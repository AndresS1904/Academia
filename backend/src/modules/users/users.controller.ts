import {
  Controller, Get, Post, Patch, Delete, Param, Body, Request, Query,
  UseGuards, UseInterceptors, UploadedFile, Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Response } from 'express';
import { UsersService } from './users.service';
import { UpdateUserStatusDto } from './dto/update-user.dto';
import { UpdateAdminDto } from './dto/admin.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class UsersController {
  constructor(private usersService: UsersService) {}

  // ── SUPER_ADMIN: gestión global de usuarios ──────────────────────────────

  @Roles(Role.SUPER_ADMIN)
  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.usersService.findAll(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 25,
      search ?? '',
    );
  }

  @Roles(Role.SUPER_ADMIN)
  @Get('admin/stats')
  getAdminStats(@Request() req: any) {
    return this.usersService.getAdminStats(req.user);
  }

  @Roles(Role.SUPER_ADMIN)
  @Post()
  createUser(@Body() dto: { email: string; firstName: string; lastName: string; password: string; role?: string }) {
    return this.usersService.createUser(dto);
  }

  @Roles(Role.SUPER_ADMIN)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Roles(Role.SUPER_ADMIN)
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateUserStatusDto, @Request() req: any) {
    return this.usersService.updateStatus(id, dto, req.user.id);
  }

  @Roles(Role.SUPER_ADMIN)
  @Patch(':id/request-password-change')
  requestPasswordChange(@Param('id') id: string) {
    return this.usersService.requestPasswordChange(id);
  }

  @Roles(Role.SUPER_ADMIN)
  @Patch(':id/admin')
  updateAdmin(@Param('id') id: string, @Body() dto: UpdateAdminDto) {
    return this.usersService.updateAdmin(id, dto);
  }

  @Roles(Role.SUPER_ADMIN)
  @Patch(':id/admin/reset-password')
  resetAdminPassword(@Param('id') id: string) {
    return this.usersService.resetAdminPassword(id);
  }

  @Roles(Role.SUPER_ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  // ── ADMIN: gestión de estudiantes del propio colegio ─────────────────────

  @Get('my-school/students')
  getMySchoolStudents(@Request() req: any) {
    return this.usersService.findBySchool(req.user.schoolId);
  }

  @Get('my-school/groups')
  getMySchoolGroups(@Request() req: any) {
    return this.usersService.findGroupsBySchool(req.user.schoolId);
  }

  @Post('my-school/students')
  createSchoolStudent(
    @Body() dto: {
      email: string;
      firstName: string;
      lastName: string;
      documento?: string;
      phone?: string;
      password?: string;
      groupId?: string;
    },
    @Request() req: any,
  ) {
    return this.usersService.createSchoolStudent(dto, req.user.schoolId);
  }

  @Patch('my-school/students/:id')
  updateSchoolStudent(
    @Param('id') id: string,
    @Body() dto: { firstName?: string; lastName?: string; email?: string; documento?: string; phone?: string; isActive?: boolean },
    @Request() req: any,
  ) {
    return this.usersService.updateSchoolStudent(id, dto, req.user.schoolId);
  }

  @Patch('my-school/students/:id/reset-password')
  resetStudentPassword(
    @Param('id') id: string,
    @Body('newPassword') newPassword: string,
    @Request() req: any,
  ) {
    return this.usersService.resetStudentPassword(id, newPassword, req.user.schoolId);
  }

  // ── Importación masiva ───────────────────────────────────────────────────

  @Get('my-school/import/template')
  downloadTemplate(@Res() res: Response) {
    const buffer = this.usersService.generateImportTemplate();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="plantilla_estudiantes.xlsx"');
    res.send(buffer);
  }

  @Post('my-school/import')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }))
  bulkImport(
    @UploadedFile() file: Express.Multer.File,
    @Body('groupId') groupId: string,
    @Request() req: any,
  ) {
    if (!file) throw new Error('No se recibió ningún archivo');
    return this.usersService.bulkImportStudents(
      file.buffer,
      req.user.schoolId,
      groupId || undefined,
    );
  }
}
