import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLicenseDto } from './dto/create-license.dto';

@Injectable()
export class LicensesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateLicenseDto, grantedById: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId, isActive: true },
    });
    if (!product) throw new NotFoundException('Producto no encontrado o inactivo');

    const school = await this.prisma.school.findUnique({ where: { id: dto.schoolId } });
    if (!school) throw new NotFoundException('Colegio no encontrado');

    return this.prisma.license.upsert({
      where: { schoolId_productId: { schoolId: dto.schoolId, productId: dto.productId } },
      create: {
        schoolId: dto.schoolId,
        productId: dto.productId,
        status: 'ACTIVE',
        startsAt: dto.startsAt ? new Date(dto.startsAt) : new Date(),
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        pricePaid: dto.pricePaid ?? null,
        currency: dto.currency ?? 'COP',
        paymentRef: dto.paymentRef ?? 'MANUAL',
        notes: dto.notes,
        grantedById,
      },
      update: {
        status: 'ACTIVE',
        startsAt: dto.startsAt ? new Date(dto.startsAt) : new Date(),
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        pricePaid: dto.pricePaid ?? null,
        currency: dto.currency ?? 'COP',
        paymentRef: dto.paymentRef ?? 'MANUAL',
        notes: dto.notes,
        grantedById,
      },
      include: {
        school: { select: { id: true, name: true } },
        product: { select: { id: true, name: true, type: true, price: true } },
      },
    });
  }

  findAll(schoolId?: string) {
    return this.prisma.license.findMany({
      where: { ...(schoolId ? { schoolId } : {}) },
      include: {
        school: { select: { id: true, name: true, slug: true } },
        product: { select: { id: true, name: true, type: true, price: true } },
        grantedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revoke(id: string) {
    const license = await this.prisma.license.findUnique({ where: { id } });
    if (!license) throw new NotFoundException('Licencia no encontrada');

    return this.prisma.license.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  async expireOverdue() {
    const result = await this.prisma.license.updateMany({
      where: {
        status: 'ACTIVE',
        endsAt: { lt: new Date() },
      },
      data: { status: 'EXPIRED' },
    });
    return { expired: result.count };
  }

  // Core: check if school has active license for a product (including via BUNDLE)
  async hasActiveLicense(schoolId: string, productIds: string[]): Promise<boolean> {
    if (!productIds.length) return false;

    // Direct license match
    const direct = await this.prisma.license.findFirst({
      where: {
        schoolId,
        productId: { in: productIds },
        status: 'ACTIVE',
        OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
      },
    });
    if (direct) return true;

    // Bundle license: check if any active BUNDLE license contains one of the productIds
    const bundleLicenses = await this.prisma.license.findMany({
      where: {
        schoolId,
        status: 'ACTIVE',
        OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
        product: { type: 'BUNDLE' },
      },
      select: {
        product: { select: { bundleItems: { select: { productId: true } } } },
      },
    });

    for (const l of bundleLicenses) {
      const bundledIds = l.product.bundleItems.map(i => i.productId);
      if (productIds.some(id => bundledIds.includes(id))) return true;
    }

    return false;
  }

  // Returns all product IDs a school has active access to (expands BUNDLE items)
  async getActiveProductIds(schoolId: string): Promise<string[]> {
    const licenses = await this.prisma.license.findMany({
      where: {
        schoolId,
        status: 'ACTIVE',
        OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
      },
      select: {
        productId: true,
        product: {
          select: {
            type: true,
            bundleItems: { select: { productId: true } },
          },
        },
      },
    });

    const ids = new Set<string>();
    for (const l of licenses) {
      ids.add(l.productId);
      // Si es un bundle, incluir también los productos contenidos
      if (l.product.type === 'BUNDLE') {
        for (const item of l.product.bundleItems) {
          ids.add(item.productId);
        }
      }
    }
    return [...ids];
  }
}
