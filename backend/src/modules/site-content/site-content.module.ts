import { Module } from '@nestjs/common';
import { SiteContentService } from './site-content.service';
import { SiteContentController } from './site-content.controller';

@Module({
  providers: [SiteContentService],
  controllers: [SiteContentController],
})
export class SiteContentModule {}
