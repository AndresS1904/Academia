import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as XLSX from 'xlsx';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { UpdateUserStatusDto } from './dto/update-user.dto';
import { CreateAdminDto, UpdateAdminDto } from './dto/admin.dto';
import { Role } from '@prisma/client';

type RequestUser = { id: string; role: Role; schoolId: string | null };

// Genera una contraseña temporal criptográficamente aleatoria (no Math.random)
const PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
function generateSecurePassword(): string {
  const bytes = crypto.randomBytes(12);
  let pwd = '';
  for (let i = 0; i < 12; i++) pwd += PASSWORD_CHARS[bytes[i] % PASSWORD_CHARS.length];
  return `${pwd}${crypto.randomInt(10, 99)}!`;
}

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  async findAll(page = 1, limit = 25, search = '') {
    const skip = (page - 1) * limit;
    const where: any = { role: 'ADMIN' };
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName:  { contains: search, mode: 'insensitive' } },
        { email:     { contains: search, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true, email: true, firstName: true, lastName: true,
          role: true, isActive: true, mustChangePassword: true, createdAt: true,
          school: { select: { id: true, name: true, slug: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { data, total, page, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        documento: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        enrollments: {
          select: {
            course: { select: { id: true, title: true } },
            status: true,
            enrolledAt: true,
          },
        },
      },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async updateStatus(id: string, dto: UpdateUserStatusDto, requesterId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (id === requesterId) throw new BadRequestException('No puedes desactivar tu propia cuenta');
    // El único SUPER_ADMIN nunca puede quedar desactivado — evitaría el acceso administrativo a toda la plataforma
    if (user.role === Role.SUPER_ADMIN) throw new ForbiddenException('No se puede desactivar al SUPER_ADMIN');

    return this.prisma.user.update({
      where: { id },
      data: { isActive: dto.isActive },
      select: { id: true, email: true, isActive: true },
    });
  }

  /**
   * Crea un ADMIN para una institución ya existente. Usado tanto al crear una
   * institución nueva (primer admin) como para agregar administradores
   * adicionales a una institución existente. El schoolId siempre lo determina
   * el llamador (nunca el body del request del ADMIN final).
   */
  async createAdminForSchool(schoolId: string, schoolName: string, dto: CreateAdminDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('El correo ya está registrado');

    const tempPassword = generateSecurePassword();
    const hashed = await bcrypt.hash(tempPassword, 10);

    const admin = await this.prisma.user.create({
      data: {
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        password: hashed,
        role: Role.ADMIN,
        schoolId,
        mustChangePassword: true,
      },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true, schoolId: true, createdAt: true },
    });

    this.emailService
      .sendWelcomeCredentials(admin.email, `${admin.firstName} ${admin.lastName}`, tempPassword, schoolName)
      .catch(() => {});

    return { admin, tempPassword };
  }

  /** SUPER_ADMIN: editar datos de un ADMIN (nunca schoolId ni role) */
  async updateAdmin(id: string, dto: UpdateAdminDto) {
    const admin = await this.prisma.user.findUnique({ where: { id } });
    if (!admin) throw new NotFoundException('Administrador no encontrado');
    if (admin.role !== Role.ADMIN) throw new BadRequestException('Solo se pueden editar usuarios ADMIN mediante este endpoint');

    if (dto.email && dto.email !== admin.email) {
      const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (exists) throw new ConflictException('El correo ya está en uso');
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true, schoolId: true },
    });
  }

  /** SUPER_ADMIN: reset administrativo — genera contraseña temporal nueva y fuerza cambio en el próximo login */
  async resetAdminPassword(id: string) {
    const admin = await this.prisma.user.findUnique({ where: { id }, include: { school: { select: { name: true } } } });
    if (!admin) throw new NotFoundException('Administrador no encontrado');
    if (admin.role !== Role.ADMIN) throw new BadRequestException('Solo se puede resetear la contraseña de usuarios ADMIN');

    const tempPassword = generateSecurePassword();
    const hashed = await bcrypt.hash(tempPassword, 10);

    await this.prisma.user.update({
      where: { id },
      data: { password: hashed, mustChangePassword: true, tokenVersion: { increment: 1 } },
    });

    this.emailService
      .sendAdminPasswordReset(admin.email, `${admin.firstName} ${admin.lastName}`, tempPassword)
      .catch(() => {});

    return { message: `Contraseña restablecida y enviada por correo a ${admin.email}` };
  }

  async createUser(dto: { email: string; firstName: string; lastName: string; password: string; role?: string }) {
    // Política de Super Admin único: ningún endpoint puede crear o promover a un SUPER_ADMIN.
    // El único SUPER_ADMIN permitido (SUPER_ADMIN_ALLOWED_EMAIL) se crea exclusivamente vía seed.
    if (dto.role === Role.SUPER_ADMIN) {
      throw new BadRequestException('No está permitido crear usuarios SUPER_ADMIN mediante este endpoint');
    }

    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('El correo ya está registrado');

    const hashed = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: {
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        password: hashed,
        role: (dto.role as Role) ?? Role.ESTUDIANTE,
        mustChangePassword: true,
      },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true, createdAt: true },
    });
  }

  async requestPasswordChange(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    await this.prisma.user.update({ where: { id }, data: { mustChangePassword: true } });
    return { message: 'Se solicitó cambio de contraseña al usuario' };
  }

  async remove(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    await this.prisma.user.delete({ where: { id } });
    return { message: 'Usuario eliminado' };
  }

  /** Estudiantes pertenecientes al colegio del ADMIN */
  findBySchool(schoolId: string) {
    return this.prisma.user.findMany({
      where: { schoolId, role: 'ESTUDIANTE' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        documento: true,
        phone: true,
        isActive: true,
        createdAt: true,
        _count: { select: { enrollments: true, simulacroAssignments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Grupos del colegio del ADMIN */
  findGroupsBySchool(schoolId: string) {
    return this.prisma.studentGroup.findMany({
      where: { schoolId, isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        _count: { select: { members: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  /** Crea un estudiante en el colegio del ADMIN */
  async createSchoolStudent(
    dto: {
      email: string;
      firstName: string;
      lastName: string;
      documento?: string;
      phone?: string;
      password?: string;
      groupId?: string;
    },
    schoolId: string,
  ) {
    // Validar correo único
    const emailExists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (emailExists) throw new ConflictException('El correo ya está registrado');

    // Validar documento único
    if (dto.documento) {
      const docExists = await this.prisma.user.findUnique({ where: { documento: dto.documento } });
      if (docExists) throw new ConflictException('El número de identificación ya está registrado');
    }

    // Contraseña inicial = documento si no se especifica
    const initialPassword = dto.password || dto.documento || dto.email;
    const hashed = await bcrypt.hash(initialPassword, 10);

    const student = await this.prisma.user.create({
      data: {
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        documento: dto.documento,
        password: hashed,
        role: 'ESTUDIANTE',
        schoolId,
        mustChangePassword: true,
      },
      select: { id: true, email: true, firstName: true, lastName: true, documento: true, role: true, isActive: true, createdAt: true },
    });

    // Asignar a grupo si se especifica
    if (dto.groupId) {
      await this.prisma.studentGroupMember.create({
        data: { groupId: dto.groupId, userId: student.id },
      }).catch(() => {}); // ignorar si ya existe
    }

    return student;
  }

  /** Admin: resetear contraseña de un estudiante de su colegio */
  async resetStudentPassword(studentId: string, newPassword: string, adminSchoolId: string) {
    const student = await this.prisma.user.findUnique({ where: { id: studentId } });
    if (!student) throw new NotFoundException('Estudiante no encontrado');
    if (student.role !== 'ESTUDIANTE') throw new BadRequestException('Solo se puede resetear la contraseña de estudiantes');
    if (student.schoolId !== adminSchoolId) throw new ForbiddenException('El estudiante no pertenece a tu colegio');

    const hashed = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: studentId },
      data: { password: hashed, mustChangePassword: true },
    });
    return { message: 'Contraseña reseteada. El estudiante deberá cambiarla al iniciar sesión.' };
  }

  /** Admin: actualizar datos de un estudiante de su colegio */
  async updateSchoolStudent(
    studentId: string,
    dto: { firstName?: string; lastName?: string; email?: string; documento?: string; phone?: string; isActive?: boolean },
    adminSchoolId: string,
  ) {
    const student = await this.prisma.user.findUnique({ where: { id: studentId } });
    if (!student) throw new NotFoundException('Estudiante no encontrado');
    if (student.role !== 'ESTUDIANTE') throw new BadRequestException('Solo se pueden editar estudiantes');
    if (student.schoolId !== adminSchoolId) throw new ForbiddenException('El estudiante no pertenece a tu colegio');

    if (dto.email && dto.email !== student.email) {
      const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (exists) throw new ConflictException('El correo ya está en uso');
    }
    if (dto.documento && dto.documento !== student.documento) {
      const exists = await this.prisma.user.findUnique({ where: { documento: dto.documento } });
      if (exists) throw new ConflictException('El número de identificación ya está en uso');
    }

    return this.prisma.user.update({
      where: { id: studentId },
      data: {
        ...(dto.firstName  !== undefined && { firstName:  dto.firstName  }),
        ...(dto.lastName   !== undefined && { lastName:   dto.lastName   }),
        ...(dto.email      !== undefined && { email:      dto.email      }),
        ...(dto.documento  !== undefined && { documento:  dto.documento  }),
        ...(dto.phone      !== undefined && { phone:      dto.phone      }),
        ...(dto.isActive   !== undefined && { isActive:   dto.isActive   }),
      },
      select: { id: true, email: true, firstName: true, lastName: true, documento: true, phone: true, isActive: true },
    });
  }

  /** Genera la plantilla Excel oficial para importación */
  generateImportTemplate(): Buffer {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ['Identificacion', 'Nombres', 'Apellidos', 'Correo', 'Telefono'],
      ['1053812345', 'Juan Carlos', 'Pérez García', 'juan@ejemplo.com', '3001234567'],
      ['1053867890', 'María', 'González López', 'maria@ejemplo.com', ''],
    ]);
    ws['!cols'] = [{ wch: 18 }, { wch: 22 }, { wch: 22 }, { wch: 32 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Estudiantes');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  /** Importación masiva de estudiantes desde Excel */
  async bulkImportStudents(
    fileBuffer: Buffer,
    schoolId: string,
    groupId?: string,
  ): Promise<{
    total: number;
    created: number;
    updated: number;
    errors: { row: number; field: string; message: string }[];
  }> {
    const wb = XLSX.read(fileBuffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });

    if (rows.length < 2) throw new BadRequestException('El archivo está vacío o no tiene datos');

    const results = { total: rows.length - 1, created: 0, updated: 0, errors: [] as any[] };

    // Verificar grupo si se especificó
    if (groupId) {
      const group = await this.prisma.studentGroup.findFirst({ where: { id: groupId, schoolId } });
      if (!group) throw new BadRequestException('El grupo seleccionado no existe o no pertenece a tu institución');
    }

    // Pre-validar duplicados dentro del archivo
    const docSet = new Set<string>();
    const emailSet = new Set<string>();

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] as any[];
      const rowNum = i + 1;

      const doc   = String(row[0] ?? '').trim();
      const first = String(row[1] ?? '').trim();
      const last  = String(row[2] ?? '').trim();
      const email = String(row[3] ?? '').trim().toLowerCase();
      const phone = String(row[4] ?? '').trim() || undefined;

      // Campos obligatorios
      if (!doc)   { results.errors.push({ row: rowNum, field: 'Identificacion', message: 'Campo obligatorio' }); continue; }
      if (!first) { results.errors.push({ row: rowNum, field: 'Nombres',        message: 'Campo obligatorio' }); continue; }
      if (!last)  { results.errors.push({ row: rowNum, field: 'Apellidos',      message: 'Campo obligatorio' }); continue; }
      if (!email) { results.errors.push({ row: rowNum, field: 'Correo',         message: 'Campo obligatorio' }); continue; }

      // Formato de correo
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        results.errors.push({ row: rowNum, field: 'Correo', message: 'Formato inválido' }); continue;
      }

      // Duplicados en el archivo
      if (docSet.has(doc)) {
        results.errors.push({ row: rowNum, field: 'Identificacion', message: 'Duplicado en el archivo' }); continue;
      }
      if (emailSet.has(email)) {
        results.errors.push({ row: rowNum, field: 'Correo', message: 'Duplicado en el archivo' }); continue;
      }
      docSet.add(doc);
      emailSet.add(email);

      // Upsert por documento
      const existing = await this.prisma.user.findUnique({ where: { documento: doc } });

      if (existing && existing.role !== 'ESTUDIANTE') {
        // Protege cuentas ADMIN/SUPER_ADMIN de ser modificadas por colisión de documento
        results.errors.push({ row: rowNum, field: 'Identificacion', message: 'Pertenece a una cuenta administrativa, no se puede modificar por importación' }); continue;
      }

      if (existing) {
        // Verificar que el correo no pertenezca a otro usuario
        if (email !== existing.email) {
          const emailTaken = await this.prisma.user.findUnique({ where: { email } });
          if (emailTaken && emailTaken.id !== existing.id) {
            results.errors.push({ row: rowNum, field: 'Correo', message: 'Ya está registrado por otro usuario' }); continue;
          }
        }
        await this.prisma.user.update({
          where: { id: existing.id },
          data: { firstName: first, lastName: last, email, ...(phone && { phone }), schoolId },
        });
        if (groupId) {
          await this.prisma.studentGroupMember.upsert({
            where: { groupId_userId: { groupId, userId: existing.id } },
            create: { groupId, userId: existing.id },
            update: {},
          });
        }
        results.updated++;
      } else {
        // Verificar correo único
        const emailTaken = await this.prisma.user.findUnique({ where: { email } });
        if (emailTaken) {
          results.errors.push({ row: rowNum, field: 'Correo', message: 'Ya está registrado por otro usuario' }); continue;
        }
        const hashed = await bcrypt.hash(doc, 10);
        const student = await this.prisma.user.create({
          data: {
            email, firstName: first, lastName: last, phone,
            documento: doc, password: hashed,
            role: 'ESTUDIANTE', schoolId, mustChangePassword: true,
          },
          select: { id: true },
        });
        if (groupId) {
          await this.prisma.studentGroupMember.create({
            data: { groupId, userId: student.id },
          }).catch(() => {});
        }
        results.created++;
      }
    }

    return results;
  }

  async getAdminStats(caller?: RequestUser) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const isAdmin = caller?.role === Role.ADMIN && caller?.schoolId;
    const schoolFilter = isAdmin ? { schoolId: caller.schoolId } : {};
    const enrollmentFilter = isAdmin
      ? { enrolledAt: { gte: todayStart }, user: { schoolId: caller.schoolId } }
      : { enrolledAt: { gte: todayStart } };

    const [totalStudents, totalCourses, inscritosHoy, mejorPuntajeResult] = await Promise.all([
      this.prisma.user.count({ where: { role: 'ESTUDIANTE', ...schoolFilter } }),
      this.prisma.course.count({ where: isAdmin ? { schoolId: caller.schoolId } : {} }),
      this.prisma.enrollment.count({ where: enrollmentFilter }),
      this.prisma.simulacroAssignment.aggregate({
        _max: { score: true },
        where: isAdmin
          ? { score: { not: null }, user: { schoolId: caller.schoolId } }
          : { score: { not: null } },
      }),
    ]);

    return {
      totalStudents,
      totalCourses,
      inscritosHoy,
      mejorPuntaje: mejorPuntajeResult._max.score ?? null,
    };
  }
}
