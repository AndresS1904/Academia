import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AccessService } from '../access/access.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { FilterQuestionDto } from './dto/filter-question.dto';
import { Difficulty, ExamType, Prisma, Role, QuestionType } from '@prisma/client';

export type RequestUser = { id: string; role: Role; schoolId: string | null };

const QUESTION_INCLUDE = {
  options: { orderBy: { letra: 'asc' as const } },
  tags: { include: { tag: { select: { id: true, name: true, color: true } } } },
  analytics: { select: { timesUsed: true, correctRate: true, avgTimeSeconds: true } },
  _count: { select: { simulacroQuestions: true } },
};

@Injectable()
export class QuestionsService {
  constructor(
    private prisma: PrismaService,
    private access: AccessService,
  ) {}

  async create(dto: CreateQuestionDto, user?: RequestUser) {
    const correctOptions = dto.options.filter(o => o.isCorrect);
    if (dto.questionType === QuestionType.MULTIPLE_CHOICE) {
      if (correctOptions.length < 1) throw new BadRequestException('Debe haber al menos una opción correcta');
    } else {
      if (correctOptions.length !== 1) throw new BadRequestException('Debe haber exactamente una opción correcta');
    }

    const isSuperAdmin = user?.role === Role.SUPER_ADMIN;

    const question = await this.prisma.question.create({
      data: {
        enunciado: dto.enunciado,
        imageUrl: dto.imageUrl,
        contexto: dto.contexto,
        area: dto.area,
        examType: dto.examType,
        difficulty: dto.difficulty,
        explicacion: dto.explicacion,
        topic: dto.topic,
        subtopic: dto.subtopic,
        competence: dto.competence,
        component: dto.component,
        gradeLevel: dto.gradeLevel,
        year: dto.year,
        sourceType: dto.sourceType,
        subject: dto.subject,
        questionType: dto.questionType ?? QuestionType.SINGLE_CHOICE,
        schoolId: isSuperAdmin ? null : (user?.schoolId ?? null),
        isGlobal: isSuperAdmin,
        options: {
          create: dto.options.map(o => ({
            letra: o.letra,
            texto: o.texto,
            imageUrl: o.imageUrl,
            isCorrect: o.isCorrect,
          })),
        },
      },
      include: { options: { orderBy: { letra: 'asc' } } },
    });

    // Assign tags if provided
    if (dto.tagIds && dto.tagIds.length > 0) {
      await this.prisma.questionTagging.createMany({
        data: dto.tagIds.map(tagId => ({ questionId: question.id, tagId })),
        skipDuplicates: true,
      });
    }

    return this.findOne(question.id);
  }

