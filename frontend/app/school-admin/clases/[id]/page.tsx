"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import SchoolAdminSidebar from "@/components/school-admin/SchoolAdminSidebar";
import { api } from "@/lib/api";

// ── types ────────────────────────────────────────────────────────────────────

interface Material { id: string; title: string; type: string; fileKey: string | null; fileName: string | null; fileSize: number | null; externalUrl: string | null; allowDownload: boolean; order: number }
interface Activity { id: string; title: string; description: string | null; dueDate: string | null; maxScore: number | null; isPublished: boolean; order: number; _count: { submissions: number } }
interface LearningUnit { id: string; title: string; type: string; content: string | null; videoUrl: string | null; simulacroId: string | null; isPublished: boolean; order: number; durationMin: number | null }
interface TopicSimulacro { id: string; order: number; simulacro: { id: string; titulo: string; totalPreguntas: number } }
interface ClassSubtopic { id: string; title: string; description: string | null; order: number; isPublished: boolean; units: LearningUnit[] }
interface ClassTopic { id: string; title: string; description: string | null; order: number; isPublished: boolean; units: LearningUnit[]; subtopics: ClassSubtopic[]; simulacros: TopicSimulacro[] }
interface ClassSection { id: string; title: string; description: string | null; order: number; isPublished: boolean; topics: ClassTopic[] }
interface ClassModule { id: string; title: string; description: string | null; order: number; isPublished: boolean; materials: Material[]; activities: Activity[]; sections: ClassSection[] }
interface Forum { id: string; title: string; description: string | null; isLocked: boolean; topicId: string | null; _count: { threads: number } }
interface Classroom { id: string; title: string; description: string | null; color: string | null; emoji: string | null; isPublished: boolean; modules: ClassModule[]; forums: Forum[]; _count: { enrollments: number } }
interface Enrollment { id: string; student: { id: string; firstName: string; lastName: string; email: string } }
interface ClassroomCourse { id: string; courseId: string; order: number; isRequired: boolean; course: { id: string; title: string; slug: string; thumbnail: string | null; isPublished: boolean; isGlobal: boolean; instructorName: string | null } }
interface ClassroomSimulacro { id: string; simulacroId: string; order: number; isRequired: boolean; dueDate: string | null; context: string | null; simulacro: { id: string; titulo: string; totalPreguntas: number; duracionMinutos: number; isPublished: boolean; isGlobal: boolean; examType: string } }
interface AvailableCourse { id: string; title: string; slug: string; isPublished: boolean; isGlobal: boolean }
interface AvailableSimulacro { id: string; titulo: string; totalPreguntas: number; isPublished: boolean; isGlobal: boolean }

// ── helpers ───────────────────────────────────────────────────────────────────

