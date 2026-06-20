import {
  Controller, Get, Post, Put, Body, Param, Query, Request, UseGuards,
} from '@nestjs/common';
import { AntiFraudService } from './anti-fraud.service';
import { LogEventDto } from './dto/log-event.dto';
import { UpsertSecurityConfigDto } from './dto/upsert-config.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('anti-fraud')
@UseGuards(JwtAuthGuard)
export class AntiFraudController {
  constructor(private service: AntiFraudService) {}

  // ── Config (ADMIN only) ──────────────────────────────────────────────────────

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Put('config')
  upsertConfig(@Body() dto: UpsertSecurityConfigDto) {
    return this.service.upsertConfig(dto);
  }

  @Get('config/:evaluationType/:evaluationId')
  getConfig(
    @Param('evaluationType') evaluationType: string,
    @Param('evaluationId')   evaluationId: string,
  ) {
    return this.service.getConfig(evaluationType, evaluationId);
  }

  // ── Log event (ESTUDIANTE during exam) ───────────────────────────────────────

  @Post('log')
  logEvent(
    @Body() dto: LogEventDto,
    @Request() req: { user: { id: string; schoolId: string | null } },
  ) {
    return this.service.logEvent(dto, req.user.id, req.user.schoolId ?? null);
  }

  // ── Get my attempt status ────────────────────────────────────────────────────

  @Get('attempts/:attemptId/status')
  getMyStatus(
    @Param('attemptId') attemptId: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.service.getAttemptStatus(attemptId, req.user.id);
  }

  // ── Admin: logs list ─────────────────────────────────────────────────────────

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Get('logs')
  getLogs(
    @Request() req: { user: any },
    @Query('page')           page?: string,
    @Query('limit')          limit?: string,
    @Query('attemptId')      attemptId?: string,
    @Query('userId')         userId?: string,
    @Query('evaluationId')   evaluationId?: string,
    @Query('severity')       severity?: string,
    @Query('eventType')      eventType?: string,
  ) {
    return this.service.getLogsForAdmin(req.user, {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
      attemptId, userId, evaluationId, severity, eventType,
    });
  }

  // ── Admin: security statuses ─────────────────────────────────────────────────

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Get('statuses')
  getStatuses(
    @Request() req: { user: any },
    @Query('evaluationId')   evaluationId?: string,
    @Query('evaluationType') evaluationType?: string,
    @Query('page')           page?: string,
    @Query('limit')          limit?: string,
  ) {
    return this.service.getSecurityStatuses(req.user, {
      evaluationId, evaluationType,
      page:  page  ? Number(page)  : 1,
      limit: limit ? Number(limit) : 50,
    });
  }

  // ── Admin: review ────────────────────────────────────────────────────────────

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Post('attempts/:attemptId/review')
  reviewAttempt(
    @Param('attemptId') attemptId: string,
    @Body('notes') notes: string,
    @Request() req: { user: any },
  ) {
    return this.service.reviewAttempt(attemptId, req.user, notes ?? '');
  }
}
