import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { SimulacrosService } from './simulacros.service';
import { CreateSimulacroDto } from './dto/create-simulacro.dto';
import { CreateLibreSimulacroDto } from './dto/create-libre-simulacro.dto';
import { AssignSimulacroDto } from './dto/assign-simulacro.dto';
import { SubmitSimulacroDto } from './dto/submit-simulacro.dto';
import { SaveAnswerDto } from './dto/save-answer.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Role } from '@prisma/client';

@Controller('simulacros')
@UseGuards(JwtAuthGuard)
export class SimulacrosController {
  constructor(private simulacrosService: SimulacrosService) {}

  // ── Catálogo público ─────────────────────────────────────────
  @Public()
  @Get('catalog')
  getCatalog() {
    return this.simulacrosService.findAllCatalog();
  }

  // ── Admin: CRUD simulacros ────────────────────────────────────
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  create(@Body() dto: CreateSimulacroDto, @Request() req: { user: any }) {
    return this.simulacrosService.create(dto, req.user);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Get('admin/all')
  findAll(@Request() req: { user: any }) {
    return this.simulacrosService.findAllForAdmin(req.user);
  }

  // ── Simulacro Libre (Modo Práctica) ──────────────────────────
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Post('libre')
  createLibre(@Body() dto: CreateLibreSimulacroDto, @Request() req: { user: any }) {
    return this.simulacrosService.createLibre(dto, req.user);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Get('questions/bank')
  getQuestionBank(
    @Request() req: { user: any },
    @Query('area') area?: string,
    @Query('difficulty') difficulty?: string,
    @Query('topic') topic?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.simulacrosService.getQuestionBank(req.user, {
      area,
      difficulty,
      topic,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? Math.min(parseInt(limit, 10), 50) : 20,
    });
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Get('admin/:id')
  findOne(@Param('id') id: string, @Request() req: { user: any }) {
    return this.simulacrosService.findOne(id, req.user);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('admin/:id')
  update(@Param('id') id: string, @Body() data: {
    titulo?: string;
    descripcion?: string;
    isPublished?: boolean;
    emoji?: string;
    color?: string;
    scaledScoring?: boolean;
    allowBackNavigation?: boolean;
    showResultsImmediately?: boolean;
  }, @Request() req: { user: any }) {
    return this.simulacrosService.update(id, data, req.user);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Delete('admin/:id')
  remove(@Param('id') id: string, @Request() req: { user: any }) {
    return this.simulacrosService.remove(id, req.user);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('admin/:id/publish')
  togglePublish(@Param('id') id: string, @Request() req: { user: any }) {
    return this.simulacrosService.togglePublish(id, req.user);
  }

  // ── Preguntas para estudiante (sin isCorrect) ─────────────────
  @Get(':simulacroId/questions')
  getQuestions(@Param('simulacroId') simulacroId: string, @Request() req: { user: any }) {
    return this.simulacrosService.getQuestions(simulacroId, req.user);
  }

  // ── Asignaciones ──────────────────────────────────────────────
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Get('assignments')
  findAllAssignments(@Request() req: { user: any }, @Query('userId') userId?: string) {
    if (!req.user.schoolId) return [];
    return this.simulacrosService.findAssignmentsBySchool(req.user.schoolId, userId);
  }

  @Get('me')
  findMine(@Request() req: { user: { id: string } }) {
    return this.simulacrosService.findByUser(req.user.id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Post('assign')
  assign(@Body() dto: AssignSimulacroDto, @Request() req: { user: any }) {
    return this.simulacrosService.assign(dto, req.user);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Delete('assignments/:id')
  removeAssignment(@Param('id') id: string, @Request() req: { user: any }) {
    return this.simulacrosService.removeAssignment(id, req.user);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Post('assignments/:id/reset')
  resetAttempts(@Param('id') id: string, @Request() req: { user: any }) {
    return this.simulacrosService.resetAttempts(id, req.user);
  }

  // ── Intentos ──────────────────────────────────────────────────
  @Post('assignments/:assignmentId/start')
  startAttempt(@Param('assignmentId') assignmentId: string, @Request() req: { user: { id: string } }) {
    return this.simulacrosService.startAttempt(assignmentId, req.user.id);
  }

  @Post('attempts/:attemptId/submit')
  submitAttempt(
    @Param('attemptId') attemptId: string,
    @Request() req: { user: { id: string } },
    @Body() dto: SubmitSimulacroDto,
  ) {
    return this.simulacrosService.submitAttempt(attemptId, req.user.id, dto);
  }

  @Get('attempts/:attemptId/status')
  getAttemptStatus(@Param('attemptId') attemptId: string, @Request() req: { user: { id: string } }) {
    return this.simulacrosService.getAttemptStatus(attemptId, req.user.id);
  }

  @Post('attempts/:attemptId/save-answer')
  saveAnswer(
    @Param('attemptId') attemptId: string,
    @Request() req: { user: { id: string } },
    @Body() dto: SaveAnswerDto,
  ) {
    return this.simulacrosService.saveAnswer(attemptId, req.user.id, dto);
  }

  @Post('attempts/:attemptId/tab-switch')
  recordTabSwitch(@Param('attemptId') attemptId: string, @Request() req: { user: { id: string } }) {
    return this.simulacrosService.recordTabSwitch(attemptId, req.user.id);
  }

  @Post('attempts/:attemptId/advance-session')
  advanceSession(@Param('attemptId') attemptId: string, @Request() req: { user: { id: string } }) {
    return this.simulacrosService.advanceSession(attemptId, req.user.id);
  }

  @Get('attempts/:attemptId/results')
  getResults(@Param('attemptId') attemptId: string, @Request() req: { user: { id: string } }) {
    return this.simulacrosService.getAttemptResults(attemptId, req.user.id);
  }
}
