import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { CreateAdminDto } from '../users/dto/admin.dto';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';

@Injectable()
export class SchoolsService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
  ) {}

  async create(dto: CreateSchoolDto) {
    const existing = await this.prisma.school.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException('Ya existe una institución con ese slug');

    if (dto.nit) {
      const nitExists = await this.prisma.school.findUnique({ where: { nit: dto.nit } });
      if (nitExists) throw new ConflictException('Ya existe una institución con ese NIT');
    }

    // Default colors if not provided
    const colors = dto.colors ?? {
      primary: '#004aad',
      secondary: '#fc740c',
      accent: '#0ea5e9',
      dark: '#0a1628',
    };

    // Full default template so the super admin can edit right away
    const defaultTemplate = {
      colors,
      hero: {
        titulo: '',
        subtitulo: `Formación académica estratégica para las Pruebas Saber 11 y exámenes de admisión universitaria. Prepárate con los mejores docentes y metodología de alto rendimiento.`,
        stat1: '', stat1lbl: '',
        stat2: '', stat2lbl: '',
        stat3: '', stat3lbl: '',
      },
      sobreNosotros: {
        titulo: 'Sobre Nosotros',
        contenido: `${dto.name} es una institución dedicada a la formación académica de alto rendimiento. Nuestro equipo de docentes especializados prepara a cada estudiante con método, datos y acompañamiento personalizado para lograr sus metas.`,
        mision: `Preparar de manera integral y estratégica a estudiantes de bachillerato para las Pruebas Saber 11 y exámenes de admisión universitaria, garantizando resultados medibles y reales.`,
        vision: `Ser una institución líder en preparación académica a nivel regional, reconocida por la calidad de sus docentes, metodología innovadora y el éxito comprobado de sus estudiantes.`,
      },
      programas: [
        {
          id: 'prog_1',
          titulo: 'Programa Principal',
          emoji: '📚',
          tag: 'Destacado',
          activo: true,
          descripcion: `Descripción del programa principal de ${dto.name}. Edita este contenido con la información real del programa que ofrece tu institución.`,
          objetivo: '',
        },
      ],
      contacto: {
        whatsapp: dto.phone?.replace(/\D/g, '') ?? '',
        whatsappMsg: `Hola, me interesa conocer más sobre los programas de ${dto.name}. ¿Me pueden dar más información?`,
        instagram: '',
        tiktok: '',
        facebook: '',
      },
      galeria: [],
    };

    const pageContent = { ...defaultTemplate, ...(dto.pageContent ?? {}) };

    const school = await this.prisma.school.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        nit: dto.nit,
        logoUrl: dto.logoUrl,
        colors: colors as any,
        pageContent: pageContent as any,
      },
    });

    // Construir email único para el primer admin: usar el ID corto de la escuela para evitar conflictos
    const shortId = school.id.slice(0, 8);
    const candidateEmails = [
      dto.email,
      `admin@${dto.slug}.edu.co`,
      `admin.${dto.slug}@tucolgioweb.co`,
      `admin-${shortId}@tucolgioweb.co`,
    ].filter(Boolean) as string[];

    let finalEmail = `admin-${shortId}@tucolgioweb.co`; // fallback garantizado único
    for (const candidate of candidateEmails) {
      const emailTaken = await this.prisma.user.findUnique({ where: { email: candidate } });
      if (!emailTaken) { finalEmail = candidate; break; }
    }

    // Auto-crea el primer admin de la institución reutilizando la misma lógica
    // que usa SUPER_ADMIN para agregar administradores adicionales después.
    const { admin, tempPassword } = await this.usersService.createAdminForSchool(school.id, school.name, {
      email: finalEmail,
      firstName: 'Admin',
      lastName: dto.name,
    });

    return {
      school,
      adminCredentials: {
        email: admin.email,
        tempPassword,
        note: 'Comparte estas credenciales con el administrador de la institución. Deberá cambiar la contraseña al primer ingreso. También se enviaron por correo.',
      },
    };
  }

  /** SUPER_ADMIN: agrega un administrador adicional a una institución ya existente */
  async createAdmin(schoolId: string, dto: CreateAdminDto) {
    const school = await this.findOne(schoolId);
    const { admin, tempPassword } = await this.usersService.createAdminForSchool(school.id, school.name, dto);
    return {
      admin,
      tempPassword,
      note: 'Credenciales enviadas por correo al nuevo administrador.',
    };
  }

  findAll() {
    return this.prisma.school.findMany({
      include: {
        _count: { select: { users: true, licenses: true, courses: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const school = await this.prisma.school.findUnique({
      where: { id },
      include: {
        licenses: {
          where: { status: 'ACTIVE' },
          include: { product: true },
        },
        _count: { select: { users: true, courses: true, simulacros: true } },
      },
    });
    if (!school) throw new NotFoundException('Institución no encontrada');
    return school;
  }

  async update(id: string, dto: UpdateSchoolDto) {
    await this.findOne(id);
    const data: any = { ...dto };
    if (dto.colors) {
      const current = await this.prisma.school.findUnique({ where: { id }, select: { pageContent: true } });
      const currentContent = (current?.pageContent as Record<string, unknown>) ?? {};
      data.pageContent = { ...currentContent, colors: dto.colors };
    }
    return this.prisma.school.update({ where: { id }, data });
  }

  async toggleActive(id: string) {
    const school = await this.findOne(id);
    return this.prisma.school.update({
      where: { id },
      data: { isActive: !school.isActive },
      select: { id: true, isActive: true },
    });
  }

  async getPublicBySlug(slug: string) {
    const school = await this.prisma.school.findUnique({
      where: { slug, isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        phone: true,
        logoUrl: true,
        colors: true,
        pageContent: true,
      },
    });
    if (!school) throw new NotFoundException('Institución no encontrada');
    return school;
  }

  async updatePageContent(id: string, content: Record<string, unknown>) {
    await this.findOne(id);
    const data: any = { pageContent: content as any };
    if (content.colors) data.colors = content.colors as any;
    return this.prisma.school.update({
      where: { id },
      data,
      select: { id: true, slug: true, pageContent: true, colors: true },
    });
  }

  findAllPublic() {
    return this.prisma.school.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        colors: true,
        pageContent: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
