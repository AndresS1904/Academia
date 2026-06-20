import { Controller, Get, Param, Res, UseGuards, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';
import { existsSync } from 'fs';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

/**
 * Sirve archivos de /uploads/resources/* con protección JWT.
 * Solo usuarios autenticados pueden acceder a recursos privados.
 *
 * Ruta pública original (/uploads/resources) fue eliminada de main.ts.
 */
@Controller('uploads/resources')
@UseGuards(JwtAuthGuard)
export class UploadsServeController {
  @Get('*')
  serveResource(@Param('0') filePath: string, @Res() res: Response) {
    // Sanitize path: prevent directory traversal
    const sanitized = filePath.replace(/\.\./g, '').replace(/\\/g, '/');
    const absolutePath = join(process.cwd(), 'uploads', 'resources', sanitized);

    if (!existsSync(absolutePath)) {
      throw new NotFoundException('Archivo no encontrado');
    }

    // Verify the resolved path is still inside the uploads/resources directory
    const resourcesRoot = join(process.cwd(), 'uploads', 'resources');
    if (!absolutePath.startsWith(resourcesRoot)) {
      throw new NotFoundException('Archivo no encontrado');
    }

    return res.sendFile(absolutePath);
  }
}
