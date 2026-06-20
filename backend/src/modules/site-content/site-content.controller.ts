import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { SiteContentService } from './site-content.service';
import { UpdateSiteContentDto } from './dto/update-content.dto';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('site-content')
export class SiteContentController {
  constructor(private siteContentService: SiteContentService) {}

  @Public()
  @Get()
  findAll() {
    return this.siteContentService.findAll();
  }

  @Public()
  @Get(':key')
  findByKey(@Param('key') key: string) {
    return this.siteContentService.findByKey(key);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':key')
  upsert(@Param('key') key: string, @Body() dto: UpdateSiteContentDto) {
    return this.siteContentService.upsert(key, dto);
  }
}
