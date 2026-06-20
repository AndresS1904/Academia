import {
  Controller, Get, Post, Patch, Delete, Body, Param, Request,
  UseGuards, UseInterceptors, UploadedFile, UploadedFiles, Res, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Response } from 'express';
import { createReadStream, statSync } from 'fs';
import { extname, basename } from 'path';
import { ClassroomsService } from './classrooms.service';
import { CreateClassroomDto } from './dto/create-classroom.dto';
import { CreateModuleDto } from './dto/create-module.dto';
import { AddMaterialDto } from './dto/add-material.dto';
import { CreateActivityDto } from './dto/create-activity.dto';
import { SubmitActivityDto } from './dto/submit-activity.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';
import { EnrollStudentsDto } from './dto/enroll-students.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

const ALLOWED_MIME: Record<string, string[]> = {
  PDF:   ['application/pdf'],
  WORD:  ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  IMAGE: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  VIDEO: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'],
  OTHER: [],
};

const MAX_SIZE: Record<string, number> = {
  PDF:   50  * 1024 * 1024,
  WORD:  20  * 1024 * 1024,
  IMAGE: 10  * 1024 * 1024,
  VIDEO: 500 * 1024 * 1024,
  OTHER: 50  * 1024 * 1024,
};

function materialFileFilter(type: string) {
  return (_req: any, file: Express.Multer.File, cb: Function) => {
    const allowed = ALLOWED_MIME[type] ?? [];
    if (allowed.length > 0 && !allowed.includes(file.mimetype)) {
      return cb(new BadRequestException(`Tipo de archivo no permitido para ${type}`), false);
    }
    cb(null, true);
  };
}

@Controller('classrooms')
@UseGuards(JwtAuthGuard)
export class ClassroomsController {
  constructor(private service: ClassroomsService) {}

