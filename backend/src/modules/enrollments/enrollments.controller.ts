import { Controller, Get, Post, Patch, Param, Body, Request, Query, UseGuards } from '@nestjs/common';
import { EnrollmentsService } from './enrollments.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('enrollments')
@UseGuards(JwtAuthGuard)
export class EnrollmentsController {
  constructor(private enrollmentsService: EnrollmentsService) {}

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Request() req?: any,
  ) {
    return this.enrollmentsService.findAll(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 25,
      search ?? '',
      req?.user,
    );
  }

  @Get('me')
  findMine(@Request() req: any) {
    return this.enrollmentsService.findByUser(req.user.id);
  }

  /** Auto-inscripción del propio estudiante */
  @Post()
  create(@Request() req: any, @Body() dto: CreateEnrollmentDto) {
    return this.enrollmentsService.create(req.user.id, dto, req.user);
  }

  /** ADMIN inscribe a un estudiante en un curso */
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Post('admin/assign')
  adminAssign(
    @Body() body: { courseId: string; studentId: string },
    @Request() req: any,
  ) {
    return this.enrollmentsService.adminAssign(body.courseId, body.studentId, req.user);
  }

  @Patch(':courseId/complete')
  complete(@Param('courseId') courseId: string, @Request() req: any) {
    return this.enrollmentsService.complete(req.user.id, courseId);
  }
}
