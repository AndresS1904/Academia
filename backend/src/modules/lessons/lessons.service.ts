import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';

@Injectable()
export class LessonsService {
  constructor(private prisma: PrismaService) {}

  async findByCourse(courseId: string) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Curso no encontrado');

    return this.prisma.lesson.findMany({
      where: { courseId },
      orderBy: { order: 'asc' },
      include: { resources: true },
    });
  }

  async create(courseId: string, dto: CreateLessonDto) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Curso no encontrado');

    const lastLesson = await this.prisma.lesson.findFirst({
      where: { courseId },
      orderBy: { order: 'desc' },
    });
    const order = dto.order ?? (lastLesson ? lastLesson.order + 1 : 0);

    return this.prisma.lesson.create({
      data: { courseId, title: dto.title, content: dto.content, order },
    });
  }

  async update(id: string, dto: UpdateLessonDto) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id } });
    if (!lesson) throw new NotFoundException('Lección no encontrada');

    return this.prisma.lesson.update({ where: { id }, data: dto });
  }

  async togglePublish(id: string) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id } });
    if (!lesson) throw new NotFoundException('Lección no encontrada');

    return this.prisma.lesson.update({
      where: { id },
      data: { isPublished: !lesson.isPublished },
      select: { id: true, isPublished: true },
    });
  }

  async remove(id: string) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id } });
    if (!lesson) throw new NotFoundException('Lección no encontrada');

    await this.prisma.lesson.delete({ where: { id } });
    return { message: 'Lección eliminada' };
  }
}
