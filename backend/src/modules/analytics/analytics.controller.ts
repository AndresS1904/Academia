import { Controller, Get, Patch, Param, Request, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private service: AnalyticsService) {}

  // ── Student: own dashboard ─────────────────────────────────────────────
  @Roles(Role.ESTUDIANTE)
  @Get('me')
  getMyDashboard(@Request() req: any) {
    return this.service.getStudentDashboard(req.user.id, req.user);
  }

  // ── Student: own profile ───────────────────────────────────────────────
  @Roles(Role.ESTUDIANTE)
  @Get('me/profile')
  getMyProfile(@Request() req: any) {
    return this.service.getStudentProfile(req.user.id, req.user);
  }

  // ── Student: dismiss recommendation ───────────────────────────────────
  @Roles(Role.ESTUDIANTE)
  @Patch('recommendations/:id/dismiss')
  dismissRecommendation(@Param('id') id: string, @Request() req: any) {
    return this.service.dismissRecommendation(id, req.user.id);
  }

  // ── Student: mark alerts read ──────────────────────────────────────────
  @Roles(Role.ESTUDIANTE)
  @Patch('alerts/read')
  markAlertsRead(@Request() req: any) {
    return this.service.markAlertsRead(req.user.id);
  }

  // ── Admin: school dashboard ────────────────────────────────────────────
  @Roles(Role.ADMIN)
  @Get('school')
  getSchoolDashboard(@Request() req: any) {
    return this.service.getSchoolDashboard(req.user.schoolId, req.user);
  }

  // ── Admin: student detail ──────────────────────────────────────────────
  @Roles(Role.ADMIN)
  @Get('school/students/:id')
  getStudentDetail(@Param('id') id: string, @Request() req: any) {
    return this.service.getStudentDetailForAdmin(id, req.user.schoolId);
  }

  // ── SUPER_ADMIN: global metrics ────────────────────────────────────────
  @Roles(Role.SUPER_ADMIN)
  @Get('global')
  getGlobalMetrics() {
    return this.service.getGlobalMetrics();
  }
}
