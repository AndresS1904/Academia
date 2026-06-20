import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QuestionsService } from '../questions/questions.service';
import { GenerateSimulacroDto } from './dto/generate-simulacro.dto';
import { ExamType, Role } from '@prisma/client';

export type RequestUser = { id: string; role: Role; schoolId: string | null };

export interface SelectedQuestion {
  questionId: string;
  order: number;
}

export interface SectionResult {
  area: string;
  durationMinutes: number;
  order: number;
  questions: SelectedQuestion[];
}

export interface SessionResult {
  type: string;
  label: string;
  order: number;
  durationMinutes: number;
  sections: SectionResult[];
}

@Injectable()
export class GeneratorService {
  constructor(
    private prisma: PrismaService,
    private questionsService: QuestionsService,
  ) {}

  async generate(dto: GenerateSimulacroDto, user: RequestUser) {
    const isSuperAdmin = user.role === Role.SUPER_ADMIN;

    // Load template with all rules
    const template = await this.prisma.simulacroTemplate.findUnique({
      where: { id: dto.templateId },
      include: {
        sessions: {
          orderBy: { order: 'asc' },
          include: {
            sections: {
              orderBy: { order: 'asc' },
              include: { rules: true },
            },
          },
        },
      },
    });
    if (!template) throw new NotFoundException('Plantilla no encontrada');

    // Determine schoolId for the simulacro
    const targetSchoolId = dto.schoolId ?? (isSuperAdmin ? null : user.schoolId);

    // Process each session → section → rules
    const sessionResults: SessionResult[] = [];
    const allSelectedIds: string[] = [];

    for (const session of template.sessions) {
      const sectionResults: SectionResult[] = [];

      for (const section of session.sections) {
        const selectedForSection: SelectedQuestion[] = [];
        const usedInSection = new Set<string>();

        for (const rule of section.rules) {
          const questions = await this.selectQuestions({
            rule,
            area: section.area,
            examType: template.examType,
            schoolId: targetSchoolId,
            isSuperAdmin,
            alreadyUsed: [...allSelectedIds, ...usedInSection],
            count: rule.count,
          });

          for (const q of questions) {
            usedInSection.add(q.questionId);
            allSelectedIds.push(q.questionId);
            selectedForSection.push({
              questionId: q.questionId,
              order: selectedForSection.length + 1,
            });
          }
        }

        sectionResults.push({
          area: section.area,
          durationMinutes: section.durationMinutes,
          order: section.order,
          questions: selectedForSection,
        });
      }

      sessionResults.push({
        type: session.type,
        label: session.label,
        order: session.order,
        durationMinutes: session.durationMinutes,
        sections: sectionResults,
      });
    }

    // Calculate totals
    const totalPreguntas = allSelectedIds.length;
    const duracionMinutos = sessionResults.reduce((acc, s) => acc + s.durationMinutes, 0);
    const areasEvaluadas = [...new Set(
      sessionResults.flatMap(s => s.sections.map(sec => sec.area))
    )];

    if (dto.preview) {
      // Return preview without persisting
      return {
        preview: true,
        titulo: dto.titulo,
        examType: template.examType,
        totalPreguntas,
        duracionMinutos,
        areasEvaluadas,
        sessions: sessionResults,
      };
    }

    // Persist simulacro
    const simulacro = await this.prisma.simulacro.create({
      data: {
        titulo: dto.titulo,
        descripcion: dto.descripcion,
        examType: template.examType,
        totalPreguntas,
        duracionMinutos,
        areasEvaluadas,
        schoolId: targetSchoolId,
        isGlobal: dto.isGlobal ?? false,
        isPublished: false,
        sessions: {
          create: sessionResults.map(sess => ({
            type: sess.type as any,
            label: sess.label,
            order: sess.order,
            sections: {
              create: sess.sections.map(sec => ({
                area: sec.area,
                order: sec.order,
                questionCount: sec.questions.length,
                duracionMinutos: sec.durationMinutes,
                questions: {
                  create: sec.questions.map(q => ({
                    questionId: q.questionId,
                    order: q.order,
                  })),
                },
              })),
            },
          })),
        },
      },
      include: {
        sessions: {
          include: {
            sections: {
              include: { questions: true },
            },
          },
        },
      },
    });

    // Update analytics (fire-and-forget)
    this.questionsService.incrementTimesUsed(allSelectedIds).catch(() => {});

    return simulacro;
  }

  private async selectQuestions(params: {
    rule: any;
    area: string;
    examType: ExamType;
    schoolId: string | null;
    isSuperAdmin: boolean;
    alreadyUsed: string[];
    count: number;
  }): Promise<{ questionId: string }[]> {
    const { rule, area, examType, schoolId, isSuperAdmin, alreadyUsed, count } = params;

    // Build base filter
    const where: any = {
      isActive: true,
      area,
      examType,
    };

    // Scope: global questions + school questions
    if (!isSuperAdmin) {
      where.OR = [
        { isGlobal: true },
        { schoolId },
      ];
    }

    if (rule.difficulty) where.difficulty = rule.difficulty;
    if (rule.topic)      where.topic      = rule.topic;
    if (rule.subtopic)   where.subtopic   = rule.subtopic;
    if (rule.competence) where.competence = rule.competence;
    if (rule.component)  where.component  = rule.component;
    if (rule.gradeLevel) where.gradeLevel = rule.gradeLevel;
    if (rule.sourceType) where.sourceType = rule.sourceType;

    if (rule.tagIds && rule.tagIds.length > 0) {
      where.tags = { some: { tagId: { in: rule.tagIds } } };
    }

    // Exclude recently used questions
    if (rule.excludeRecentDays > 0) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - rule.excludeRecentDays);
      where.analytics = {
        OR: [
          { lastUsedAt: null },
          { lastUsedAt: { lt: cutoff } },
        ],
      };
    }

    // LRU selection: order by timesUsed asc, then lastUsedAt asc (least recently used first)
    const candidates = await this.prisma.question.findMany({
      where,
      select: {
        id: true,
        analytics: { select: { timesUsed: true, lastUsedAt: true } },
      },
      orderBy: [
        { analytics: { timesUsed: 'asc' } },
        { analytics: { lastUsedAt: 'asc' } },
        { createdAt: 'asc' },
      ],
    });

    // Filter out questions already selected in this generation run
    const alreadyUsedSet = new Set(alreadyUsed);
    const filtered = candidates.filter(q => !alreadyUsedSet.has(q.id));

    if (filtered.length < count) {
      // Soft fallback: relax constraints, pick from all available
      // (don't throw — just take what's available)
      const fallbackCount = count - filtered.length;
      const fallbackWhere: any = { isActive: true, area, examType };
      if (!isSuperAdmin) {
        fallbackWhere.OR = [{ isGlobal: true }, { schoolId }];
      }
      const fallback = await this.prisma.question.findMany({
        where: { ...fallbackWhere, id: { notIn: [...alreadyUsed, ...filtered.map(f => f.id)] } },
        select: { id: true },
        take: fallbackCount,
      });
      return [...filtered.slice(0, count), ...fallback].map(q => ({ questionId: q.id }));
    }

    return filtered.slice(0, count).map(q => ({ questionId: q.id }));
  }
}
