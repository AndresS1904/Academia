import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FraudEventType, FraudSeverity, FraudRiskLevel, Role } from '@prisma/client';
import { LogEventDto } from './dto/log-event.dto';
import { UpsertSecurityConfigDto } from './dto/upsert-config.dto';

// ─── Score weights per event ──────────────────────────────────────────────────
const EVENT_WEIGHTS: Record<FraudEventType, { score: number; severity: FraudSeverity; isViolation: boolean }> = {
  FULLSCREEN_EXIT:      { score: 10, severity: FraudSeverity.MEDIUM,   isViolation: true  },
  TAB_SWITCH:           { score: 15, severity: FraudSeverity.MEDIUM,   isViolation: true  },
  WINDOW_BLUR:          { score:  5, severity: FraudSeverity.LOW,      isViolation: false },
  COPY_ATTEMPT:         { score: 10, severity: FraudSeverity.LOW,      isViolation: false },
  PASTE_ATTEMPT:        { score: 10, severity: FraudSeverity.LOW,      isViolation: false },
  RIGHTCLICK_ATTEMPT:   { score:  3, severity: FraudSeverity.LOW,      isViolation: false },
  KEYBOARD_SHORTCUT:    { score:  5, severity: FraudSeverity.LOW,      isViolation: false },
  WEBCAM_DISCONNECT:    { score: 30, severity: FraudSeverity.HIGH,     isViolation: true  },
  WEBCAM_NO_FACE:       { score: 20, severity: FraudSeverity.HIGH,     isViolation: true  },
  WEBCAM_MULTIPLE_FACES:{ score: 25, severity: FraudSeverity.HIGH,     isViolation: true  },
  AUTO_SUBMIT_FRAUD:    { score: 50, severity: FraudSeverity.CRITICAL, isViolation: true  },
};

function calcRiskLevel(score: number): FraudRiskLevel {
  if (score === 0)   return FraudRiskLevel.CLEAN;
  if (score <= 15)   return FraudRiskLevel.LOW;
  if (score <= 40)   return FraudRiskLevel.MEDIUM;
  if (score <= 80)   return FraudRiskLevel.HIGH;
  return FraudRiskLevel.CRITICAL;
}

export type RequestUser = { id: string; role: Role; schoolId: string | null };

@Injectable()
export class AntiFraudService {
  constructor(private prisma: PrismaService) {}

  // ─── Config ──────────────────────────────────────────────────────────────────

  async upsertConfig(dto: UpsertSecurityConfigDto) {
    const { evaluationType, evaluationId, ...data } = dto;
    return this.prisma.evaluationSecurityConfig.upsert({
      where: { evaluationType_evaluationId: { evaluationType, evaluationId } },
      create: { evaluationType, evaluationId, ...data },
      update: data,
    });
  }

  async getConfig(evaluationType: string, evaluationId: string) {
    return this.prisma.evaluationSecurityConfig.findUnique({
      where: { evaluationType_evaluationId: { evaluationType, evaluationId } },
    });
  }

  // ─── Log event ───────────────────────────────────────────────────────────────

