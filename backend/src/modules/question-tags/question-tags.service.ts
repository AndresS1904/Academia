import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class QuestionTagsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.questionTag.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { taggings: true } } },
    });
  }

  async create(name: string, color?: string) {
    const existing = await this.prisma.questionTag.findUnique({ where: { name } });
    if (existing) throw new ConflictException(`El tag "${name}" ya existe`);
    return this.prisma.questionTag.create({
      data: { name, color: color ?? '#6366f1' },
    });
  }

  async update(id: string, name?: string, color?: string) {
    const tag = await this.prisma.questionTag.findUnique({ where: { id } });
    if (!tag) throw new NotFoundException('Tag no encontrado');
    return this.prisma.questionTag.update({
      where: { id },
      data: { ...(name && { name }), ...(color && { color }) },
    });
  }

  async remove(id: string) {
    const tag = await this.prisma.questionTag.findUnique({ where: { id } });
    if (!tag) throw new NotFoundException('Tag no encontrado');
    await this.prisma.questionTag.delete({ where: { id } });
    return { message: 'Tag eliminado' };
  }
}
