import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateResourceDto } from './dto/create-resource.dto';

@Injectable()
export class ResourcesService {
  constructor(private prisma: PrismaService) {}

  async findByLesson(lessonId: string) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundException('Lección no encontrada');
    return this.prisma.resource.findMany({ where: { lessonId } });
  }

  async create(lessonId: string, dto: CreateResourceDto) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundException('Lección no encontrada');
    return this.prisma.resource.create({ data: { lessonId, ...dto } });
  }

  async update(id: string, dto: Partial<CreateResourceDto>) {
    const resource = await this.prisma.resource.findUnique({ where: { id } });
    if (!resource) throw new NotFoundException('Recurso no encontrado');
    return this.prisma.resource.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const resource = await this.prisma.resource.findUnique({ where: { id } });
    if (!resource) throw new NotFoundException('Recurso no encontrado');
    await this.prisma.resource.delete({ where: { id } });
    return { message: 'Recurso eliminado' };
  }

  // ── Resource academic content (admin) ─────────────────────────────────────

  async getResourceFull(resourceId: string) {
    const resource = await this.prisma.resource.findUnique({
      where: { id: resourceId },
      include: {
        lesson: { select: { id: true, title: true, courseId: true } },
        materials:  { orderBy: { order: 'asc' } },
        activities: {
          orderBy: { order: 'asc' },
          include: { submissions: { select: { id: true, studentId: true, status: true, score: true, submittedAt: true } } },
        },
        quizzes: {
          where: { resourceId },
          orderBy: { order: 'asc' },
          include: { questions: { select: { id: true } }, attempts: { select: { id: true } } },
        },
        forums: {
          where: { resourceId },
          orderBy: { createdAt: 'asc' },
          include: { threads: { select: { id: true } } },
        },
      },
    });
    if (!resource) throw new NotFoundException('Recurso no encontrado');
    return resource;
  }

  async addResourceMaterial(resourceId: string, data: { title: string; type: string; externalUrl?: string; description?: string }) {
    const resource = await this.prisma.resource.findUnique({ where: { id: resourceId } });
    if (!resource) throw new NotFoundException('Recurso no encontrado');
    const count = await this.prisma.topicMaterial.count({ where: { resourceId } });
    return this.prisma.topicMaterial.create({
      data: { resourceId, title: data.title, type: data.type as any, externalUrl: data.externalUrl, description: data.description, order: count },
    });
  }

  async deleteResourceMaterial(materialId: string) {
    await this.prisma.topicMaterial.delete({ where: { id: materialId } });
    return { message: 'Material eliminado' };
  }

  async addResourceActivity(resourceId: string, data: { title: string; description?: string; instructions?: string; dueDate?: string; maxScore?: number }) {
    const resource = await this.prisma.resource.findUnique({ where: { id: resourceId } });
    if (!resource) throw new NotFoundException('Recurso no encontrado');
    const count = await this.prisma.topicActivity.count({ where: { resourceId } });
    return this.prisma.topicActivity.create({
      data: {
        resourceId,
        title: data.title,
        description: data.description,
        instructions: data.instructions,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        maxScore: data.maxScore ?? 10,
        order: count,
      },
    });
  }

  async getResourceActivities(resourceId: string) {
    return this.prisma.topicActivity.findMany({
      where: { resourceId },
      orderBy: { order: 'asc' },
      include: {
        submissions: {
          select: { id: true, studentId: true, status: true, score: true, submittedAt: true, feedback: true },
        },
      },
    });
  }

  async addResourceQuiz(resourceId: string, data: { title: string; description?: string; timeLimit?: number; maxAttempts?: number; passingScore?: number }) {
    const resource = await this.prisma.resource.findUnique({ where: { id: resourceId } });
    if (!resource) throw new NotFoundException('Recurso no encontrado');
    const count = await this.prisma.classQuiz.count({ where: { resourceId } });
    return this.prisma.classQuiz.create({
      data: {
        resourceId,
        title: data.title,
        description: data.description,
        timeLimit: data.timeLimit,
        maxAttempts: data.maxAttempts ?? 1,
        passingScore: data.passingScore ?? 60,
        order: count,
      },
    });
  }

  async getResourceQuizzes(resourceId: string) {
    return this.prisma.classQuiz.findMany({
      where: { resourceId },
      orderBy: { order: 'asc' },
      include: { questions: { select: { id: true } }, attempts: { select: { id: true } } },
    });
  }

  async getResourceForums(resourceId: string) {
    return this.prisma.forum.findMany({
      where: { resourceId },
      orderBy: { createdAt: 'asc' },
      include: { threads: { select: { id: true } } },
    });
  }

  async addResourceForum(resourceId: string, data: { title: string; description?: string }) {
    const resource = await this.prisma.resource.findUnique({ where: { id: resourceId } });
    if (!resource) throw new NotFoundException('Recurso no encontrado');
    return this.prisma.forum.create({ data: { resourceId, title: data.title, description: data.description } });
  }

  // ── Student view ───────────────────────────────────────────────────────────

  async getResourceStudentView(resourceId: string, studentId: string) {
    const resource = await this.prisma.resource.findUnique({
      where: { id: resourceId },
      include: {
        lesson: { select: { id: true, title: true, courseId: true } },
        materials: { where: {}, orderBy: { order: 'asc' } },
        activities: {
          where: { isPublished: true },
          orderBy: { order: 'asc' },
          include: {
            submissions: { where: { studentId }, select: { id: true, status: true, score: true, submittedAt: true, feedback: true, gradedAt: true } },
          },
        },
        quizzes: {
          where: { resourceId, status: 'PUBLISHED' },
          orderBy: { order: 'asc' },
          include: {
            questions: { select: { id: true } },
            attempts: { where: { studentId }, orderBy: { createdAt: 'desc' }, take: 1, select: { id: true, score: true, status: true, createdAt: true } },
          },
        },
        forums: { where: { resourceId, isLocked: false }, orderBy: { createdAt: 'asc' }, include: { threads: { select: { id: true } } } },
      },
    });
    if (!resource) throw new NotFoundException('Recurso no encontrado');
    return resource;
  }
}
