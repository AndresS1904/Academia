import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AccessService } from '../access/access.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { Role } from '@prisma/client';

export type RequestUser = { id: string; role: Role; schoolId: string | null };

@Injectable()
export class EnrollmentsService {
  constructor(
    private prisma: PrismaService,
    private access: AccessService,
  ) {}

  async findAll(page = 1, limit = 25, search = '', caller?: RequestUser) {
    const skip = (page - 1) * limit;
    const where: any = {};

    // ADMIN solo ve inscripciones de su propio colegio
    if (caller && caller.role === Role.ADMIN && caller.schoolId) {
      where.user = { schoolId: caller.schoolId };
    }

    if (search) {
      where.OR = [
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName:  { contains: search, mode: 'insensitive' } } },
        { user: { email:     { contains: search, mode: 'insensitive' } } },
        { course: { title:   { contains: search, mode: 'insensitive' } } },
      ];
    }
    const [data, total] = await Promise.all([
      this.prisma.enrollment.findMany({
        where,
        include: {
          user:   { select: { id: true, email: true, firstName: true, lastName: true } },
          course: { select: { id: true, title: true } },
        },
        orderBy: { enrolledAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.enrollment.count({ where }),
    ]);
    return { data, total, page, pages: Math.ceil(total / limit) };
  }

  async findByUser(userId: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
            thumbnail: true,
            description: true,
            lessons: {
              select: { _count: { select: { resources: true } } },
            },
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    });

    return enrollments.map((e) => ({
      ...e,
      course: {
        ...e.course,
        totalResources: e.course.lessons.reduce((sum, l) => sum + l._count.resources, 0),
        lessons: undefined,
      },
    }));
  }

  async complete(userId: string, courseId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (!enrollment) throw new NotFoundException('Inscripción no encontrada');

    return this.prisma.enrollment.update({
      where: { userId_courseId: { userId, courseId } },
      data: { status: 'COMPLETED' },
      select: { id: true, status: true },
    });
  }

  /** Auto-inscripción del estudiante — valida licencia si el curso es global */
  async create(userId: string, dto: CreateEnrollmentDto, user: RequestUser) {
    const course = await this.prisma.course.findUnique({
      where: { id: dto.courseId, isPublished: true },
    });
    if (!course) throw new NotFoundException('Curso no encontrado');

    if (user.role !== Role.SUPER_ADMIN) {
      const canAccess = await this.access.canAccessCourse(user.schoolId, dto.courseId);
      if (!canAccess) throw new ForbiddenException('Tu colegio no tiene licencia para este curso');
    }

    const existing = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId: dto.courseId } },
    });
    if (existing) throw new ConflictException('Ya estás inscrito en este curso');

    return this.prisma.enrollment.create({
      data: { userId, courseId: dto.courseId },
      include: { course: { select: { id: true, title: true } } },
    });
  }

  /** ADMIN inscribe a un estudiante de su colegio — valida licencia si el curso es global */
  async adminAssign(courseId: string, studentId: string, admin: RequestUser) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId, isPublished: true },
    });
    if (!course) throw new NotFoundException('Curso no encontrado o no publicado');

    const student = await this.prisma.user.findUnique({ where: { id: studentId } });
    if (!student) throw new NotFoundException('Estudiante no encontrado');

    // ADMIN solo puede inscribir estudiantes de su colegio
    if (admin.role === Role.ADMIN && student.schoolId !== admin.schoolId) {
      throw new ForbiddenException('Solo puedes inscribir estudiantes de tu colegio');
    }

    // Validar licencia si el curso es global
    if (admin.role !== Role.SUPER_ADMIN) {
      const canAccess = await this.access.canAccessCourse(admin.schoolId, courseId);
      if (!canAccess) throw new ForbiddenException('Tu colegio no tiene licencia para este curso');
    }

    const existing = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: studentId, courseId } },
    });
    if (existing) throw new ConflictException('El estudiante ya está inscrito en este curso');

    return this.prisma.enrollment.create({
      data: { userId: studentId, courseId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        course: { select: { id: true, title: true } },
      },
    });
  }
}
