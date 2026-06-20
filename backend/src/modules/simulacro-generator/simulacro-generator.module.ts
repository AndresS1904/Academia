import { Module } from '@nestjs/common';
import { SimulacroGeneratorController } from './simulacro-generator.controller';
import { SimulacroTemplatesService } from './simulacro-templates.service';
import { GeneratorService } from './generator.service';
import { QuestionsModule } from '../questions/questions.module';

@Module({
  imports: [QuestionsModule],
  controllers: [SimulacroGeneratorController],
  providers: [SimulacroTemplatesService, GeneratorService],
})
export class SimulacroGeneratorModule {}
