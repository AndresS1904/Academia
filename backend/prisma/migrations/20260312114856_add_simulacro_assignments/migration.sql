-- CreateTable
CREATE TABLE "simulacro_assignments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "simulacroId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "instructions" TEXT,

    CONSTRAINT "simulacro_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "simulacro_assignments_userId_idx" ON "simulacro_assignments"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "simulacro_assignments_userId_simulacroId_key" ON "simulacro_assignments"("userId", "simulacroId");

-- AddForeignKey
ALTER TABLE "simulacro_assignments" ADD CONSTRAINT "simulacro_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
