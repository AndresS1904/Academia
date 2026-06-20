import { Module } from '@nestjs/common';
import { QuestionTagsController } from './question-tags.controller';
import { QuestionTagsService } from './question-tags.service';

@Module({
  controllers: [QuestionTagsController],
  providers: [QuestionTagsService],
  exports: [QuestionTagsService],
})
export class QuestionTagsModule {}
