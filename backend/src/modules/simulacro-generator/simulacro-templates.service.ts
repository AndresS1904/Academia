import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { Role } from '@prisma/client';

export type RequestUser = { id: string; role: Role; schoolId: string | null };

const TEMPLATE_INCLUDE = {
  sessions: {
    orderBy: { order: 'asc' as const },
    include: {
      sections: {
        orderBy: { order: 'asc' as const },
        include: { rules: true },
      },
    },
  },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
  _count: { select: { sessions: true } },
};

@Injectable()
export class SimulacroTemplatesService {
  constructor(private prisma: PrismaService) {}

  async findAll(user: RequestUser) {
    const where: any = { isActive: true };
    if (user.role !== Role.SUPER_ADMIN) {
      // ADMIN can see global templates (schoolId=null) + their own school's templates
      where.OR = [{ schoolId: null }, { schoolId: user.schoolId }];
    }

    return this.prisma.simulacroTemplate.findMany({
      where,
      include: TEMPLATE_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, user: RequestUser) {
    const template = await this.prisma.simulacroTemplate.findUnique({
      where: { id },
      include: TEMPLATE_INCLUDE,
    });
    if (!template) throw new NotFoundException('Plantilla no encontrada');
    if (user.role !== Role.SUPER_ADMIN && template.schoolId && template.schoolId !== user.schoolId) {
      throw new ForbiddenException();
    }
    return template;
  }

  async create(dto: CreateTemplateDto, user: RequestUser) {
    const isSuperAdmin = user.role === Role.SUPER_ADMIN;
    return this.prisma.simulacroTemplate.create({
      data: {
        name: dto.name,
        description: dto.description,
        examType: dto.examType,
        schoolId: isSuperAdmin ? null : user.schoolId,
        createdById: user.id,
        sessions: {
          create: dto.sessions.map(sess => ({
            type: sess.type,
            label: sess.label,
            order: sess.order,
            durationMinutes: sess.durationMinutes,
            sections: {
              create: sess.sections.map(sec => ({
                area: sec.area,
                order: sec.order,
                durationMinutes: sec.durationMinutes,
                rules: {
                  create: sec.rules.map(rule => ({
                    count: rule.count,
                    difficulty: rule.difficulty ?? null,
                    topic: rule.topic ?? null,
                    subtopic: rule.subtopic ?? null,
                    competence: rule.competence ?? null,
                    component: rule.component ?? null,
                    gradeLevel: rule.gradeLevel ?? null,
                    sourceType: rule.sourceType ?? null,
                    tagIds: rule.tagIds ?? [],
                    excludeRecentDays: rule.excludeRecentDays ?? 0,
                  })),
                },
              })),
            },
          })),
        },
      },
      include: TEMPLATE_INCLUDE,
    });
  }

  async update(id: string, dto: Partial<CreateTemplateDto>, user: RequestUser) {
    const template = await this.findOne(id, user);
    if (user.role !== Role.SUPER_ADMIN && template.schoolId !== user.schoolId) {
      throw new ForbiddenException();
    }

    // Full replace strategy: delete and recreate sessions if provided
    return this.prisma.$transaction(async (tx) => {
      if (dto.sessions) {
        await tx.templateSession.deleteMany({ where: { templateId: id } });
      }

      return tx.simulacroTemplate.update({
        where: { id },
        data: {
          ...(dto.name && { name: dto.name }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.examType && { examType: dto.examType }),
          ...(dto.sessions && {
            sessions: {
              create: dto.sessions.map(sess => ({
                type: sess.type,
                label: sess.label,
                order: sess.order,
                durationMinutes: sess.durationMinutes,
                sections: {
                  create: sess.sections.map(sec => ({
                    area: sec.area,
                    order: sec.order,
                    durationMinutes: sec.durationMinutes,
                    rules: {
                      create: sec.rules.map(rule => ({
                        count: rule.count,
                        difficulty: rule.difficulty ?? null,
                        topic: rule.topic ?? null,
                        subtopic: rule.subtopic ?? null,
                        competence: rule.competence ?? null,
                        component: rule.component ?? null,
                        gradeLevel: rule.gradeLevel ?? null,
                        sourceType: rule.sourceType ?? null,
                        tagIds: rule.tagIds ?? [],
                        excludeRecentDays: rule.excludeRecentDays ?? 0,
                      })),
                    },
                  })),
                },
              })),
            },
          }),
        },
        include: TEMPLATE_INCLUDE,
      });
    });
  }

  async remove(id: string, user: RequestUser) {
    await this.findOne(id, user);
    return this.prisma.simulacroTemplate.update({
      where: { id },
      data: { isActive: false },
      select: { id: true },
    });
  }
}
