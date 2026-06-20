import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AccessService } from '../access/access.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { CreateSimulacroDto } from './dto/create-simulacro.dto';
import { AssignSimulacroDto } from './dto/assign-simulacro.dto';
import { SubmitSimulacroDto } from './dto/submit-simulacro.dto';
import { SaveAnswerDto } from './dto/save-answer.dto';
import { Difficulty, ExamType, Prisma, Role, SessionType, SimulacroType } from '@prisma/client';
import { CreateLibreSimulacroDto, LibreCreationMode } from './dto/create-libre-simulacro.dto';

/** Scale raw score to ICFES 300–500 range */
function scaleToIcfes(correct: number, total: number): number {
  if (total === 0) return 300;
  return Math.round(300 + (correct / total) * 200);
}

export type RequestUser = { id: string; role: Role; schoolId: string | null };

/** Fisher-Yates shuffle */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

@Injectable()
export class SimulacrosService {
  constructor(
    private prisma: PrismaService,
    private access: AccessService,
    private analytics: AnalyticsService,
  ) {}

  // ────────────────────────────────────────────────────────────
  //  CATÁLOGO PÚBLICO
  // ────────────────────────────────────────────────────────────

  /** Catálogo público: solo simulacros globales publicados */
  findAllCatalog() {
    return this.prisma.simulacro.findMany({
      where: { isPublished: true, isGlobal: true },
      select: {
        id: true, titulo: true, descripcion: true, examType: true,
        duracionMinutos: true, totalPreguntas: true,
        areasEvaluadas: true, color: true, emoji: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** Admin: todos (SUPER_ADMIN) o propios (cualquier estado) + licenciados globales (ADMIN) */
  async findAllForAdmin(user: RequestUser) {
    if (user.role === Role.SUPER_ADMIN) {
      return this.prisma.simulacro.findMany({
        include: {
          sessions: { orderBy: { order: 'asc' }, include: { sections: { orderBy: { order: 'asc' } } } },
          _count: { select: { assignments: true, attempts: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    // ADMIN: propios sin importar si están publicados + globales licenciados publicados
    const activeProductIds = await this.access.getActiveProductIds(user.schoolId);
    return this.prisma.simulacro.findMany({
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
      include: {
        _count: { select: { assignments: true, attempts: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAll() {
    return this.prisma.simulacro.findMany({
      include: {
        sessions: {
          orderBy: { order: 'asc' },
          include: {
            sections: { orderBy: { order: 'asc' } },
          },
        },
        _count: { select: { assignments: true, attempts: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, user?: RequestUser) {
    const sim = await this.prisma.simulacro.findUnique({
      where: { id },
      include: {
        sessions: {
          orderBy: { order: 'asc' },
          include: {
            sections: {
              orderBy: { order: 'asc' },
              include: {
                questions: {
                  orderBy: { order: 'asc' },
                  include: {
                    question: {
                      include: { options: { orderBy: { letra: 'asc' } } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!sim) throw new NotFoundException('Simulacro no encontrado');

    // ADMIN: solo puede ver los suyos o los globales
    if (user && user.role === Role.ADMIN) {
      if (!sim.isGlobal && sim.schoolId !== user.schoolId) {
        throw new ForbiddenException('No tienes acceso a este simulacro');
      }
    }

    return sim;
  }

  // ────────────────────────────────────────────────────────────
  //  PREGUNTAS PARA EL ESTUDIANTE (sin isCorrect)
  // ────────────────────────────────────────────────────────────

  async getQuestions(simulacroId: string, user?: RequestUser) {
    // ESTUDIANTE: debe tener asignación activa para ver las preguntas
    if (user && user.role === Role.ESTUDIANTE) {
      const assignment = await this.prisma.simulacroAssignment.findUnique({
        where: { userId_simulacroId: { userId: user.id, simulacroId } },
      });
      if (!assignment) {
        throw new ForbiddenException('No tienes acceso a este simulacro');
      }
    }

    const simulacro = await this.prisma.simulacro.findUnique({
      where: { id: simulacroId },
      include: {
        sessions: {
          orderBy: { order: 'asc' },
          include: {
            sections: {
              orderBy: { order: 'asc' },
              include: {
                questions: {
                  orderBy: { order: 'asc' },
                  include: {
                    question: {
                      select: {
                        id: true, area: true, contexto: true, enunciado: true, imageUrl: true,
                        options: {
                          select: { id: true, letra: true, texto: true, imageUrl: true },
                          orderBy: { letra: 'asc' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!simulacro) throw new NotFoundException('Simulacro no encontrado');

    // Aplanar preguntas manteniendo el orden sesión→sección→pregunta
    const questions = simulacro.sessions.flatMap(session =>
      session.sections.flatMap(section =>
        section.questions.map(sq => ({
          ...sq.question,
          sectionId: section.id,
          sessionId: session.id,
          sessionOrder: session.order,
          sessionType: session.type,
          sessionLabel: session.label,
          order: sq.order,
        }))
      )
    );

    return { simulacro, questions };
  }

  // ────────────────────────────────────────────────────────────
  //  CREACIÓN CON GENERACIÓN AUTOMÁTICA
  // ────────────────────────────────────────────────────────────

  async create(dto: CreateSimulacroDto, user?: RequestUser) {
    // Determinar filtro de acceso al banco de preguntas
    const questionAccessFilter = await this.access.getQuestionWhereFilter(user?.schoolId ?? null);

    // Pre-validar que hay suficientes preguntas antes de abrir la transacción
    for (const sessionConfig of dto.sessions) {
      for (const sectionConfig of sessionConfig.sections) {
        const available = await this.prisma.question.count({
          where: {
            ...questionAccessFilter,
            area: sectionConfig.area,
            examType: dto.examType,
            isActive: true,
            ...(sectionConfig.difficulty ? { difficulty: sectionConfig.difficulty } : {}),
          },
        });
        if (available < sectionConfig.questionCount) {
          throw new BadRequestException(
            `No hay suficientes preguntas accesibles de "${sectionConfig.area}" (${dto.examType}). ` +
            `Se necesitan ${sectionConfig.questionCount} pero solo hay ${available} disponibles.`
          );
        }
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const usedIds = new Set<string>();
      let totalPreguntas = 0;
      let totalDuracion = 0;
      const areasSet = new Set<string>();

      const isSuperAdmin = user?.role === Role.SUPER_ADMIN;
      const simulacro = await tx.simulacro.create({
        data: {
          titulo: dto.titulo,
          descripcion: dto.descripcion,
          examType: dto.examType,
          emoji: dto.emoji ?? '📝',
          color: dto.color ?? '#004aad',
          isPublished: dto.isPublished ?? false,
          schoolId: isSuperAdmin ? null : (user?.schoolId ?? null),
          isGlobal: isSuperAdmin,
        },
      });

      for (const sessionConfig of dto.sessions) {
        const sessionDuration = sessionConfig.sections.reduce((sum, s) => sum + s.duracionMinutos, 0);
        const session = await tx.simulacroSession.create({
          data: {
            simulacroId: simulacro.id,
            type: sessionConfig.type,
            label: sessionConfig.label,
            order: sessionConfig.order,
            instructions: sessionConfig.instructions ?? null,
            pauseMinutes: sessionConfig.pauseMinutes ?? 0,
            durationMinutes: sessionConfig.durationMinutes ?? sessionDuration,
          },
        });

        for (let sIdx = 0; sIdx < sessionConfig.sections.length; sIdx++) {
          const sectionConfig = sessionConfig.sections[sIdx];
          const section = await tx.simulacroSection.create({
            data: {
              sessionId: session.id,
              area: sectionConfig.area,
              order: sIdx + 1,
              questionCount: sectionConfig.questionCount,
              duracionMinutos: sectionConfig.duracionMinutos,
            },
          });

          // Selección aleatoria del banco (respetando filtro de acceso)
          const candidates = await tx.question.findMany({
            where: {
              ...questionAccessFilter,
              area: sectionConfig.area,
              examType: dto.examType,
              isActive: true,
              ...(usedIds.size > 0 ? { id: { notIn: [...usedIds] } } : {}),
              ...(sectionConfig.difficulty ? { difficulty: sectionConfig.difficulty } : {}),
            },
            select: { id: true },
          });

          const selected = shuffle(candidates).slice(0, sectionConfig.questionCount);

          await tx.simulacroQuestion.createMany({
            data: selected.map((q, i) => ({
              sectionId: section.id,
              questionId: q.id,
              order: i + 1,
            })),
          });

          selected.forEach(q => usedIds.add(q.id));
          totalPreguntas += sectionConfig.questionCount;
          totalDuracion += sectionConfig.duracionMinutos;
          areasSet.add(sectionConfig.area);
        }
      }

      // Actualizar campos denormalizados
      return tx.simulacro.update({
        where: { id: simulacro.id },
        data: {
          totalPreguntas,
          duracionMinutos: totalDuracion,
          areasEvaluadas: [...areasSet],
        },
        include: {
          sessions: {
            orderBy: { order: 'asc' },
            include: { sections: { orderBy: { order: 'asc' } } },
          },
        },
      });
    });
  }

  async update(id: string, data: {
    titulo?: string;
    descripcion?: string;
    isPublished?: boolean;
    emoji?: string;
    color?: string;
    scaledScoring?: boolean;
    allowBackNavigation?: boolean;
    showResultsImmediately?: boolean;
  }, user: RequestUser) {
    const sim = await this.findOne(id, user);

    if (user.role !== Role.SUPER_ADMIN) {
      if (sim.schoolId !== user.schoolId) {
        throw new ForbiddenException('No puedes editar un simulacro que no es tuyo');
      }
      if (sim.isGlobal) {
        throw new ForbiddenException('No puedes editar contenido global');
      }
    }

    return this.prisma.simulacro.update({ where: { id }, data });
  }

  // ────────────────────────────────────────────────────────────
  //  SIMULACRO LIBRE (Modo Práctica)
  // ────────────────────────────────────────────────────────────

  async createLibre(dto: CreateLibreSimulacroDto, user: RequestUser) {
    const isSuperAdmin = user.role === Role.SUPER_ADMIN;
    const schoolId = isSuperAdmin ? null : (user.schoolId ?? null);

    // Build question access filter
    const schoolFilter = schoolId
      ? { OR: [{ schoolId }, { isGlobal: true }] }
      : {};

    // ── Gather questions ──────────────────────────────────────
    let questionsByArea = new Map<string, string[]>(); // area → questionIds[]

    if (dto.mode === LibreCreationMode.MANUAL) {
      if (!dto.questionIds?.length) {
        throw new BadRequestException('Se requieren questionIds para modo manual');
      }
      const questions = await this.prisma.question.findMany({
        where: { id: { in: dto.questionIds }, isActive: true, ...schoolFilter },
        select: { id: true, area: true },
      });
      if (!questions.length) {
        throw new BadRequestException('No se encontraron preguntas válidas');
      }
      for (const q of questions) {
        if (!questionsByArea.has(q.area)) questionsByArea.set(q.area, []);
        questionsByArea.get(q.area)!.push(q.id);
      }
    } else {
      // AUTO mode
      if (!dto.autoConfig?.length) {
        throw new BadRequestException('Se requiere autoConfig para modo automático');
      }
      const usedIds = new Set<string>();
      for (const cfg of dto.autoConfig) {
        const where: any = {
          isActive: true,
          area: cfg.area,
          ...schoolFilter,
          ...(cfg.difficulty ? { difficulty: cfg.difficulty as Difficulty } : {}),
        };
        const candidates = await this.prisma.question.findMany({
          where,
          select: { id: true },
          orderBy: [
            { analytics: { timesUsed: 'asc' } },
            { analytics: { lastUsedAt: 'asc' } },
            { createdAt: 'asc' },
          ],
          take: cfg.count * 4,
        });
        const available = candidates.filter(q => !usedIds.has(q.id));
        const selected = shuffle(available).slice(0, cfg.count);
        if (!selected.length) continue;
        selected.forEach(q => usedIds.add(q.id));
        if (!questionsByArea.has(cfg.area)) questionsByArea.set(cfg.area, []);
        questionsByArea.get(cfg.area)!.push(...selected.map(q => q.id));
      }
    }

    if (!questionsByArea.size) {
      throw new BadRequestException('No se encontraron preguntas para crear el simulacro libre');
    }

    const totalPreguntas = Array.from(questionsByArea.values()).reduce((s, qs) => s + qs.length, 0);
    const areasEvaluadas = Array.from(questionsByArea.keys());

    // ── Persist in transaction ────────────────────────────────
    return this.prisma.$transaction(async (tx) => {
      const simulacro = await tx.simulacro.create({
        data: {
          titulo: dto.titulo,
          descripcion: dto.descripcion,
          examType: ExamType.ICFES,
          simulacroType: SimulacroType.LIBRE,
          schoolId,
          isGlobal: isSuperAdmin ? (dto.isGlobal ?? false) : false,
          duracionMinutos: dto.timeLimitMinutes,
          totalPreguntas,
          areasEvaluadas,
          emoji: dto.emoji ?? '⚡',
          color: dto.color ?? '#7c3aed',
          showResultsImmediately: dto.showResultsImmediately ?? true,
          allowBackNavigation: dto.allowBackNavigation ?? true,
          scaledScoring: false,
          isPublished: dto.isPublished ?? false,
        },
      });

      // One virtual session
      const session = await tx.simulacroSession.create({
        data: {
          simulacroId: simulacro.id,
          type: SessionType.MANANA,
          label: 'Simulacro',
          order: 1,
          instructions: dto.instructions ?? null,
          durationMinutes: dto.timeLimitMinutes,
          pauseMinutes: 0,
        },
      });

      // One section per area
      let sIdx = 1;
      for (const [area, qIds] of questionsByArea) {
        const section = await tx.simulacroSection.create({
          data: {
            sessionId: session.id,
            area,
            order: sIdx++,
            questionCount: qIds.length,
            duracionMinutos: Math.ceil(dto.timeLimitMinutes / questionsByArea.size),
          },
        });
        const shuffled = shuffle([...qIds]);
        await tx.simulacroQuestion.createMany({
          data: shuffled.map((qId, i) => ({ sectionId: section.id, questionId: qId, order: i + 1 })),
        });
      }

      return simulacro;
    });
  }

  async getQuestionBank(
    user: RequestUser,
    params: { area?: string; difficulty?: string; topic?: string; search?: string; page?: number; limit?: number },
  ) {
    const { area, difficulty, topic, search, page = 1, limit = 20 } = params;
    const schoolId = user.role === Role.ADMIN ? user.schoolId : null;

    const where: Prisma.QuestionWhereInput = { isActive: true };
    if (area) where.area = area;
    if (difficulty) where.difficulty = difficulty as Difficulty;
    if (topic) where.topic = { contains: topic, mode: 'insensitive' };
    if (search) where.enunciado = { contains: search, mode: 'insensitive' };
    if (schoolId) {
      (where as any).OR = [{ schoolId }, { isGlobal: true }];
    }

    const [total, questions] = await Promise.all([
      this.prisma.question.count({ where }),
      this.prisma.question.findMany({
        where,
        select: {
          id: true, enunciado: true, area: true, difficulty: true,
          topic: true, subtopic: true, year: true, sourceType: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
    ]);

    return { total, page, limit, questions };
  }

  async remove(id: string, user: RequestUser) {
    const sim = await this.findOne(id);

    if (user.role !== Role.SUPER_ADMIN) {
      if (sim.schoolId !== user.schoolId) {
        throw new ForbiddenException('No puedes eliminar un simulacro que no es tuyo');
      }
      if (sim.isGlobal) {
        throw new ForbiddenException('No puedes eliminar contenido global');
      }
    }

    await this.prisma.simulacro.delete({ where: { id } });
    return { message: 'Simulacro eliminado' };
  }

  async togglePublish(id: string, user: RequestUser) {
    const sim = await this.findOne(id, user);

    if (user.role !== Role.SUPER_ADMIN) {
      if (sim.schoolId !== user.schoolId || sim.isGlobal) {
        throw new ForbiddenException('No puedes publicar/despublicar este simulacro');
      }
    }

    return this.prisma.simulacro.update({
      where: { id },
      data: { isPublished: !sim.isPublished },
      select: { id: true, isPublished: true },
    });
  }

  // ────────────────────────────────────────────────────────────
  //  ASIGNACIONES
  // ────────────────────────────────────────────────────────────

  /** ADMIN: asignaciones del colegio, opcionalmente filtradas por userId */
  findAssignmentsBySchool(schoolId: string, userId?: string) {
    return this.prisma.simulacroAssignment.findMany({
      where: {
        user: { schoolId },
        ...(userId ? { userId } : {}),
      },
      include: {
        simulacro: { select: { id: true, titulo: true, emoji: true, color: true } },
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { assignedAt: 'desc' },
    });
  }

  findByUser(userId: string) {
    return this.prisma.simulacroAssignment.findMany({
      where: { userId },
      include: {
        simulacro: {
          select: {
            id: true, titulo: true, descripcion: true, examType: true,
            duracionMinutos: true, totalPreguntas: true,
            areasEvaluadas: true, color: true, emoji: true,
            allowBackNavigation: true, showResultsImmediately: true,
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });
  }

  async assign(dto: AssignSimulacroDto, admin: RequestUser) {
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const simulacro = await this.prisma.simulacro.findUnique({ where: { id: dto.simulacroId } });
    if (!simulacro) throw new NotFoundException('Simulacro no encontrado');

    // ADMIN: el estudiante debe pertenecer al mismo colegio
    if (admin.role !== Role.SUPER_ADMIN) {
      if (user.schoolId !== admin.schoolId) {
        throw new ForbiddenException('Solo puedes asignar simulacros a estudiantes de tu colegio');
      }
      // Validar que el colegio del admin tiene acceso a este simulacro
      const canAccess = await this.access.canAccessSimulacro(admin.schoolId, dto.simulacroId);
      if (!canAccess) throw new ForbiddenException('Tu colegio no tiene licencia para este simulacro');
    }

    const existing = await this.prisma.simulacroAssignment.findUnique({
      where: { userId_simulacroId: { userId: dto.userId, simulacroId: dto.simulacroId } },
    });
    if (existing) throw new ConflictException('El simulacro ya está asignado a este usuario');

    return this.prisma.simulacroAssignment.create({
      data: {
        userId: dto.userId,
        simulacroId: dto.simulacroId,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        instructions: dto.instructions ?? null,
      },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        simulacro: { select: { id: true, titulo: true } },
      },
    });
  }

  async removeAssignment(id: string, user: RequestUser) {
    const existing = await this.prisma.simulacroAssignment.findUnique({
      where: { id },
      include: { user: { select: { schoolId: true } } },
    });
    if (!existing) throw new NotFoundException('Asignación no encontrada');

    // ADMIN: solo puede eliminar asignaciones de estudiantes de su colegio
    if (user.role !== Role.SUPER_ADMIN) {
      if (existing.user.schoolId !== user.schoolId) {
        throw new ForbiddenException('No tienes acceso a esta asignación');
      }
    }

    await this.prisma.simulacroAssignment.delete({ where: { id } });
    return { message: 'Asignación eliminada' };
  }

  async resetAttempts(assignmentId: string, user: RequestUser) {
    const assignment = await this.prisma.simulacroAssignment.findUnique({
      where: { id: assignmentId },
      include: { user: { select: { schoolId: true } } },
    });
    if (!assignment) throw new NotFoundException('Asignación no encontrada');

    if (user.role !== Role.SUPER_ADMIN && assignment.user.schoolId !== user.schoolId) {
      throw new ForbiddenException('No tienes acceso a esta asignación');
    }

    const { count } = await this.prisma.simulacroAttempt.deleteMany({
      where: { assignmentId },
    });

    await this.prisma.simulacroAssignment.update({
      where: { id: assignmentId },
      data: { score: null, completedAt: null },
    });

    return { message: 'Simulacro reiniciado', attemptsDeleted: count };
  }

  // ────────────────────────────────────────────────────────────
  //  INTENTOS
  // ────────────────────────────────────────────────────────────

  async startAttempt(assignmentId: string, userId: string) {
    const assignment = await this.prisma.simulacroAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        simulacro: {
          include: {
            sessions: {
              orderBy: { order: 'asc' },
              include: { sections: { orderBy: { order: 'asc' } } },
            },
          },
        },
      },
    });

    if (!assignment) throw new NotFoundException('Asignación no encontrada');
    if (assignment.userId !== userId) throw new ForbiddenException('No autorizado');
    if (assignment.completedAt) {
      throw new BadRequestException('Este simulacro ya fue completado. Consulta tus resultados.');
    }

    // Resume an existing IN_PROGRESS attempt (check if it's still valid)
    const existingAttempt = await this.prisma.simulacroAttempt.findFirst({
      where: { assignmentId, status: 'IN_PROGRESS' },
      include: { answers: { select: { questionId: true, selectedOptionId: true, isFlagged: true } } },
    });

    if (existingAttempt) {
      // Check if expired
      if (existingAttempt.expiresAt && existingAttempt.expiresAt <= new Date()) {
        await this.autoExpireAttempt(existingAttempt.id, assignment.simulacroId, assignment.id);
        throw new BadRequestException('El tiempo del simulacro ha expirado.');
      }
      return {
        attempt: existingAttempt,
        resumed: true,
        timeRemainingSeconds: this.calcTimeRemaining(existingAttempt.expiresAt),
        sessions: assignment.simulacro.sessions,
      };
    }

    // Compute expiresAt from simulacro duration (seconds)
    const durationSec = (assignment.simulacro.duracionMinutos ?? 0) * 60;
    const now = new Date();
    const expiresAt = durationSec > 0 ? new Date(now.getTime() + durationSec * 1000) : null;

    const attempt = await this.prisma.simulacroAttempt.create({
      data: {
        assignmentId,
        userId,
        simulacroId: assignment.simulacroId,
        status: 'IN_PROGRESS',
        expiresAt,
        currentSessionOrder: 1,
        sessionStartedAt: now,
      },
    });

    return {
      attempt,
      resumed: false,
      timeRemainingSeconds: this.calcTimeRemaining(expiresAt),
      sessions: assignment.simulacro.sessions,
    };
  }

  /** POST /attempts/:id/advance-session — transición a la siguiente sesión */
  async advanceSession(attemptId: string, userId: string) {
    const attempt = await this.prisma.simulacroAttempt.findUnique({
      where: { id: attemptId },
      include: {
        simulacro: {
          include: {
            sessions: {
              orderBy: { order: 'asc' },
              include: { sections: { orderBy: { order: 'asc' } } },
            },
          },
        },
      },
    });

    if (!attempt) throw new NotFoundException('Intento no encontrado');
    if (attempt.userId !== userId) throw new ForbiddenException('No autorizado');
    if (attempt.status !== 'IN_PROGRESS') throw new BadRequestException('El intento no está activo');
    if (attempt.expiresAt && attempt.expiresAt <= new Date()) {
      throw new BadRequestException('El tiempo del simulacro ha expirado.');
    }

    const sessions = attempt.simulacro.sessions;
    const nextOrder = attempt.currentSessionOrder + 1;
    const nextSession = sessions.find(s => s.order === nextOrder);

    if (!nextSession) throw new BadRequestException('No hay más sesiones disponibles');

    const updated = await this.prisma.simulacroAttempt.update({
      where: { id: attemptId },
      data: {
        currentSessionOrder: nextOrder,
        sessionStartedAt: new Date(),
      },
    });

    return {
      currentSessionOrder: updated.currentSessionOrder,
      sessionStartedAt: updated.sessionStartedAt,
      nextSession,
      timeRemainingSeconds: this.calcTimeRemaining(attempt.expiresAt),
    };
  }

  private calcTimeRemaining(expiresAt: Date | null): number | null {
    if (!expiresAt) return null;
    return Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
  }

  private async autoExpireAttempt(attemptId: string, simulacroId: string, assignmentId: string) {
    // Score with answers saved so far
    const attempt = await this.prisma.simulacroAttempt.findUnique({
      where: { id: attemptId },
      include: { answers: true },
    });
    if (!attempt || attempt.status !== 'IN_PROGRESS') return;

    const simulacroQuestions = await this.prisma.simulacroQuestion.findMany({
      where: { section: { session: { simulacroId } } },
      include: { question: { include: { options: { where: { isCorrect: true }, select: { id: true, questionId: true } } } } },
    });

    const correctMap = new Map<string, string>(
      simulacroQuestions.filter(sq => sq.question.options.length > 0)
        .map(sq => [sq.questionId, sq.question.options[0].id])
    );

    const correctas = attempt.answers.filter(a => a.selectedOptionId && a.selectedOptionId === correctMap.get(a.questionId)).length;
    const total = correctMap.size;
    const score = total > 0 ? Math.round((correctas / total) * 100) : 0;

    await this.prisma.$transaction([
      this.prisma.simulacroAttempt.update({
        where: { id: attemptId },
        data: { status: 'EXPIRED', completedAt: new Date(), score },
      }),
      this.prisma.simulacroAssignment.update({
        where: { id: assignmentId },
        data: { score, completedAt: new Date() },
      }),
    ]);
  }

  /** GET /attempts/:id/status — returns time remaining and current state */
  async getAttemptStatus(attemptId: string, userId: string) {
    const attempt = await this.prisma.simulacroAttempt.findUnique({
      where: { id: attemptId },
      include: { answers: { select: { questionId: true, selectedOptionId: true, isFlagged: true } } },
    });

    if (!attempt) throw new NotFoundException('Intento no encontrado');
    if (attempt.userId !== userId) throw new ForbiddenException('No autorizado');

    // Auto-expire if time is up
    if (attempt.status === 'IN_PROGRESS' && attempt.expiresAt && attempt.expiresAt <= new Date()) {
      await this.autoExpireAttempt(attemptId, attempt.simulacroId, attempt.assignmentId);
      return {
        status: 'EXPIRED',
        timeRemainingSeconds: 0,
        answeredCount: attempt.answers.filter(a => a.selectedOptionId).length,
        flaggedQuestionIds: attempt.answers.filter(a => a.isFlagged).map(a => a.questionId),
        answers: attempt.answers,
      };
    }

    return {
      status: attempt.status,
      timeRemainingSeconds: this.calcTimeRemaining(attempt.expiresAt),
      answeredCount: attempt.answers.filter(a => a.selectedOptionId).length,
      flaggedQuestionIds: attempt.answers.filter(a => a.isFlagged).map(a => a.questionId),
      answers: attempt.answers,
    };
  }

  /** POST /attempts/:id/save-answer — incremental answer save */
  async saveAnswer(attemptId: string, userId: string, dto: SaveAnswerDto) {
    const attempt = await this.prisma.simulacroAttempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt) throw new NotFoundException('Intento no encontrado');
    if (attempt.userId !== userId) throw new ForbiddenException('No autorizado');
    if (attempt.status !== 'IN_PROGRESS') {
      throw new BadRequestException('El intento ya no está activo');
    }

    // Server-side expiry check
    if (attempt.expiresAt && attempt.expiresAt <= new Date()) {
      await this.autoExpireAttempt(attemptId, attempt.simulacroId, attempt.assignmentId);
      throw new ForbiddenException('El tiempo del simulacro ha expirado. Tus respuestas guardadas han sido enviadas automáticamente.');
    }

    await this.prisma.simulacroAnswer.upsert({
      where: { attemptId_questionId: { attemptId, questionId: dto.questionId } },
      create: {
        attemptId,
        questionId: dto.questionId,
        selectedOptionId: dto.selectedOptionId ?? null,
        isFlagged: dto.isFlagged ?? false,
        timeSpentSeconds: dto.timeSpentSeconds ?? null,
        isCorrect: false,
        savedAt: new Date(),
      },
      update: {
        selectedOptionId: dto.selectedOptionId ?? null,
        isFlagged: dto.isFlagged ?? false,
        timeSpentSeconds: dto.timeSpentSeconds ?? null,
        savedAt: new Date(),
      },
    });

    return { saved: true, timeRemainingSeconds: this.calcTimeRemaining(attempt.expiresAt) };
  }

  /** POST /attempts/:id/tab-switch — record suspicious tab switch */
  async recordTabSwitch(attemptId: string, userId: string) {
    const attempt = await this.prisma.simulacroAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt) throw new NotFoundException('Intento no encontrado');
    if (attempt.userId !== userId) throw new ForbiddenException('No autorizado');
    if (attempt.status !== 'IN_PROGRESS') return { tabSwitchCount: attempt.tabSwitchCount };

    const updated = await this.prisma.simulacroAttempt.update({
      where: { id: attemptId },
      data: { tabSwitchCount: { increment: 1 } },
      select: { tabSwitchCount: true },
    });
    return { tabSwitchCount: updated.tabSwitchCount };
  }

  async submitAttempt(attemptId: string, userId: string, dto: SubmitSimulacroDto) {
    const attempt = await this.prisma.simulacroAttempt.findUnique({
      where: { id: attemptId },
      include: {
        assignment: true,
        simulacro: { select: { scaledScoring: true } },
      },
    });

    if (!attempt) throw new NotFoundException('Intento no encontrado');
    if (attempt.userId !== userId) throw new ForbiddenException('No autorizado');
    if (attempt.status === 'COMPLETED' || attempt.completedAt) {
      throw new BadRequestException('Este intento ya fue enviado');
    }

    // If time expired, auto-expire instead of accepting new answers
    if (attempt.expiresAt && attempt.expiresAt <= new Date()) {
      await this.autoExpireAttempt(attemptId, attempt.simulacroId, attempt.assignmentId);
      const expired = await this.prisma.simulacroAttempt.findUnique({ where: { id: attemptId } });
      return { score: expired?.score ?? 0, correctas: 0, totalPreguntas: 0, expired: true };
    }

    // Obtener respuestas correctas + área de cada pregunta
    const simulacroQuestions = await this.prisma.simulacroQuestion.findMany({
      where: { section: { session: { simulacroId: attempt.simulacroId } } },
      include: {
        question: {
          select: {
            id: true,
            area: true,
            options: { where: { isCorrect: true }, select: { id: true } },
          },
        },
        section: { select: { area: true } },
      },
    });

    // Build maps: questionId → correctOptionId, questionId → area
    const correctMap = new Map<string, string>();
    const areaMap = new Map<string, string>();
    for (const sq of simulacroQuestions) {
      if (sq.question.options.length > 0) {
        correctMap.set(sq.questionId, sq.question.options[0].id);
      }
      areaMap.set(sq.questionId, sq.question.area || sq.section.area);
    }

    // Merge incremental saves with submitted answers (submitted overrides)
    const savedAnswers = await this.prisma.simulacroAnswer.findMany({
      where: { attemptId },
    });
    const savedMap = new Map(savedAnswers.map(a => [a.questionId, a.selectedOptionId]));
    for (const a of dto.answers) {
      savedMap.set(a.questionId, a.selectedOptionId);
    }

    // Score all answers
    const answerRecords: { attemptId: string; questionId: string; selectedOptionId: string | null; isCorrect: boolean; area: string }[] = [];
    for (const [questionId, selectedOptionId] of savedMap) {
      const correctOptionId = correctMap.get(questionId);
      if (!correctOptionId) continue;
      answerRecords.push({
        attemptId,
        questionId,
        selectedOptionId: selectedOptionId ?? null,
        isCorrect: !!selectedOptionId && selectedOptionId === correctOptionId,
        area: areaMap.get(questionId) ?? 'Sin área',
      });
    }

    const totalPreguntas = correctMap.size;
    const correctas = answerRecords.filter(a => a.isCorrect).length;
    const score = totalPreguntas > 0 ? Math.round((correctas / totalPreguntas) * 100) : 0;

    // Per-subject breakdown
    const byArea = new Map<string, { raw: number; total: number }>();
    for (const [qId] of correctMap) {
      const area = areaMap.get(qId) ?? 'Sin área';
      if (!byArea.has(area)) byArea.set(area, { raw: 0, total: 0 });
      byArea.get(area)!.total++;
    }
    for (const a of answerRecords) {
      if (a.isCorrect) {
        if (!byArea.has(a.area)) byArea.set(a.area, { raw: 0, total: 0 });
        byArea.get(a.area)!.raw++;
      }
    }

    const subjectScores = [...byArea.entries()].map(([area, { raw, total }]) => ({
      area,
      raw,
      total,
      scaled: attempt.simulacro.scaledScoring ? scaleToIcfes(raw, total) : null,
    }));

    await this.prisma.$transaction([
      ...answerRecords.map(a =>
        this.prisma.simulacroAnswer.upsert({
          where: { attemptId_questionId: { attemptId: a.attemptId, questionId: a.questionId } },
          create: { attemptId: a.attemptId, questionId: a.questionId, selectedOptionId: a.selectedOptionId, isCorrect: a.isCorrect },
          update: { selectedOptionId: a.selectedOptionId, isCorrect: a.isCorrect },
        })
      ),
      ...subjectScores.map(s =>
        this.prisma.simulacroSubjectScore.upsert({
          where: { attemptId_area: { attemptId, area: s.area } },
          create: { attemptId, area: s.area, raw: s.raw, total: s.total, scaled: s.scaled },
          update: { raw: s.raw, total: s.total, scaled: s.scaled },
        })
      ),
      this.prisma.simulacroAttempt.update({
        where: { id: attemptId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          score,
          tiempoUsadoSeg: dto.tiempoUsadoSeg ?? null,
        },
      }),
      this.prisma.simulacroAssignment.update({
        where: { id: attempt.assignmentId },
        data: { score, completedAt: new Date() },
      }),
    ]);

    // Fire-and-forget analytics computation — never blocks the response
    this.analytics.computeAttemptSnapshot(attemptId).catch(() => {});

    return { score, correctas, totalPreguntas, subjectScores };
  }

  async getAttemptResults(attemptId: string, userId: string) {
    const attempt = await this.prisma.simulacroAttempt.findUnique({
      where: { id: attemptId },
      include: {
        simulacro: { select: { id: true, titulo: true, color: true, areasEvaluadas: true, examType: true, scaledScoring: true } },
        answers: {
          include: {
            question: { include: { options: { orderBy: { letra: 'asc' } } } },
            selectedOption: { select: { id: true, letra: true, texto: true } },
          },
        },
        subjectScores: { orderBy: { area: 'asc' } },
      },
    });

    if (!attempt) throw new NotFoundException('Intento no encontrado');
    if (attempt.userId !== userId) throw new ForbiddenException('No autorizado');
    if (!attempt.completedAt) throw new BadRequestException('El intento aún no ha sido completado');

    const porArea: Record<string, { correctas: number; total: number; scaled?: number | null }> = {};
    for (const s of attempt.subjectScores) {
      porArea[s.area] = { correctas: s.raw, total: s.total, scaled: s.scaled };
    }
    // Fallback: compute from answers if no subject scores saved
    if (attempt.subjectScores.length === 0) {
      for (const a of attempt.answers) {
        const area = a.question.area;
        if (!porArea[area]) porArea[area] = { correctas: 0, total: 0 };
        porArea[area].total++;
        if (a.isCorrect) porArea[area].correctas++;
      }
    }

    return {
      attemptId,
      status: attempt.status,
      score: attempt.score,
      tiempoUsadoSeg: attempt.tiempoUsadoSeg,
      completedAt: attempt.completedAt,
      tabSwitchCount: attempt.tabSwitchCount,
      simulacro: attempt.simulacro,
      porArea,
      preguntas: attempt.answers.map(a => ({
        questionId: a.questionId,
        area: a.question.area,
        contexto: a.question.contexto,
        enunciado: a.question.enunciado,
        imageUrl: a.question.imageUrl,
        explicacion: (a.question as any).explicacion,
        selectedOptionId: a.selectedOptionId,
        selectedLetra: a.selectedOption?.letra ?? null,
        isCorrect: a.isCorrect,
        isFlagged: a.isFlagged,
        options: a.question.options.map(o => ({
          id: o.id, letra: o.letra, texto: o.texto, imageUrl: o.imageUrl, isCorrect: o.isCorrect,
        })),
      })),
    };
  }
}
