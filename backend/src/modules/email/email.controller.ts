import { Controller, Get, Query, UseGuards, NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { EmailService } from './email.service';

// Endpoint temporal para validar el SMTP en desarrollo.
// Para deshabilitarlo: ENABLE_EMAIL_TEST=false (o cualquier valor distinto a 'true')
// Para eliminarlo permanentemente: borrar este archivo y quitar EmailController de email.module.ts
@Controller('email')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Get('test')
  async testEmail(@Query('to') to: string) {
    const enabled = process.env.ENABLE_EMAIL_TEST === 'true'
      && process.env.NODE_ENV !== 'production';

    if (!enabled) {
      throw new NotFoundException();
    }

    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      throw new BadRequestException('Parámetro requerido: ?to=correo@ejemplo.com');
    }

    return this.emailService.sendTest(to);
  }
}