  // ── ADMIN — Classrooms ───────────────────────────────────────────────────
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Get('admin')
  listAdmin(@Request() req: any) {
    return this.service.listAdmin(req.user);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Post('admin')
  create(@Body() dto: CreateClassroomDto, @Request() req: any) {
    return this.service.create(dto, req.user);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Get('admin/:id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.service.findOneAdmin(id, req.user);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('admin/:id')
  update(@Param('id') id: string, @Body() data: Partial<CreateClassroomDto>, @Request() req: any) {
    return this.service.update(id, data, req.user);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Delete('admin/:id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.service.remove(id, req.user);
  }

  // ── ADMIN — Modules ──────────────────────────────────────────────────────
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Post('admin/:classroomId/modules')
  createModule(
    @Param('classroomId') classroomId: string,
    @Body() dto: CreateModuleDto,
    @Request() req: any,
  ) {
    return this.service.createModule(classroomId, dto, req.user);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('admin/modules/:moduleId')
  updateModule(
    @Param('moduleId') moduleId: string,
    @Body() data: Partial<CreateModuleDto>,
    @Request() req: any,
  ) {
    return this.service.updateModule(moduleId, data, req.user);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Delete('admin/modules/:moduleId')
  deleteModule(@Param('moduleId') moduleId: string, @Request() req: any) {
    return this.service.deleteModule(moduleId, req.user);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('admin/:classroomId/modules/reorder')
  reorderModules(
    @Param('classroomId') classroomId: string,
    @Body('orderedIds') orderedIds: string[],
    @Request() req: any,
  ) {
    return this.service.reorderModules(classroomId, orderedIds, req.user);
  }

  // ── ADMIN — Materials ────────────────────────────────────────────────────
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Post('admin/modules/:moduleId/materials')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 500 * 1024 * 1024 },
    }),
  )
  addMaterial(
    @Param('moduleId') moduleId: string,
    @Body() dto: AddMaterialDto,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    return this.service.addMaterial(moduleId, dto, file, req.user);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('admin/materials/:id')
  updateMaterial(
    @Param('id') id: string,
    @Body() data: Partial<AddMaterialDto>,
    @Request() req: any,
  ) {
    return this.service.updateMaterial(id, data, req.user);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Delete('admin/materials/:id')
  deleteMaterial(@Param('id') id: string, @Request() req: any) {
    return this.service.deleteMaterial(id, req.user);
  }

  // ── ADMIN — Activities ───────────────────────────────────────────────────
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Post('admin/modules/:moduleId/activities')
  createActivity(
    @Param('moduleId') moduleId: string,
    @Body() dto: CreateActivityDto,
    @Request() req: any,
  ) {
    return this.service.createActivity(moduleId, dto, req.user);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('admin/activities/:id')
  updateActivity(
    @Param('id') id: string,
    @Body() data: Partial<CreateActivityDto>,
    @Request() req: any,
  ) {
    return this.service.updateActivity(id, data, req.user);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Delete('admin/activities/:id')
  deleteActivity(@Param('id') id: string, @Request() req: any) {
    return this.service.deleteActivity(id, req.user);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Get('admin/activities/:id')
  findActivityAdmin(@Param('id') id: string, @Request() req: any) {
    return this.service.findActivityAdmin(id, req.user);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Get('admin/activities/:id/submissions')
  listSubmissions(@Param('id') id: string, @Request() req: any) {
    return this.service.listSubmissions(id, req.user);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('admin/submissions/:id/grade')
  grade(
    @Param('id') id: string,
    @Body() dto: GradeSubmissionDto,
    @Request() req: any,
  ) {
    return this.service.gradeSubmission(id, dto, req.user);
  }

  // ── ADMIN — Enrollment ───────────────────────────────────────────────────
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Post('admin/:classroomId/enroll')
  enroll(
    @Param('classroomId') classroomId: string,
    @Body() dto: EnrollStudentsDto,
    @Request() req: any,
  ) {
    return this.service.enrollStudents(classroomId, dto, req.user);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Post('admin/:classroomId/enroll-group')
  enrollGroup(
    @Param('classroomId') classroomId: string,
    @Body('groupId') groupId: string,
    @Request() req: any,
  ) {
    return this.service.enrollGroup(classroomId, groupId, req.user);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Delete('admin/:classroomId/enroll/:studentId')
  unenroll(
    @Param('classroomId') classroomId: string,
    @Param('studentId') studentId: string,
    @Request() req: any,
  ) {
    return this.service.unenrollStudent(classroomId, studentId, req.user);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Get('admin/:classroomId/students')
  listStudents(@Param('classroomId') classroomId: string, @Request() req: any) {
    return this.service.listStudents(classroomId, req.user);
  }

  // ── ADMIN — Sections ─────────────────────────────────────────────────────
  @UseGuards(RolesGuard) @Roles(Role.ADMIN)
  @Post('admin/modules/:moduleId/sections')
  createSection(@Param('moduleId') moduleId: string, @Body() data: any, @Request() req: any) {
    return this.service.createSection(moduleId, data, req.user);
  }

  @UseGuards(RolesGuard) @Roles(Role.ADMIN)
  @Patch('admin/sections/:sectionId')
  updateSection(@Param('sectionId') sectionId: string, @Body() data: any, @Request() req: any) {
    return this.service.updateSection(sectionId, data, req.user);
  }

  @UseGuards(RolesGuard) @Roles(Role.ADMIN)
  @Delete('admin/sections/:sectionId')
  deleteSection(@Param('sectionId') sectionId: string, @Request() req: any) {
    return this.service.deleteSection(sectionId, req.user);
  }

  // ── ADMIN — Topics ────────────────────────────────────────────────────────
  @UseGuards(RolesGuard) @Roles(Role.ADMIN)
  @Post('admin/sections/:sectionId/topics')
  createTopic(@Param('sectionId') sectionId: string, @Body() data: any, @Request() req: any) {
    return this.service.createTopic(sectionId, data, req.user);
  }

  @UseGuards(RolesGuard) @Roles(Role.ADMIN)
  @Get('admin/topics/:topicId')
  findTopicAdmin(@Param('topicId') topicId: string, @Request() req: any) {
    return this.service.findTopicAdmin(topicId, req.user);
  }

  @UseGuards(RolesGuard) @Roles(Role.ADMIN)
  @Patch('admin/topics/:topicId')
  updateTopic(@Param('topicId') topicId: string, @Body() data: any, @Request() req: any) {
    return this.service.updateTopic(topicId, data, req.user);
  }

  @UseGuards(RolesGuard) @Roles(Role.ADMIN)
  @Delete('admin/topics/:topicId')
  deleteTopic(@Param('topicId') topicId: string, @Request() req: any) {
    return this.service.deleteTopic(topicId, req.user);
  }

  // ── ADMIN — Subtopics ─────────────────────────────────────────────────────
  @UseGuards(RolesGuard) @Roles(Role.ADMIN)
  @Post('admin/topics/:topicId/subtopics')
  createSubtopic(@Param('topicId') topicId: string, @Body() data: any, @Request() req: any) {
    return this.service.createSubtopic(topicId, data, req.user);
  }

  @UseGuards(RolesGuard) @Roles(Role.ADMIN)
  @Patch('admin/subtopics/:subtopicId')
  updateSubtopic(@Param('subtopicId') subtopicId: string, @Body() data: any, @Request() req: any) {
    return this.service.updateSubtopic(subtopicId, data, req.user);
  }

  @UseGuards(RolesGuard) @Roles(Role.ADMIN)
  @Delete('admin/subtopics/:subtopicId')
  deleteSubtopic(@Param('subtopicId') subtopicId: string, @Request() req: any) {
    return this.service.deleteSubtopic(subtopicId, req.user);
  }

  // ── ADMIN — Learning Units ────────────────────────────────────────────────
  @UseGuards(RolesGuard) @Roles(Role.ADMIN)
  @Post('admin/topics/:topicId/units')
  createUnitForTopic(@Param('topicId') topicId: string, @Body() data: any, @Request() req: any) {
    return this.service.createUnitForTopic(topicId, data, req.user);
  }

  @UseGuards(RolesGuard) @Roles(Role.ADMIN)
  @Post('admin/subtopics/:subtopicId/units')
  createUnitForSubtopic(@Param('subtopicId') subtopicId: string, @Body() data: any, @Request() req: any) {
    return this.service.createUnitForSubtopic(subtopicId, data, req.user);
  }

  @UseGuards(RolesGuard) @Roles(Role.ADMIN)
  @Patch('admin/units/:unitId')
  updateUnit(@Param('unitId') unitId: string, @Body() data: any, @Request() req: any) {
    return this.service.updateUnit(unitId, data, req.user);
  }

  @UseGuards(RolesGuard) @Roles(Role.ADMIN)
  @Delete('admin/units/:unitId')
  deleteUnit(@Param('unitId') unitId: string, @Request() req: any) {
    return this.service.deleteUnit(unitId, req.user);
  }

  // ── ADMIN — Topic Simulacros ──────────────────────────────────────────────
  @UseGuards(RolesGuard) @Roles(Role.ADMIN)
  @Post('admin/topics/:topicId/simulacros')
  addTopicSimulacro(@Param('topicId') topicId: string, @Body('simulacroId') simulacroId: string, @Request() req: any) {
    return this.service.addTopicSimulacro(topicId, simulacroId, req.user);
  }

  @UseGuards(RolesGuard) @Roles(Role.ADMIN)
  @Delete('admin/topics/:topicId/simulacros/:simulacroId')
  removeTopicSimulacro(@Param('topicId') topicId: string, @Param('simulacroId') simulacroId: string, @Request() req: any) {
    return this.service.removeTopicSimulacro(topicId, simulacroId, req.user);
  }

  // ── ADMIN — Full detail (with sections/topics) ────────────────────────────
  @UseGuards(RolesGuard) @Roles(Role.ADMIN)
  @Get('admin/:id/full')
  findOneFull(@Param('id') id: string, @Request() req: any) {
    return this.service.findOneAdminFull(id, req.user);
  }

  // ── ADMIN / STUDENT — Forums ──────────────────────────────────────────────
  @Get('admin/:classroomId/forums')
  @UseGuards(RolesGuard) @Roles(Role.ADMIN)
  listForumsAdmin(@Param('classroomId') classroomId: string, @Request() req: any) {
    return this.service.listForums(classroomId, req.user);
  }

  @Post('admin/:classroomId/forums')
  @UseGuards(RolesGuard) @Roles(Role.ADMIN)
  createForum(@Param('classroomId') classroomId: string, @Body() data: any, @Request() req: any) {
    return this.service.createForum(classroomId, data, req.user);
  }

  @Patch('admin/forums/:forumId')
  @UseGuards(RolesGuard) @Roles(Role.ADMIN)
  updateForum(@Param('forumId') forumId: string, @Body() data: any, @Request() req: any) {
    return this.service.updateForum(forumId, data, req.user);
  }

  @Delete('admin/forums/:forumId')
  @UseGuards(RolesGuard) @Roles(Role.ADMIN)
  deleteForum(@Param('forumId') forumId: string, @Request() req: any) {
    return this.service.deleteForum(forumId, req.user);
  }

  // ── Threads (admin + student) ─────────────────────────────────────────────
  @Get('forums/:forumId/threads')
  listThreads(@Param('forumId') forumId: string, @Request() req: any) {
    return this.service.listThreads(forumId, req.user);
  }

  @Post('forums/:forumId/threads')
  createThread(@Param('forumId') forumId: string, @Body() data: any, @Request() req: any) {
    return this.service.createThread(forumId, data, req.user);
  }

  @Patch('threads/:threadId')
  updateThread(@Param('threadId') threadId: string, @Body() data: any, @Request() req: any) {
    return this.service.updateThread(threadId, data, req.user);
  }

  @Delete('threads/:threadId')
  deleteThread(@Param('threadId') threadId: string, @Request() req: any) {
    return this.service.deleteThread(threadId, req.user);
  }

  // ── Posts (admin + student) ───────────────────────────────────────────────
  @Get('threads/:threadId/posts')
  listPosts(@Param('threadId') threadId: string, @Request() req: any) {
    return this.service.listPosts(threadId, req.user);
  }

  @Post('threads/:threadId/posts')
  createPost(@Param('threadId') threadId: string, @Body() data: any, @Request() req: any) {
    return this.service.createPost(threadId, data, req.user);
  }

  @Patch('posts/:postId')
  updatePost(@Param('postId') postId: string, @Body() data: any, @Request() req: any) {
    return this.service.updatePost(postId, data, req.user);
  }

  @Delete('posts/:postId')
  deletePost(@Param('postId') postId: string, @Request() req: any) {
    return this.service.deletePost(postId, req.user);
  }

  // ── STUDENT ──────────────────────────────────────────────────────────────
  @Get('my')
  listMy(@Request() req: any) {
    return this.service.listMy(req.user);
  }

  @Get('view/:id')
  findOneStudent(@Param('id') id: string, @Request() req: any) {
    return this.service.findOneStudent(id, req.user);
  }

  @Get('view/:id/full')
  findOneStudentFull(@Param('id') id: string, @Request() req: any) {
    return this.service.findOneStudentFull(id, req.user);
  }

  @Get('view/:id/progress')
  getClassroomProgress(@Param('id') id: string, @Request() req: any) {
    return this.service.getClassroomProgress(id, req.user);
  }

  @Get('view/:classroomId/forums')
  listForumsStudent(@Param('classroomId') classroomId: string, @Request() req: any) {
    return this.service.listForums(classroomId, req.user);
  }

  @Post('units/:unitId/complete')
  markUnitComplete(@Param('unitId') unitId: string, @Request() req: any) {
    return this.service.markUnitComplete(unitId, req.user);
  }

  @Get('activities/:activityId')
  getActivity(@Param('activityId') activityId: string, @Request() req: any) {
    return this.service.getActivity(activityId, req.user);
  }

  @Post('activities/:activityId/submit')
  @UseInterceptors(FilesInterceptor('file', 10, { storage: memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } }))
  submit(
    @Param('activityId') activityId: string,
    @Body() dto: SubmitActivityDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Request() req: any,
  ) {
    return this.service.submitActivity(activityId, dto, files ?? [], req.user);
  }

  // ── Protected file download ──────────────────────────────────────────────
  @Get('files/*')
  async serveFile(
    @Param('0') fileKey: string,
    @Request() req: any,
    @Res() res: Response,
  ) {
    const filePath = await this.service.resolveProtectedFile(fileKey, req.user);
    const stat = statSync(filePath);
    const ext = extname(filePath).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.doc': 'application/msword',
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
      '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp',
      '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
      '.mkv': 'video/x-matroska',
    };
    res.setHeader('Content-Type', mimeMap[ext] ?? 'application/octet-stream');
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Disposition', `inline; filename="${basename(filePath)}"`);
    createReadStream(filePath).pipe(res);
  }

  // ─────────────────────────────────────────────
  //  PREREQUISITES
  // ─────────────────────────────────────────────

  @Get('topics/:topicId/prerequisites')
  @UseGuards(JwtAuthGuard)
  listPrerequisites(@Param('topicId') topicId: string) {
    return this.service.listPrerequisites(topicId);
  }

  @Post('topics/:topicId/prerequisites')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  addPrerequisite(@Param('topicId') topicId: string, @Body() body: { prerequisiteId: string }) {
    return this.service.addPrerequisite(topicId, body.prerequisiteId);
  }

  @Delete('topics/:topicId/prerequisites/:prerequisiteId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  removePrerequisite(@Param('topicId') topicId: string, @Param('prerequisiteId') prerequisiteId: string) {
    return this.service.removePrerequisite(topicId, prerequisiteId);
  }

  // ─────────────────────────────────────────────
  //  TOPIC MATERIALS
  // ─────────────────────────────────────────────

  @Get('topics/:topicId/materials')
  @UseGuards(JwtAuthGuard)
  listTopicMaterials(@Param('topicId') topicId: string) {
    return this.service.listTopicMaterials(topicId);
  }

  @Get('subtopics/:subtopicId/materials')
  @UseGuards(JwtAuthGuard)
  listSubtopicMaterials(@Param('subtopicId') subtopicId: string) {
    return this.service.listSubtopicMaterials(subtopicId);
  }

  @Post('topics/:topicId/materials')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  createTopicMaterial(@Param('topicId') topicId: string, @Body() body: any) {
    return this.service.createTopicMaterial({ topicId, ...body });
  }

  @Post('subtopics/:subtopicId/materials')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  createSubtopicMaterial(@Param('subtopicId') subtopicId: string, @Body() body: any) {
    return this.service.createTopicMaterial({ subtopicId, ...body });
  }

  @Delete('topic-materials/:materialId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  deleteTopicMaterial(@Param('materialId') materialId: string) {
    return this.service.deleteTopicMaterial(materialId);
  }

  // ─────────────────────────────────────────────
  //  TOPIC ACTIVITIES & SUBMISSIONS
  // ─────────────────────────────────────────────

  @Get('topics/:topicId/activities')
  @UseGuards(JwtAuthGuard)
  listTopicActivities(@Param('topicId') topicId: string) {
    return this.service.listTopicActivities(topicId);
  }

  @Get('subtopics/:subtopicId/activities')
  @UseGuards(JwtAuthGuard)
  listSubtopicActivities(@Param('subtopicId') subtopicId: string) {
    return this.service.listSubtopicActivities(subtopicId);
  }

  @Post('topics/:topicId/activities')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  createTopicActivity(@Param('topicId') topicId: string, @Body() body: any) {
    return this.service.createTopicActivity({ topicId, ...body });
  }

  @Post('subtopics/:subtopicId/activities')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  createSubtopicActivity(@Param('subtopicId') subtopicId: string, @Body() body: any) {
    return this.service.createTopicActivity({ subtopicId, ...body });
  }

  @Patch('topic-activities/:activityId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  updateTopicActivity(@Param('activityId') activityId: string, @Body() body: any) {
    return this.service.updateTopicActivity(activityId, body);
  }

  @Delete('topic-activities/:activityId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  deleteTopicActivity(@Param('activityId') activityId: string) {
    return this.service.deleteTopicActivity(activityId);
  }

  @Get('topic-activities/:activityId/submissions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  listActivitySubmissions(@Param('activityId') activityId: string) {
    return this.service.listActivitySubmissions(activityId);
  }

  @Post('topic-activities/:activityId/submit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ESTUDIANTE)
  submitTopicActivity(@Param('activityId') activityId: string, @Request() req: any, @Body() body: any) {
    return this.service.submitTopicActivity(activityId, req.user.id, body);
  }

  @Get('topic-activities/:activityId/my-submission')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ESTUDIANTE)
  myTopicSubmission(@Param('activityId') activityId: string, @Request() req: any) {
    return this.service.myTopicSubmission(activityId, req.user.id);
  }

  @Get('topic-activities/:activityId/student')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ESTUDIANTE)
  getTopicActivityForStudent(@Param('activityId') activityId: string) {
    return this.service.getTopicActivityForStudent(activityId);
  }

  @Patch('topic-submissions/:submissionId/grade')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  gradeTopicSubmission(@Param('submissionId') submissionId: string, @Request() req: any, @Body() body: { score: number; feedback?: string }) {
    return this.service.gradeTopicSubmission(submissionId, req.user.id, body);
  }

  // ─────────────────────────────────────────────
  //  QUIZZES
  // ─────────────────────────────────────────────

  @Get('classrooms/:classroomId/quizzes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  listQuizzes(@Param('classroomId') classroomId: string) {
    return this.service.listQuizzes(classroomId);
  }

  @Post('classrooms/:classroomId/quizzes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  createQuiz(@Param('classroomId') classroomId: string, @Body() body: any) {
    return this.service.createQuiz({ classroomId, ...body });
  }

  @Get('quizzes/:quizId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  getQuiz(@Param('quizId') quizId: string) {
    return this.service.getQuiz(quizId);
  }

  @Get('quizzes/:quizId/student')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ESTUDIANTE)
  getQuizForStudent(@Param('quizId') quizId: string, @Request() req: any) {
    return this.service.getQuizForStudent(quizId, req.user.id);
  }

  @Patch('quizzes/:quizId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  updateQuiz(@Param('quizId') quizId: string, @Body() body: any) {
    return this.service.updateQuiz(quizId, body);
  }

  @Delete('quizzes/:quizId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  deleteQuiz(@Param('quizId') quizId: string) {
    return this.service.deleteQuiz(quizId);
  }

  @Post('quizzes/:quizId/questions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  addQuizQuestion(@Param('quizId') quizId: string, @Body() body: any) {
    return this.service.addQuizQuestion(quizId, body);
  }

  @Patch('quiz-questions/:questionId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  updateQuizQuestion(@Param('questionId') questionId: string, @Body() body: any) {
    return this.service.updateQuizQuestion(questionId, body);
  }

  @Delete('quiz-questions/:questionId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  deleteQuizQuestion(@Param('questionId') questionId: string) {
    return this.service.deleteQuizQuestion(questionId);
  }

  @Post('quizzes/:quizId/start')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ESTUDIANTE)
  startQuizAttempt(@Param('quizId') quizId: string, @Request() req: any) {
    return this.service.startQuizAttempt(quizId, req.user.id);
  }

  @Post('quiz-attempts/:attemptId/submit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ESTUDIANTE)
  submitQuizAttempt(@Param('attemptId') attemptId: string, @Request() req: any, @Body() body: { answers: { questionId: string; selectedOptionId: string }[] }) {
    return this.service.submitQuizAttempt(attemptId, req.user.id, body.answers);
  }

  @Get('quizzes/:quizId/my-attempts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ESTUDIANTE)
  getMyQuizAttempts(@Param('quizId') quizId: string, @Request() req: any) {
    return this.service.getMyQuizAttempts(quizId, req.user.id);
  }

  @Get('quiz-attempts/:attemptId')
  @UseGuards(JwtAuthGuard)
  getAttemptDetail(@Param('attemptId') attemptId: string) {
    return this.service.getAttemptDetail(attemptId);
  }

  // ─────────────────────────────────────────────
  //  GRADING & COURSE GRADES
  // ─────────────────────────────────────────────

  @Get('classrooms/:classroomId/grading-config')
  @UseGuards(JwtAuthGuard)
  getGradingConfig(@Param('classroomId') classroomId: string) {
    return this.service.getGradingConfig(classroomId);
  }

  @Patch('classrooms/:classroomId/grading-config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  upsertGradingConfig(@Param('classroomId') classroomId: string, @Body() body: any) {
    return this.service.upsertGradingConfig(classroomId, body);
  }

  @Post('classrooms/:classroomId/grades/recalculate/:studentId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  recalculateCourseGrade(@Param('classroomId') classroomId: string, @Param('studentId') studentId: string) {
    return this.service.recalculateCourseGrade(classroomId, studentId);
  }

  @Get('classrooms/:classroomId/grades')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  getCourseGrades(@Param('classroomId') classroomId: string) {
    return this.service.getCourseGrades(classroomId);
  }

  @Get('classrooms/:classroomId/my-grade')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ESTUDIANTE)
  getMyCourseGrade(@Param('classroomId') classroomId: string, @Request() req: any) {
    return this.service.getMyCourseGrade(classroomId, req.user.id);
  }

  // ─────────────────────────────────────────────
  //  CERTIFICATES
  // ─────────────────────────────────────────────

  @Post('classrooms/:classroomId/certificates/issue/:studentId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  issueCertificate(@Param('classroomId') classroomId: string, @Param('studentId') studentId: string) {
    return this.service.issueCertificate(classroomId, studentId);
  }

  @Post('classrooms/:classroomId/certificates/issue-bulk')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  issueCertificateBulk(@Param('classroomId') classroomId: string) {
    return this.service.issueCertificateBulk(classroomId);
  }

  @Get('classrooms/:classroomId/certificates')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  listCertificates(@Param('classroomId') classroomId: string) {
    return this.service.listCertificates(classroomId);
  }

  @Get('classrooms/:classroomId/my-certificate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ESTUDIANTE)
  getMyCertificate(@Param('classroomId') classroomId: string, @Request() req: any) {
    return this.service.getMyCertificate(classroomId, req.user.id);
  }

  @Get('certificates/verify/:code')
  @UseGuards(JwtAuthGuard)
  verifyCertificate(@Param('code') code: string) {
    return this.service.verifyCertificate(code);
  }

  @Patch('classrooms/:classroomId/certificates/revoke/:studentId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  revokeCertificate(@Param('classroomId') classroomId: string, @Param('studentId') studentId: string) {
    return this.service.revokeCertificate(classroomId, studentId);
  }

  // ─────────────────────────────────────────────
  //  UNIT CONTENT — Admin
  // ─────────────────────────────────────────────

  @Get('admin/units/:unitId/full')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  getUnitFull(@Param('unitId') unitId: string) {
    return this.service.getUnitFull(unitId);
  }

  @Post('admin/units/:unitId/materials')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  createUnitMaterial(@Param('unitId') unitId: string, @Body() body: any) {
    return this.service.createUnitMaterial(unitId, body);
  }

  @Delete('admin/unit-materials/:materialId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  deleteUnitMaterial(@Param('materialId') materialId: string) {
    return this.service.deleteUnitMaterial(materialId);
  }

  @Post('admin/units/:unitId/activities')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  createUnitActivity(@Param('unitId') unitId: string, @Body() body: any) {
    return this.service.createUnitActivity(unitId, body);
  }

  @Post('admin/units/:unitId/quizzes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  createUnitQuiz(@Param('unitId') unitId: string, @Body() body: any) {
    return this.service.createUnitQuiz(unitId, body);
  }

  @Get('admin/units/:unitId/forums')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  getUnitForums(@Param('unitId') unitId: string) {
    return this.service.getUnitForums(unitId);
  }

  @Post('admin/units/:unitId/forums')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  createUnitForum(@Param('unitId') unitId: string, @Body() body: any) {
    return this.service.createUnitForum(unitId, body);
  }

  // ─────────────────────────────────────────────
  //  UNIT CONTENT — Student
  // ─────────────────────────────────────────────

  @Get('units/:unitId/student')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ESTUDIANTE)
  getUnitStudentView(@Param('unitId') unitId: string, @Request() req: any) {
    return this.service.getUnitStudentView(unitId, req.user.id);
  }

  // ─────────────────────────────────────────────
  //  CLASSROOM ↔ CURSOS
  // ─────────────────────────────────────────────

  @Get('admin/:classroomId/courses')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  listClassroomCourses(@Param('classroomId') classroomId: string, @Request() req: any) {
    return this.service.listClassroomCourses(classroomId, req.user);
  }

  @Post('admin/:classroomId/courses')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  assignCourseToClassroom(
    @Param('classroomId') classroomId: string,
    @Body() body: { courseId: string; order?: number; isRequired?: boolean },
    @Request() req: any,
  ) {
    return this.service.assignCourseToClassroom(classroomId, body.courseId, body.order ?? 0, body.isRequired ?? true, req.user);
  }

  @Delete('admin/:classroomId/courses/:courseId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  removeClassroomCourse(
    @Param('classroomId') classroomId: string,
    @Param('courseId') courseId: string,
    @Request() req: any,
  ) {
    return this.service.removeClassroomCourse(classroomId, courseId, req.user);
  }

  // ─────────────────────────────────────────────
  //  CLASSROOM ↔ SIMULACROS
  // ─────────────────────────────────────────────

  @Get('admin/:classroomId/simulacros-assigned')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  listClassroomSimulacros(@Param('classroomId') classroomId: string, @Request() req: any) {
    return this.service.listClassroomSimulacros(classroomId, req.user);
  }

  @Post('admin/:classroomId/simulacros-assigned')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  assignSimulacroToClassroom(
    @Param('classroomId') classroomId: string,
    @Body() body: { simulacroId: string; dueDate?: string; isRequired?: boolean; context?: string; order?: number },
    @Request() req: any,
  ) {
    return this.service.assignSimulacroToClassroom(classroomId, body.simulacroId, body, req.user);
  }

  @Delete('admin/:classroomId/simulacros-assigned/:simulacroId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  removeClassroomSimulacro(
    @Param('classroomId') classroomId: string,
    @Param('simulacroId') simulacroId: string,
    @Request() req: any,
  ) {
    return this.service.removeClassroomSimulacro(classroomId, simulacroId, req.user);
  }
}
