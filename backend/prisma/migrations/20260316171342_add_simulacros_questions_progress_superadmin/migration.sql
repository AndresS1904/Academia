-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'SUPER_ADMIN';

-- DropIndex
DROP INDEX "lessons_courseId_idx";

-- CreateTable
CREATE TABLE "resource_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "watchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resource_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "simulacros" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "duracionMinutos" INTEGER NOT NULL,
    "totalPreguntas" INTEGER NOT NULL DEFAULT 20,
    "areasEvaluadas" TEXT[],
    "color" TEXT NOT NULL DEFAULT '#004aad',
    "emoji" TEXT NOT NULL DEFAULT '📝',
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "simulacros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "simulacroId" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "contexto" TEXT,
    "enunciado" TEXT NOT NULL,
    "explicacion" TEXT,
    "order" INTEGER NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "answer_options" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "letra" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "answer_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "simulacro_attempts" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "simulacroId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "score" DOUBLE PRECISION,
    "tiempoUsadoSeg" INTEGER,

    CONSTRAINT "simulacro_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "simulacro_answers" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "selectedOptionId" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,

    CONSTRAINT "simulacro_answers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "resource_progress_userId_idx" ON "resource_progress"("userId");

-- CreateIndex
CREATE INDEX "resource_progress_resourceId_idx" ON "resource_progress"("resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "resource_progress_userId_resourceId_key" ON "resource_progress"("userId", "resourceId");

-- CreateIndex
CREATE INDEX "questions_simulacroId_order_idx" ON "questions"("simulacroId", "order");

-- CreateIndex
CREATE INDEX "answer_options_questionId_idx" ON "answer_options"("questionId");

-- CreateIndex
CREATE INDEX "simulacro_attempts_assignmentId_idx" ON "simulacro_attempts"("assignmentId");

-- CreateIndex
CREATE INDEX "simulacro_attempts_userId_idx" ON "simulacro_attempts"("userId");

-- CreateIndex
CREATE INDEX "simulacro_answers_attemptId_idx" ON "simulacro_answers"("attemptId");

-- CreateIndex
CREATE UNIQUE INDEX "simulacro_answers_attemptId_questionId_key" ON "simulacro_answers"("attemptId", "questionId");

-- CreateIndex
CREATE INDEX "lessons_courseId_order_idx" ON "lessons"("courseId", "order");

-- AddForeignKey
ALTER TABLE "resource_progress" ADD CONSTRAINT "resource_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_progress" ADD CONSTRAINT "resource_progress_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_simulacroId_fkey" FOREIGN KEY ("simulacroId") REFERENCES "simulacros"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answer_options" ADD CONSTRAINT "answer_options_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulacro_assignments" ADD CONSTRAINT "simulacro_assignments_simulacroId_fkey" FOREIGN KEY ("simulacroId") REFERENCES "simulacros"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulacro_attempts" ADD CONSTRAINT "simulacro_attempts_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "simulacro_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulacro_attempts" ADD CONSTRAINT "simulacro_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulacro_attempts" ADD CONSTRAINT "simulacro_attempts_simulacroId_fkey" FOREIGN KEY ("simulacroId") REFERENCES "simulacros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulacro_answers" ADD CONSTRAINT "simulacro_answers_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "simulacro_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulacro_answers" ADD CONSTRAINT "simulacro_answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulacro_answers" ADD CONSTRAINT "simulacro_answers_selectedOptionId_fkey" FOREIGN KEY ("selectedOptionId") REFERENCES "answer_options"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
