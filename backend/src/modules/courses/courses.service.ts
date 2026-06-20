import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AccessService } from '../access/access.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { Role } from '@prisma/client';

export type RequestUser = { id: string; role: Role; schoolId: string | null };

function generateSlug(title: string, addSuffix = false): string {
  const base = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  if (!addSuffix) return base;

  // Sufijo corto para evitar colisiones entre colegios
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base}-${suffix}`;
}

@Injectable()
export class CoursesService {
  constructor(
    private prisma: PrismaService,
    private access: AccessService,
  ) {}

  /** Catálogo público: solo cursos globales publicados */
  findAllPublished() {
    return this.prisma.course.findMany({
      where: { isPublished: true, isGlobal: true },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        thumbnail: true,
        _count: { select: { lessons: true, enrollments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Panel admin:
   * - SUPER_ADMIN → todos los cursos
   * - ADMIN       → sus propios cursos + globales con licencia activa
   */
  async findAll(user: RequestUser) {
    if (user.role === Role.SUPER_ADMIN) {
      return this.prisma.course.findMany({
        select: {
          id: true, title: true, slug: true, description: true,
          thumbnail: true, duration: true, instructorName: true,
          isPublished: true, isGlobal: true, schoolId: true, createdAt: true,
          _count: { select: { lessons: true, enrollments: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    // ADMIN: todos sus propios cursos (incluyendo borradores) + globales publicados con licencia activa
    const activeProductIds = await this.access.getActiveProductIds(user.schoolId);

    return this.prisma.course.findMany({
      where: {
        OR: [
          { schoolId: user.schoolId },
          {
            isGlobal: true,
            isPublished: true,
            products: { some: { id: { in: activeProductIds } } },
          },
        ],
      },
      select: {
        id: true, title: true, slug: true, description: true,
        thumbnail: true, duration: true, instructorName: true,
        isPublished: true, isGlobal: true, schoolId: true, createdAt: true,
        _count: { select: { lessons: true, enrollments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneAdmin(id: string, user: RequestUser) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        lessons: {
          orderBy: { order: 'asc' },
          include: {
            resources: {
              include: {
                _count: { select: { materials: true, activities: true, quizzes: true, forums: true } },
              },
            },
          },
        },
      },
    });
    if (!course) throw new NotFoundException('Curso no encontrado');

    // ADMIN solo puede ver su propio contenido o global con licencia
    if (user.role !== Role.SUPER_ADMIN) {
      const canAccess = await this.access.canAccessCourse(user.schoolId, id);
      if (!canAccess) throw new ForbiddenException('Sin acceso a este curso');
    }

    return course;
  }

  async findOne(id: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        lessons: { orderBy: { order: 'asc' }, include: { resources: true } },
      },
    });
    if (!course) throw new NotFoundException('Curso no encontrado');
    return course;
  }

  async create(dto: CreateCourseDto, user: RequestUser) {
    const isSuperAdmin = user.role === Role.SUPER_ADMIN;
    // Cursos de colegio usan sufijo para evitar colisión de slug entre colegios
    const slug = generateSlug(dto.title, !isSuperAdmin);

    return this.prisma.course.create({
      data: {
        title: dto.title,
        slug,
        description: dto.description,
        thumbnail: dto.thumbnail,
        duration: dto.duration,
        instructorName: dto.instructorName,
        isPublished: dto.isPublished ?? false,
        authorId: user.id,
        // SUPER_ADMIN crea contenido global; ADMIN crea contenido de su colegio
        schoolId: isSuperAdmin ? null : user.schoolId,
        isGlobal: isSuperAdmin,
      },
    });
  }

  async update(id: string, dto: UpdateCourseDto, user: RequestUser) {
    const course = await this.prisma.course.findUnique({ where: { id } });
    if (!course) throw new NotFoundException('Curso no encontrado');

    // Solo el dueño (SUPER_ADMIN para globales, ADMIN para los suyos) puede editar
    if (user.role !== Role.SUPER_ADMIN && course.schoolId !== user.schoolId) {
      throw new ForbiddenException('No puedes editar un curso que no es tuyo');
    }

    const data: any = { ...dto };
    if (dto.title) {
      // Mantener el sufijo existente si el curso ya tiene uno (schoolId !== null)
      const keepSuffix = course.schoolId !== null;
      data.slug = generateSlug(dto.title, keepSuffix);
    }

    return this.prisma.course.update({ where: { id }, data });
  }

  async togglePublish(id: string, user: RequestUser) {
    const course = await this.prisma.course.findUnique({ where: { id } });
    if (!course) throw new NotFoundException('Curso no encontrado');

    if (user.role !== Role.SUPER_ADMIN && course.schoolId !== user.schoolId) {
      throw new ForbiddenException('No puedes modificar un curso que no es tuyo');
    }

    return this.prisma.course.update({
      where: { id },
      data: { isPublished: !course.isPublished },
      select: { id: true, isPublished: true },
    });
  }

  async remove(id: string, user: RequestUser) {
    const course = await this.prisma.course.findUnique({ where: { id } });
    if (!course) throw new NotFoundException('Curso no encontrado');

    if (user.role !== Role.SUPER_ADMIN && course.schoolId !== user.schoolId) {
      throw new ForbiddenException('No puedes eliminar un curso que no es tuyo');
    }
    if (user.role !== Role.SUPER_ADMIN && course.isGlobal) {
      throw new ForbiddenException('No puedes eliminar contenido global');
    }

    await this.prisma.course.delete({ where: { id } });
    return { message: 'Curso eliminado' };
  }
}
