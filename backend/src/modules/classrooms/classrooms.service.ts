import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MaterialType, SubmissionStatus, LearningUnitType, QuizStatus, QuizAttemptStatus, CertificateStatus } from '@prisma/client';
import { CreateClassroomDto } from './dto/create-classroom.dto';
import { CreateModuleDto } from './dto/create-module.dto';
import { AddMaterialDto } from './dto/add-material.dto';
import { CreateActivityDto } from './dto/create-activity.dto';
import { SubmitActivityDto } from './dto/submit-activity.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';
import { EnrollStudentsDto } from './dto/enroll-students.dto';
import { join, extname } from 'path';
import { existsSync, unlinkSync, mkdirSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ClassroomsService {
  constructor(private prisma: PrismaService) {}

  // ── helpers ─────────────────────────────────────────────────────────────

  private assertSchool(user: any) {
    if (!user.schoolId) throw new ForbiddenException('Sin escuela asignada');
    return user.schoolId as string;
  }

  private async assertClassroomOwner(classroomId: string, schoolId: string) {
    const c = await this.prisma.classroom.findFirst({
      where: { id: classroomId, schoolId },
    });
    if (!c) throw new NotFoundException('Aula no encontrada');
    return c;
  }

  private async assertModuleOwner(moduleId: string, schoolId: string) {
    const m = await this.prisma.classModule.findFirst({
      where: { id: moduleId, classroom: { schoolId } },
      include: { classroom: true },
    });
    if (!m) throw new NotFoundException('Módulo no encontrado');
    return m;
  }

  private protectedPath(fileKey: string) {
    return join(process.cwd(), 'uploads', 'protected', fileKey);
  }

  // ── ADMIN — Classrooms CRUD ──────────────────────────────────────────────

  async listAdmin(user: any) {
    const schoolId = this.assertSchool(user);
    return this.prisma.classroom.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { modules: true, enrollments: true } },
      },
    });
  }

  async create(dto: CreateClassroomDto, user: any) {
    const schoolId = this.assertSchool(user);
    return this.prisma.classroom.create({
      data: { ...dto, schoolId },
    });
  }

  async findOneAdmin(id: string, user: any) {
    const schoolId = this.assertSchool(user);
    const classroom = await this.prisma.classroom.findFirst({
      where: { id, schoolId },
      include: {
        modules: {
          orderBy: { order: 'asc' },
          include: {
            materials: { orderBy: { order: 'asc' } },
            activities: {
              orderBy: { order: 'asc' },
              include: { _count: { select: { submissions: true } } },
            },
          },
        },
        _count: { select: { enrollments: true } },
      },
    });
    if (!classroom) throw new NotFoundException('Aula no encontrada');
    return classroom;
  }

  async update(id: string, data: Partial<CreateClassroomDto>, user: any) {
    const schoolId = this.assertSchool(user);
    await this.assertClassroomOwner(id, schoolId);
    return this.prisma.classroom.update({ where: { id }, data });
  }

  async remove(id: string, user: any) {
    const schoolId = this.assertSchool(user);
    await this.assertClassroomOwner(id, schoolId);
    await this.prisma.classroom.delete({ where: { id } });
    return { ok: true };
  }

  // ── ADMIN — Modules ──────────────────────────────────────────────────────

  async createModule(classroomId: string, dto: CreateModuleDto, user: any) {
    const schoolId = this.assertSchool(user);
    await this.assertClassroomOwner(classroomId, schoolId);
    const last = await this.prisma.classModule.findFirst({
      where: { classroomId },
      orderBy: { order: 'desc' },
    });
    return this.prisma.classModule.create({
      data: { ...dto, classroomId, order: dto.order ?? (last ? last.order + 1 : 0) },
    });
  }

  async updateModule(moduleId: string, data: Partial<CreateModuleDto>, user: any) {
    const schoolId = this.assertSchool(user);
    await this.assertModuleOwner(moduleId, schoolId);
    return this.prisma.classModule.update({ where: { id: moduleId }, data });
  }

  async deleteModule(moduleId: string, user: any) {
    const schoolId = this.assertSchool(user);
    await this.assertModuleOwner(moduleId, schoolId);
    await this.prisma.classModule.delete({ where: { id: moduleId } });
    return { ok: true };
  }

  async reorderModules(classroomId: string, orderedIds: string[], user: any) {
    const schoolId = this.assertSchool(user);
    await this.assertClassroomOwner(classroomId, schoolId);
    await Promise.all(
      orderedIds.map((id, index) =>
        this.prisma.classModule.updateMany({
          where: { id, classroomId },
          data: { order: index },
        }),
      ),
    );
    return { ok: true };
  }

  // ── ADMIN — Materials ────────────────────────────────────────────────────

  async addMaterial(
    moduleId: string,
    dto: AddMaterialDto,
    file: Express.Multer.File | undefined,
    user: any,
  ) {
    const schoolId = this.assertSchool(user);
    const mod = await this.assertModuleOwner(moduleId, schoolId);

    if (dto.type === MaterialType.LINK) {
      if (!dto.externalUrl) throw new BadRequestException('Se requiere externalUrl para tipo LINK');
    } else {
      if (!file) throw new BadRequestException('Se requiere un archivo');
    }

    let fileKey: string | undefined;
    let fileName: string | undefined;
    let fileSize: number | undefined;
    let mimeType: string | undefined;

    if (file) {
      const dir = join(
        process.cwd(), 'uploads', 'protected', 'classrooms', schoolId, mod.classroomId,
      );
      mkdirSync(dir, { recursive: true });
      const ext = extname(file.originalname);
      const uuid = uuidv4();
      const savedName = `${uuid}${ext}`;
      const fs = await import('fs/promises');
      await fs.writeFile(join(dir, savedName), file.buffer);
      fileKey = `classrooms/${schoolId}/${mod.classroomId}/${savedName}`;
      fileName = file.originalname;
      fileSize = file.size;
      mimeType = file.mimetype;
    }

    const last = await this.prisma.classMaterial.findFirst({
      where: { moduleId },
      orderBy: { order: 'desc' },
    });

    return this.prisma.classMaterial.create({
      data: {
        moduleId,
        title: dto.title,
        description: dto.description,
        type: dto.type,
        fileKey,
        fileName,
        fileSize,
        mimeType,
        externalUrl: dto.externalUrl,
        allowDownload: dto.allowDownload ?? true,
        order: dto.order ?? (last ? last.order + 1 : 0),
      },
    });
  }

  async updateMaterial(
    materialId: string,
    data: Partial<AddMaterialDto>,
    user: any,
  ) {
    const schoolId = this.assertSchool(user);
    const mat = await this.prisma.classMaterial.findFirst({
      where: { id: materialId, module: { classroom: { schoolId } } },
    });
    if (!mat) throw new NotFoundException('Material no encontrado');
    return this.prisma.classMaterial.update({ where: { id: materialId }, data });
  }

  async deleteMaterial(materialId: string, user: any) {
    const schoolId = this.assertSchool(user);
    const mat = await this.prisma.classMaterial.findFirst({
      where: { id: materialId, module: { classroom: { schoolId } } },
    });
    if (!mat) throw new NotFoundException('Material no encontrado');
    if (mat.fileKey) {
      const p = this.protectedPath(mat.fileKey);
      if (existsSync(p)) unlinkSync(p);
    }
    await this.prisma.classMaterial.delete({ where: { id: materialId } });
    return { ok: true };
  }

  // ── ADMIN — Activities ───────────────────────────────────────────────────

  async createActivity(moduleId: string, dto: CreateActivityDto, user: any) {
    const schoolId = this.assertSchool(user);
    await this.assertModuleOwner(moduleId, schoolId);
    const last = await this.prisma.classActivity.findFirst({
      where: { moduleId },
      orderBy: { order: 'desc' },
    });
    return this.prisma.classActivity.create({
      data: { ...dto, moduleId, order: last ? last.order + 1 : 0 },
    });
  }

  async updateActivity(activityId: string, data: Partial<CreateActivityDto>, user: any) {
    const schoolId = this.assertSchool(user);
    const act = await this.prisma.classActivity.findFirst({
      where: { id: activityId, module: { classroom: { schoolId } } },
    });
    if (!act) throw new NotFoundException('Actividad no encontrada');
    return this.prisma.classActivity.update({ where: { id: activityId }, data });
  }

  async deleteActivity(activityId: string, user: any) {
    const schoolId = this.assertSchool(user);
    const act = await this.prisma.classActivity.findFirst({
      where: { id: activityId, module: { classroom: { schoolId } } },
    });
    if (!act) throw new NotFoundException('Actividad no encontrada');
    await this.prisma.classActivity.delete({ where: { id: activityId } });
    return { ok: true };
  }

  async findActivityAdmin(activityId: string, user: any) {
    const schoolId = this.assertSchool(user);
    const act = await this.prisma.classActivity.findFirst({
      where: { id: activityId, module: { classroom: { schoolId } } },
      include: { module: { include: { classroom: { select: { id: true, title: true } } } } },
    });
    if (!act) throw new NotFoundException('Actividad no encontrada');
    return {
      ...act,
      classroom: act.module.classroom,
    };
  }

  async listSubmissions(activityId: string, user: any) {
    const schoolId = this.assertSchool(user);
    const act = await this.prisma.classActivity.findFirst({
      where: { id: activityId, module: { classroom: { schoolId } } },
    });
    if (!act) throw new NotFoundException('Actividad no encontrada');
    return this.prisma.studentSubmission.findMany({
      where: { activityId },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async gradeSubmission(submissionId: string, dto: GradeSubmissionDto, user: any) {
    const schoolId = this.assertSchool(user);
    const sub = await this.prisma.studentSubmission.findFirst({
      where: { id: submissionId, activity: { module: { classroom: { schoolId } } } },
    });
    if (!sub) throw new NotFoundException('Entrega no encontrada');
    return this.prisma.studentSubmission.update({
      where: { id: submissionId },
      data: {
        score: dto.score,
        feedback: dto.feedback,
        status: dto.status ?? SubmissionStatus.GRADED,
        gradedAt: new Date(),
        gradedById: user.id,
      },
    });
  }

  // ── ADMIN — Enrollment ───────────────────────────────────────────────────

  async enrollStudents(classroomId: string, dto: EnrollStudentsDto, user: any) {
    const schoolId = this.assertSchool(user);
    await this.assertClassroomOwner(classroomId, schoolId);
    const students = await this.prisma.user.findMany({
      where: { id: { in: dto.studentIds }, schoolId },
      select: { id: true },
    });
    if (students.length === 0) throw new BadRequestException('No se encontraron estudiantes válidos');
    await this.prisma.classEnrollment.createMany({
      data: students.map((s) => ({ classroomId, studentId: s.id })),
      skipDuplicates: true,
    });
    return { enrolled: students.length };
  }

  async enrollGroup(classroomId: string, groupId: string, user: any) {
    const schoolId = this.assertSchool(user);
    await this.assertClassroomOwner(classroomId, schoolId);
    const group = await this.prisma.studentGroup.findFirst({
      where: { id: groupId, schoolId },
      include: { members: { select: { userId: true } } },
    });
    if (!group) throw new NotFoundException('Grupo no encontrado');
    if (group.members.length === 0) throw new BadRequestException('El grupo no tiene estudiantes');
    await this.prisma.classEnrollment.createMany({
      data: group.members.map((m) => ({ classroomId, studentId: m.userId })),
      skipDuplicates: true,
    });
    return { enrolled: group.members.length, groupName: group.name };
  }

  async unenrollStudent(classroomId: string, studentId: string, user: any) {
    const schoolId = this.assertSchool(user);
    await this.assertClassroomOwner(classroomId, schoolId);
    await this.prisma.classEnrollment.deleteMany({ where: { classroomId, studentId } });
    return { ok: true };
  }

  async listStudents(classroomId: string, user: any) {
    const schoolId = this.assertSchool(user);
    await this.assertClassroomOwner(classroomId, schoolId);
    return this.prisma.classEnrollment.findMany({
      where: { classroomId },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { enrolledAt: 'asc' },
    });
  }

  // ── STUDENT — view classrooms ────────────────────────────────────────────

  async listMy(user: any) {
    return this.prisma.classroom.findMany({
      where: {
        isPublished: true,
        enrollments: { some: { studentId: user.id } },
      },
      include: {
        _count: { select: { modules: true, classroomCourses: true, classroomSimulacros: true } },
        school: { select: { name: true } },
      },
      orderBy: { title: 'asc' },
    });
  }

  async findOneStudent(classroomId: string, user: any) {
    const enrollment = await this.prisma.classEnrollment.findFirst({
      where: { classroomId, studentId: user.id },
    });
    if (!enrollment) throw new ForbiddenException('No estás inscrito en esta clase');

    const classroom = await this.prisma.classroom.findFirst({
      where: { id: classroomId, isPublished: true },
      include: {
        modules: {
          where: { isPublished: true },
          orderBy: { order: 'asc' },
          include: {
            materials: { orderBy: { order: 'asc' } },
            activities: {
              where: { isPublished: true },
              orderBy: { order: 'asc' },
              include: {
                submissions: {
                  where: { studentId: user.id },
                  select: { id: true, status: true, score: true, feedback: true, submittedAt: true },
                },
              },
            },
          },
        },
      },
    });
    if (!classroom) throw new NotFoundException('Clase no disponible');
    return classroom;
  }

  async getActivity(activityId: string, user: any) {
    const activity = await this.prisma.classActivity.findFirst({
      where: {
        id: activityId,
        isPublished: true,
        module: {
          isPublished: true,
          classroom: {
            isPublished: true,
            enrollments: { some: { studentId: user.id } },
          },
        },
      },
      include: {
        module: { select: { id: true, title: true, classroomId: true } },
        submissions: {
          where: { studentId: user.id },
        },
      },
    });
    if (!activity) throw new NotFoundException('Actividad no disponible');
    return activity;
  }

  async submitActivity(
    activityId: string,
    dto: SubmitActivityDto,
    uploadedFiles: Express.Multer.File[],
    user: any,
  ) {
    const activity = await this.prisma.classActivity.findFirst({
      where: {
        id: activityId,
        isPublished: true,
        module: {
          classroom: {
            isPublished: true,
            enrollments: { some: { studentId: user.id } },
          },
        },
      },
      include: { module: { include: { classroom: true } } },
    });
    if (!activity) throw new NotFoundException('Actividad no disponible');

    const schoolId = activity.module.classroom.schoolId;
    const classroomId = activity.module.classroomId;

    let fileKeys: string[] = [];
    let fileNames: string[] = [];

    if (uploadedFiles.length > 0) {
      const dir = join(
        process.cwd(), 'uploads', 'protected', 'classrooms', schoolId, classroomId, 'submissions',
      );
      mkdirSync(dir, { recursive: true });
      const fs = await import('fs/promises');
      for (const file of uploadedFiles) {
        const ext = extname(file.originalname);
        const savedName = `${uuidv4()}${ext}`;
        await fs.writeFile(join(dir, savedName), file.buffer);
        fileKeys.push(`classrooms/${schoolId}/${classroomId}/submissions/${savedName}`);
        fileNames.push(file.originalname);
      }
    }

    const isLate = activity.dueDate && new Date() > new Date(activity.dueDate);
    const status = isLate ? SubmissionStatus.LATE : SubmissionStatus.SUBMITTED;

    return this.prisma.studentSubmission.upsert({
      where: { activityId_studentId: { activityId, studentId: user.id } },
      create: {
        activityId,
        studentId: user.id,
        content: dto.content,
        fileKeys,
        fileNames,
        status,
        submittedAt: new Date(),
      },
      update: {
        content: dto.content,
        fileKeys,
        fileNames,
        status,
        submittedAt: new Date(),
      },
    });
  }

  // ── ADMIN — Sections ─────────────────────────────────────────────────────

  private async assertSectionOwner(sectionId: string, schoolId: string) {
    const s = await this.prisma.classSection.findFirst({
      where: { id: sectionId, module: { classroom: { schoolId } } },
    });
    if (!s) throw new NotFoundException('Sección no encontrada');
    return s;
  }

  async createSection(moduleId: string, data: { title: string; description?: string; order?: number; isPublished?: boolean }, user: any) {
    const schoolId = this.assertSchool(user);
    await this.assertModuleOwner(moduleId, schoolId);
    const last = await this.prisma.classSection.findFirst({ where: { moduleId }, orderBy: { order: 'desc' } });
    return this.prisma.classSection.create({
      data: { moduleId, title: data.title, description: data.description, isPublished: data.isPublished ?? true, order: data.order ?? (last ? last.order + 1 : 0) },
    });
  }

  async updateSection(sectionId: string, data: any, user: any) {
    const schoolId = this.assertSchool(user);
    await this.assertSectionOwner(sectionId, schoolId);
    return this.prisma.classSection.update({ where: { id: sectionId }, data });
  }

  async deleteSection(sectionId: string, user: any) {
    const schoolId = this.assertSchool(user);
    await this.assertSectionOwner(sectionId, schoolId);
    await this.prisma.classSection.delete({ where: { id: sectionId } });
    return { ok: true };
  }

  // ── ADMIN — Topics ────────────────────────────────────────────────────────

  private async assertTopicOwner(topicId: string, schoolId: string) {
    const t = await this.prisma.classTopic.findFirst({
      where: { id: topicId, section: { module: { classroom: { schoolId } } } },
    });
    if (!t) throw new NotFoundException('Tema no encontrado');
    return t;
  }

  async createTopic(sectionId: string, data: { title: string; description?: string; order?: number; isPublished?: boolean }, user: any) {
    const schoolId = this.assertSchool(user);
    await this.assertSectionOwner(sectionId, schoolId);
    const last = await this.prisma.classTopic.findFirst({ where: { sectionId }, orderBy: { order: 'desc' } });
    return this.prisma.classTopic.create({
      data: { sectionId, title: data.title, description: data.description, isPublished: data.isPublished ?? true, order: data.order ?? (last ? last.order + 1 : 0) },
    });
  }

  async updateTopic(topicId: string, data: any, user: any) {
    const schoolId = this.assertSchool(user);
    await this.assertTopicOwner(topicId, schoolId);
    return this.prisma.classTopic.update({ where: { id: topicId }, data });
  }

  async deleteTopic(topicId: string, user: any) {
    const schoolId = this.assertSchool(user);
    await this.assertTopicOwner(topicId, schoolId);
    await this.prisma.classTopic.delete({ where: { id: topicId } });
    return { ok: true };
  }

  async findTopicAdmin(topicId: string, user: any) {
    const schoolId = this.assertSchool(user);
    const topic = await this.prisma.classTopic.findFirst({
      where: { id: topicId, section: { module: { classroom: { schoolId } } } },
      include: {
        subtopics: { orderBy: { order: 'asc' }, include: { units: { orderBy: { order: 'asc' } } } },
        units: { orderBy: { order: 'asc' } },
        simulacros: { include: { simulacro: { select: { id: true, titulo: true, totalPreguntas: true } } }, orderBy: { order: 'asc' } },
      },
    });
    if (!topic) throw new NotFoundException('Tema no encontrado');
    return topic;
  }

  // ── ADMIN — Subtopics ─────────────────────────────────────────────────────

  private async assertSubtopicOwner(subtopicId: string, schoolId: string) {
    const s = await this.prisma.classSubtopic.findFirst({
      where: { id: subtopicId, topic: { section: { module: { classroom: { schoolId } } } } },
    });
    if (!s) throw new NotFoundException('Subtema no encontrado');
    return s;
  }

  async createSubtopic(topicId: string, data: { title: string; description?: string; order?: number; isPublished?: boolean }, user: any) {
    const schoolId = this.assertSchool(user);
    await this.assertTopicOwner(topicId, schoolId);
    const last = await this.prisma.classSubtopic.findFirst({ where: { topicId }, orderBy: { order: 'desc' } });
    return this.prisma.classSubtopic.create({
      data: { topicId, title: data.title, description: data.description, isPublished: data.isPublished ?? true, order: data.order ?? (last ? last.order + 1 : 0) },
    });
  }

  async updateSubtopic(subtopicId: string, data: any, user: any) {
    const schoolId = this.assertSchool(user);
    await this.assertSubtopicOwner(subtopicId, schoolId);
    return this.prisma.classSubtopic.update({ where: { id: subtopicId }, data });
  }

  async deleteSubtopic(subtopicId: string, user: any) {
    const schoolId = this.assertSchool(user);
    await this.assertSubtopicOwner(subtopicId, schoolId);
    await this.prisma.classSubtopic.delete({ where: { id: subtopicId } });
    return { ok: true };
  }

  // ── ADMIN — Learning Units ────────────────────────────────────────────────

  private async assertUnitOwner(unitId: string, schoolId: string) {
    const u = await this.prisma.learningUnit.findFirst({
      where: {
        id: unitId,
        OR: [
          { topic: { section: { module: { classroom: { schoolId } } } } },
          { subtopic: { topic: { section: { module: { classroom: { schoolId } } } } } },
        ],
      },
    });
    if (!u) throw new NotFoundException('Unidad no encontrada');
    return u;
  }

  async createUnitForTopic(topicId: string, data: any, user: any) {
    const schoolId = this.assertSchool(user);
    await this.assertTopicOwner(topicId, schoolId);
    const last = await this.prisma.learningUnit.findFirst({ where: { topicId }, orderBy: { order: 'desc' } });
    return this.prisma.learningUnit.create({
      data: { ...data, topicId, subtopicId: undefined, order: data.order ?? (last ? last.order + 1 : 0) },
    });
  }

  async createUnitForSubtopic(subtopicId: string, data: any, user: any) {
    const schoolId = this.assertSchool(user);
    await this.assertSubtopicOwner(subtopicId, schoolId);
    const last = await this.prisma.learningUnit.findFirst({ where: { subtopicId }, orderBy: { order: 'desc' } });
    return this.prisma.learningUnit.create({
      data: { ...data, subtopicId, topicId: undefined, order: data.order ?? (last ? last.order + 1 : 0) },
    });
  }

  async updateUnit(unitId: string, data: any, user: any) {
    const schoolId = this.assertSchool(user);
    await this.assertUnitOwner(unitId, schoolId);
    return this.prisma.learningUnit.update({ where: { id: unitId }, data });
  }

  async deleteUnit(unitId: string, user: any) {
    const schoolId = this.assertSchool(user);
    await this.assertUnitOwner(unitId, schoolId);
    await this.prisma.learningUnit.delete({ where: { id: unitId } });
    return { ok: true };
  }

  // ── ADMIN — Topic Simulacros ──────────────────────────────────────────────

  async addTopicSimulacro(topicId: string, simulacroId: string, user: any) {
    const schoolId = this.assertSchool(user);
    await this.assertTopicOwner(topicId, schoolId);
    const last = await this.prisma.topicSimulacro.findFirst({ where: { topicId }, orderBy: { order: 'desc' } });
    return this.prisma.topicSimulacro.upsert({
      where: { topicId_simulacroId: { topicId, simulacroId } },
      create: { topicId, simulacroId, order: last ? last.order + 1 : 0 },
      update: {},
    });
  }

  async removeTopicSimulacro(topicId: string, simulacroId: string, user: any) {
    const schoolId = this.assertSchool(user);
    await this.assertTopicOwner(topicId, schoolId);
    await this.prisma.topicSimulacro.deleteMany({ where: { topicId, simulacroId } });
    return { ok: true };
  }

  // ── ADMIN / STUDENT — Forums ──────────────────────────────────────────────

  private async assertForumAccess(forumId: string, user: any) {
    const forum = await this.prisma.forum.findFirst({
      where: {
        id: forumId,
        classroom: user.role === 'ESTUDIANTE'
          ? { isPublished: true, enrollments: { some: { studentId: user.id } } }
          : { schoolId: user.schoolId },
      },
    });
    if (!forum) throw new NotFoundException('Foro no encontrado');
    return forum;
  }

  async listForums(classroomId: string, user: any) {
    const schoolId = this.assertSchool(user);
    if (user.role === 'ESTUDIANTE') {
      const enrollment = await this.prisma.classEnrollment.findFirst({ where: { classroomId, studentId: user.id } });
      if (!enrollment) throw new ForbiddenException('No estás inscrito');
    } else {
      await this.assertClassroomOwner(classroomId, schoolId);
    }
    return this.prisma.forum.findMany({
      where: { classroomId },
      include: { _count: { select: { threads: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createForum(classroomId: string, data: { title: string; description?: string; moduleId?: string; sectionId?: string; topicId?: string }, user: any) {
    const schoolId = this.assertSchool(user);
    await this.assertClassroomOwner(classroomId, schoolId);
    return this.prisma.forum.create({ data: { ...data, classroomId } });
  }

  async updateForum(forumId: string, data: any, user: any) {
    const schoolId = this.assertSchool(user);
    const forum = await this.prisma.forum.findFirst({ where: { id: forumId, classroom: { schoolId } } });
    if (!forum) throw new NotFoundException('Foro no encontrado');
    return this.prisma.forum.update({ where: { id: forumId }, data });
  }

  async deleteForum(forumId: string, user: any) {
    const schoolId = this.assertSchool(user);
    const forum = await this.prisma.forum.findFirst({ where: { id: forumId, classroom: { schoolId } } });
    if (!forum) throw new NotFoundException('Foro no encontrado');
    await this.prisma.forum.delete({ where: { id: forumId } });
    return { ok: true };
  }

  // ── Threads ───────────────────────────────────────────────────────────────

  async listThreads(forumId: string, user: any) {
    await this.assertForumAccess(forumId, user);
    return this.prisma.forumThread.findMany({
      where: { forumId },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        _count: { select: { posts: true } },
      },
      orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  async createThread(forumId: string, data: { title: string }, user: any) {
    const forum = await this.assertForumAccess(forumId, user);
    if (forum.isLocked) throw new ForbiddenException('Foro bloqueado');
    return this.prisma.forumThread.create({
      data: { forumId, authorId: user.id, title: data.title },
      include: { author: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async updateThread(threadId: string, data: any, user: any) {
    const thread = await this.prisma.forumThread.findFirst({
      where: { id: threadId, forum: { classroom: user.role === 'ADMIN' ? { schoolId: user.schoolId } : undefined } },
    });
    if (!thread) throw new NotFoundException('Hilo no encontrado');
    if (user.role === 'ESTUDIANTE' && thread.authorId !== user.id) throw new ForbiddenException('Sin permiso');
    return this.prisma.forumThread.update({ where: { id: threadId }, data });
  }

  async deleteThread(threadId: string, user: any) {
    const thread = await this.prisma.forumThread.findFirst({
      where: { id: threadId, forum: { classroom: { schoolId: user.schoolId } } },
    });
    if (!thread) throw new NotFoundException('Hilo no encontrado');
    await this.prisma.forumThread.delete({ where: { id: threadId } });
    return { ok: true };
  }

  // ── Posts ─────────────────────────────────────────────────────────────────

  async listPosts(threadId: string, user: any) {
    const thread = await this.prisma.forumThread.findFirst({
      where: {
        id: threadId,
        forum: {
          classroom: user.role === 'ESTUDIANTE'
            ? { isPublished: true, enrollments: { some: { studentId: user.id } } }
            : { schoolId: user.schoolId },
        },
      },
    });
    if (!thread) throw new NotFoundException('Hilo no encontrado');
    await this.prisma.forumThread.update({ where: { id: threadId }, data: { viewCount: { increment: 1 } } });
    return this.prisma.forumPost.findMany({
      where: { threadId, parentId: null },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, avatar: true, role: true } },
        replies: {
          include: { author: { select: { id: true, firstName: true, lastName: true, avatar: true, role: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createPost(threadId: string, data: { content: string; parentId?: string }, user: any) {
    const thread = await this.prisma.forumThread.findFirst({
      where: {
        id: threadId,
        forum: {
          classroom: user.role === 'ESTUDIANTE'
            ? { isPublished: true, enrollments: { some: { studentId: user.id } } }
            : { schoolId: user.schoolId },
        },
      },
      include: { forum: true },
    });
    if (!thread) throw new NotFoundException('Hilo no encontrado');
    if (thread.isLocked || thread.forum.isLocked) throw new ForbiddenException('Hilo o foro bloqueado');
    return this.prisma.forumPost.create({
      data: { threadId, authorId: user.id, content: data.content, parentId: data.parentId ?? null },
      include: { author: { select: { id: true, firstName: true, lastName: true, avatar: true, role: true } } },
    });
  }

  async updatePost(postId: string, data: { content: string }, user: any) {
    const post = await this.prisma.forumPost.findFirst({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post no encontrado');
    if (post.authorId !== user.id && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')
      throw new ForbiddenException('Sin permiso');
    return this.prisma.forumPost.update({ where: { id: postId }, data: { content: data.content, isEdited: true } });
  }

  async deletePost(postId: string, user: any) {
    const post = await this.prisma.forumPost.findFirst({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post no encontrado');
    if (post.authorId !== user.id && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')
      throw new ForbiddenException('Sin permiso');
    await this.prisma.forumPost.delete({ where: { id: postId } });
    return { ok: true };
  }

  // ── STUDENT — Progress ────────────────────────────────────────────────────

  async markUnitComplete(unitId: string, user: any) {
    const unit = await this.prisma.learningUnit.findFirst({
      where: {
        id: unitId,
        isPublished: true,
        OR: [
          { topic: { isPublished: true, section: { isPublished: true, module: { isPublished: true, classroom: { isPublished: true, enrollments: { some: { studentId: user.id } } } } } } },
          { subtopic: { isPublished: true, topic: { isPublished: true, section: { isPublished: true, module: { isPublished: true, classroom: { isPublished: true, enrollments: { some: { studentId: user.id } } } } } } } },
        ],
      },
    });
    if (!unit) throw new NotFoundException('Unidad no disponible');
    const progress = await this.prisma.unitProgress.upsert({
      where: { studentId_unitId: { studentId: user.id, unitId } },
      create: { studentId: user.id, unitId, isCompleted: true, completedAt: new Date() },
      update: { isCompleted: true, completedAt: new Date() },
    });
    return progress;
  }

  async getClassroomProgress(classroomId: string, user: any) {
    const enrollment = await this.prisma.classEnrollment.findFirst({ where: { classroomId, studentId: user.id } });
    if (!enrollment) throw new ForbiddenException('No estás inscrito');

    const [totalUnits, completedUnits] = await Promise.all([
      this.prisma.learningUnit.count({
        where: {
          isPublished: true,
          OR: [
            { topic: { isPublished: true, section: { isPublished: true, module: { classroomId, isPublished: true } } } },
            { subtopic: { isPublished: true, topic: { isPublished: true, section: { isPublished: true, module: { classroomId, isPublished: true } } } } },
          ],
        },
      }),
      this.prisma.unitProgress.count({
        where: {
          studentId: user.id,
          isCompleted: true,
          unit: {
            isPublished: true,
            OR: [
              { topic: { isPublished: true, section: { isPublished: true, module: { classroomId, isPublished: true } } } },
              { subtopic: { isPublished: true, topic: { isPublished: true, section: { isPublished: true, module: { classroomId, isPublished: true } } } } },
            ],
          },
        },
      }),
    ]);

    return { totalUnits, completedUnits, percentage: totalUnits > 0 ? Math.round((completedUnits / totalUnits) * 100) : 0 };
  }

  // ── STUDENT — Enriched classroom view (with sections/topics/subtopics) ────

  async findOneStudentFull(classroomId: string, user: any) {
    const enrollment = await this.prisma.classEnrollment.findFirst({ where: { classroomId, studentId: user.id } });
    if (!enrollment) throw new ForbiddenException('No estás inscrito en esta clase');

    const classroom = await this.prisma.classroom.findFirst({
      where: { id: classroomId, isPublished: true },
      include: {
        modules: {
          where: { isPublished: true },
          orderBy: { order: 'asc' },
          include: {
            materials: { orderBy: { order: 'asc' } },
            activities: {
              where: { isPublished: true },
              orderBy: { order: 'asc' },
              include: {
                submissions: { where: { studentId: user.id }, select: { id: true, status: true, score: true, submittedAt: true } },
              },
            },
            sections: {
              where: { isPublished: true },
              orderBy: { order: 'asc' },
              include: {
                topics: {
                  where: { isPublished: true },
                  orderBy: { order: 'asc' },
                  include: {
                    units: { where: { isPublished: true }, orderBy: { order: 'asc' }, include: { progress: { where: { studentId: user.id } } } },
                    simulacros: { orderBy: { order: 'asc' }, include: { simulacro: { select: { id: true, titulo: true, totalPreguntas: true, duracionMinutos: true } } } },
                    subtopics: {
                      where: { isPublished: true },
                      orderBy: { order: 'asc' },
                      include: {
                        units: { where: { isPublished: true }, orderBy: { order: 'asc' }, include: { progress: { where: { studentId: user.id } } } },
                      },
                    },
                    progress: { where: { studentId: user.id } },
                  },
                },
              },
            },
          },
        },
        forums: { include: { _count: { select: { threads: true } } }, orderBy: { createdAt: 'asc' } },
      },
    });
    if (!classroom) throw new NotFoundException('Clase no disponible');
    return classroom;
  }

  // ── ADMIN — Full classroom view (with sections/topics/subtopics) ──────────

  async findOneAdminFull(id: string, user: any) {
    const schoolId = this.assertSchool(user);
    const classroom = await this.prisma.classroom.findFirst({
      where: { id, schoolId },
      include: {
        modules: {
          orderBy: { order: 'asc' },
          include: {
            materials: { orderBy: { order: 'asc' } },
            activities: { orderBy: { order: 'asc' }, include: { _count: { select: { submissions: true } } } },
            sections: {
              orderBy: { order: 'asc' },
              include: {
                topics: {
                  orderBy: { order: 'asc' },
                  include: {
                    units: { orderBy: { order: 'asc' } },
                    simulacros: { orderBy: { order: 'asc' }, include: { simulacro: { select: { id: true, titulo: true, totalPreguntas: true } } } },
                    subtopics: {
                      orderBy: { order: 'asc' },
                      include: { units: { orderBy: { order: 'asc' } } },
                    },
                  },
                },
              },
            },
          },
        },
        forums: { include: { _count: { select: { threads: true } } }, orderBy: { createdAt: 'asc' } },
        _count: { select: { enrollments: true } },
      },
    });
    if (!classroom) throw new NotFoundException('Aula no encontrada');
    return classroom;
  }

  // ── Protected file serving ───────────────────────────────────────────────

  async resolveProtectedFile(fileKey: string, requestUser: any) {
    const parts = fileKey.split('/');
    // fileKey format: classrooms/{schoolId}/{classroomId}/...
    if (parts.length < 3 || parts[0] !== 'classrooms') {
      throw new ForbiddenException('Clave de archivo inválida');
    }
    const fileSchoolId = parts[1];
    const classroomId = parts[2];

    if (requestUser.role === 'ESTUDIANTE') {
      const enrollment = await this.prisma.classEnrollment.findFirst({
        where: { classroomId, studentId: requestUser.userId },
      });
      if (!enrollment) throw new ForbiddenException('Sin acceso a este archivo');
    } else if (requestUser.role === 'ADMIN') {
      if (requestUser.schoolId !== fileSchoolId) throw new ForbiddenException('Sin acceso');
    }

    const filePath = this.protectedPath(fileKey);
    if (!existsSync(filePath)) throw new NotFoundException('Archivo no encontrado');
    return filePath;
  }

  // ─────────────────────────────────────────────
  //  PREREQUISITES
  // ─────────────────────────────────────────────

  async listPrerequisites(topicId: string) {
    return this.prisma.topicPrerequisite.findMany({
      where: { topicId },
      include: { prerequisite: { select: { id: true, title: true } } },
    });
  }

  async addPrerequisite(topicId: string, prerequisiteId: string) {
    if (topicId === prerequisiteId) throw new BadRequestException('Un tema no puede ser prerrequisito de sí mismo');
    return this.prisma.topicPrerequisite.create({
      data: { topicId, prerequisiteId },
      include: { prerequisite: { select: { id: true, title: true } } },
    });
  }

  async removePrerequisite(topicId: string, prerequisiteId: string) {
    await this.prisma.topicPrerequisite.deleteMany({ where: { topicId, prerequisiteId } });
  }

  // ─────────────────────────────────────────────
  //  TOPIC MATERIALS
  // ─────────────────────────────────────────────

  async listTopicMaterials(topicId: string) {
    return this.prisma.topicMaterial.findMany({
      where: { topicId },
      orderBy: { order: 'asc' },
    });
  }

  async listSubtopicMaterials(subtopicId: string) {
    return this.prisma.topicMaterial.findMany({
      where: { subtopicId },
      orderBy: { order: 'asc' },
    });
  }

  async createTopicMaterial(data: { topicId?: string; subtopicId?: string; title: string; description?: string; type: MaterialType; fileKey?: string; fileName?: string; fileSize?: number; mimeType?: string; externalUrl?: string; allowDownload?: boolean; order?: number }) {
    return this.prisma.topicMaterial.create({ data });
  }

  async deleteTopicMaterial(materialId: string) {
    await this.prisma.topicMaterial.delete({ where: { id: materialId } });
  }

  // ─────────────────────────────────────────────
  //  TOPIC ACTIVITIES & SUBMISSIONS
  // ─────────────────────────────────────────────

  async listTopicActivities(topicId: string) {
    return this.prisma.topicActivity.findMany({
      where: { topicId },
      include: { _count: { select: { submissions: true } } },
      orderBy: { order: 'asc' },
    });
  }

  async listSubtopicActivities(subtopicId: string) {
    return this.prisma.topicActivity.findMany({
      where: { subtopicId },
      include: { _count: { select: { submissions: true } } },
      orderBy: { order: 'asc' },
    });
  }

  async createTopicActivity(data: { topicId?: string; subtopicId?: string; title: string; description?: string; instructions?: string; dueDate?: Date; maxScore?: number; weight?: number; allowFiles?: boolean; isPublished?: boolean; order?: number }) {
    return this.prisma.topicActivity.create({ data });
  }

  async updateTopicActivity(activityId: string, data: Partial<{ title: string; description: string; instructions: string; dueDate: Date; maxScore: number; weight: number; allowFiles: boolean; isPublished: boolean; order: number }>) {
    return this.prisma.topicActivity.update({ where: { id: activityId }, data });
  }

  async deleteTopicActivity(activityId: string) {
    await this.prisma.topicActivity.delete({ where: { id: activityId } });
  }

  async listActivitySubmissions(activityId: string) {
    return this.prisma.topicSubmission.findMany({
      where: { activityId },
      include: { student: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async submitTopicActivity(activityId: string, studentId: string, data: { content?: string; fileKeys?: string[]; fileNames?: string[] }) {
    const existing = await this.prisma.topicSubmission.findUnique({ where: { activityId_studentId: { activityId, studentId } } });
    if (existing) {
      return this.prisma.topicSubmission.update({
        where: { activityId_studentId: { activityId, studentId } },
        data: { ...data, status: SubmissionStatus.SUBMITTED, submittedAt: new Date() },
      });
    }
    return this.prisma.topicSubmission.create({
      data: { activityId, studentId, ...data, status: SubmissionStatus.SUBMITTED, submittedAt: new Date() },
    });
  }

  async gradeTopicSubmission(submissionId: string, graderId: string, data: { score: number; feedback?: string }) {
    return this.prisma.topicSubmission.update({
      where: { id: submissionId },
      data: { score: data.score, feedback: data.feedback, status: SubmissionStatus.GRADED, gradedAt: new Date(), gradedById: graderId },
    });
  }

  async myTopicSubmission(activityId: string, studentId: string) {
    return this.prisma.topicSubmission.findUnique({ where: { activityId_studentId: { activityId, studentId } } });
  }

  async getTopicActivityForStudent(activityId: string) {
    const act = await this.prisma.topicActivity.findUnique({ where: { id: activityId } });
    if (!act) throw new NotFoundException('Tarea no encontrada');
    if (!act.isPublished) throw new ForbiddenException('Tarea no disponible');
    return act;
  }

  // ─────────────────────────────────────────────
  //  QUIZZES
  // ─────────────────────────────────────────────

  async listQuizzes(classroomId: string) {
    return this.prisma.classQuiz.findMany({
      where: { classroomId },
      include: { _count: { select: { questions: true, attempts: true } } },
      orderBy: { order: 'asc' },
    });
  }

  async getQuiz(quizId: string) {
    const quiz = await this.prisma.classQuiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          include: { options: { orderBy: { order: 'asc' } } },
        },
      },
    });
    if (!quiz) throw new NotFoundException('Quiz no encontrado');
    return quiz;
  }

  async getQuizForStudent(quizId: string, studentId: string) {
    const quiz = await this.prisma.classQuiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          include: {
            options: {
              orderBy: { order: 'asc' },
              select: { id: true, content: true, order: true },
            },
          },
        },
        _count: { select: { attempts: { where: { studentId } } } },
      },
    });
    if (!quiz) throw new NotFoundException('Quiz no encontrado');
    if (quiz.status !== QuizStatus.PUBLISHED) throw new ForbiddenException('Quiz no disponible');
    return quiz;
  }

  async createQuiz(data: { classroomId: string; topicId?: string; subtopicId?: string; title: string; description?: string; instructions?: string; timeLimit?: number; maxAttempts?: number; passingScore?: number; weight?: number; shuffleQuestions?: boolean; showResults?: boolean; dueDate?: Date; availableFrom?: Date; order?: number }) {
    return this.prisma.classQuiz.create({ data });
  }

  async updateQuiz(quizId: string, data: Partial<{ title: string; description: string; instructions: string; timeLimit: number; maxAttempts: number; passingScore: number; weight: number; shuffleQuestions: boolean; showResults: boolean; status: QuizStatus; dueDate: Date; availableFrom: Date; order: number }>) {
    return this.prisma.classQuiz.update({ where: { id: quizId }, data });
  }

  async deleteQuiz(quizId: string) {
    await this.prisma.classQuiz.delete({ where: { id: quizId } });
  }

  async addQuizQuestion(quizId: string, data: { content: string; explanation?: string; imageUrl?: string; points?: number; order?: number; options: { content: string; isCorrect: boolean; order?: number }[] }) {
    const { options, ...questionData } = data;
    return this.prisma.quizQuestion.create({
      data: { quizId, ...questionData, options: { create: options } },
      include: { options: { orderBy: { order: 'asc' } } },
    });
  }

  async updateQuizQuestion(questionId: string, data: Partial<{ content: string; explanation: string; imageUrl: string; points: number; order: number }>) {
    return this.prisma.quizQuestion.update({ where: { id: questionId }, data });
  }

  async deleteQuizQuestion(questionId: string) {
    await this.prisma.quizQuestion.delete({ where: { id: questionId } });
  }

  async startQuizAttempt(quizId: string, studentId: string) {
    const quiz = await this.prisma.classQuiz.findUnique({ where: { id: quizId } });
    if (!quiz || quiz.status !== QuizStatus.PUBLISHED) throw new ForbiddenException('Quiz no disponible');

    const attemptsCount = await this.prisma.quizAttempt.count({ where: { quizId, studentId } });
    if (attemptsCount >= quiz.maxAttempts) throw new ForbiddenException('Has alcanzado el máximo de intentos');

    return this.prisma.quizAttempt.create({
      data: { quizId, studentId, status: QuizAttemptStatus.IN_PROGRESS },
    });
  }

  async submitQuizAttempt(attemptId: string, studentId: string, answers: { questionId: string; selectedOptionId: string }[]) {
    const attempt = await this.prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: { quiz: { include: { questions: { include: { options: true } } } } },
    });
    if (!attempt || attempt.studentId !== studentId) throw new NotFoundException('Intento no encontrado');
    if (attempt.status !== QuizAttemptStatus.IN_PROGRESS) throw new BadRequestException('Este intento ya fue enviado');

    let totalPoints = 0;
    let earnedPoints = 0;
    const answerData = [];

    for (const q of attempt.quiz.questions) {
      totalPoints += q.points;
      const submitted = answers.find((a) => a.questionId === q.id);
      const selectedOption = submitted ? q.options.find((o) => o.id === submitted.selectedOptionId) : null;
      const isCorrect = selectedOption?.isCorrect ?? false;
      const pointsEarned = isCorrect ? q.points : 0;
      earnedPoints += pointsEarned;
      answerData.push({
        attemptId,
        questionId: q.id,
        selectedOptionId: submitted?.selectedOptionId ?? null,
        isCorrect,
        pointsEarned,
      });
    }

    const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
    const passed = score >= attempt.quiz.passingScore;
    const now = new Date();
    const timeSpentSec = Math.floor((now.getTime() - attempt.startedAt.getTime()) / 1000);

    await this.prisma.quizAnswer.createMany({ data: answerData, skipDuplicates: true });
    return this.prisma.quizAttempt.update({
      where: { id: attemptId },
      data: { status: QuizAttemptStatus.COMPLETED, submittedAt: now, score, maxScore: 100, passed, timeSpentSec },
      include: { answers: { include: { question: { select: { content: true, explanation: true, options: { select: { id: true, content: true, isCorrect: true, order: true }, orderBy: { order: 'asc' } } } } } } },
    });
  }

  async getMyQuizAttempts(quizId: string, studentId: string) {
    return this.prisma.quizAttempt.findMany({
      where: { quizId, studentId },
      orderBy: { startedAt: 'desc' },
    });
  }

  async getAttemptDetail(attemptId: string) {
    return this.prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        answers: {
          include: {
            question: { select: { content: true, explanation: true, points: true, options: { select: { id: true, content: true, isCorrect: true, order: true } } } },
          },
        },
      },
    });
  }

  // ─────────────────────────────────────────────
  //  GRADING & COURSE GRADES
  // ─────────────────────────────────────────────

  async getGradingConfig(classroomId: string) {
    const config = await this.prisma.gradingConfig.findUnique({ where: { classroomId } });
    if (!config) {
      return { classroomId, activityWeight: 0.4, quizWeight: 0.4, simulacroWeight: 0.2, minPassingScore: 60 };
    }
    return config;
  }

  async upsertGradingConfig(classroomId: string, data: { activityWeight?: number; quizWeight?: number; simulacroWeight?: number; minPassingScore?: number }) {
    return this.prisma.gradingConfig.upsert({
      where: { classroomId },
      create: { classroomId, ...data, updatedAt: new Date() },
      update: { ...data, updatedAt: new Date() },
    });
  }

  async recalculateCourseGrade(classroomId: string, studentId: string) {
    const config = await this.getGradingConfig(classroomId);

    const activities = await this.prisma.topicSubmission.findMany({
      where: { studentId, activity: { topic: { section: { module: { classroomId } } } } },
      include: { activity: { select: { maxScore: true, weight: true } } },
    });

    let activityScore: number | null = null;
    if (activities.length > 0) {
      let weighted = 0; let totalWeight = 0;
      for (const s of activities) {
        if (s.score != null) {
          const pct = (s.score / (s.activity.maxScore || 10)) * 100;
          weighted += pct * s.activity.weight;
          totalWeight += s.activity.weight;
        }
      }
      activityScore = totalWeight > 0 ? weighted / totalWeight : null;
    }

    const quizAttempts = await this.prisma.quizAttempt.findMany({
      where: { studentId, status: QuizAttemptStatus.COMPLETED, quiz: { classroomId } },
      orderBy: { score: 'desc' },
    });
    let quizScore: number | null = null;
    if (quizAttempts.length > 0) {
      const bestByQuiz = new Map<string, number>();
      for (const a of quizAttempts) {
        if (!bestByQuiz.has(a.quizId) || (a.score ?? 0) > bestByQuiz.get(a.quizId)!) {
          bestByQuiz.set(a.quizId, a.score ?? 0);
        }
      }
      quizScore = Array.from(bestByQuiz.values()).reduce((a, b) => a + b, 0) / bestByQuiz.size;
    }

    let finalScore: number | null = null;
    const parts: number[] = [];
    const weights: number[] = [];
    if (activityScore != null) { parts.push(activityScore * config.activityWeight); weights.push(config.activityWeight); }
    if (quizScore != null) { parts.push(quizScore * config.quizWeight); weights.push(config.quizWeight); }
    if (parts.length > 0) {
      const totalW = weights.reduce((a, b) => a + b, 0);
      finalScore = parts.reduce((a, b) => a + b, 0) / totalW;
    }

    const isPassing = finalScore != null && finalScore >= config.minPassingScore;

    return this.prisma.courseGrade.upsert({
      where: { classroomId_studentId: { classroomId, studentId } },
      create: { classroomId, studentId, activityScore, quizScore, finalScore, isPassing, updatedAt: new Date() },
      update: { activityScore, quizScore, finalScore, isPassing, calculatedAt: new Date(), updatedAt: new Date() },
    });
  }

  async getCourseGrades(classroomId: string) {
    return this.prisma.courseGrade.findMany({
      where: { classroomId },
      include: { student: { select: { id: true, firstName: true, lastName: true, documento: true } } },
      orderBy: [{ isPassing: 'desc' }, { finalScore: 'desc' }],
    });
  }

  async getMyCourseGrade(classroomId: string, studentId: string) {
    return this.prisma.courseGrade.findUnique({ where: { classroomId_studentId: { classroomId, studentId } } });
  }

  // ─────────────────────────────────────────────
  //  CERTIFICATES
  // ─────────────────────────────────────────────

  private generateVerificationCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 12; i++) {
      if (i > 0 && i % 4 === 0) code += '-';
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  async issueCertificate(classroomId: string, studentId: string) {
    const grade = await this.prisma.courseGrade.findUnique({ where: { classroomId_studentId: { classroomId, studentId } } });
    if (!grade || !grade.isPassing) throw new ForbiddenException('El estudiante no ha aprobado el curso');

    const existing = await this.prisma.completionCertificate.findUnique({ where: { classroomId_studentId: { classroomId, studentId } } });
    if (existing && existing.status === CertificateStatus.ISSUED) return existing;

    const verificationCode = this.generateVerificationCode();
    return this.prisma.completionCertificate.upsert({
      where: { classroomId_studentId: { classroomId, studentId } },
      create: { classroomId, studentId, verificationCode, status: CertificateStatus.ISSUED, issuedAt: new Date(), finalScore: grade.finalScore },
      update: { status: CertificateStatus.ISSUED, issuedAt: new Date(), finalScore: grade.finalScore },
    });
  }

  async issueCertificateBulk(classroomId: string) {
    const passingGrades = await this.prisma.courseGrade.findMany({ where: { classroomId, isPassing: true } });
    const results = await Promise.all(passingGrades.map((g) => this.issueCertificate(classroomId, g.studentId)));
    return results;
  }

  async listCertificates(classroomId: string) {
    return this.prisma.completionCertificate.findMany({
      where: { classroomId },
      include: { student: { select: { id: true, firstName: true, lastName: true, documento: true } } },
      orderBy: { issuedAt: 'desc' },
    });
  }

  async getMyCertificate(classroomId: string, studentId: string) {
    return this.prisma.completionCertificate.findUnique({
      where: { classroomId_studentId: { classroomId, studentId } },
      include: { classroom: { select: { title: true } }, student: { select: { firstName: true, lastName: true, documento: true } } },
    });
  }

  async verifyCertificate(verificationCode: string) {
    const cert = await this.prisma.completionCertificate.findUnique({
      where: { verificationCode },
      include: {
        classroom: { select: { title: true, school: { select: { name: true } } } },
        student: { select: { firstName: true, lastName: true } },
      },
    });
    if (!cert || cert.status !== CertificateStatus.ISSUED) throw new NotFoundException('Certificado no válido');
    return cert;
  }

  async revokeCertificate(classroomId: string, studentId: string) {
    return this.prisma.completionCertificate.update({
      where: { classroomId_studentId: { classroomId, studentId } },
      data: { status: CertificateStatus.REVOKED },
    });
  }

  // ─────────────────────────────────────────────
  //  UNIT CONTENT (materiales, pruebas, foros, tareas por unidad)
  // ─────────────────────────────────────────────

  private async getClassroomIdFromUnit(unitId: string): Promise<string> {
    const unit = await this.prisma.learningUnit.findUnique({
      where: { id: unitId },
      select: { topicId: true, subtopicId: true },
    });
    if (!unit) throw new NotFoundException('Unidad no encontrada');
    if (unit.topicId) {
      const topic = await this.prisma.classTopic.findUnique({
        where: { id: unit.topicId },
        include: { section: { include: { module: { select: { classroomId: true } } } } },
      });
      return topic!.section.module.classroomId;
    }
    if (unit.subtopicId) {
      const sub = await this.prisma.classSubtopic.findUnique({
        where: { id: unit.subtopicId },
        include: { topic: { include: { section: { include: { module: { select: { classroomId: true } } } } } } },
      });
      return sub!.topic.section.module.classroomId;
    }
    throw new NotFoundException('La unidad no pertenece a ningún aula');
  }

  async getUnitFull(unitId: string) {
    const unit = await this.prisma.learningUnit.findUnique({
      where: { id: unitId },
      include: {
        materials: { orderBy: { order: 'asc' } },
        activities: {
          orderBy: { order: 'asc' },
          include: { _count: { select: { submissions: true } } },
        },
        quizzes: {
          orderBy: { order: 'asc' },
          include: { _count: { select: { questions: true, attempts: true } } },
        },
        forums: { include: { _count: { select: { threads: true } } } },
      },
    });
    if (!unit) throw new NotFoundException('Unidad no encontrada');
    return unit;
  }

  async createUnitMaterial(unitId: string, data: { title: string; type: string; externalUrl?: string; description?: string; allowDownload?: boolean }) {
    return this.prisma.topicMaterial.create({
      data: { unitId, type: data.type as MaterialType, title: data.title, description: data.description, externalUrl: data.externalUrl, allowDownload: data.allowDownload ?? true },
    });
  }

  async deleteUnitMaterial(materialId: string) {
    await this.prisma.topicMaterial.delete({ where: { id: materialId } });
  }

  async createUnitActivity(unitId: string, data: { title: string; description?: string; instructions?: string; dueDate?: Date; maxScore?: number; weight?: number; allowFiles?: boolean; isPublished?: boolean }) {
    return this.prisma.topicActivity.create({ data: { unitId, ...data } });
  }

  async createUnitQuiz(unitId: string, data: { title: string; description?: string; instructions?: string; timeLimit?: number; maxAttempts?: number; passingScore?: number; shuffleQuestions?: boolean; showResults?: boolean }) {
    const classroomId = await this.getClassroomIdFromUnit(unitId);
    return this.prisma.classQuiz.create({ data: { unitId, classroomId, ...data } });
  }

  async getUnitForums(unitId: string) {
    return this.prisma.forum.findMany({
      where: { unitId },
      include: { _count: { select: { threads: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createUnitForum(unitId: string, data: { title: string; description?: string }) {
    const classroomId = await this.getClassroomIdFromUnit(unitId);
    return this.prisma.forum.create({ data: { classroomId, unitId, ...data } });
  }

  // ── ADMIN — ClassroomCourse (Aula ↔ Curso) ──────────────────────────────────

  async listClassroomCourses(classroomId: string, user: any) {
    const schoolId = this.assertSchool(user);
    await this.assertClassroomOwner(classroomId, schoolId);
    return this.prisma.classroomCourse.findMany({
      where: { classroomId },
      orderBy: { order: 'asc' },
      include: {
        course: {
          select: { id: true, title: true, slug: true, thumbnail: true, isPublished: true, isGlobal: true, instructorName: true },
        },
      },
    });
  }

  async assignCourseToClassroom(classroomId: string, courseId: string, order: number, isRequired: boolean, user: any) {
    const schoolId = this.assertSchool(user);
    await this.assertClassroomOwner(classroomId, schoolId);
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, OR: [{ schoolId }, { isGlobal: true }] },
    });
    if (!course) throw new ForbiddenException('Curso no disponible para esta institución');
    return this.prisma.classroomCourse.create({
      data: { classroomId, courseId, order: order ?? 0, isRequired: isRequired ?? true, assignedBy: user.sub ?? user.id },
      include: { course: { select: { id: true, title: true, slug: true, thumbnail: true, isPublished: true, isGlobal: true } } },
    });
  }

  async removeClassroomCourse(classroomId: string, courseId: string, user: any) {
    const schoolId = this.assertSchool(user);
    await this.assertClassroomOwner(classroomId, schoolId);
    await this.prisma.classroomCourse.delete({ where: { classroomId_courseId: { classroomId, courseId } } });
    return { ok: true };
  }

  // ── ADMIN — ClassroomSimulacro (Aula ↔ Simulacro) ───────────────────────────

  async listClassroomSimulacros(classroomId: string, user: any) {
    const schoolId = this.assertSchool(user);
    await this.assertClassroomOwner(classroomId, schoolId);
    return this.prisma.classroomSimulacro.findMany({
      where: { classroomId },
      orderBy: { order: 'asc' },
      include: {
        simulacro: {
          select: { id: true, titulo: true, descripcion: true, totalPreguntas: true, duracionMinutos: true, isPublished: true, isGlobal: true, examType: true },
        },
      },
    });
  }

  async assignSimulacroToClassroom(classroomId: string, simulacroId: string, dto: { dueDate?: string; isRequired?: boolean; context?: string; order?: number }, user: any) {
    const schoolId = this.assertSchool(user);
    await this.assertClassroomOwner(classroomId, schoolId);
    const simulacro = await this.prisma.simulacro.findFirst({
      where: { id: simulacroId, OR: [{ schoolId }, { isGlobal: true }] },
    });
    if (!simulacro) throw new ForbiddenException('Simulacro no disponible para esta institución');
    return this.prisma.classroomSimulacro.create({
      data: {
        classroomId,
        simulacroId,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        isRequired: dto.isRequired ?? true,
        context: dto.context ?? null,
        order: dto.order ?? 0,
        assignedBy: user.sub ?? user.id,
      },
      include: { simulacro: { select: { id: true, titulo: true, totalPreguntas: true, duracionMinutos: true, isPublished: true } } },
    });
  }

  async removeClassroomSimulacro(classroomId: string, simulacroId: string, user: any) {
    const schoolId = this.assertSchool(user);
    await this.assertClassroomOwner(classroomId, schoolId);
    await this.prisma.classroomSimulacro.delete({ where: { classroomId_simulacroId: { classroomId, simulacroId } } });
    return { ok: true };
  }

  async getUnitStudentView(unitId: string, studentId: string) {
    const unit = await this.prisma.learningUnit.findUnique({
      where: { id: unitId },
      include: {
        materials: { orderBy: { order: 'asc' } },
        activities: {
          where: { isPublished: true },
          orderBy: { order: 'asc' },
          include: {
            submissions: {
              where: { studentId },
              select: { id: true, status: true, score: true, submittedAt: true, feedback: true },
            },
          },
        },
        quizzes: {
          where: { status: QuizStatus.PUBLISHED },
          orderBy: { order: 'asc' },
          include: {
            _count: { select: { questions: true } },
            attempts: { where: { studentId }, orderBy: { submittedAt: 'desc' }, take: 1 },
          },
        },
        forums: { include: { _count: { select: { threads: true } } } },
        progress: { where: { studentId } },
      },
    });
    if (!unit) throw new NotFoundException('Unidad no encontrada');
    return unit;
  }
}
