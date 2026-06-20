import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateSiteContentDto } from './dto/update-content.dto';

@Injectable()
export class SiteContentService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.siteContent.findMany();
  }

  async findByKey(key: string) {
    return this.prisma.siteContent.findUnique({ where: { key } });
  }

  async upsert(key: string, dto: UpdateSiteContentDto) {
    return this.prisma.siteContent.upsert({
      where: { key },
      update: { value: dto.value, type: dto.type },
      create: { key, value: dto.value, type: dto.type },
    });
  }
}
