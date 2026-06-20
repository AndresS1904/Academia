import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { QuestionsService } from './questions.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { FilterQuestionDto } from './dto/filter-question.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('questions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class QuestionsController {
  constructor(private questionsService: QuestionsService) {}

  @Post()
  create(@Body() dto: CreateQuestionDto, @Request() req: any) {
    return this.questionsService.create(dto, req.user);
  }

  @Get()
  findAll(@Query() filter: FilterQuestionDto, @Request() req: any) {
    return this.questionsService.findAll(filter, req.user);
  }

  @Get('stats')
  getStats(@Request() req: any) {
    return this.questionsService.getStats(req.user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.questionsService.findOne(id, req.user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateQuestionDto, @Request() req: any) {
    return this.questionsService.update(id, dto, req.user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.questionsService.remove(id, req.user);
  }

  @Patch(':id/toggle-active')
  toggleActive(@Param('id') id: string) {
    return this.questionsService.toggleActive(id);
  }

  @Get('meta/options')
  getMetadataOptions(@Request() req: any) {
    return this.questionsService.getMetadataOptions(req.user);
  }
}
