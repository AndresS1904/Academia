import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, Request, Res,
  UseGuards, UseInterceptors, UploadedFile,
  BadRequestException, Header,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Response } from 'express';
import { GroupsService } from './groups.service';
import { CreateGroupDto, UpdateGroupDto, AssignCourseDto, AssignSimulacroDto } from './dto/create-group.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('groups')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class GroupsController {
  constructor(private groups: GroupsService) {}

  // ── Rutas estáticas PRIMERO (antes que :id) ─────────────────────

  @Get()
  findAll(@Request() req: any) {
    if (!req.user.schoolId) return [];
    return this.groups.findAll(req.user.schoolId);
  }

  @Post()
  create(@Body() dto: CreateGroupDto, @Request() req: any) {
    if (!req.user.schoolId) throw new BadRequestException('Sin colegio asignado');
    return this.groups.create(dto, req.user.schoolId);
  }

  /** Descarga plantilla Excel — debe ir ANTES de GET :id */
  @Get('import/template')
  downloadTemplate(@Res() res: Response) {
    const buffer = this.groups.getTemplate();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="plantilla_estudiantes.xlsx"',
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  // ── Rutas paramétricas ─────────────────────────────────────────

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    if (!req.user.schoolId) throw new BadRequestException('Sin colegio asignado');
    return this.groups.findOne(id, req.user.schoolId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateGroupDto, @Request() req: any) {
    if (!req.user.schoolId) throw new BadRequestException('Sin colegio asignado');
    return this.groups.update(id, dto, req.user.schoolId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    if (!req.user.schoolId) throw new BadRequestException('Sin colegio asignado');
    return this.groups.remove(id, req.user.schoolId);
  }

  // ── Miembros ───────────────────────────────────────────────────

  @Get(':id/members')
  findMembers(@Param('id') id: string, @Request() req: any) {
    if (!req.user.schoolId) return [];
    return this.groups.findMembers(id, req.user.schoolId);
  }

  @Post(':id/members')
  addMember(@Param('id') id: string, @Body() body: { userId: string }, @Request() req: any) {
    if (!req.user.schoolId) throw new BadRequestException('Sin colegio asignado');
    return this.groups.addMember(id, body.userId, req.user.schoolId);
  }

  @Delete(':id/members/:userId')
  removeMember(@Param('id') id: string, @Param('userId') userId: string, @Request() req: any) {
    if (!req.user.schoolId) throw new BadRequestException('Sin colegio asignado');
    return this.groups.removeMember(id, userId, req.user.schoolId);
  }

  // ── Importación masiva ─────────────────────────────────────────

  @Post(':id/import')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: (_req, file, cb) => {
        const allowed = /\.(xlsx|xls|csv)$/i;
        if (!file.originalname.match(allowed)) {
          return cb(new BadRequestException('Solo se permiten archivos .xlsx, .xls o .csv'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  importStudents(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('updateExisting') updateExisting: string,
    @Request() req: any,
  ) {
    if (!file) throw new BadRequestException('No se recibió ningún archivo');
    if (!req.user.schoolId) throw new BadRequestException('Sin colegio asignado');
    return this.groups.importStudents(id, file, updateExisting === 'true', req.user.schoolId);
  }

  // ── Analytics ─────────────────────────────────────────────────

  @Get(':id/analytics')
  getAnalytics(@Param('id') id: string, @Request() req: any) {
    if (!req.user.schoolId) throw new BadRequestException('Sin colegio asignado');
    return this.groups.getGroupAnalytics(id, req.user.schoolId);
  }

  // ── Exportar CSV ───────────────────────────────────────────────

  @Get(':id/export/students')
  async exportStudents(@Param('id') id: string, @Request() req: any, @Res() res: Response) {
    if (!req.user.schoolId) throw new BadRequestException('Sin colegio asignado');
    const csv = await this.groups.exportStudentsCsv(id, req.user.schoolId);
    (res as any).set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="estudiantes_grupo.csv"',
    });
    (res as any).send(csv);
  }

  @Get(':id/export/simulacros')
  async exportSimulacros(@Param('id') id: string, @Request() req: any, @Res() res: Response) {
    if (!req.user.schoolId) throw new BadRequestException('Sin colegio asignado');
    const csv = await this.groups.exportSimulacrosCsv(id, req.user.schoolId);
    (res as any).set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="resultados_simulacros.csv"',
    });
    (res as any).send(csv);
  }

  // ── Asignación masiva ──────────────────────────────────────────

  @Post(':id/assign-course')
  assignCourse(@Param('id') id: string, @Body() dto: AssignCourseDto, @Request() req: any) {
    if (!req.user.schoolId) throw new BadRequestException('Sin colegio asignado');
    return this.groups.assignCourse(id, dto.courseId, req.user.schoolId);
  }

  @Post(':id/assign-simulacro')
  assignSimulacro(@Param('id') id: string, @Body() dto: AssignSimulacroDto, @Request() req: any) {
    if (!req.user.schoolId) throw new BadRequestException('Sin colegio asignado');
    return this.groups.assignSimulacro(id, dto, req.user.schoolId);
  }
}
