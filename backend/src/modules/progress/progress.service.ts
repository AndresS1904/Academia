import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProgressService {
  constructor(private prisma: PrismaService) {}

  /** Marca un recurso como visto. Automáticamente completa el enrollment si es necesario. */
  async markResourceWatched(userId: string, resourceId: string) {
    // Verificar que el recurso existe y obtener el courseId
    const resource = await this.prisma.resource.findUnique({
      where: { id: resourceId },
      include: { lesson: { select: { courseId: true } } },
    });
    if (!resource) throw new NotFoundException('Recurso no encontrado');

    const courseId = resource.lesson.courseId;

    // Verificar que el estudiante está inscrito
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (!enrollment) throw new ForbiddenException('No estás inscrito en este curso');

    // Upsert del progreso (idempotente)
    await this.prisma.resourceProgress.upsert({
      where: { userId_resourceId: { userId, resourceId } },
      create: { userId, resourceId },
      update: { watchedAt: new Date() },
    });

    // Verificar si todos los recursos del curso están vistos
    const totalResources = await this.prisma.resource.count({
      where: { lesson: { courseId } },
    });

    const watchedResources = await this.prisma.resourceProgress.count({
      where: {
        userId,
        resource: { lesson: { courseId } },
      },
    });

    // Si completó todo y el enrollment no está marcado como COMPLETED → actualizarlo
    if (totalResources > 0 && watchedResources >= totalResources) {
      if (enrollment.status !== 'COMPLETED') {
        await this.prisma.enrollment.update({
          where: { userId_courseId: { userId, courseId } },
          data: { status: 'COMPLETED' },
        });
      }
    }

    return {
      resourceId,
      courseId,
      watched: watchedResources,
      total: totalResources,
      completed: watchedResources >= totalResources,
    };
  }

  /** Progreso de un curso para un usuario */
  async getCourseProgress(userId: string, courseId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (!enrollment) throw new ForbiddenException('No estás inscrito en este curso');

    const totalResources = await this.prisma.resource.count({
      where: { lesson: { courseId } },
    });

    const watchedIds = await this.prisma.resourceProgress.findMany({
      where: { userId, resource: { lesson: { courseId } } },
      select: { resourceId: true, watchedAt: true },
    });

    return {
      courseId,
      enrollmentStatus: enrollment.status,
      total: totalResources,
      watched: watchedIds.length,
      percentage: totalResources > 0 ? Math.round((watchedIds.length / totalResources) * 100) : 0,
      watchedResourceIds: watchedIds.map((w) => w.resourceId),
    };
  }
}
