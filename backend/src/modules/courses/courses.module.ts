import { Module } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CoursesController } from './courses.controller';
import { AccessModule } from '../access/access.module';

@Module({
  imports: [AccessModule],
  providers: [CoursesService],
  controllers: [CoursesController],
})
export class CoursesModule {}
