import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateProductDto) {
    return this.prisma.product.create({
      data: {
        name: dto.name,
        description: dto.description,
        type: dto.type,
        price: dto.price,
        currency: dto.currency ?? 'COP',
        billingModel: dto.billingModel ?? 'ONE_TIME',
        courseId: dto.courseId,
        simulacroId: dto.simulacroId,
        isActive: dto.isActive ?? true,
      },
      include: {
        course: { select: { id: true, title: true } },
        simulacro: { select: { id: true, titulo: true } },
      },
    });
  }

  findAll() {
    return this.prisma.product.findMany({
      include: {
        course: { select: { id: true, title: true } },
        simulacro: { select: { id: true, titulo: true } },
        _count: { select: { licenses: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        course: { select: { id: true, title: true } },
        simulacro: { select: { id: true, titulo: true } },
        licenses: {
          include: { school: { select: { id: true, name: true } } },
        },
      },
    });
    if (!product) throw new NotFoundException('Producto no encontrado');
    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);
    return this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.currency !== undefined && { currency: dto.currency }),
        ...(dto.billingModel !== undefined && { billingModel: dto.billingModel }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }
}
