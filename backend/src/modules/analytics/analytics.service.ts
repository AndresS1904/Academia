import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AcademicLevel, AlertType, RiskLevel, Role, TrendDirection } from '@prisma/client';

export type RequestUser = { id: string; role: Role; schoolId: string | null };

// ─── Helpers ────────────────────────────────────────────────────────────────

function scaleToIcfes(accuracy: number): number {
  return Math.round(300 + accuracy * 200);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toLevel(accuracy: number): AcademicLevel {
  if (accuracy < 0.40) return AcademicLevel.BAJO;
  if (accuracy < 0.55) return AcademicLevel.MEDIO_BAJO;
  if (accuracy < 0.65) return AcademicLevel.MEDIO;
  if (accuracy < 0.75) return AcademicLevel.MEDIO_ALTO;
  return AcademicLevel.ALTO;
}

function toRisk(accuracy: number, trend: TrendDirection, totalAttempts: number): RiskLevel {
  if (accuracy < 0.35 || trend === TrendDirection.RETROCEDIENDO && accuracy < 0.50) return RiskLevel.CRITICO;
  if (accuracy < 0.50 || trend === TrendDirection.RETROCEDIENDO) return RiskLevel.ALTO;
  if (accuracy < 0.60 || trend === TrendDirection.ESTANCADO) return RiskLevel.MEDIO;
  return RiskLevel.BAJO;
}

function calcTrend(scores: number[]): TrendDirection {
  if (scores.length < 2) return TrendDirection.INSUFICIENTE_DATA;
  const last = scores.slice(-3); // last 3 attempts
  if (last.length < 2) return TrendDirection.INSUFICIENTE_DATA;
  const diffs = last.slice(1).map((v, i) => v - last[i]);
  const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  if (avg > 0.02) return TrendDirection.MEJORANDO;
  if (avg < -0.02) return TrendDirection.RETROCEDIENDO;
  return TrendDirection.ESTANCADO;
}

// ─── Predicción ICFES heurística ────────────────────────────────────────────
// base = accuracy * 200 + 300
// + difficultyBonus: más correctas en preguntas difíciles → hasta +12
// + timePenalty: muy rápido (<20s) → -5, muy lento (>90s) → -3
// + consistencyBonus: desviación estándar baja → hasta +5
// + trendBonus: mejorando en últimas 3 → +5
function predictIcfesScore(
  accuracy: number,
  difficultyBreakdown: { difficulty: string; correct: number; total: number }[],
  avgTimeSec: number,
  recentScores: number[],
): number {
  const base = 300 + accuracy * 200;

  // Difficulty bonus: hard questions correct
  const hard = difficultyBreakdown.find(d => d.difficulty === 'DIFICIL');
  const hardAcc = hard && hard.total > 0 ? hard.correct / hard.total : 0.5;
  const difficultyBonus = (hardAcc - 0.5) * 24; // –12 to +12

  // Time penalty
  let timePenalty = 0;
  if (avgTimeSec > 0 && avgTimeSec < 20) timePenalty = -5; // rushing
  if (avgTimeSec > 120) timePenalty = -3; // very slow

  // Consistency bonus
  let consistencyBonus = 0;
  if (recentScores.length >= 3) {
    const mean = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
    const variance = recentScores.reduce((a, b) => a + (b - mean) ** 2, 0) / recentScores.length;
    const stddev = Math.sqrt(variance);
    consistencyBonus = stddev < 0.05 ? 5 : stddev < 0.10 ? 2 : 0;
  }

  // Trend bonus
  const trendBonus = calcTrend(recentScores) === TrendDirection.MEJORANDO ? 5 : 0;

  const predicted = base + difficultyBonus + timePenalty + consistencyBonus + trendBonus;
  return clamp(Math.round(predicted), 300, 500);
}

// ─── Service ────────────────────────────────────────────────────────────────

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  // ── Called fire-and-forget after submitAttempt ────────────────────────────
  async computeAttemptSnapshot(attemptId: string): Promise<void> {
    try {
      const attempt = await this.prisma.simulacroAttempt.findUnique({
        where: { id: attemptId },
        include: {
          simulacro: { select: { id: true } },
          user: { select: { id: true, schoolId: true } },
          answers: {
            include: {
              question: {
                select: {
                  area: true, competence: true, topic: true, difficulty: true,
                },
              },
            },
          },
        },
      });

      if (!attempt || attempt.status === 'IN_PROGRESS') return;

      const answers = attempt.answers;
      const total = answers.length;
      const correct = answers.filter(a => a.isCorrect).length;
      const accuracyRate = total > 0 ? correct / total : 0;

      const totalTimeSec = answers.reduce((s, a) => s + (a.timeSpentSeconds ?? 0), 0);
      const avgTimeSec = total > 0 ? totalTimeSec / total : 0;

      // ── Area scores ──────────────────────────────────────────────────────
      const areaMap = new Map<string, { correct: number; total: number; totalTime: number }>();
      for (const a of answers) {
        const area = a.question.area ?? 'Sin área';
        if (!areaMap.has(area)) areaMap.set(area, { correct: 0, total: 0, totalTime: 0 });
        const r = areaMap.get(area)!;
        r.total++;
        if (a.isCorrect) r.correct++;
        r.totalTime += a.timeSpentSeconds ?? 0;
      }
      const areaScores = [...areaMap.entries()].map(([area, { correct, total, totalTime }]) => ({
        area,
        correct,
        total,
        accuracyRate: total > 0 ? correct / total : 0,
        avgTimeSec: total > 0 ? totalTime / total : 0,
      }));

      // ── Competence scores ────────────────────────────────────────────────
      const competenceMap = new Map<string, { correct: number; total: number }>();
      for (const a of answers) {
        const area = a.question.area ?? 'Sin área';
        const comp = a.question.competence ?? null;
        if (!comp) continue;
        const key = `${area}||${comp}`;
        if (!competenceMap.has(key)) competenceMap.set(key, { correct: 0, total: 0 });
        const r = competenceMap.get(key)!;
        r.total++;
        if (a.isCorrect) r.correct++;
      }
      const competenceScores = [...competenceMap.entries()].map(([key, { correct, total }]) => {
        const [area, competence] = key.split('||');
        return { area, competence, correct, total, accuracyRate: total > 0 ? correct / total : 0 };
      });

      // ── Topic scores ─────────────────────────────────────────────────────
      const topicMap = new Map<string, { correct: number; total: number }>();
      for (const a of answers) {
        const area = a.question.area ?? 'Sin área';
        const topic = a.question.topic ?? null;
        if (!topic) continue;
        const key = `${area}||${topic}`;
        if (!topicMap.has(key)) topicMap.set(key, { correct: 0, total: 0 });
        const r = topicMap.get(key)!;
        r.total++;
        if (a.isCorrect) r.correct++;
      }
      const topicScores = [...topicMap.entries()].map(([key, { correct, total }]) => {
        const [area, topic] = key.split('||');
        return { area, topic, correct, total, accuracyRate: total > 0 ? correct / total : 0 };
      });

      // ── Difficulty scores ────────────────────────────────────────────────
      const diffMap = new Map<string, { correct: number; total: number }>();
      for (const a of answers) {
        const diff = a.question.difficulty ?? 'MEDIA';
        if (!diffMap.has(diff)) diffMap.set(diff, { correct: 0, total: 0 });
        const r = diffMap.get(diff)!;
        r.total++;
        if (a.isCorrect) r.correct++;
      }
      const difficultyScores = [...diffMap.entries()].map(([difficulty, { correct, total }]) => ({
        difficulty, correct, total, accuracyRate: total > 0 ? correct / total : 0,
      }));

      // ── Get recent history for prediction ────────────────────────────────
      const recentSnapshots = await this.prisma.attemptAnalyticsSnapshot.findMany({
        where: { userId: attempt.userId, id: { not: attemptId } },
        orderBy: { completedAt: 'desc' },
        take: 5,
        select: { accuracyRate: true },
      });
      const recentScores = recentSnapshots.map(s => s.accuracyRate).reverse();
      recentScores.push(accuracyRate);

      const predictedScore = predictIcfesScore(accuracyRate, difficultyScores, avgTimeSec, recentScores);

      // ── Persist snapshot ─────────────────────────────────────────────────
      await this.prisma.attemptAnalyticsSnapshot.upsert({
        where: { attemptId },
        create: {
          attemptId,
          userId: attempt.userId,
          schoolId: attempt.user.schoolId,
          simulacroId: attempt.simulacroId,
          completedAt: attempt.completedAt ?? new Date(),
          totalQuestions: total,
          correctAnswers: correct,
          accuracyRate,
          scaledScore: scaleToIcfes(accuracyRate),
          totalTimeSec,
          avgTimeSec,
          areaScores,
          competenceScores,
          topicScores,
          difficultyScores,
          predictedScore,
        },
        update: {
          accuracyRate, scaledScore: scaleToIcfes(accuracyRate), correctAnswers: correct,
          totalQuestions: total, totalTimeSec, avgTimeSec, areaScores, competenceScores,
          topicScores, difficultyScores, predictedScore,
        },
      });

      // ── Update student profile ────────────────────────────────────────────
      await this.updateStudentProfile(attempt.userId, attempt.user.schoolId);

      // ── Generate recommendations ─────────────────────────────────────────
      await this.generateRecommendations(attempt.userId, attempt.user.schoolId, {
        areaScores, competenceScores, topicScores, avgTimeSec,
      });

      // ── Generate alerts ───────────────────────────────────────────────────
      await this.generateAlerts(attempt.userId, attempt.user.schoolId, { accuracyRate, areaScores });

    } catch (err) {
      // Analytics failures must never crash the submit flow
      console.error('[Analytics] computeAttemptSnapshot error:', err);
    }
  }

  // ── Update aggregated student profile ────────────────────────────────────
  private async updateStudentProfile(userId: string, schoolId: string | null): Promise<void> {
    const snapshots = await this.prisma.attemptAnalyticsSnapshot.findMany({
      where: { userId },
      orderBy: { completedAt: 'asc' },
    });

    if (snapshots.length === 0) return;

    const totalAttempts = snapshots.length;
    const avgAccuracy = snapshots.reduce((s, n) => s + n.accuracyRate, 0) / totalAttempts;
    const avgScaledScore = scaleToIcfes(avgAccuracy);
    const recentScores = snapshots.map(s => s.accuracyRate);
    const trend = calcTrend(recentScores);
    const level = toLevel(avgAccuracy);
    const riskLevel = toRisk(avgAccuracy, trend, totalAttempts);

    // Predicted ICFES from last snapshot
    const latestSnapshot = snapshots[snapshots.length - 1];
    const predictedIcfes = latestSnapshot.predictedScore;

    // Aggregate area profiles
    const areaTotals = new Map<string, { correct: number; total: number; scoreHistory: number[] }>();
    for (const snap of snapshots) {
      const areas = (snap.areaScores as any[]) ?? [];
      for (const a of areas) {
        if (!areaTotals.has(a.area)) areaTotals.set(a.area, { correct: 0, total: 0, scoreHistory: [] });
        const r = areaTotals.get(a.area)!;
        r.correct += a.correct;
        r.total += a.total;
        r.scoreHistory.push(a.accuracyRate);
      }
    }
    const areaProfiles = [...areaTotals.entries()].map(([area, { correct, total, scoreHistory }]) => ({
      area,
      accuracyRate: total > 0 ? correct / total : 0,
      attempts: scoreHistory.length,
      trend: calcTrend(scoreHistory),
    }));

    // Aggregate competence profiles
    const compTotals = new Map<string, { correct: number; total: number }>();
    for (const snap of snapshots) {
      const comps = (snap.competenceScores as any[]) ?? [];
      for (const c of comps) {
        const key = `${c.area}||${c.competence}`;
        if (!compTotals.has(key)) compTotals.set(key, { correct: 0, total: 0 });
        const r = compTotals.get(key)!;
        r.correct += c.correct;
        r.total += c.total;
      }
    }
    const competenceProfiles = [...compTotals.entries()].map(([key, { correct, total }]) => {
      const [area, competence] = key.split('||');
      return { area, competence, accuracyRate: total > 0 ? correct / total : 0 };
    });

    // Aggregate topic profiles
    const topicTotals = new Map<string, { correct: number; total: number }>();
    for (const snap of snapshots) {
      const topics = (snap.topicScores as any[]) ?? [];
      for (const t of topics) {
        const key = `${t.area}||${t.topic}`;
        if (!topicTotals.has(key)) topicTotals.set(key, { correct: 0, total: 0 });
        const r = topicTotals.get(key)!;
        r.correct += t.correct;
        r.total += t.total;
      }
    }
    const topicProfiles = [...topicTotals.entries()]
      .filter(([, { total }]) => total >= 3)
      .map(([key, { correct, total }]) => {
        const [area, topic] = key.split('||');
        return { area, topic, accuracyRate: total > 0 ? correct / total : 0 };
      });

    // Build strengths (>= 0.70) and weaknesses (<= 0.50)
    const allMetrics = [
      ...areaProfiles.map(a => ({ type: 'area', label: a.area, score: a.accuracyRate })),
      ...competenceProfiles.map(c => ({ type: 'competence', label: `${c.area} — ${c.competence}`, score: c.accuracyRate })),
      ...topicProfiles.map(t => ({ type: 'topic', label: `${t.area} — ${t.topic}`, score: t.accuracyRate })),
    ];
    const strengths = allMetrics.filter(m => m.score >= 0.70).sort((a, b) => b.score - a.score).slice(0, 5);
    const weaknesses = allMetrics.filter(m => m.score <= 0.50).sort((a, b) => a.score - b.score).slice(0, 5);

    await this.prisma.studentAcademicProfile.upsert({
      where: { userId },
      create: {
        userId, schoolId, totalAttempts, avgAccuracy, avgScaledScore, predictedIcfes,
        level, riskLevel, trend, areaProfiles, competenceProfiles, topicProfiles,
        strengths, weaknesses, lastAttemptAt: latestSnapshot.completedAt,
      },
      update: {
        totalAttempts, avgAccuracy, avgScaledScore, predictedIcfes,
        level, riskLevel, trend, areaProfiles, competenceProfiles, topicProfiles,
        strengths, weaknesses, lastAttemptAt: latestSnapshot.completedAt,
      },
    });
  }

  // ── Auto-recommendations ─────────────────────────────────────────────────
  private async generateRecommendations(
    userId: string,
    schoolId: string | null,
    data: { areaScores: any[]; competenceScores: any[]; topicScores: any[]; avgTimeSec: number },
  ): Promise<void> {
    // Delete old unread/undismissed recommendations before adding new ones
    await this.prisma.academicRecommendation.deleteMany({
      where: { userId, isRead: false, isDismissed: false },
    });

    const recs: {
      type: string; area?: string; topic?: string; competence?: string;
      message: string; priority: number;
    }[] = [];

    // Weak areas (< 55%)
    for (const a of data.areaScores.filter(a => a.accuracyRate < 0.55)) {
      recs.push({
        type: 'REFORZAR_AREA',
        area: a.area,
        message: `Tu rendimiento en ${a.area} es del ${Math.round(a.accuracyRate * 100)}%. Se recomienda reforzar este área con práctica adicional.`,
        priority: a.accuracyRate < 0.40 ? 1 : 2,
      });
    }

    // Weak competences (< 50%)
    for (const c of data.competenceScores.filter(c => c.accuracyRate < 0.50)) {
      recs.push({
        type: 'PRACTICAR_COMPETENCIA',
        area: c.area,
        competence: c.competence,
        message: `La competencia "${c.competence}" en ${c.area} muestra un rendimiento del ${Math.round(c.accuracyRate * 100)}%. Practica ejercicios específicos de esta competencia.`,
        priority: 2,
      });
    }

    // Weak topics (< 45%)
    for (const t of data.topicScores.filter(t => t.accuracyRate < 0.45)) {
      recs.push({
        type: 'REFORZAR_TEMA',
        area: t.area,
        topic: t.topic,
        message: `El tema "${t.topic}" requiere atención especial: rendimiento del ${Math.round(t.accuracyRate * 100)}%. Dedica tiempo a revisar este tema en detalle.`,
        priority: 1,
      });
    }

    // Time alerts
    if (data.avgTimeSec > 0 && data.avgTimeSec < 20) {
      recs.push({
        type: 'REDUCIR_VELOCIDAD',
        message: `Tu tiempo promedio por pregunta es muy bajo (${Math.round(data.avgTimeSec)}s). Tómate más tiempo para leer y analizar cada pregunta cuidadosamente.`,
        priority: 2,
      });
    } else if (data.avgTimeSec > 100) {
      recs.push({
        type: 'REDUCIR_TIEMPO',
        message: `Tu tiempo promedio por pregunta es alto (${Math.round(data.avgTimeSec)}s). Practica técnicas de lectura rápida y gestión del tiempo en exámenes.`,
        priority: 2,
      });
    }

    // High performers
    const strongAreas = data.areaScores.filter(a => a.accuracyRate >= 0.80);
    if (strongAreas.length > 0) {
      recs.push({
        type: 'MANTENER_RITMO',
        area: strongAreas[0].area,
        message: `Excelente desempeño en ${strongAreas.map(a => a.area).join(', ')} (>80%). Mantén este ritmo y enfócate en elevar tus áreas débiles.`,
        priority: 3,
      });
    }

    if (recs.length > 0) {
      await this.prisma.academicRecommendation.createMany({
        data: recs.map(r => ({ userId, schoolId, ...r })),
      });
    }
  }

  // ── Auto-alerts ───────────────────────────────────────────────────────────
  private async generateAlerts(
    userId: string,
    schoolId: string | null,
    data: { accuracyRate: number; areaScores: any[] },
  ): Promise<void> {
    const alerts: { type: AlertType; message: string; severity: string; metadata?: any }[] = [];

    if (data.accuracyRate < 0.40) {
      alerts.push({
        type: AlertType.BAJO_RENDIMIENTO,
        severity: 'HIGH',
        message: `Rendimiento global muy bajo (${Math.round(data.accuracyRate * 100)}%). Se recomienda revisión urgente del plan de estudio.`,
        metadata: { accuracyRate: data.accuracyRate },
      });
    }

    for (const a of data.areaScores.filter(a => a.accuracyRate < 0.35)) {
      alerts.push({
        type: AlertType.COMPETENCIA_CRITICA,
        severity: 'CRITICAL',
        message: `⚠️ Rendimiento crítico en ${a.area}: ${Math.round(a.accuracyRate * 100)}%.`,
        metadata: { area: a.area, accuracyRate: a.accuracyRate },
      });
    }

    if (data.areaScores.some(a => a.avgTimeSec > 120)) {
      alerts.push({
        type: AlertType.TIEMPO_EXCESIVO,
        severity: 'MEDIUM',
        message: `Tiempo excesivo detectado en algunas áreas. Revisa la gestión del tiempo durante el examen.`,
      });
    }

    if (alerts.length > 0) {
      await this.prisma.academicAlert.createMany({
        data: alerts.map(a => ({ userId, schoolId, ...a })),
      });
    }
  }

  // ─── API: Student dashboard ──────────────────────────────────────────────

  async getStudentDashboard(userId: string, requestUser: RequestUser) {
    if (requestUser.role === Role.ESTUDIANTE && requestUser.id !== userId) {
      throw new ForbiddenException();
    }

    const [profile, snapshots, recommendations, alerts] = await Promise.all([
      this.prisma.studentAcademicProfile.findUnique({ where: { userId } }),
      this.prisma.attemptAnalyticsSnapshot.findMany({
        where: { userId },
        orderBy: { completedAt: 'asc' },
        select: {
          attemptId: true, completedAt: true, accuracyRate: true, scaledScore: true,
          predictedScore: true, areaScores: true, totalQuestions: true, correctAnswers: true,
          avgTimeSec: true,
        },
      }),
      this.prisma.academicRecommendation.findMany({
        where: { userId, isDismissed: false },
        orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
        take: 10,
      }),
      this.prisma.academicAlert.findMany({
        where: { userId, isRead: false },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    // Evolution data for charts: last 10 attempts
    const evolution = snapshots.slice(-10).map(s => ({
      attemptId: s.attemptId,
      date: s.completedAt,
      accuracyRate: s.accuracyRate,
      scaledScore: s.scaledScore,
      predictedScore: s.predictedScore,
      areaScores: s.areaScores,
    }));

    // Area evolution (per area, last 10 snapshots)
    const areaEvolution = this.buildAreaEvolution(snapshots.slice(-10));

    return {
      profile,
      evolution,
      areaEvolution,
      recommendations,
      alerts,
      totalAttempts: snapshots.length,
    };
  }

  private buildAreaEvolution(snapshots: any[]): Record<string, { date: Date; accuracyRate: number }[]> {
    const result: Record<string, { date: Date; accuracyRate: number }[]> = {};
    for (const snap of snapshots) {
      const areas = (snap.areaScores as any[]) ?? [];
      for (const a of areas) {
        if (!result[a.area]) result[a.area] = [];
        result[a.area].push({ date: snap.completedAt, accuracyRate: a.accuracyRate });
      }
    }
    return result;
  }

  // ─── API: Admin school dashboard ─────────────────────────────────────────

  async getSchoolDashboard(schoolId: string, requestUser: RequestUser) {
    if (requestUser.role === Role.ADMIN && requestUser.schoolId !== schoolId) {
      throw new ForbiddenException();
    }

    const [profiles, snapshots] = await Promise.all([
      this.prisma.studentAcademicProfile.findMany({
        where: { schoolId },
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
        orderBy: { avgAccuracy: 'desc' },
      }),
      this.prisma.attemptAnalyticsSnapshot.findMany({
        where: { schoolId },
        orderBy: { completedAt: 'desc' },
        take: 500, // recent history for aggregation
        select: { userId: true, completedAt: true, accuracyRate: true, areaScores: true, competenceScores: true },
      }),
    ]);

    const totalStudents = profiles.length;
    const avgAccuracy = totalStudents > 0
      ? profiles.reduce((s, p) => s + p.avgAccuracy, 0) / totalStudents
      : 0;
    const avgPredictedIcfes = totalStudents > 0
      ? profiles.reduce((s, p) => s + p.predictedIcfes, 0) / totalStudents
      : 0;

    // Area averages across school
    const schoolAreaTotals = new Map<string, { correct: number; total: number }>();
    for (const snap of snapshots) {
      for (const a of (snap.areaScores as any[]) ?? []) {
        if (!schoolAreaTotals.has(a.area)) schoolAreaTotals.set(a.area, { correct: 0, total: 0 });
        const r = schoolAreaTotals.get(a.area)!;
        r.correct += a.correct;
        r.total += a.total;
      }
    }
    const areaAverages = [...schoolAreaTotals.entries()].map(([area, { correct, total }]) => ({
      area,
      accuracyRate: total > 0 ? correct / total : 0,
      total,
    })).sort((a, b) => b.accuracyRate - a.accuracyRate);

    // Risk distribution
    const riskCounts = { BAJO: 0, MEDIO: 0, ALTO: 0, CRITICO: 0 };
    for (const p of profiles) riskCounts[p.riskLevel]++;

    // Top 10 students
    const topStudents = profiles.slice(0, 10).map(p => ({
      userId: p.userId,
      name: `${p.user.firstName} ${p.user.lastName}`,
      avgAccuracy: p.avgAccuracy,
      predictedIcfes: p.predictedIcfes,
      level: p.level,
      riskLevel: p.riskLevel,
      totalAttempts: p.totalAttempts,
    }));

    // At-risk students
    const atRiskStudents = profiles
      .filter(p => p.riskLevel === RiskLevel.ALTO || p.riskLevel === RiskLevel.CRITICO)
      .map(p => ({
        userId: p.userId,
        name: `${p.user.firstName} ${p.user.lastName}`,
        avgAccuracy: p.avgAccuracy,
        riskLevel: p.riskLevel,
        trend: p.trend,
      }));

    // School evolution (weekly avg, last 8 weeks)
    const schoolEvolution = this.buildSchoolEvolution(snapshots);

    return {
      totalStudents,
      avgAccuracy,
      avgPredictedIcfes,
      areaAverages,
      riskCounts,
      topStudents,
      atRiskStudents,
      schoolEvolution,
    };
  }

  private buildSchoolEvolution(snapshots: any[]): { week: string; avgAccuracy: number; count: number }[] {
    const weekMap = new Map<string, { total: number; count: number }>();
    for (const snap of snapshots) {
      const d = new Date(snap.completedAt);
      // ISO week key YYYY-WW
      const year = d.getFullYear();
      const week = Math.ceil((((d.getTime() - new Date(year, 0, 1).getTime()) / 86400000) + 1) / 7);
      const key = `${year}-W${String(week).padStart(2, '0')}`;
      if (!weekMap.has(key)) weekMap.set(key, { total: 0, count: 0 });
      const r = weekMap.get(key)!;
      r.total += snap.accuracyRate;
      r.count++;
    }
    return [...weekMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8)
      .map(([week, { total, count }]) => ({
        week,
        avgAccuracy: count > 0 ? total / count : 0,
        count,
      }));
  }

  // ─── API: Student profile (for profile page) ──────────────────────────────
  async getStudentProfile(userId: string, requestUser: RequestUser) {
    if (requestUser.role === Role.ESTUDIANTE && requestUser.id !== userId) {
      throw new ForbiddenException();
    }
    const profile = await this.prisma.studentAcademicProfile.findUnique({
      where: { userId },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
    });
    if (!profile) return null;
    return profile;
  }

  // ─── API: dismiss recommendation ────────────────────────────────────────
  async dismissRecommendation(id: string, userId: string) {
    return this.prisma.academicRecommendation.updateMany({
      where: { id, userId },
      data: { isDismissed: true },
    });
  }

  // ─── API: mark alerts read ────────────────────────────────────────────────
  async markAlertsRead(userId: string) {
    return this.prisma.academicAlert.updateMany({
      where: { userId },
      data: { isRead: true },
    });
  }

  // ─── API: School student detail ──────────────────────────────────────────
  async getStudentDetailForAdmin(studentId: string, adminSchoolId: string) {
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: { schoolId: true },
    });
    if (!student || student.schoolId !== adminSchoolId) throw new ForbiddenException();
    return this.getStudentDashboard(studentId, {
      id: studentId, role: Role.ADMIN, schoolId: adminSchoolId,
    });
  }

  // ─── API: Super admin global metrics ────────────────────────────────────
  async getGlobalMetrics() {
    const [totalStudents, totalAttempts, schools] = await Promise.all([
      this.prisma.studentAcademicProfile.count(),
      this.prisma.attemptAnalyticsSnapshot.count(),
      this.prisma.studentAcademicProfile.groupBy({
        by: ['schoolId'],
        _count: { userId: true },
        _avg: { avgAccuracy: true, predictedIcfes: true },
        where: { schoolId: { not: null } },
      }),
    ]);

    const schoolMetrics = await Promise.all(
      schools.map(async (s) => {
        const school = await this.prisma.school.findUnique({
          where: { id: s.schoolId! },
          select: { name: true },
        });
        return {
          schoolId: s.schoolId,
          schoolName: school?.name ?? 'Unknown',
          studentCount: s._count.userId,
          avgAccuracy: s._avg.avgAccuracy ?? 0,
          avgPredictedIcfes: s._avg.predictedIcfes ?? 0,
        };
      })
    );

    return {
      totalStudents,
      totalAttempts,
      schoolMetrics: schoolMetrics.sort((a, b) => b.avgAccuracy - a.avgAccuracy),
    };
  }
}
