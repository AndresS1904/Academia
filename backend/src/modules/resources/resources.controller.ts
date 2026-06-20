import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ResourcesService } from './resources.service';
import { CreateResourceDto } from './dto/create-resource.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller()
@UseGuards(JwtAuthGuard)
export class ResourcesController {
  constructor(private resourcesService: ResourcesService) {}

  @Get('lessons/:lessonId/resources')
  findByLesson(@Param('lessonId') lessonId: string) {
    return this.resourcesService.findByLesson(lessonId);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Post('lessons/:lessonId/resources')
  create(@Param('lessonId') lessonId: string, @Body() dto: CreateResourceDto) {
    return this.resourcesService.create(lessonId, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('resources/:id')
  update(@Param('id') id: string, @Body() dto: CreateResourceDto) {
    return this.resourcesService.update(id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Delete('resources/:id')
  remove(@Param('id') id: string) {
    return this.resourcesService.remove(id);
  }

  // ── Resource academic content (admin) ───────────────────────────────────────

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Get('resources/:id/full')
  getResourceFull(@Param('id') id: string) {
    return this.resourcesService.getResourceFull(id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Post('resources/:id/materials')
  addMaterial(@Param('id') id: string, @Body() body: any) {
    return this.resourcesService.addResourceMaterial(id, body);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Delete('resource-materials/:materialId')
  deleteMaterial(@Param('materialId') materialId: string) {
    return this.resourcesService.deleteResourceMaterial(materialId);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Get('resources/:id/activities')
  getActivities(@Param('id') id: string) {
    return this.resourcesService.getResourceActivities(id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Post('resources/:id/activities')
  addActivity(@Param('id') id: string, @Body() body: any) {
    return this.resourcesService.addResourceActivity(id, body);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Get('resources/:id/quizzes')
  getQuizzes(@Param('id') id: string) {
    return this.resourcesService.getResourceQuizzes(id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Post('resources/:id/quizzes')
  addQuiz(@Param('id') id: string, @Body() body: any) {
    return this.resourcesService.addResourceQuiz(id, body);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Get('resources/:id/forums')
  getForums(@Param('id') id: string) {
    return this.resourcesService.getResourceForums(id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Post('resources/:id/forums')
  addForum(@Param('id') id: string, @Body() body: any) {
    return this.resourcesService.addResourceForum(id, body);
  }

  // ── Student view ─────────────────────────────────────────────────────────────

  @Get('resources/:id/student')
  getStudentView(@Param('id') id: string, @Request() req: any) {
    return this.resourcesService.getResourceStudentView(id, req.user.id);
  }
}
