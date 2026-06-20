import {
  Controller, Get, Post, Patch, Delete, Param, Body, Request, UseGuards,
} from '@nestjs/common';
import { SimulacroTemplatesService } from './simulacro-templates.service';
import { GeneratorService } from './generator.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { GenerateSimulacroDto } from './dto/generate-simulacro.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('simulacro-templates')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class SimulacroGeneratorController {
  constructor(
    private templatesService: SimulacroTemplatesService,
    private generatorService: GeneratorService,
  ) {}

  // ── Template CRUD ──────────────────────────────────────────────────────────

  @Get()
  findAll(@Request() req: any) {
    return this.templatesService.findAll(req.user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.templatesService.findOne(id, req.user);
  }

  @Post()
  create(@Body() dto: CreateTemplateDto, @Request() req: any) {
    return this.templatesService.create(dto, req.user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateTemplateDto>, @Request() req: any) {
    return this.templatesService.update(id, dto, req.user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.templatesService.remove(id, req.user);
  }

  // ── Generator ──────────────────────────────────────────────────────────────

  @Post('generate')
  generate(@Body() dto: GenerateSimulacroDto, @Request() req: any) {
    return this.generatorService.generate(dto, req.user);
  }
}
