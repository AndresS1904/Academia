import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscribeDto } from './dto/subscribe.dto';

@Injectable()
export class NewsletterService {
  constructor(private prisma: PrismaService) {}

  async subscribe(dto: SubscribeDto) {
    const exists = await this.prisma.newsletterSubscriber.findUnique({
      where: { email: dto.email },
    });
    if (exists) {
      throw new ConflictException('Este correo ya está suscrito');
    }
    await this.prisma.newsletterSubscriber.create({
      data: { email: dto.email },
    });
    return { message: 'Suscripción exitosa' };
  }

  async findAll() {
    return this.prisma.newsletterSubscriber.findMany({
      orderBy: { subscribedAt: 'desc' },
    });
  }
}