  async logEvent(dto: LogEventDto, userId: string, schoolId: string | null) {
    // Validar que el intento pertenece al usuario que reporta
    const attempt = await this.prisma.simulacroAttempt.findUnique({
      where: { id: dto.attemptId },
      select: { userId: true },
    });
    if (!attempt || attempt.userId !== userId) {
      throw new ForbiddenException('No autorizado para reportar eventos en este intento');
    }

    const weight = EVENT_WEIGHTS[dto.eventType];
    const now = new Date();

    // Create log (server timestamp — never trust client)
    await this.prisma.antiFraudLog.create({
      data: {
        userId,
        schoolId,
        evaluationType: dto.evaluationType,
        evaluationId:  dto.evaluationId,
        attemptId:     dto.attemptId,
        eventType:     dto.eventType,
        severity:      weight.severity,
        scoreContribution: weight.score,
        metadata:      (dto.metadata ?? null) as any,
        timestamp:     now,
        clientTimestamp: dto.clientTimestamp ? new Date(dto.clientTimestamp) : null,
      },
    });

    // Upsert security status (accumulate counters)
    const counterUpdate: Record<string, unknown> = {
      fraudScore:   { increment: weight.score },
      lastEventAt:  now,
    };
    if (weight.isViolation) counterUpdate.violationCount = { increment: 1 };

    switch (dto.eventType) {
      case FraudEventType.FULLSCREEN_EXIT:
        counterUpdate.fullscreenExits = { increment: 1 }; break;
      case FraudEventType.TAB_SWITCH:
        counterUpdate.tabSwitches = { increment: 1 }; break;
      case FraudEventType.COPY_ATTEMPT:
      case FraudEventType.PASTE_ATTEMPT:
        counterUpdate.copyAttempts = { increment: 1 }; break;
      case FraudEventType.WEBCAM_DISCONNECT:
      case FraudEventType.WEBCAM_NO_FACE:
      case FraudEventType.WEBCAM_MULTIPLE_FACES:
        counterUpdate.webcamEvents = { increment: 1 }; break;
      case FraudEventType.AUTO_SUBMIT_FRAUD:
        counterUpdate.autoSubmitted = true; break;
    }

    // Upsert + riskLevel recalculation in one atomic transaction
    const updatedStatus = await this.prisma.$transaction(async (tx) => {
      const status = await tx.attemptSecurityStatus.upsert({
        where: { attemptId: dto.attemptId },
        create: {
          attemptId:     dto.attemptId,
          evaluationType: dto.evaluationType,
          evaluationId:  dto.evaluationId,
          userId,
          schoolId,
          fraudScore:    weight.score,
          riskLevel:     calcRiskLevel(weight.score),
          violationCount: weight.isViolation ? 1 : 0,
          fullscreenExits: dto.eventType === FraudEventType.FULLSCREEN_EXIT ? 1 : 0,
          tabSwitches:    dto.eventType === FraudEventType.TAB_SWITCH ? 1 : 0,
          copyAttempts:   ([FraudEventType.COPY_ATTEMPT, FraudEventType.PASTE_ATTEMPT] as FraudEventType[]).includes(dto.eventType) ? 1 : 0,
          webcamEvents:   ([FraudEventType.WEBCAM_DISCONNECT, FraudEventType.WEBCAM_NO_FACE, FraudEventType.WEBCAM_MULTIPLE_FACES] as FraudEventType[]).includes(dto.eventType) ? 1 : 0,
          lastEventAt: now,
        },
        update: counterUpdate,
      });

      // Recalculate risk level based on current (updated) fraudScore
      return tx.attemptSecurityStatus.update({
        where: { attemptId: dto.attemptId },
        data: { riskLevel: calcRiskLevel(status.fraudScore) },
      });
    });

    // Check if should auto-submit
    const config = await this.getConfig(dto.evaluationType, dto.evaluationId);
    const shouldAutoSubmit =
      config?.autoSubmitOnFraud &&
      updatedStatus.violationCount >= (config?.maxViolations ?? 3);

    return {
      fraudScore:    updatedStatus.fraudScore,
      riskLevel:     updatedStatus.riskLevel,
      violationCount: updatedStatus.violationCount,
      maxViolations: config?.maxViolations ?? 3,
      shouldAutoSubmit,
    };
  }

  // ─── Status ──────────────────────────────────────────────────────────────────

  async getAttemptStatus(attemptId: string, userId: string) {
    const status = await this.prisma.attemptSecurityStatus.findUnique({
      where: { attemptId },
    });
    if (!status) return { attemptId, fraudScore: 0, riskLevel: 'CLEAN', violationCount: 0 };
    if (status.userId !== userId) throw new ForbiddenException();
    return status;
  }

  // ─── Admin: logs list ─────────────────────────────────────────────────────────

  async getLogsForAdmin(
    user: RequestUser,
    filters: {
      page?: number;
      limit?: number;
      attemptId?: string;
      userId?: string;
      evaluationId?: string;
      severity?: string;
      eventType?: string;
    },
  ) {
    const page  = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, filters.limit ?? 50);
    const skip  = (page - 1) * limit;

    const where: any = {};
    if (user.role !== Role.SUPER_ADMIN && user.schoolId) {
      where.schoolId = user.schoolId;
    }
    if (filters.attemptId)   where.attemptId   = filters.attemptId;
    if (filters.userId)      where.userId      = filters.userId;
    if (filters.evaluationId) where.evaluationId = filters.evaluationId;
    if (filters.severity)    where.severity    = filters.severity;
    if (filters.eventType)   where.eventType   = filters.eventType;

    const [data, total] = await Promise.all([
      this.prisma.antiFraudLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { timestamp: 'desc' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
      this.prisma.antiFraudLog.count({ where }),
    ]);

    return { data, total, page, pages: Math.ceil(total / limit) };
  }

  // ─── Admin: security statuses ─────────────────────────────────────────────────

  async getSecurityStatuses(
    user: RequestUser,
    filters: { evaluationId?: string; evaluationType?: string; page?: number; limit?: number },
  ) {
    const page  = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, filters.limit ?? 50);
    const skip  = (page - 1) * limit;

    const where: any = {};
    if (user.role !== Role.SUPER_ADMIN && user.schoolId) {
      where.schoolId = user.schoolId;
    }
    if (filters.evaluationId)   where.evaluationId   = filters.evaluationId;
    if (filters.evaluationType) where.evaluationType = filters.evaluationType;

    const [data, total] = await Promise.all([
      this.prisma.attemptSecurityStatus.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fraudScore: 'desc' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
      this.prisma.attemptSecurityStatus.count({ where }),
    ]);

    return { data, total, page, pages: Math.ceil(total / limit) };
  }

  // ─── Admin: review attempt ───────────────────────────────────────────────────

  async reviewAttempt(attemptId: string, reviewer: RequestUser, notes: string) {
    return this.prisma.attemptSecurityStatus.update({
      where: { attemptId },
      data: {
        reviewedBy:  reviewer.id,
        reviewedAt:  new Date(),
        reviewNotes: notes,
      },
    });
  }
}