const TYPE_ICONS: Record<string, string> = { PDF: "📄", WORD: "📝", IMAGE: "🖼️", VIDEO: "🎬", LINK: "🔗", OTHER: "📎" };
const UNIT_ICONS: Record<string, string> = { TEXT: "📄", VIDEO: "🎬", FILE: "📎", SIMULACRO_LINK: "📝" };
function fmtSize(bytes: number) { return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`; }

// ── main component ─────────────────────────────────────────────────────────────

export default function ClassroomAdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [fetching, setFetching] = useState(true);
  const [activeTab, setActiveTab] = useState<"modulos" | "estructura" | "foros" | "estudiantes" | "notas" | "cursos" | "simulacros">("modulos");

  // Cursos asignados al aula
  const [classroomCourses, setClassroomCourses] = useState<ClassroomCourse[]>([]);
  const [availableCourses, setAvailableCourses] = useState<AvailableCourse[]>([]);
  const [courseSearch, setCourseSearch] = useState("");
  const [savingCourse, setSavingCourse] = useState(false);
  const [courseMsg, setCourseMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Simulacros asignados al aula
  const [classroomSimulacros, setClassroomSimulacros] = useState<ClassroomSimulacro[]>([]);
  const [availableSimulacros, setAvailableSimulacros] = useState<AvailableSimulacro[]>([]);
  const [simulacroSearch, setSimulacroSearch] = useState("");
  const [savingSimulacro, setSavingSimulacro] = useState(false);
  const [simulacroMsg, setSimulacroMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Module
  const [showModForm, setShowModForm] = useState(false);
  const [modTitle, setModTitle] = useState(""); const [modDesc, setModDesc] = useState(""); const [savingMod, setSavingMod] = useState(false);
  // Material
  const [matModuleId, setMatModuleId] = useState<string | null>(null);
  const [matTitle, setMatTitle] = useState(""); const [matType, setMatType] = useState("PDF"); const [matUrl, setMatUrl] = useState(""); const [matFile, setMatFile] = useState<File | null>(null); const [savingMat, setSavingMat] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  // Activity
  const [actModuleId, setActModuleId] = useState<string | null>(null);
  const [actTitle, setActTitle] = useState(""); const [actDesc, setActDesc] = useState(""); const [actDue, setActDue] = useState(""); const [actScore, setActScore] = useState(""); const [savingAct, setSavingAct] = useState(false);
  // Section
  const [sectionModuleId, setSectionModuleId] = useState<string | null>(null);
  const [sectionTitle, setSectionTitle] = useState(""); const [savingSection, setSavingSection] = useState(false);
  // Topic
  const [topicSectionId, setTopicSectionId] = useState<string | null>(null);
  const [topicTitle, setTopicTitle] = useState(""); const [savingTopic, setSavingTopic] = useState(false);
  // Subtopic
  const [subtopicTopicId, setSubtopicTopicId] = useState<string | null>(null);
  const [subtopicTitle, setSubtopicTitle] = useState(""); const [savingSubtopic, setSavingSubtopic] = useState(false);
  // Unit
  const [unitParent, setUnitParent] = useState<{ id: string; type: "topic" | "subtopic" } | null>(null);
  const [unitTitle, setUnitTitle] = useState(""); const [unitType, setUnitType] = useState("TEXT"); const [unitContent, setUnitContent] = useState(""); const [unitVideoUrl, setUnitVideoUrl] = useState(""); const [savingUnit, setSavingUnit] = useState(false);
  // Forum
  const [showForumForm, setShowForumForm] = useState(false);
  const [forumTitle, setForumTitle] = useState(""); const [forumDesc, setForumDesc] = useState(""); const [savingForum, setSavingForum] = useState(false);
  // Students
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [allStudents, setAllStudents] = useState<{ id: string; firstName: string; lastName: string }[]>([]);
  const [allGroups, setAllGroups] = useState<{ id: string; name: string; description?: string; _count: { members: number } }[]>([]);
  const [enrollInput, setEnrollInput] = useState(""); const [enrolling, setEnrolling] = useState(false);
  const [enrollMode, setEnrollMode] = useState<"student" | "group">("student");
  const [enrollMsg, setEnrollMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => { if (!loading && (!user || user.role !== "ADMIN")) router.replace("/auth/login"); }, [user, loading]);

  function loadClassroom() {
    api.get<Classroom>(`/classrooms/admin/${id}/full`)
      .then(setClassroom)
      .catch(() => router.replace("/school-admin/clases"))
      .finally(() => setFetching(false));
  }

  useEffect(() => { if (!user || !id) return; loadClassroom(); }, [user, id]);

  function loadStudents() {
    api.get<Enrollment[]>(`/classrooms/admin/${id}/students`).then(setEnrollments).catch(() => {});
    api.get<any[]>("/users/my-school/students").then(setAllStudents).catch(() => {});
    api.get<any[]>("/users/my-school/groups").then(setAllGroups).catch(() => {});
  }
  useEffect(() => { if (activeTab === "estudiantes") loadStudents(); }, [activeTab]);

  function loadClassroomCourses() {
    api.get<ClassroomCourse[]>(`/classrooms/admin/${id}/courses`).then(setClassroomCourses).catch(() => {});
    api.get<AvailableCourse[]>("/access/catalog/courses").then(setAvailableCourses).catch(() => {});
  }
  useEffect(() => { if (activeTab === "cursos" && id) loadClassroomCourses(); }, [activeTab]);

  function loadClassroomSimulacros() {
    api.get<ClassroomSimulacro[]>(`/classrooms/admin/${id}/simulacros-assigned`).then(setClassroomSimulacros).catch(() => {});
    api.get<AvailableSimulacro[]>("/access/catalog/simulacros").then(setAvailableSimulacros).catch(() => {});
  }
  useEffect(() => { if (activeTab === "simulacros" && id) loadClassroomSimulacros(); }, [activeTab]);

  async function assignCourse(courseId: string) {
    setSavingCourse(true); setCourseMsg(null);
    try {
      await api.post(`/classrooms/admin/${id}/courses`, { courseId });
      setCourseMsg({ type: "ok", text: "Curso asociado correctamente" });
      loadClassroomCourses();
    } catch (e: any) {
      setCourseMsg({ type: "err", text: e?.message ?? "Error al asociar el curso" });
    }
    setSavingCourse(false);
    setTimeout(() => setCourseMsg(null), 3500);
  }

  async function removeCourse(courseId: string) {
    if (!confirm("¿Quitar este curso del aula?")) return;
    try {
      await api.delete(`/classrooms/admin/${id}/courses/${courseId}`);
      setClassroomCourses((p) => p.filter((c) => c.courseId !== courseId));
    } catch (e: any) {
      alert(e?.message ?? "Error al quitar el curso");
    }
  }

  async function assignSimulacro(simulacroId: string) {
    setSavingSimulacro(true); setSimulacroMsg(null);
    try {
      await api.post(`/classrooms/admin/${id}/simulacros-assigned`, { simulacroId });
      setSimulacroMsg({ type: "ok", text: "Simulacro asociado correctamente" });
      loadClassroomSimulacros();
    } catch (e: any) {
      setSimulacroMsg({ type: "err", text: e?.message ?? "Error al asociar el simulacro" });
    }
    setSavingSimulacro(false);
    setTimeout(() => setSimulacroMsg(null), 3500);
  }

  async function removeSimulacro(simulacroId: string) {
    if (!confirm("¿Quitar este simulacro del aula?")) return;
    try {
      await api.delete(`/classrooms/admin/${id}/simulacros-assigned/${simulacroId}`);
      setClassroomSimulacros((p) => p.filter((s) => s.simulacroId !== simulacroId));
    } catch (e: any) {
      alert(e?.message ?? "Error al quitar el simulacro");
    }
  }

  // ── Module CRUD ──────────────────────────────────────────────────────────────
  async function saveModule() {
    if (!modTitle.trim()) return;
    setSavingMod(true);
    const mod = await api.post<ClassModule>(`/classrooms/admin/${id}/modules`, { title: modTitle.trim(), description: modDesc.trim() || undefined });
    setClassroom((p) => p ? { ...p, modules: [...p.modules, { ...mod, materials: [], activities: [], sections: [] }] } : p);
    setModTitle(""); setModDesc(""); setShowModForm(false); setSavingMod(false);
  }
  async function deleteModule(moduleId: string) {
    if (!confirm("¿Eliminar este módulo y todo su contenido?")) return;
    await api.delete(`/classrooms/admin/modules/${moduleId}`);
    setClassroom((p) => p ? { ...p, modules: p.modules.filter((m) => m.id !== moduleId) } : p);
  }
  async function toggleModulePublish(moduleId: string, current: boolean) {
    await api.patch(`/classrooms/admin/modules/${moduleId}`, { isPublished: !current });
    setClassroom((p) => p ? { ...p, modules: p.modules.map((m) => m.id === moduleId ? { ...m, isPublished: !current } : m) } : p);
  }

  // ── Material CRUD ────────────────────────────────────────────────────────────
  async function saveMaterial() {
    if (!matModuleId || !matTitle.trim()) return;
    if (matType === "LINK" && !matUrl.trim()) { alert("Ingresa la URL"); return; }
    if (matType !== "LINK" && !matFile) { alert("Selecciona un archivo"); return; }
    setSavingMat(true);
    try {
      const fd = new FormData();
      fd.append("title", matTitle.trim()); fd.append("type", matType);
      if (matType === "LINK") fd.append("externalUrl", matUrl.trim());
      else if (matFile) fd.append("file", matFile);
      const mat = await api.postForm<Material>(`/classrooms/admin/modules/${matModuleId}/materials`, fd);
      setClassroom((p) => p ? { ...p, modules: p.modules.map((m) => m.id === matModuleId ? { ...m, materials: [...m.materials, mat] } : m) } : p);
      setMatModuleId(null); setMatTitle(""); setMatType("PDF"); setMatUrl(""); setMatFile(null);
    } catch (e: any) { alert(e.message ?? "Error al subir el material"); }
    finally { setSavingMat(false); }
  }
  async function deleteMaterial(moduleId: string, materialId: string) {
    if (!confirm("¿Eliminar este material?")) return;
    await api.delete(`/classrooms/admin/materials/${materialId}`);
    setClassroom((p) => p ? { ...p, modules: p.modules.map((m) => m.id === moduleId ? { ...m, materials: m.materials.filter((mat) => mat.id !== materialId) } : m) } : p);
  }

  // ── Activity CRUD ────────────────────────────────────────────────────────────
  async function saveActivity() {
    if (!actModuleId || !actTitle.trim()) return;
    setSavingAct(true);
    const act = await api.post<Activity>(`/classrooms/admin/modules/${actModuleId}/activities`, {
      title: actTitle.trim(), description: actDesc.trim() || undefined,
      dueDate: actDue || undefined, maxScore: actScore ? Number(actScore) : undefined, isPublished: false,
    });
    setClassroom((p) => p ? { ...p, modules: p.modules.map((m) => m.id === actModuleId ? { ...m, activities: [...m.activities, { ...act, _count: { submissions: 0 } }] } : m) } : p);
    setActModuleId(null); setActTitle(""); setActDesc(""); setActDue(""); setActScore(""); setSavingAct(false);
  }
  async function deleteActivity(moduleId: string, actId: string) {
    if (!confirm("¿Eliminar esta actividad?")) return;
    await api.delete(`/classrooms/admin/activities/${actId}`);
    setClassroom((p) => p ? { ...p, modules: p.modules.map((m) => m.id === moduleId ? { ...m, activities: m.activities.filter((a) => a.id !== actId) } : m) } : p);
  }
  async function toggleActivityPublish(moduleId: string, actId: string, current: boolean) {
    await api.patch(`/classrooms/admin/activities/${actId}`, { isPublished: !current });
    setClassroom((p) => p ? { ...p, modules: p.modules.map((m) => m.id === moduleId ? { ...m, activities: m.activities.map((a) => a.id === actId ? { ...a, isPublished: !current } : a) } : m) } : p);
  }

  // ── Section CRUD ─────────────────────────────────────────────────────────────
  async function saveSection() {
    if (!sectionModuleId || !sectionTitle.trim()) return;
    setSavingSection(true);
    const sec = await api.post<ClassSection>(`/classrooms/admin/modules/${sectionModuleId}/sections`, { title: sectionTitle.trim() });
    setClassroom((p) => p ? { ...p, modules: p.modules.map((m) => m.id === sectionModuleId ? { ...m, sections: [...m.sections, { ...sec, topics: [] }] } : m) } : p);
    setSectionModuleId(null); setSectionTitle(""); setSavingSection(false);
  }
  async function deleteSection(moduleId: string, sectionId: string) {
    if (!confirm("¿Eliminar esta sección y todo su contenido?")) return;
    await api.delete(`/classrooms/admin/sections/${sectionId}`);
    setClassroom((p) => p ? { ...p, modules: p.modules.map((m) => m.id === moduleId ? { ...m, sections: m.sections.filter((s) => s.id !== sectionId) } : m) } : p);
  }

  // ── Topic CRUD ──────────────────────────────────────────────────────────────
  async function saveTopic() {
    if (!topicSectionId || !topicTitle.trim()) return;
    setSavingTopic(true);
    const topic = await api.post<ClassTopic>(`/classrooms/admin/sections/${topicSectionId}/topics`, { title: topicTitle.trim() });
    setClassroom((p) => p ? {
      ...p, modules: p.modules.map((m) => ({
        ...m, sections: m.sections.map((s) => s.id === topicSectionId ? { ...s, topics: [...s.topics, { ...topic, subtopics: [], units: [], simulacros: [] }] } : s)
      }))
    } : p);
    setTopicSectionId(null); setTopicTitle(""); setSavingTopic(false);
  }
  async function deleteTopic(sectionId: string, topicId: string) {
    if (!confirm("¿Eliminar este tema?")) return;
    await api.delete(`/classrooms/admin/topics/${topicId}`);
    setClassroom((p) => p ? {
      ...p, modules: p.modules.map((m) => ({
        ...m, sections: m.sections.map((s) => s.id === sectionId ? { ...s, topics: s.topics.filter((t) => t.id !== topicId) } : s)
      }))
    } : p);
  }

  // ── Subtopic CRUD ────────────────────────────────────────────────────────────
  async function saveSubtopic() {
    if (!subtopicTopicId || !subtopicTitle.trim()) return;
    setSavingSubtopic(true);
    const sub = await api.post<ClassSubtopic>(`/classrooms/admin/topics/${subtopicTopicId}/subtopics`, { title: subtopicTitle.trim() });
    setClassroom((p) => p ? {
      ...p, modules: p.modules.map((m) => ({
        ...m, sections: m.sections.map((s) => ({
          ...s, topics: s.topics.map((t) => t.id === subtopicTopicId ? { ...t, subtopics: [...t.subtopics, { ...sub, units: [] }] } : t)
        }))
      }))
    } : p);
    setSubtopicTopicId(null); setSubtopicTitle(""); setSavingSubtopic(false);
  }
  async function deleteSubtopic(topicId: string, subtopicId: string) {
    if (!confirm("¿Eliminar este subtema?")) return;
    await api.delete(`/classrooms/admin/subtopics/${subtopicId}`);
    loadClassroom();
  }

  // ── Unit CRUD ────────────────────────────────────────────────────────────────
  async function saveUnit() {
    if (!unitParent || !unitTitle.trim()) return;
    setSavingUnit(true);
    const payload: any = { title: unitTitle.trim(), type: unitType, isPublished: true };
    if (unitType === "TEXT") payload.content = unitContent;
    if (unitType === "VIDEO") payload.videoUrl = unitVideoUrl;
    const endpoint = unitParent.type === "topic"
      ? `/classrooms/admin/topics/${unitParent.id}/units`
      : `/classrooms/admin/subtopics/${unitParent.id}/units`;
    await api.post(endpoint, payload);
    loadClassroom();
    setUnitParent(null); setUnitTitle(""); setUnitType("TEXT"); setUnitContent(""); setUnitVideoUrl(""); setSavingUnit(false);
  }
  async function deleteUnit(unitId: string) {
    if (!confirm("¿Eliminar esta unidad?")) return;
    await api.delete(`/classrooms/admin/units/${unitId}`);
    loadClassroom();
  }

  // ── Forum CRUD ───────────────────────────────────────────────────────────────
  async function saveForum() {
    if (!forumTitle.trim()) return;
    setSavingForum(true);
    const forum = await api.post<Forum>(`/classrooms/admin/${id}/forums`, { title: forumTitle.trim(), description: forumDesc.trim() || undefined });
    setClassroom((p) => p ? { ...p, forums: [...p.forums, { ...forum, _count: { threads: 0 } }] } : p);
    setForumTitle(""); setForumDesc(""); setShowForumForm(false); setSavingForum(false);
  }
  async function deleteForum(forumId: string) {
    if (!confirm("¿Eliminar este foro?")) return;
    await api.delete(`/classrooms/admin/forums/${forumId}`);
    setClassroom((p) => p ? { ...p, forums: p.forums.filter((f) => f.id !== forumId) } : p);
  }

  // ── Enrollment ───────────────────────────────────────────────────────────────
  async function enrollStudent(studentId: string) {
    setEnrolling(true);
    await api.post(`/classrooms/admin/${id}/enroll`, { studentIds: [studentId] });
    loadStudents(); setEnrolling(false);
  }
  async function enrollGroup(groupId: string) {
    setEnrolling(true); setEnrollMsg(null);
    try {
      const res = await api.post<{ enrolled: number; groupName: string }>(`/classrooms/admin/${id}/enroll-group`, { groupId });
      setEnrollMsg({ type: "ok", text: `${res.enrolled} estudiante(s) de "${res.groupName}" inscritos` });
      loadStudents();
    } catch (e: any) {
      setEnrollMsg({ type: "err", text: e?.message ?? "Error al inscribir el grupo" });
    }
    setEnrolling(false);
    setTimeout(() => setEnrollMsg(null), 4000);
  }
  async function unenroll(studentId: string) {
    await api.delete(`/classrooms/admin/${id}/enroll/${studentId}`);
    setEnrollments((p) => p.filter((e) => e.student.id !== studentId));
  }

  if (loading || fetching) return (
    <div className="admin-layout"><SchoolAdminSidebar />
      <main className="admin-main"><div style={{ padding: 48, textAlign: "center", color: "#94a3b8" }}>Cargando aula…</div></main>
    </div>
  );
  if (!classroom) return null;

  const enrolledIds = new Set(enrollments.map((e) => e.student.id));
  const filteredStudents = allStudents.filter((s) => !enrolledIds.has(s.id) && (s.firstName + " " + s.lastName).toLowerCase().includes(enrollInput.toLowerCase()));

  const TABS = [
    { key: "modulos", label: "Módulos" },
    { key: "estructura", label: "Estructura" },
    { key: "foros", label: `Foros (${classroom.forums.length})` },
    { key: "estudiantes", label: "Estudiantes" },
    { key: "cursos", label: "📚 Cursos" },
    { key: "simulacros", label: "🎯 Simulacros" },
    { key: "notas", label: "🏆 Notas" },
  ] as const;

  const inputStyle = { padding: "9px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: "0.85rem", boxSizing: "border-box" as const, width: "100%" };

  return (
    <div className="admin-layout">
      <SchoolAdminSidebar />
      <main className="admin-main">
        <div className="admin-content">

          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, flexShrink: 0, background: `${classroom.color ?? "#004aad"}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.6rem" }}>
              {classroom.emoji ?? "🏫"}
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <h1 style={{ fontFamily: "var(--font-poppins)", fontWeight: 800, fontSize: "1.4rem", color: "#1e293b", margin: 0 }}>{classroom.title}</h1>
                <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 700, background: classroom.isPublished ? "#dcfce7" : "#f1f5f9", color: classroom.isPublished ? "#15803d" : "#64748b" }}>
                  {classroom.isPublished ? "Publicada" : "Borrador"}
                </span>
              </div>
              <p style={{ color: "#64748b", fontSize: "0.85rem", margin: "4px 0 0" }}>
                {classroom.description ?? "Sin descripción"} · {classroom._count.enrollments} estudiante{classroom._count.enrollments !== 1 ? "s" : ""}
              </p>
            </div>
            <Link href="/school-admin/clases" style={{ padding: "8px 16px", background: "#f1f5f9", color: "#475569", borderRadius: 8, textDecoration: "none", fontSize: "0.82rem", fontWeight: 600 }}>← Volver</Link>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "2px solid #f1f5f9" }}>
            {TABS.map(({ key, label }) => (
              <button key={key} onClick={() => setActiveTab(key as any)} style={{
                padding: "10px 20px", border: "none", background: "none", cursor: "pointer", fontWeight: 700, fontSize: "0.875rem",
                color: activeTab === key ? "#004aad" : "#94a3b8",
                borderBottom: activeTab === key ? "2px solid #004aad" : "2px solid transparent",
                marginBottom: -2, transition: "color 0.15s",
              }}>{label}</button>
            ))}
          </div>

          {/* ── TAB: MÓDULOS ─────────────────────────────────────────────── */}
          {activeTab === "modulos" && (
            <div>
              <div style={{ marginBottom: 20 }}>
                {!showModForm ? (
                  <button onClick={() => setShowModForm(true)} style={{ padding: "10px 20px", background: "#f0f4ff", color: "#004aad", border: "2px dashed #c7d7f0", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: "0.875rem" }}>
                    + Agregar módulo
                  </button>
                ) : (
                  <div style={{ background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0", padding: 16 }}>
                    <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#374151", marginBottom: 10 }}>Nuevo módulo</div>
                    <input placeholder="Título del módulo *" value={modTitle} onChange={(e) => setModTitle(e.target.value)} style={{ ...inputStyle, marginBottom: 8 }} />
                    <input placeholder="Descripción (opcional)" value={modDesc} onChange={(e) => setModDesc(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }} />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={saveModule} disabled={savingMod} style={{ padding: "9px 18px", background: "#004aad", color: "#fff", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: "0.85rem" }}>{savingMod ? "Guardando…" : "Guardar"}</button>
                      <button onClick={() => { setShowModForm(false); setModTitle(""); setModDesc(""); }} style={{ padding: "9px 14px", background: "#f1f5f9", border: "none", borderRadius: 8, cursor: "pointer", color: "#64748b" }}>Cancelar</button>
                    </div>
                  </div>
                )}
              </div>

              {classroom.modules.length === 0 && !showModForm && (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}><div style={{ fontSize: "2.5rem", marginBottom: 8 }}>📦</div><div style={{ fontWeight: 600 }}>Sin módulos aún.</div></div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {classroom.modules.map((mod) => (
                  <div key={mod.id} style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                    <div style={{ padding: "14px 18px", background: "#f8fafc", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, color: "#1e293b", fontSize: "0.95rem" }}>{mod.title}</div>
                        {mod.description && <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: 2 }}>{mod.description}</div>}
                      </div>
                      <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: "0.7rem", fontWeight: 600, background: mod.isPublished ? "#dcfce7" : "#f1f5f9", color: mod.isPublished ? "#15803d" : "#64748b" }}>{mod.isPublished ? "Visible" : "Oculto"}</span>
                      <button onClick={() => toggleModulePublish(mod.id, mod.isPublished)} style={{ padding: "4px 10px", border: "1px solid #e2e8f0", borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: "0.75rem", color: "#475569" }}>{mod.isPublished ? "Ocultar" : "Mostrar"}</button>
                      <button onClick={() => deleteModule(mod.id)} style={{ padding: "4px 8px", border: "1px solid #fee2e2", borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: "0.8rem", color: "#dc2626" }}>✕</button>
                    </div>

                    <div style={{ padding: "12px 18px" }}>
                      {mod.materials.length > 0 && (
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 6 }}>Materiales</div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            {mod.materials.map((mat) => (
                              <div key={mat.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#f8fafc", borderRadius: 8 }}>
                                <span>{TYPE_ICONS[mat.type] ?? "📎"}</span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{mat.title}</div>
                                  {mat.fileSize && <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>{fmtSize(mat.fileSize)}</div>}
                                </div>
                                <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>{mat.type}</span>
                                <button onClick={() => deleteMaterial(mod.id, mat.id)} style={{ border: "none", background: "none", cursor: "pointer", color: "#94a3b8" }}>✕</button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {mod.activities.length > 0 && (
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 6 }}>Actividades</div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            {mod.activities.map((act) => (
                              <div key={act.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#fffbeb", borderRadius: 8, border: "1px solid #fef3c7" }}>
                                <span>📋</span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{act.title}</div>
                                  <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>{act._count.submissions} entregas{act.dueDate && ` · Límite: ${new Date(act.dueDate).toLocaleDateString("es-CO")}`}</div>
                                </div>
                                <span style={{ padding: "2px 7px", borderRadius: 10, fontSize: "0.68rem", fontWeight: 600, background: act.isPublished ? "#dcfce7" : "#f1f5f9", color: act.isPublished ? "#15803d" : "#64748b" }}>{act.isPublished ? "Visible" : "Borrador"}</span>
                                <button onClick={() => toggleActivityPublish(mod.id, act.id, act.isPublished)} style={{ padding: "3px 8px", border: "1px solid #e2e8f0", borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: "0.7rem", color: "#64748b" }}>{act.isPublished ? "Ocultar" : "Publicar"}</button>
                                <Link href={`/school-admin/clases/${id}/actividad/${act.id}`} style={{ padding: "3px 8px", border: "1px solid #e2e8f0", borderRadius: 6, background: "#fff", textDecoration: "none", fontSize: "0.7rem", color: "#004aad", fontWeight: 600 }}>Entregas</Link>
                                <button onClick={() => deleteActivity(mod.id, act.id)} style={{ border: "none", background: "none", cursor: "pointer", color: "#94a3b8" }}>✕</button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {matModuleId === mod.id ? (
                        <div style={{ background: "#f0f4ff", borderRadius: 10, padding: 14, border: "1px solid #c7d7f0", marginBottom: 8 }}>
                          <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#374151", marginBottom: 8 }}>Agregar material</div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                            <input placeholder="Título *" value={matTitle} onChange={(e) => setMatTitle(e.target.value)} style={{ padding: "9px 12px", borderRadius: 8, border: "1.5px solid #c7d7f0", fontSize: "0.85rem", boxSizing: "border-box" as const }} />
                            <select value={matType} onChange={(e) => { setMatType(e.target.value); setMatFile(null); }} style={{ padding: "9px 12px", borderRadius: 8, border: "1.5px solid #c7d7f0", fontSize: "0.85rem" }}>
                              {["PDF","WORD","IMAGE","VIDEO","LINK","OTHER"].map((t) => <option key={t}>{t}</option>)}
                            </select>
                          </div>
                          {matType === "LINK" ? (
                            <input placeholder="URL del enlace *" value={matUrl} onChange={(e) => setMatUrl(e.target.value)} style={{ ...inputStyle, marginBottom: 8, borderColor: "#c7d7f0" }} />
                          ) : (
                            <>
                              <input ref={fileRef} type="file" style={{ display: "none" }} onChange={(e) => setMatFile(e.target.files?.[0] ?? null)} />
                              <button onClick={() => fileRef.current?.click()} type="button" style={{ ...inputStyle, background: "#fff", cursor: "pointer", textAlign: "left", marginBottom: 8, borderColor: "#c7d7f0", borderStyle: "dashed" }}>
                                {matFile ? `📎 ${matFile.name}` : "Seleccionar archivo…"}
                              </button>
                            </>
                          )}
                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={saveMaterial} disabled={savingMat} style={{ padding: "8px 16px", background: "#004aad", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: "0.82rem" }}>{savingMat ? "Subiendo…" : "Subir material"}</button>
                            <button onClick={() => setMatModuleId(null)} style={{ padding: "8px 12px", background: "#f1f5f9", border: "none", borderRadius: 8, cursor: "pointer", color: "#64748b" }}>Cancelar</button>
                          </div>
                        </div>
                      ) : actModuleId === mod.id ? (
                        <div style={{ background: "#fffbeb", borderRadius: 10, padding: 14, border: "1px solid #fef3c7", marginBottom: 8 }}>
                          <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#374151", marginBottom: 8 }}>Nueva actividad</div>
                          <input placeholder="Título *" value={actTitle} onChange={(e) => setActTitle(e.target.value)} style={{ ...inputStyle, marginBottom: 8, borderColor: "#fde68a" }} />
                          <textarea placeholder="Descripción / instrucciones" value={actDesc} onChange={(e) => setActDesc(e.target.value)} rows={2} style={{ ...inputStyle, marginBottom: 8, borderColor: "#fde68a", resize: "vertical" }} />
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                            <div><label style={{ fontSize: "0.72rem", fontWeight: 600, color: "#92400e" }}>Fecha límite</label><input type="datetime-local" value={actDue} onChange={(e) => setActDue(e.target.value)} style={{ ...inputStyle, marginTop: 4, borderColor: "#fde68a" }} /></div>
                            <div><label style={{ fontSize: "0.72rem", fontWeight: 600, color: "#92400e" }}>Puntaje máximo</label><input type="number" placeholder="100" value={actScore} onChange={(e) => setActScore(e.target.value)} style={{ ...inputStyle, marginTop: 4, borderColor: "#fde68a" }} /></div>
                          </div>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={saveActivity} disabled={savingAct} style={{ padding: "8px 16px", background: "#d97706", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: "0.82rem" }}>{savingAct ? "Guardando…" : "Crear actividad"}</button>
                            <button onClick={() => setActModuleId(null)} style={{ padding: "8px 12px", background: "#f1f5f9", border: "none", borderRadius: 8, cursor: "pointer", color: "#64748b" }}>Cancelar</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
                          <button onClick={() => { setMatModuleId(mod.id); setActModuleId(null); }} style={{ padding: "7px 14px", background: "#f0f4ff", color: "#004aad", border: "none", borderRadius: 8, cursor: "pointer", fontSize: "0.78rem", fontWeight: 600 }}>+ Material</button>
                          <button onClick={() => { setActModuleId(mod.id); setMatModuleId(null); }} style={{ padding: "7px 14px", background: "#fffbeb", color: "#92400e", border: "none", borderRadius: 8, cursor: "pointer", fontSize: "0.78rem", fontWeight: 600 }}>+ Actividad</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TAB: ESTRUCTURA ──────────────────────────────────────────── */}
          {activeTab === "estructura" && (
            <div>
              <p style={{ color: "#64748b", fontSize: "0.85rem", marginBottom: 20 }}>
                Organiza el contenido del aula en secciones, temas, subtemas y unidades de aprendizaje.
              </p>
              {classroom.modules.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>
                  <div style={{ fontSize: "2rem", marginBottom: 8 }}>📂</div>
                  <div>Primero crea módulos en la pestaña Módulos.</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  {classroom.modules.map((mod) => (
                    <div key={mod.id} style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                      {/* Module header */}
                      <div style={{ padding: "12px 18px", background: "#f0f4ff", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "#004aad" }}>📦 {mod.title}</span>
                        <div style={{ flex: 1 }} />
                        {sectionModuleId === mod.id ? null : (
                          <button onClick={() => { setSectionModuleId(mod.id); setSectionTitle(""); }} style={{ padding: "5px 12px", background: "#004aad", color: "#fff", border: "none", borderRadius: 7, cursor: "pointer", fontSize: "0.75rem", fontWeight: 700 }}>+ Sección</button>
                        )}
                      </div>

                      <div style={{ padding: "12px 18px" }}>
                        {/* Add section form */}
                        {sectionModuleId === mod.id && (
                          <div style={{ background: "#f0f4ff", borderRadius: 10, padding: 12, border: "1px solid #c7d7f0", marginBottom: 12 }}>
                            <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#374151", marginBottom: 8 }}>Nueva sección</div>
                            <div style={{ display: "flex", gap: 8 }}>
                              <input placeholder="Título de la sección *" value={sectionTitle} onChange={(e) => setSectionTitle(e.target.value)} style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1.5px solid #c7d7f0", fontSize: "0.85rem" }} />
                              <button onClick={saveSection} disabled={savingSection} style={{ padding: "8px 16px", background: "#004aad", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: "0.82rem" }}>{savingSection ? "…" : "Crear"}</button>
                              <button onClick={() => setSectionModuleId(null)} style={{ padding: "8px 12px", background: "#f1f5f9", border: "none", borderRadius: 8, cursor: "pointer", color: "#64748b" }}>✕</button>
                            </div>
                          </div>
                        )}

                        {mod.sections.length === 0 && sectionModuleId !== mod.id && (
                          <div style={{ color: "#94a3b8", fontSize: "0.82rem", padding: "8px 0" }}>Sin secciones. Agrega una.</div>
                        )}

                        {/* Sections */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                          {mod.sections.map((sec) => (
                            <div key={sec.id} style={{ border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
                              {/* Section header */}
                              <div style={{ padding: "10px 14px", background: "#f8f9ff", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#1e293b" }}>📂 {sec.title}</span>
                                <div style={{ flex: 1 }} />
                                {topicSectionId === sec.id ? null : (
                                  <button onClick={() => { setTopicSectionId(sec.id); setTopicTitle(""); }} style={{ padding: "4px 10px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: "0.72rem", fontWeight: 700 }}>+ Tema</button>
                                )}
                                <button onClick={() => deleteSection(mod.id, sec.id)} style={{ padding: "4px 8px", border: "1px solid #fee2e2", borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: "0.75rem", color: "#dc2626" }}>✕</button>
                              </div>

                              <div style={{ padding: "10px 14px" }}>
                                {/* Add topic form */}
                                {topicSectionId === sec.id && (
                                  <div style={{ background: "#f5f3ff", borderRadius: 8, padding: 10, border: "1px solid #ddd6fe", marginBottom: 10 }}>
                                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#6d28d9", marginBottom: 6 }}>Nuevo tema</div>
                                    <div style={{ display: "flex", gap: 8 }}>
                                      <input placeholder="Título del tema *" value={topicTitle} onChange={(e) => setTopicTitle(e.target.value)} style={{ flex: 1, padding: "7px 10px", borderRadius: 7, border: "1.5px solid #ddd6fe", fontSize: "0.82rem" }} />
                                      <button onClick={saveTopic} disabled={savingTopic} style={{ padding: "7px 14px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 7, cursor: "pointer", fontWeight: 700, fontSize: "0.78rem" }}>{savingTopic ? "…" : "Crear"}</button>
                                      <button onClick={() => setTopicSectionId(null)} style={{ padding: "7px 10px", background: "#f1f5f9", border: "none", borderRadius: 7, cursor: "pointer", color: "#64748b" }}>✕</button>
                                    </div>
                                  </div>
                                )}

                                {sec.topics.length === 0 && topicSectionId !== sec.id && (
                                  <div style={{ color: "#94a3b8", fontSize: "0.78rem", padding: "4px 0" }}>Sin temas. Agrega uno.</div>
                                )}

                                {/* Topics */}
                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                  {sec.topics.map((topic) => (
                                    <div key={topic.id} style={{ border: "1px solid #f3e8ff", borderRadius: 8, background: "#faf5ff" }}>
                                      {/* Topic header */}
                                      <div style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: 6, borderBottom: "1px solid #f3e8ff" }}>
                                        <span style={{ fontWeight: 600, fontSize: "0.82rem", color: "#6d28d9" }}>📖 {topic.title}</span>
                                        <div style={{ flex: 1 }} />
                                        <Link href={`/school-admin/clases/${id}/tema/${topic.id}`} style={{ padding: "3px 8px", background: "#f0f4ff", color: "#004aad", border: "1px solid #c7d7f0", borderRadius: 5, fontSize: "0.68rem", fontWeight: 700, textDecoration: "none" }}>Detalle</Link>
                                        <button onClick={() => { setSubtopicTopicId(topic.id); setSubtopicTitle(""); }} style={{ padding: "3px 8px", background: "#059669", color: "#fff", border: "none", borderRadius: 5, cursor: "pointer", fontSize: "0.68rem", fontWeight: 700 }}>+ Subtema</button>
                                        <button onClick={() => { setUnitParent({ id: topic.id, type: "topic" }); setUnitTitle(""); setUnitType("TEXT"); setUnitContent(""); setUnitVideoUrl(""); }} style={{ padding: "3px 8px", background: "#0891b2", color: "#fff", border: "none", borderRadius: 5, cursor: "pointer", fontSize: "0.68rem", fontWeight: 700 }}>+ Unidad</button>
                                        <button onClick={() => deleteTopic(sec.id, topic.id)} style={{ border: "none", background: "none", cursor: "pointer", color: "#94a3b8", fontSize: "0.85rem" }}>✕</button>
                                      </div>

                                      <div style={{ padding: "8px 12px" }}>
                                        {/* Topic units */}
                                        {topic.units.length > 0 && (
                                          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
                                            {topic.units.map((u) => (
                                              <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "#fff", borderRadius: 6, border: "1px solid #e9d5ff" }}>
                                                <span style={{ fontSize: "0.85rem" }}>{UNIT_ICONS[u.type] ?? "📄"}</span>
                                                <span style={{ fontSize: "0.78rem", color: "#1e293b", flex: 1 }}>{u.title}</span>
                                                <span style={{ fontSize: "0.65rem", color: "#94a3b8", background: "#f3e8ff", padding: "2px 6px", borderRadius: 10 }}>{u.type}</span>
                                                <span style={{ fontSize: "0.65rem", color: u.isPublished ? "#059669" : "#94a3b8" }}>{u.isPublished ? "✓" : "○"}</span>
                                                <Link href={`/school-admin/clases/${id}/unidad/${u.id}`} style={{ padding: "2px 7px", background: "#f0f4ff", color: "#004aad", border: "1px solid #c7d7f0", borderRadius: 5, fontSize: "0.65rem", fontWeight: 700, textDecoration: "none" }}>Gestionar</Link>
                                                <button onClick={() => deleteUnit(u.id)} style={{ border: "none", background: "none", cursor: "pointer", color: "#94a3b8", fontSize: "0.78rem" }}>✕</button>
                                              </div>
                                            ))}
                                          </div>
                                        )}

                                        {/* Topic simulacros */}
                                        {topic.simulacros.length > 0 && (
                                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
                                            {topic.simulacros.map((ts) => (
                                              <span key={ts.id} style={{ padding: "3px 10px", background: "#fef3c7", color: "#92400e", borderRadius: 20, fontSize: "0.72rem", fontWeight: 600 }}>
                                                📝 {ts.simulacro.titulo}
                                              </span>
                                            ))}
                                          </div>
                                        )}

                                        {/* Add unit form (for topic) */}
                                        {unitParent?.id === topic.id && unitParent.type === "topic" && (
                                          <div style={{ background: "#e0f2fe", borderRadius: 8, padding: 10, border: "1px solid #bae6fd", marginBottom: 8 }}>
                                            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#0369a1", marginBottom: 6 }}>Nueva unidad</div>
                                            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, marginBottom: 8 }}>
                                              <input placeholder="Título *" value={unitTitle} onChange={(e) => setUnitTitle(e.target.value)} style={{ padding: "7px 10px", borderRadius: 7, border: "1.5px solid #bae6fd", fontSize: "0.8rem" }} />
                                              <select value={unitType} onChange={(e) => setUnitType(e.target.value)} style={{ padding: "7px 10px", borderRadius: 7, border: "1.5px solid #bae6fd", fontSize: "0.8rem" }}>
                                                {["TEXT","VIDEO","FILE","SIMULACRO_LINK"].map((t) => <option key={t} value={t}>{t}</option>)}
                                              </select>
                                            </div>
                                            {unitType === "TEXT" && <textarea placeholder="Contenido..." value={unitContent} onChange={(e) => setUnitContent(e.target.value)} rows={3} style={{ width: "100%", padding: "7px 10px", borderRadius: 7, border: "1.5px solid #bae6fd", fontSize: "0.8rem", marginBottom: 8, boxSizing: "border-box" as const, resize: "vertical" }} />}
                                            {unitType === "VIDEO" && <input placeholder="URL del video (YouTube, Vimeo…)" value={unitVideoUrl} onChange={(e) => setUnitVideoUrl(e.target.value)} style={{ width: "100%", padding: "7px 10px", borderRadius: 7, border: "1.5px solid #bae6fd", fontSize: "0.8rem", marginBottom: 8, boxSizing: "border-box" as const }} />}
                                            <div style={{ display: "flex", gap: 8 }}>
                                              <button onClick={saveUnit} disabled={savingUnit} style={{ padding: "7px 14px", background: "#0891b2", color: "#fff", border: "none", borderRadius: 7, cursor: "pointer", fontWeight: 700, fontSize: "0.78rem" }}>{savingUnit ? "…" : "Crear"}</button>
                                              <button onClick={() => setUnitParent(null)} style={{ padding: "7px 10px", background: "#f1f5f9", border: "none", borderRadius: 7, cursor: "pointer", color: "#64748b" }}>✕</button>
                                            </div>
                                          </div>
                                        )}

                                        {/* Add subtopic form */}
                                        {subtopicTopicId === topic.id && (
                                          <div style={{ background: "#f0fdf4", borderRadius: 8, padding: 10, border: "1px solid #bbf7d0", marginBottom: 8 }}>
                                            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#15803d", marginBottom: 6 }}>Nuevo subtema</div>
                                            <div style={{ display: "flex", gap: 8 }}>
                                              <input placeholder="Título del subtema *" value={subtopicTitle} onChange={(e) => setSubtopicTitle(e.target.value)} style={{ flex: 1, padding: "7px 10px", borderRadius: 7, border: "1.5px solid #bbf7d0", fontSize: "0.8rem" }} />
                                              <button onClick={saveSubtopic} disabled={savingSubtopic} style={{ padding: "7px 14px", background: "#059669", color: "#fff", border: "none", borderRadius: 7, cursor: "pointer", fontWeight: 700, fontSize: "0.78rem" }}>{savingSubtopic ? "…" : "Crear"}</button>
                                              <button onClick={() => setSubtopicTopicId(null)} style={{ padding: "7px 10px", background: "#f1f5f9", border: "none", borderRadius: 7, cursor: "pointer", color: "#64748b" }}>✕</button>
                                            </div>
                                          </div>
                                        )}

                                        {/* Subtopics */}
                                        {topic.subtopics.map((sub) => (
                                          <div key={sub.id} style={{ border: "1px solid #bbf7d0", borderRadius: 7, background: "#f0fdf4", padding: "8px 10px", marginTop: 4 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: sub.units.length > 0 ? 6 : 0 }}>
                                              <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#15803d" }}>↳ {sub.title}</span>
                                              <div style={{ flex: 1 }} />
                                              <button onClick={() => { setUnitParent({ id: sub.id, type: "subtopic" }); setUnitTitle(""); setUnitType("TEXT"); }} style={{ padding: "2px 7px", background: "#0891b2", color: "#fff", border: "none", borderRadius: 5, cursor: "pointer", fontSize: "0.65rem", fontWeight: 700 }}>+ Unidad</button>
                                              <button onClick={() => deleteSubtopic(topic.id, sub.id)} style={{ border: "none", background: "none", cursor: "pointer", color: "#94a3b8", fontSize: "0.78rem" }}>✕</button>
                                            </div>
                                            {unitParent?.id === sub.id && unitParent.type === "subtopic" && (
                                              <div style={{ background: "#e0f2fe", borderRadius: 7, padding: 8, border: "1px solid #bae6fd", marginBottom: 6 }}>
                                                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 6, marginBottom: 6 }}>
                                                  <input placeholder="Título *" value={unitTitle} onChange={(e) => setUnitTitle(e.target.value)} style={{ padding: "6px 8px", borderRadius: 6, border: "1.5px solid #bae6fd", fontSize: "0.78rem" }} />
                                                  <select value={unitType} onChange={(e) => setUnitType(e.target.value)} style={{ padding: "6px 8px", borderRadius: 6, border: "1.5px solid #bae6fd", fontSize: "0.78rem" }}>
                                                    {["TEXT","VIDEO","FILE","SIMULACRO_LINK"].map((t) => <option key={t} value={t}>{t}</option>)}
                                                  </select>
                                                </div>
                                                {unitType === "TEXT" && <textarea placeholder="Contenido..." value={unitContent} onChange={(e) => setUnitContent(e.target.value)} rows={2} style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1.5px solid #bae6fd", fontSize: "0.78rem", marginBottom: 6, boxSizing: "border-box" as const, resize: "vertical" }} />}
                                                {unitType === "VIDEO" && <input placeholder="URL del video" value={unitVideoUrl} onChange={(e) => setUnitVideoUrl(e.target.value)} style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1.5px solid #bae6fd", fontSize: "0.78rem", marginBottom: 6, boxSizing: "border-box" as const }} />}
                                                <div style={{ display: "flex", gap: 6 }}>
                                                  <button onClick={saveUnit} disabled={savingUnit} style={{ padding: "6px 12px", background: "#0891b2", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: "0.75rem" }}>{savingUnit ? "…" : "Crear"}</button>
                                                  <button onClick={() => setUnitParent(null)} style={{ padding: "6px 8px", background: "#f1f5f9", border: "none", borderRadius: 6, cursor: "pointer", color: "#64748b" }}>✕</button>
                                                </div>
                                              </div>
                                            )}
                                            {sub.units.map((u) => (
                                              <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", background: "#fff", borderRadius: 5, border: "1px solid #bbf7d0", marginTop: 4 }}>
                                                <span style={{ fontSize: "0.78rem" }}>{UNIT_ICONS[u.type] ?? "📄"}</span>
                                                <span style={{ fontSize: "0.75rem", color: "#1e293b", flex: 1 }}>{u.title}</span>
                                                <Link href={`/school-admin/clases/${id}/unidad/${u.id}`} style={{ padding: "2px 7px", background: "#f0f4ff", color: "#004aad", border: "1px solid #c7d7f0", borderRadius: 5, fontSize: "0.65rem", fontWeight: 700, textDecoration: "none" }}>Gestionar</Link>
                                                <button onClick={() => deleteUnit(u.id)} style={{ border: "none", background: "none", cursor: "pointer", color: "#94a3b8", fontSize: "0.75rem" }}>✕</button>
                                              </div>
                                            ))}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── TAB: FOROS ───────────────────────────────────────────────── */}
          {activeTab === "foros" && (
            <div>
              <div style={{ marginBottom: 20 }}>
                {!showForumForm ? (
                  <button onClick={() => setShowForumForm(true)} style={{ padding: "10px 20px", background: "#f0fdf4", color: "#059669", border: "2px dashed #bbf7d0", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: "0.875rem" }}>
                    + Crear foro
                  </button>
                ) : (
                  <div style={{ background: "#f0fdf4", borderRadius: 12, border: "1px solid #bbf7d0", padding: 16 }}>
                    <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#15803d", marginBottom: 10 }}>Nuevo foro</div>
                    <input placeholder="Título del foro *" value={forumTitle} onChange={(e) => setForumTitle(e.target.value)} style={{ ...inputStyle, marginBottom: 8 }} />
                    <input placeholder="Descripción (opcional)" value={forumDesc} onChange={(e) => setForumDesc(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }} />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={saveForum} disabled={savingForum} style={{ padding: "9px 18px", background: "#059669", color: "#fff", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: "0.85rem" }}>{savingForum ? "Creando…" : "Crear foro"}</button>
                      <button onClick={() => { setShowForumForm(false); setForumTitle(""); setForumDesc(""); }} style={{ padding: "9px 14px", background: "#f1f5f9", border: "none", borderRadius: 8, cursor: "pointer", color: "#64748b" }}>Cancelar</button>
                    </div>
                  </div>
                )}
              </div>

              {classroom.forums.length === 0 && !showForumForm ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>
                  <div style={{ fontSize: "2.5rem", marginBottom: 8 }}>💬</div>
                  <div style={{ fontWeight: 600 }}>Sin foros. Crea el primero para que los estudiantes puedan participar.</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {classroom.forums.map((forum) => (
                    <div key={forum.id} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem", flexShrink: 0 }}>💬</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "#1e293b" }}>{forum.title}</div>
                        {forum.description && <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: 2 }}>{forum.description}</div>}
                        <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 2 }}>{forum._count.threads} hilo{forum._count.threads !== 1 ? "s" : ""}</div>
                      </div>
                      {forum.isLocked && <span style={{ padding: "2px 8px", background: "#fef2f2", color: "#dc2626", borderRadius: 10, fontSize: "0.7rem", fontWeight: 600 }}>Bloqueado</span>}
                      <Link href={`/school-admin/clases/${id}/foro/${forum.id}`} style={{ padding: "7px 14px", background: "#f0f4ff", color: "#004aad", borderRadius: 8, textDecoration: "none", fontWeight: 700, fontSize: "0.78rem" }}>Ver hilos</Link>
                      <button onClick={() => deleteForum(forum.id)} style={{ padding: "7px 10px", border: "1px solid #fee2e2", borderRadius: 8, background: "#fff", cursor: "pointer", fontSize: "0.8rem", color: "#dc2626" }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── TAB: ESTUDIANTES ─────────────────────────────────────────── */}
          {activeTab === "estudiantes" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>
              <div>
                <div style={{ fontWeight: 700, color: "#1e293b", marginBottom: 12 }}>Inscritos ({enrollments.length})</div>
                {enrollments.length === 0 ? (
                  <div style={{ color: "#94a3b8", fontSize: "0.85rem", padding: "20px 0" }}>Sin estudiantes inscritos.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {enrollments.map((e) => (
                      <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#f8fafc", borderRadius: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#e0e7ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", fontWeight: 700, color: "#4338ca", flexShrink: 0 }}>
                          {(e.student.firstName[0] + e.student.lastName[0]).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "#374151" }}>{e.student.firstName} {e.student.lastName}</div>
                          <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{e.student.email}</div>
                        </div>
                        <button onClick={() => unenroll(e.student.id)} style={{ padding: "4px 10px", border: "1px solid #fee2e2", borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: "0.75rem", color: "#dc2626" }}>Quitar</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <div style={{ fontWeight: 700, color: "#1e293b", marginBottom: 12 }}>Agregar al aula</div>
                {/* Toggle estudiante / grupo */}
                <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 8, padding: 3, marginBottom: 12, gap: 2 }}>
                  {(["student", "group"] as const).map((mode) => (
                    <button key={mode} onClick={() => { setEnrollMode(mode); setEnrollInput(""); }}
                      style={{ flex: 1, padding: "6px 0", border: "none", borderRadius: 6, cursor: "pointer", fontSize: "0.78rem", fontWeight: 700,
                        background: enrollMode === mode ? "#fff" : "transparent",
                        color: enrollMode === mode ? "#004aad" : "#64748b",
                        boxShadow: enrollMode === mode ? "0 1px 3px #0001" : "none" }}>
                      {mode === "student" ? "👤 Estudiante" : "👥 Grupo"}
                    </button>
                  ))}
                </div>

                {enrollMode === "student" && (
                  <>
                    <input placeholder="Buscar por nombre…" value={enrollInput} onChange={(e) => setEnrollInput(e.target.value)} style={{ ...inputStyle, marginBottom: 8 }} />
                    <div style={{ maxHeight: 280, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                      {filteredStudents.slice(0, 20).map((s) => (
                        <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", background: "#f8fafc", borderRadius: 8 }}>
                          <span style={{ fontSize: "0.85rem", color: "#374151" }}>{s.firstName} {s.lastName}</span>
                          <button onClick={() => enrollStudent(s.id)} disabled={enrolling} style={{ padding: "4px 12px", background: "#004aad", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: "0.78rem", fontWeight: 700 }}>Inscribir</button>
                        </div>
                      ))}
                      {filteredStudents.length === 0 && <div style={{ color: "#94a3b8", fontSize: "0.82rem", padding: "12px 0", textAlign: "center" }}>{enrollInput ? "Sin resultados." : "Todos los estudiantes ya están inscritos."}</div>}
                    </div>
                  </>
                )}

                {enrollMode === "group" && (
                  <>
                    {enrollMsg && (
                      <div style={{ padding: "8px 12px", borderRadius: 8, marginBottom: 8, fontSize: "0.8rem", fontWeight: 600,
                        background: enrollMsg.type === "ok" ? "#dcfce7" : "#fef2f2",
                        color: enrollMsg.type === "ok" ? "#166534" : "#dc2626",
                        border: `1px solid ${enrollMsg.type === "ok" ? "#86efac" : "#fecaca"}` }}>
                        {enrollMsg.type === "ok" ? "✓" : "⚠"} {enrollMsg.text}
                      </div>
                    )}
                    <input placeholder="Buscar grupo…" value={enrollInput} onChange={(e) => setEnrollInput(e.target.value)} style={{ ...inputStyle, marginBottom: 8 }} />
                    <div style={{ maxHeight: 280, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                      {allGroups
                        .filter((g) => g.name.toLowerCase().includes(enrollInput.toLowerCase()))
                        .map((g) => (
                          <div key={g.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "#f8fafc", borderRadius: 8 }}>
                            <div>
                              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1e293b" }}>{g.name}</div>
                              <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{g._count.members} estudiante(s){g.description ? ` · ${g.description}` : ""}</div>
                            </div>
                            <button onClick={() => enrollGroup(g.id)} disabled={enrolling || g._count.members === 0}
                              style={{ padding: "4px 12px", background: g._count.members === 0 ? "#e2e8f0" : "#004aad", color: g._count.members === 0 ? "#94a3b8" : "#fff", border: "none", borderRadius: 6, cursor: g._count.members === 0 ? "default" : "pointer", fontSize: "0.78rem", fontWeight: 700, flexShrink: 0 }}>
                              Inscribir
                            </button>
                          </div>
                        ))}
                      {allGroups.filter((g) => g.name.toLowerCase().includes(enrollInput.toLowerCase())).length === 0 && (
                        <div style={{ color: "#94a3b8", fontSize: "0.82rem", padding: "12px 0", textAlign: "center" }}>{enrollInput ? "Sin resultados." : "No hay grupos creados."}</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── TAB: CURSOS ─────────────────────────────────────────────────── */}
          {activeTab === "cursos" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>
              {/* Cursos asignados */}
              <div>
                <div style={{ fontWeight: 700, color: "#1e293b", marginBottom: 12 }}>Cursos del aula ({classroomCourses.length})</div>
                {classroomCourses.length === 0 ? (
                  <div style={{ color: "#94a3b8", fontSize: "0.85rem", padding: "20px 0", textAlign: "center" }}>
                    <div style={{ fontSize: "2rem", marginBottom: 8 }}>📚</div>
                    Sin cursos asignados aún.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {classroomCourses.map((cc) => (
                      <div key={cc.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                        <div style={{ width: 38, height: 38, borderRadius: 8, background: "#e0e7ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", flexShrink: 0 }}>📚</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cc.course.title}</div>
                          <div style={{ display: "flex", gap: 6, marginTop: 3, flexWrap: "wrap" }}>
                            {cc.course.isGlobal && <span style={{ fontSize: "0.68rem", fontWeight: 600, background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0", borderRadius: 10, padding: "1px 7px" }}>Global</span>}
                            {cc.isRequired && <span style={{ fontSize: "0.68rem", fontWeight: 600, background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", borderRadius: 10, padding: "1px 7px" }}>Obligatorio</span>}
                            {!cc.course.isPublished && <span style={{ fontSize: "0.68rem", fontWeight: 600, background: "#fef9c3", color: "#a16207", border: "1px solid #fde68a", borderRadius: 10, padding: "1px 7px" }}>Borrador</span>}
                          </div>
                        </div>
                        <button onClick={() => removeCourse(cc.courseId)} style={{ padding: "4px 10px", border: "1px solid #fee2e2", borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: "0.75rem", color: "#dc2626", flexShrink: 0 }}>Quitar</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* Selector de cursos disponibles */}
              <div>
                <div style={{ fontWeight: 700, color: "#1e293b", marginBottom: 12 }}>Asociar curso</div>
                {courseMsg && (
                  <div style={{ padding: "8px 12px", borderRadius: 8, marginBottom: 10, fontSize: "0.8rem", fontWeight: 600,
                    background: courseMsg.type === "ok" ? "#dcfce7" : "#fef2f2",
                    color: courseMsg.type === "ok" ? "#166534" : "#dc2626",
                    border: `1px solid ${courseMsg.type === "ok" ? "#86efac" : "#fecaca"}` }}>
                    {courseMsg.type === "ok" ? "✓" : "⚠"} {courseMsg.text}
                  </div>
                )}
                <input placeholder="Buscar curso…" value={courseSearch} onChange={(e) => setCourseSearch(e.target.value)} style={{ ...inputStyle, marginBottom: 8 }} />
                <div style={{ maxHeight: 320, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                  {availableCourses
                    .filter((c) => !classroomCourses.some((cc) => cc.courseId === c.id) && c.title.toLowerCase().includes(courseSearch.toLowerCase()))
                    .map((c) => (
                      <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</div>
                          <div style={{ display: "flex", gap: 5, marginTop: 2 }}>
                            {c.isGlobal && <span style={{ fontSize: "0.65rem", fontWeight: 600, background: "#f0fdf4", color: "#16a34a", borderRadius: 8, padding: "1px 6px" }}>Global</span>}
                            {!c.isPublished && <span style={{ fontSize: "0.65rem", fontWeight: 600, background: "#fef9c3", color: "#a16207", borderRadius: 8, padding: "1px 6px" }}>Borrador</span>}
                          </div>
                        </div>
                        <button onClick={() => assignCourse(c.id)} disabled={savingCourse} style={{ padding: "4px 12px", background: "#004aad", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: "0.78rem", fontWeight: 700, flexShrink: 0 }}>Agregar</button>
                      </div>
                    ))}
                  {availableCourses.filter((c) => !classroomCourses.some((cc) => cc.courseId === c.id) && c.title.toLowerCase().includes(courseSearch.toLowerCase())).length === 0 && (
                    <div style={{ color: "#94a3b8", fontSize: "0.82rem", padding: "12px 0", textAlign: "center" }}>
                      {courseSearch ? "Sin resultados." : "No hay cursos disponibles para asociar."}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── TAB: SIMULACROS ──────────────────────────────────────────────── */}
          {activeTab === "simulacros" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>
              {/* Simulacros asignados */}
              <div>
                <div style={{ fontWeight: 700, color: "#1e293b", marginBottom: 12 }}>Simulacros del aula ({classroomSimulacros.length})</div>
                {classroomSimulacros.length === 0 ? (
                  <div style={{ color: "#94a3b8", fontSize: "0.85rem", padding: "20px 0", textAlign: "center" }}>
                    <div style={{ fontSize: "2rem", marginBottom: 8 }}>🎯</div>
                    Sin simulacros asignados aún.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {classroomSimulacros.map((cs) => (
                      <div key={cs.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                        <div style={{ width: 38, height: 38, borderRadius: 8, background: "#fdf2ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", flexShrink: 0 }}>🎯</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cs.simulacro.titulo}</div>
                          <div style={{ fontSize: "0.73rem", color: "#94a3b8", marginTop: 2 }}>
                            {cs.simulacro.totalPreguntas} preguntas · {cs.simulacro.duracionMinutos} min
                            {cs.dueDate && ` · Límite: ${new Date(cs.dueDate).toLocaleDateString("es-CO")}`}
                          </div>
                          <div style={{ display: "flex", gap: 5, marginTop: 3, flexWrap: "wrap" }}>
                            {cs.context && <span style={{ fontSize: "0.65rem", fontWeight: 600, background: "#f5f3ff", color: "#7c3aed", border: "1px solid #ddd6fe", borderRadius: 10, padding: "1px 7px" }}>{cs.context}</span>}
                            {cs.simulacro.isGlobal && <span style={{ fontSize: "0.65rem", fontWeight: 600, background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0", borderRadius: 10, padding: "1px 7px" }}>Global</span>}
                            {cs.isRequired && <span style={{ fontSize: "0.65rem", fontWeight: 600, background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", borderRadius: 10, padding: "1px 7px" }}>Obligatorio</span>}
                          </div>
                        </div>
                        <button onClick={() => removeSimulacro(cs.simulacroId)} style={{ padding: "4px 10px", border: "1px solid #fee2e2", borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: "0.75rem", color: "#dc2626", flexShrink: 0 }}>Quitar</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* Selector de simulacros disponibles */}
              <div>
                <div style={{ fontWeight: 700, color: "#1e293b", marginBottom: 12 }}>Asociar simulacro</div>
                {simulacroMsg && (
                  <div style={{ padding: "8px 12px", borderRadius: 8, marginBottom: 10, fontSize: "0.8rem", fontWeight: 600,
                    background: simulacroMsg.type === "ok" ? "#dcfce7" : "#fef2f2",
                    color: simulacroMsg.type === "ok" ? "#166534" : "#dc2626",
                    border: `1px solid ${simulacroMsg.type === "ok" ? "#86efac" : "#fecaca"}` }}>
                    {simulacroMsg.type === "ok" ? "✓" : "⚠"} {simulacroMsg.text}
                  </div>
                )}
                <input placeholder="Buscar simulacro…" value={simulacroSearch} onChange={(e) => setSimulacroSearch(e.target.value)} style={{ ...inputStyle, marginBottom: 8 }} />
                <div style={{ maxHeight: 320, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                  {availableSimulacros
                    .filter((s) => !classroomSimulacros.some((cs) => cs.simulacroId === s.id) && s.titulo.toLowerCase().includes(simulacroSearch.toLowerCase()))
                    .map((s) => (
                      <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.titulo}</div>
                          <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 1 }}>{s.totalPreguntas} preguntas</div>
                          {s.isGlobal && <span style={{ fontSize: "0.65rem", fontWeight: 600, background: "#f0fdf4", color: "#16a34a", borderRadius: 8, padding: "1px 6px", marginTop: 2, display: "inline-block" }}>Global</span>}
                        </div>
                        <button onClick={() => assignSimulacro(s.id)} disabled={savingSimulacro} style={{ padding: "4px 12px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: "0.78rem", fontWeight: 700, flexShrink: 0 }}>Agregar</button>
                      </div>
                    ))}
                  {availableSimulacros.filter((s) => !classroomSimulacros.some((cs) => cs.simulacroId === s.id) && s.titulo.toLowerCase().includes(simulacroSearch.toLowerCase())).length === 0 && (
                    <div style={{ color: "#94a3b8", fontSize: "0.82rem", padding: "12px 0", textAlign: "center" }}>
                      {simulacroSearch ? "Sin resultados." : "No hay simulacros disponibles para asociar."}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── TAB: NOTAS ──────────────────────────────────────────────────── */}
          {activeTab === "notas" && (
            <div style={{ textAlign: "center", padding: "40px 24px" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🏆</div>
              <h3 style={{ fontWeight: 800, color: "#1e293b", margin: "0 0 8px" }}>Notas y Certificados</h3>
              <p style={{ color: "#64748b", marginBottom: 20 }}>Gestiona las notas finales y emite certificados de finalización.</p>
              <Link href={`/school-admin/clases/${id}/notas`} style={{ padding: "10px 24px", background: "#004aad", color: "#fff", borderRadius: 10, textDecoration: "none", fontWeight: 700 }}>
                Ver notas y certificados →
              </Link>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