  async findAll(filter: FilterQuestionDto, user?: RequestUser) {
    const where: Prisma.QuestionWhereInput = {};

    if (user && user.role !== Role.SUPER_ADMIN) {
      const scopeFilter = await this.access.getQuestionWhereFilter(user.schoolId);
      Object.assign(where, scopeFilter);
    }

    if (filter.area)       where.area       = filter.area;
    if (filter.examType)   where.examType   = filter.examType;
    if (filter.difficulty) where.difficulty = filter.difficulty;
    if (filter.isActive !== undefined) where.isActive = filter.isActive;
    if (filter.topic)      where.topic      = { contains: filter.topic, mode: 'insensitive' };
    if (filter.subtopic)   where.subtopic   = { contains: filter.subtopic, mode: 'insensitive' };
    if (filter.competence) where.competence = { contains: filter.competence, mode: 'insensitive' };
    if (filter.component)  where.component  = { contains: filter.component, mode: 'insensitive' };
    if (filter.gradeLevel) where.gradeLevel = filter.gradeLevel;
    if (filter.year)       where.year       = filter.year;
    if (filter.sourceType) where.sourceType = filter.sourceType;
    if (filter.tagId)      where.tags       = { some: { tagId: filter.tagId } };
    if (filter.search) {
      where.enunciado = { contains: filter.search, mode: 'insensitive' };
    }

    const page  = Math.max(1, filter.page  ?? 1);
    const limit = Math.min(100, Math.max(1, filter.limit ?? 20));
    const skip  = (page - 1) * limit;

    const [total, questions] = await this.prisma.$transaction([
      this.prisma.question.count({ where }),
      this.prisma.question.findMany({
        where,
        include: QUESTION_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      data: questions,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, user?: RequestUser) {
    const question = await this.prisma.question.findUnique({
      where: { id },
      include: QUESTION_INCLUDE,
    });
    if (!question) throw new NotFoundException('Pregunta no encontrada');

    // ADMIN: solo puede ver sus propias preguntas o las globales
    if (user && user.role === Role.ADMIN) {
      if (!question.isGlobal && question.schoolId !== user.schoolId) {
        throw new ForbiddenException('No tienes acceso a esta pregunta');
      }
    }

    return question;
  }

  async update(id: string, dto: UpdateQuestionDto, user?: RequestUser) {
    const question = await this.findOne(id, user);

    // ADMIN: solo puede editar sus propias preguntas (no las globales)
    if (user && user.role === Role.ADMIN) {
      if (question.isGlobal || question.schoolId !== user.schoolId) {
        throw new ForbiddenException('No puedes editar esta pregunta');
      }
    }

    if (dto.options) {
      const correctOptions = dto.options.filter(o => o.isCorrect);
      const qType = (dto as any).questionType ?? question.questionType ?? QuestionType.SINGLE_CHOICE;
      if (qType === QuestionType.MULTIPLE_CHOICE) {
        if (correctOptions.length < 1) throw new BadRequestException('Debe haber al menos una opción correcta');
      } else {
        if (correctOptions.length !== 1) throw new BadRequestException('Debe haber exactamente una opción correcta');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      if (dto.options) {
        await tx.answerOption.deleteMany({ where: { questionId: id } });
      }

      await tx.question.update({
        where: { id },
        data: {
          ...(dto.enunciado   && { enunciado: dto.enunciado }),
          ...(dto.imageUrl    !== undefined && { imageUrl: dto.imageUrl }),
          ...(dto.contexto    !== undefined && { contexto: dto.contexto }),
          ...(dto.area        && { area: dto.area }),
          ...(dto.examType    && { examType: dto.examType }),
          ...(dto.difficulty  && { difficulty: dto.difficulty }),
          ...(dto.explicacion !== undefined && { explicacion: dto.explicacion }),
          ...(dto.topic       !== undefined && { topic: dto.topic }),
          ...(dto.subtopic    !== undefined && { subtopic: dto.subtopic }),
          ...(dto.competence  !== undefined && { competence: dto.competence }),
          ...(dto.component   !== undefined && { component: dto.component }),
          ...(dto.gradeLevel  !== undefined && { gradeLevel: dto.gradeLevel }),
          ...(dto.year        !== undefined && { year: dto.year }),
          ...(dto.sourceType  && { sourceType: dto.sourceType }),
          ...(dto.subject       !== undefined && { subject: dto.subject }),
          ...(dto.questionType  && { questionType: dto.questionType }),
          ...(dto.options && {
            options: {
              create: dto.options.map(o => ({
                letra: o.letra,
                texto: o.texto,
                imageUrl: o.imageUrl,
                isCorrect: o.isCorrect,
              })),
            },
          }),
        },
      });

      // Replace tags if provided
      if (dto.tagIds !== undefined) {
        await tx.questionTagging.deleteMany({ where: { questionId: id } });
        if (dto.tagIds.length > 0) {
          await tx.questionTagging.createMany({
            data: dto.tagIds.map(tagId => ({ questionId: id, tagId })),
            skipDuplicates: true,
          });
        }
      }
    });

    return this.findOne(id);
  }

  async remove(id: string, user?: RequestUser) {
    const question = await this.findOne(id, user);

    // ADMIN: solo puede eliminar sus propias preguntas (no las globales)
    if (user && user.role === Role.ADMIN) {
      if (question.isGlobal || question.schoolId !== user.schoolId) {
        throw new ForbiddenException('No puedes eliminar esta pregunta');
      }
    }

    const used = await this.prisma.simulacroQuestion.count({ where: { questionId: id } });
    if (used > 0) {
      throw new BadRequestException(
        `Esta pregunta está siendo usada en ${used} simulacro(s). Desactívala en su lugar.`
      );
    }
    await this.prisma.question.delete({ where: { id } });
    return { message: 'Pregunta eliminada' };
  }

  async toggleActive(id: string) {
    const question = await this.findOne(id);
    return this.prisma.question.update({
      where: { id },
      data: { isActive: !question.isActive },
      select: { id: true, isActive: true },
    });
  }

  async getStats(user?: RequestUser) {
    let scopeFilter: Prisma.QuestionWhereInput = {};
    if (user && user.role !== Role.SUPER_ADMIN) {
      scopeFilter = await this.access.getQuestionWhereFilter(user.schoolId);
    }

    const w = scopeFilter as any;
    const [total, active, byAreaRaw, byDifficultyRaw, byExamTypeRaw, bySourceTypeRaw, byTopicRaw] =
      await Promise.all([
        this.prisma.question.count({ where: scopeFilter }),
        this.prisma.question.count({ where: { ...scopeFilter, isActive: true } }),
        this.prisma.question.groupBy({ by: ['area'], where: w, _count: { _all: true } }),
        this.prisma.question.groupBy({ by: ['difficulty'], where: w, _count: { _all: true } }),
        this.prisma.question.groupBy({ by: ['examType'], where: w, _count: { _all: true } }),
        this.prisma.question.groupBy({ by: ['sourceType'], where: w, _count: { _all: true } }),
        this.prisma.question.groupBy({
          by: ['topic'],
          where: { ...w, topic: { not: null } },
          _count: { _all: true },
        }),
      ]);

    const byArea       = Object.fromEntries(byAreaRaw.map(r => [r.area, r._count._all]));
    const byDifficulty = Object.fromEntries(byDifficultyRaw.map(r => [r.difficulty, r._count._all]));
    const byExamType   = Object.fromEntries(byExamTypeRaw.map(r => [r.examType, r._count._all]));
    const bySourceType = Object.fromEntries(bySourceTypeRaw.map(r => [r.sourceType, r._count._all]));
    const byTopic      = Object.fromEntries(
      byTopicRaw.filter(r => r.topic).map(r => [r.topic!, r._count._all])
    );

    return { total, active, inactive: total - active, byArea, byDifficulty, byExamType, bySourceType, byTopic };
  }

  // Used by the generator to update analytics after a simulacro is generated
  async incrementTimesUsed(questionIds: string[]) {
    if (questionIds.length === 0) return;
    await this.prisma.$transaction(
      questionIds.map(id =>
        this.prisma.questionAnalytics.upsert({
          where: { questionId: id },
          create: { questionId: id, timesUsed: 1, lastUsedAt: new Date() },
          update: { timesUsed: { increment: 1 }, lastUsedAt: new Date() },
        })
      )
    );
  }

  // Distinct values for metadata filters (used in frontend dropdowns)
  async getMetadataOptions(user?: RequestUser) {
    let scopeFilter: Prisma.QuestionWhereInput = {};
    if (user && user.role !== Role.SUPER_ADMIN) {
      scopeFilter = await this.access.getQuestionWhereFilter(user.schoolId);
    }

    const [topics, competences, components, gradeLevels, years] = await this.prisma.$transaction([
      this.prisma.question.findMany({ where: { ...scopeFilter, topic: { not: null } }, select: { topic: true }, distinct: ['topic'] }),
      this.prisma.question.findMany({ where: { ...scopeFilter, competence: { not: null } }, select: { competence: true }, distinct: ['competence'] }),
      this.prisma.question.findMany({ where: { ...scopeFilter, component: { not: null } }, select: { component: true }, distinct: ['component'] }),
      this.prisma.question.findMany({ where: { ...scopeFilter, gradeLevel: { not: null } }, select: { gradeLevel: true }, distinct: ['gradeLevel'], orderBy: { gradeLevel: 'asc' } }),
      this.prisma.question.findMany({ where: { ...scopeFilter, year: { not: null } }, select: { year: true }, distinct: ['year'], orderBy: { year: 'desc' } }),
    ]);

    return {
      topics:      topics.map(r => r.topic),
      competences: competences.map(r => r.competence),
      components:  components.map(r => r.component),
      gradeLevels: gradeLevels.map(r => r.gradeLevel),
      years:       years.map(r => r.year),
    };
  }
}
