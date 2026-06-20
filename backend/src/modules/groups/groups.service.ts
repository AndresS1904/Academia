import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import * as xlsx from 'xlsx';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CreateGroupDto, UpdateGroupDto, AssignSimulacroDto } from './dto/create-group.dto';

type RequestUser = { id: string; role: string; schoolId: string | null };

@Injectable()
export class GroupsService {
  constructor(
    private prisma: PrismaService,
    private email: EmailService,
  ) {}

  // ── Ownership guard ────────────────────────────────────────────
  private async assertOwnership(groupId: string, schoolId: string) {
    const group = await this.prisma.studentGroup.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Grupo no encontrado');
    if (group.schoolId !== schoolId) throw new ForbiddenException('No tienes acceso a este grupo');
    return group;
  }

  // ── CRUD grupos ────────────────────────────────────────────────
  async findOne(id: string, schoolId: string) {
    return this.assertOwnership(id, schoolId);
  }

  findAll(schoolId: string) {
    return this.prisma.studentGroup.findMany({
      where: { schoolId },
      include: { _count: { select: { members: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(dto: CreateGroupDto, schoolId: string) {
    return this.prisma.studentGroup.create({
      data: { name: dto.name, description: dto.description ?? null, schoolId },
    });
  }

  async update(id: string, dto: UpdateGroupDto, schoolId: string) {
    await this.assertOwnership(id, schoolId);
    return this.prisma.studentGroup.update({ where: { id }, data: dto });
  }

  async remove(id: string, schoolId: string) {
    await this.assertOwnership(id, schoolId);
    await this.prisma.studentGroup.update({ where: { id }, data: { isActive: false } });
    return { message: 'Grupo desactivado' };
  }

  // ── Miembros ────────────────────────────────────────────────────
  async findMembers(groupId: string, schoolId: string) {
    await this.assertOwnership(groupId, schoolId);
    return this.prisma.studentGroupMember.findMany({
      where: { groupId },
      include: {
        user: {
          select: {
            id: true, email: true, firstName: true, lastName: true,
            isActive: true, documento: true, phone: true, createdAt: true,
            _count: { select: { enrollments: true, simulacroAssignments: true } },
          },
        },
      },
      orderBy: { addedAt: 'asc' },
    });
  }

  async addMember(groupId: string, userId: string, schoolId: string) {
    await this.assertOwnership(groupId, schoolId);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Estudiante no encontrado');
    if (user.schoolId !== schoolId) throw new ForbiddenException('El estudiante no pertenece a tu colegio');

    await this.prisma.studentGroupMember.upsert({
      where: { groupId_userId: { groupId, userId } },
      create: { groupId, userId },
      update: {},
    });
    return { message: 'Estudiante agregado al grupo' };
  }

  async removeMember(groupId: string, userId: string, schoolId: string) {
    await this.assertOwnership(groupId, schoolId);
    try {
      await this.prisma.studentGroupMember.delete({
        where: { groupId_userId: { groupId, userId } },
      });
    } catch {
      throw new NotFoundException('El estudiante no pertenece a este grupo');
    }
    return { message: 'Estudiante removido del grupo' };
  }

  // ── Plantilla Excel ─────────────────────────────────────────────
  getTemplate(): Buffer {
    const ws = xlsx.utils.aoa_to_sheet([
      ['Nombre', 'Apellido', 'Email', 'Documento', 'Telefono'],
      ['Juan', 'García', 'juan.garcia@ejemplo.com', '1234567890', '3001234567'],
      ['María', 'López', 'maria.lopez@ejemplo.com', '0987654321', '3109876543'],
    ]);
    // Column widths
    ws['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 30 }, { wch: 14 }, { wch: 14 }];
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Estudiantes');
    return Buffer.from(xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' }));
  }

  // ── Importación masiva ──────────────────────────────────────────
  async importStudents(
    groupId: string,
    file: Express.Multer.File,
    updateExisting: boolean,
    schoolId: string,
  ) {
    await this.assertOwnership(groupId, schoolId);
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true },
    });
    const schoolName = school?.name ?? 'tu institución';

    if (!file?.buffer) throw new BadRequestException('No se recibió ningún archivo');

    // Parse Excel or CSV
    let rows: Record<string, any>[];
    try {
      const workbook = xlsx.read(file.buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });
    } catch {
      throw new BadRequestException('Archivo inválido o dañado');
    }

    if (!rows.length) throw new BadRequestException('El archivo está vacío o no tiene datos');

    const results = {
      success: 0,
      failed: 0,
      errors: [] as { row: number; email?: string; reason: string }[],
      passwords: [] as { nombre: string; email: string; password: string }[],
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +1 header +1 base index

      try {
        const firstName = this.col(row, ['Nombre', 'nombre', 'first_name', 'firstname']);
        const lastName  = this.col(row, ['Apellido', 'apellido', 'last_name', 'lastname']);
        const email     = this.col(row, ['Email', 'email', 'correo', 'Correo']).toLowerCase();
        const documento = this.col(row, ['Documento', 'documento', 'cedula', 'Cedula']) || null;
        const phone     = this.col(row, ['Telefono', 'teléfono', 'Telefono', 'Teléfono', 'phone']) || null;

        if (!firstName) throw new Error('Campo "Nombre" requerido');
        if (!lastName)  throw new Error('Campo "Apellido" requerido');
        if (!email)     throw new Error('Campo "Email" requerido');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Formato de email inválido');

        const existing = await this.prisma.user.findUnique({ where: { email } });
        let userId: string;

        if (existing) {
          if (existing.schoolId && existing.schoolId !== schoolId) {
            throw new Error('Email registrado en otro colegio');
          }
          if (updateExisting) {
            await this.prisma.user.update({
              where: { id: existing.id },
              data: {
                firstName, lastName, schoolId,
                ...(documento ? { documento } : {}),
                ...(phone ? { phone } : {}),
              },
            });
          }
          userId = existing.id;
        } else {
          // Validar documento duplicado si se proporcionó
          if (documento) {
            const docExists = await this.prisma.user.findUnique({ where: { documento } });
            if (docExists) throw new Error(`Documento ${documento} ya registrado`);
          }

          const password = this.generatePassword();
          const hashed = await bcrypt.hash(password, 10);
          const user = await this.prisma.user.create({
            data: {
              email, firstName, lastName, password: hashed,
              role: 'ESTUDIANTE', schoolId, mustChangePassword: true,
              ...(documento ? { documento } : {}),
              ...(phone ? { phone } : {}),
            },
          });
          userId = user.id;
          results.passwords.push({ nombre: `${firstName} ${lastName}`, email, password });
          // Enviar credenciales por correo (no bloquear el import si falla)
          this.email.sendWelcomeCredentials(email, firstName, password, schoolName).catch(() => {});
        }

        // Agregar al grupo (upsert para evitar duplicados)
        await this.prisma.studentGroupMember.upsert({
          where: { groupId_userId: { groupId, userId } },
          create: { groupId, userId },
          update: {},
        });

        results.success++;
      } catch (e: any) {
        results.failed++;
        results.errors.push({
          row: rowNum,
          email: this.col(rows[i], ['Email', 'email', 'correo']) || undefined,
          reason: e.message ?? 'Error desconocido',
        });
      }
    }

    return results;
  }

  // ── Asignación masiva ───────────────────────────────────────────
  async assignCourse(groupId: string, courseId: string, schoolId: string) {
    await this.assertOwnership(groupId, schoolId);

    const members = await this.prisma.studentGroupMember.findMany({
      where: { groupId },
      select: { userId: true },
    });
    if (!members.length) return { enrolled: 0, skipped: 0 };

    const result = await this.prisma.enrollment.createMany({
      data: members.map(({ userId }) => ({ userId, courseId, status: 'ACTIVE' as any })),
      skipDuplicates: true,
    });

    return { enrolled: result.count, skipped: members.length - result.count };
  }

  async assignSimulacro(groupId: string, dto: AssignSimulacroDto, schoolId: string) {
    await this.assertOwnership(groupId, schoolId);

    const members = await this.prisma.studentGroupMember.findMany({
      where: { groupId },
      select: { userId: true },
    });
    if (!members.length) return { assigned: 0, skipped: 0 };

    const result = await this.prisma.simulacroAssignment.createMany({
      data: members.map(({ userId }) => ({
        userId,
        simulacroId: dto.simulacroId,
        ...(dto.dueDate ? { dueDate: new Date(dto.dueDate) } : {}),
        ...(dto.instructions ? { instructions: dto.instructions } : {}),
      })),
      skipDuplicates: true,
    });

    return { assigned: result.count, skipped: members.length - result.count };
  }

  // ── Exportar CSV ────────────────────────────────────────────────
  async exportStudentsCsv(groupId: string, schoolId: string): Promise<string> {
    await this.assertOwnership(groupId, schoolId);
    const members = await this.prisma.studentGroupMember.findMany({
      where: { groupId },
      include: {
        user: {
          select: {
            firstName: true, lastName: true, email: true,
            documento: true, phone: true, createdAt: true,
            _count: { select: { enrollments: true, simulacroAssignments: true } },
          },
        },
      },
      orderBy: { addedAt: 'asc' },
    });
    const rows = [
      ['Nombre', 'Apellido', 'Email', 'Documento', 'Teléfono', 'Cursos inscritos', 'Simulacros asignados', 'Fecha ingreso al grupo'],
      ...members.map(m => [
        m.user.firstName, m.user.lastName, m.user.email,
        m.user.documento ?? '', m.user.phone ?? '',
        m.user._count.enrollments, m.user._count.simulacroAssignments,
        new Date(m.addedAt).toLocaleDateString('es-CO'),
      ]),
    ];
    return '\uFEFF' + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  }

  async exportSimulacrosCsv(groupId: string, schoolId: string): Promise<string> {
    await this.assertOwnership(groupId, schoolId);
    const members = await this.prisma.studentGroupMember.findMany({
      where: { groupId }, select: { userId: true },
    });
    const userIds = members.map(m => m.userId);
    const assignments = await this.prisma.simulacroAssignment.findMany({
      where: { userId: { in: userIds } },
      include: {
        user:      { select: { firstName: true, lastName: true, email: true } },
        simulacro: { select: { titulo: true } },
      },
      orderBy: [{ simulacroId: 'asc' }, { assignedAt: 'desc' }],
    });
    const rows = [
      ['Estudiante', 'Email', 'Simulacro', 'Puntaje (%)', 'Aprobó (≥60%)', 'Fecha completado', 'Fecha asignado'],
      ...assignments.map(a => [
        `${a.user.firstName} ${a.user.lastName}`,
        a.user.email,
        a.simulacro.titulo,
        a.score !== null ? a.score : 'Pendiente',
        a.score !== null ? (a.score >= 60 ? 'Sí' : 'No') : '—',
        a.completedAt ? new Date(a.completedAt).toLocaleDateString('es-CO') : '—',
        new Date(a.assignedAt).toLocaleDateString('es-CO'),
      ]),
    ];
    return '\uFEFF' + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  }

  // ── Analytics ────────────────────────────────────────────────────
  async getGroupAnalytics(groupId: string, schoolId: string) {
    await this.assertOwnership(groupId, schoolId);
    const members = await this.prisma.studentGroupMember.findMany({
      where: { groupId }, select: { userId: true },
    });
    const userIds = members.map(m => m.userId);

    if (!userIds.length) {
      return { totalMembers: 0, totalWithScores: 0, avgScore: null, passRate: null, bySimulacro: [], topStudents: [], bottomStudents: [] };
    }

    const assignments = await this.prisma.simulacroAssignment.findMany({
      where: { userId: { in: userIds } },
      include: {
        simulacro: { select: { id: true, titulo: true, emoji: true } },
        user:      { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    const completed = assignments.filter(a => a.score !== null);
    const avgScore = completed.length > 0
      ? Math.round(completed.reduce((s, a) => s + a.score!, 0) / completed.length * 10) / 10
      : null;
    const passRate = completed.length > 0
      ? Math.round(completed.filter(a => a.score! >= 60).length / completed.length * 100)
      : null;

    // Por simulacro
    const simMap: Record<string, { id: string; titulo: string; emoji: string; scores: number[]; total: number }> = {};
    for (const a of assignments) {
      const id = a.simulacro.id;
      if (!simMap[id]) simMap[id] = { id, titulo: a.simulacro.titulo, emoji: a.simulacro.emoji ?? '📋', scores: [], total: 0 };
      simMap[id].total++;
      if (a.score !== null) simMap[id].scores.push(a.score);
    }
    const bySimulacro = Object.values(simMap).map(s => ({
      id: s.id, titulo: s.titulo, emoji: s.emoji,
      totalAsignados: s.total, totalCompletados: s.scores.length,
      avgScore: s.scores.length > 0 ? Math.round(s.scores.reduce((a, b) => a + b, 0) / s.scores.length * 10) / 10 : null,
      passRate: s.scores.length > 0 ? Math.round(s.scores.filter(sc => sc >= 60).length / s.scores.length * 100) : null,
    }));

    // Por estudiante
    const stuMap: Record<string, { id: string; nombre: string; email: string; scores: number[] }> = {};
    for (const a of completed) {
      if (!stuMap[a.userId]) stuMap[a.userId] = { id: a.userId, nombre: `${a.user.firstName} ${a.user.lastName}`, email: a.user.email, scores: [] };
      stuMap[a.userId].scores.push(a.score!);
    }
    const students = Object.values(stuMap)
      .map(s => ({ ...s, avgScore: Math.round(s.scores.reduce((a, b) => a + b, 0) / s.scores.length * 10) / 10, total: s.scores.length }))
      .sort((a, b) => b.avgScore - a.avgScore);

    return {
      totalMembers: members.length,
      totalWithScores: students.length,
      avgScore, passRate,
      bySimulacro,
      topStudents: students.slice(0, 5),
      bottomStudents: [...students].reverse().slice(0, 5),
    };
  }

  // ── Helpers ─────────────────────────────────────────────────────
  private col(row: Record<string, any>, keys: string[]): string {
    for (const k of keys) {
      const v = row[k];
      if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
    }
    return '';
  }

  private generatePassword(): string {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
    return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }
}
