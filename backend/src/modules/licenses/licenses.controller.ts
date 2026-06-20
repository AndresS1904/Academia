import { Controller, Get, Post, Patch, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { LicensesService } from './licenses.service';
import { CreateLicenseDto } from './dto/create-license.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('licenses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LicensesController {
  constructor(private licensesService: LicensesService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN)
  create(
    @Body() dto: CreateLicenseDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.licensesService.create(dto, req.user.id);
  }

  @Get()
  @Roles(Role.SUPER_ADMIN)
  findAll(@Query('schoolId') schoolId?: string) {
    return this.licensesService.findAll(schoolId);
  }

  // ADMIN sees their own school's licenses
  @Get('my-school')
  @Roles(Role.ADMIN)
  findMine(@Request() req: { user: { schoolId: string } }) {
    return this.licensesService.findAll(req.user.schoolId);
  }

  @Patch(':id/revoke')
  @Roles(Role.SUPER_ADMIN)
  revoke(@Param('id') id: string) {
    return this.licensesService.revoke(id);
  }

  @Post('expire-overdue')
  @Roles(Role.SUPER_ADMIN)
  expireOverdue() {
    return this.licensesService.expireOverdue();
  }
}
