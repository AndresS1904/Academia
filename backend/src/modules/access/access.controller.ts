import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { AccessService } from './access.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('access')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AccessController {
  constructor(private accessService: AccessService) {}

  /** Cursos visibles para el colegio del ADMIN (propios + licenciados globales) */
  @Get('catalog/courses')
  @Roles(Role.ADMIN)
  getCatalogCourses(@Request() req: { user: { schoolId: string } }) {
    return this.accessService.getVisibleCourses(req.user.schoolId);
  }

  /** Simulacros visibles para el colegio del ADMIN (propios + licenciados globales) */
  @Get('catalog/simulacros')
  @Roles(Role.ADMIN)
  getCatalogSimulacros(@Request() req: { user: { schoolId: string } }) {
    return this.accessService.getVisibleSimulacros(req.user.schoolId);
  }
}
