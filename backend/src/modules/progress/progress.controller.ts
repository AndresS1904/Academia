import { Controller, Post, Get, Param, Request, UseGuards } from '@nestjs/common';
import { ProgressService } from './progress.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('progress')
@UseGuards(JwtAuthGuard)
export class ProgressController {
  constructor(private progressService: ProgressService) {}

  /**
   * POST /progress/resource/:resourceId
   * Marca un recurso como visto por el usuario autenticado.
   * Automáticamente completa el enrollment si todos los recursos están vistos.
   */
  @Post('resource/:resourceId')
  markWatched(@Param('resourceId') resourceId: string, @Request() req: any) {
    return this.progressService.markResourceWatched(req.user.id, resourceId);
  }

  /**
   * GET /progress/course/:courseId
   * Retorna el progreso del usuario en un curso específico.
   */
  @Get('course/:courseId')
  getCourseProgress(@Param('courseId') courseId: string, @Request() req: any) {
    return this.progressService.getCourseProgress(req.user.id, courseId);
  }
}
