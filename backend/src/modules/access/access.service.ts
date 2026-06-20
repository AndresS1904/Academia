import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LicensesService } from '../licenses/licenses.service';

@Injectable()
export class AccessService {
  constructor(
    private prisma: PrismaService,
    private licenses: LicensesService,
  ) {}

  async canAccessCourse(schoolId: string | null, courseId: string): Promise<boolean> {
    if (!schoolId) return true; // SUPER_ADMIN (schoolId=null handled at role level)

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { schoolId: true, isGlobal: true, products: { select: { id: true } } },
    });
    if (!course) return false;

    // Own content
    if (course.schoolId === schoolId) return true;

    // Global: check license
    if (course.isGlobal) {
      const productIds = course.products.map(p => p.id);
      return this.licenses.hasActiveLicense(schoolId, productIds);
    }

    return false;
  }

  async canAccessSimulacro(schoolId: string | null, simulacroId: string): Promise<boolean> {
    if (!schoolId) return true;

    const sim = await this.prisma.simulacro.findUnique({
      where: { id: simulacroId },
      select: { schoolId: true, isGlobal: true, products: { select: { id: true } } },
    });
    if (!sim) return false;

    if (sim.schoolId === schoolId) return true;

    if (sim.isGlobal) {
      const productIds = sim.products.map(p => p.id);
      return this.licenses.hasActiveLicense(schoolId, productIds);
    }

    return false;
  }

  /**
   * Returns WHERE filter for questions a school can use when generating a simulacro.
   * Includes: own questions + global questions if they have a QUESTION_BANK license.
   */
  async getQuestionWhereFilter(schoolId: string | null) {
    if (!schoolId) {
      // SUPER_ADMIN: all questions
      return {};
    }

    const qbProducts = await this.prisma.product.findMany({
      where: { type: 'QUESTION_BANK', isActive: true },
      select: { id: true },
    });
    const hasGlobalBank = await this.licenses.hasActiveLicense(
      schoolId,
      qbProducts.map(p => p.id),
    );

    return {
      OR: [
        { schoolId },
        ...(hasGlobalBank ? [{ isGlobal: true }] : []),
      ],
    };
  }

  /** Proxy para usar en otros servicios sin inyectar LicensesService directamente */
  getActiveProductIds(schoolId: string): Promise<string[]> {
    return this.licenses.getActiveProductIds(schoolId);
  }

  /**
   * Catalog: courses visible to a school (own + licensed global)
   */
  async getVisibleCourses(schoolId: string) {
    const activeProductIds = await this.licenses.getActiveProductIds(schoolId);

    return this.prisma.course.findMany({
      where: {
        isPublished: true,
        OR: [
          { schoolId },
          {
            isGlobal: true,
            products: { some: { id: { in: activeProductIds } } },
          },
        ],
      },
      include: { _count: { select: { lessons: true, enrollments: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Catalog: simulacros visible to a school (own + licensed global)
   */
  async getVisibleSimulacros(schoolId: string) {
    const activeProductIds = await this.licenses.getActiveProductIds(schoolId);

    return this.prisma.simulacro.findMany({
      where: {
        isPublished: true,
        OR: [
          { schoolId },
          {
            isGlobal: true,
            products: { some: { id: { in: activeProductIds } } },
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
