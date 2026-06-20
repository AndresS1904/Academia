import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLeadDto } from './dto/create-lead.dto';

@Injectable()
export class LeadsService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateLeadDto) {
    return this.prisma.lead.create({ data: dto });
  }

  async findAll(page = 1, limit = 25, search = '') {
    const skip = (page - 1) * limit;
    const where: any = search
      ? {
          OR: [
            { name:    { contains: search, mode: 'insensitive' } },
            { phone:   { contains: search, mode: 'insensitive' } },
            { program: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};
    const [data, total] = await Promise.all([
      this.prisma.lead.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      this.prisma.lead.count({ where }),
    ]);
    return { data, total, page, pages: Math.ceil(total / limit) };
  }

  markContacted(id: string) {
    return this.prisma.lead.update({
      where: { id },
      data: { isContacted: true },
    });
  }
}
