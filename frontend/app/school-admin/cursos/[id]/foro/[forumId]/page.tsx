"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import SchoolAdminSidebar from "@/components/school-admin/SchoolAdminSidebar";
import { api } from "@/lib/api";

interface ForumThread {
  id: string; title: string; isPinned: boolean; isLocked: boolean; viewCount: number; createdAt: string;
  author: { id: string; firstName: string; lastName: string };
  _count: { posts: number };
}
interface ForumPost {
  id: string; content: string; isEdited: boolean; createdAt: string;
  author: { id: string; firstName: string; lastName: string; role: string };
  replies: ForumPost[];
}

function PostCard({ post, onDelete, onReply }: { post: ForumPost; onDelete: (id: string) => void; onReply: (id: string) => void }) {
  const initials = (post.author.firstName[0] + post.author.lastName[0]).toUpperCase();
  const isAdmin = post.author.role === "ADMIN" || post.author.role === "SUPER_ADMIN";
  return (
    <div style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 14px", border: "1px solid #e2e8f0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: isAdmin ? "#fef3c7" : "#e0e7ff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.78rem", color: isAdmin ? "#92400e" : "#4338ca", flexShrink: 0 }}>{initials}</div>
        <div style={{ flex: 1 }}>
          <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#1e293b" }}>{post.author.firstName} {post.author.lastName}</span>
          {isAdmin && <span style={{ marginLeft: 6, padding: "1px 6px", background: "#fef3c7", color: "#92400e", borderRadius: 10, fontSize: "0.65rem", fontWeight: 700 }}>Profesor</span>}
        </div>
        <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>{new Date(post.createdAt).toLocaleDateString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
      </div>
      <p style={{ margin: 0, fontSize: "0.88rem", color: "#374151", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{post.content}</p>
      <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
        <button onClick={() => onReply(post.id)} style={{ padding: "3px 10px", border: "1px solid #e2e8f0", borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: "0.72rem", color: "#64748b" }}>Responder</button>
        <button onClick={() => onDelete(post.id)} style={{ padding: "3px 10px", border: "1px solid #fee2e2", borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: "0.72rem", color: "#dc2626" }}>Eliminar</button>
      </div>
      {post.replies.length > 0 && (
        <div style={{ marginTop: 10, paddingLeft: 20, borderLeft: "2px solid #e2e8f0", display: "flex", flexDirection: "column", gap: 8 }}>
          {post.replies.map(r => <PostCard key={r.id} post={r} onDelete={onDelete} onReply={onReply} />)}
        </div>
      )}
    </div>
  );
}

export default function CourseForumPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;
  const forumId = params.forumId as string;

  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [fetching, setFetching] = useState(true);
  const [activeThread, setActiveThread] = useState<ForumThread | null>(null);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [newThreadTitle, setNewThreadTitle] = useState("");
  const [showThreadForm, setShowThreadForm] = useState(false);
  const [savingThread, setSavingThread] = useState(false);
  const [newPostContent, setNewPostContent] = useState("");
  const [savingPost, setSavingPost] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");

  useEffect(() => { if (!loading && !user) router.replace("/auth/login"); }, [user, loading]);

  useEffect(() => {
    if (!user) return;
    api.get<ForumThread[]>(`/classrooms/forums/${forumId}/threads`)
      .then(setThreads).catch(() => {}).finally(() => setFetching(false));
  }, [user, forumId]);

  async function openThread(thread: ForumThread) {
    setActiveThread(thread); setLoadingPosts(true); setPosts([]);
    const data = await api.get<ForumPost[]>(`/classrooms/threads/${thread.id}/posts`).catch(() => []);
    setPosts(data); setLoadingPosts(false);
  }

  async function createThread() {
    if (!newThreadTitle.trim()) return;
    setSavingThread(true);
    const t = await api.post<ForumThread>(`/classrooms/forums/${forumId}/threads`, { title: newThreadTitle.trim() }).catch(() => null);
    if (t) { setThreads(prev => [...prev, { ...t, _count: { posts: 0 } }]); setNewThreadTitle(""); setShowThreadForm(false); }
    setSavingThread(false);
  }

  async function createPost(threadId: string, content: string, parentId?: string) {
    if (!content.trim()) return;
    setSavingPost(true);
    await api.post(`/classrooms/threads/${threadId}/posts`, { content: content.trim(), parentId }).catch(() => null);
    const data = await api.get<ForumPost[]>(`/classrooms/threads/${threadId}/posts`).catch(() => []);
    setPosts(data); setNewPostContent(""); setReplyTo(null); setReplyContent("");
    setSavingPost(false);
  }

  async function deleteThread(threadId: string) {
    if (!confirm("¿Eliminar este hilo?")) return;
    await api.delete(`/classrooms/threads/${threadId}`).catch(() => {});
    setThreads(p => p.filter(t => t.id !== threadId));
    if (activeThread?.id === threadId) { setActiveThread(null); setPosts([]); }
  }

  async function deletePost(postId: string, threadId: string) {
    if (!confirm("¿Eliminar este post?")) return;
    await api.delete(`/classrooms/posts/${postId}`).catch(() => {});
    const data = await api.get<ForumPost[]>(`/classrooms/threads/${threadId}/posts`).catch(() => []);
    setPosts(data);
  }

  async function togglePin(thread: ForumThread) {
    await api.patch(`/classrooms/threads/${thread.id}`, { isPinned: !thread.isPinned }).catch(() => {});
    setThreads(p => p.map(t => t.id === thread.id ? { ...t, isPinned: !t.isPinned } : t));
  }

  async function toggleLock(thread: ForumThread) {
    await api.patch(`/classrooms/threads/${thread.id}`, { isLocked: !thread.isLocked }).catch(() => {});
    setThreads(p => p.map(t => t.id === thread.id ? { ...t, isLocked: !t.isLocked } : t));
  }

  if (loading || fetching) return (
    <div style={{ minHeight: "100vh", background: "#f0f4ff" }}><SchoolAdminSidebar />
      <main style={{ marginLeft: 260, padding: 48, textAlign: "center", color: "#94a3b8" }}>Cargando foro…</main>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4ff" }}>
      <SchoolAdminSidebar />
      <main style={{ marginLeft: 260, padding: "28px 36px", minHeight: "100vh", boxSizing: "border-box" }}>
        <div style={{ marginBottom: 24 }}>
          <Link href={`/school-admin/cursos/${courseId}`} style={{ fontSize: "0.875rem", color: "#64748b", textDecoration: "none" }}>← Volver al curso</Link>
          <h1 style={{ fontWeight: 800, fontSize: "1.4rem", color: "#1e293b", margin: "8px 0 4px" }}>💬 Foro</h1>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 24, alignItems: "start" }}>
          <div>
            <div style={{ marginBottom: 12 }}>
              {!showThreadForm ? (
                <button onClick={() => setShowThreadForm(true)} style={{ width: "100%", padding: "10px 0", background: "#004aad", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: "0.875rem" }}>+ Crear hilo</button>
              ) : (
                <div style={{ background: "#f0f4ff", borderRadius: 10, padding: 12, border: "1px solid #c7d7f0" }}>
                  <input placeholder="Título del hilo *" value={newThreadTitle} onChange={e => setNewThreadTitle(e.target.value)} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid #c7d7f0", fontSize: "0.85rem", marginBottom: 8, boxSizing: "border-box" }} />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={createThread} disabled={savingThread} style={{ flex: 1, padding: "8px 0", background: "#004aad", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: "0.82rem" }}>{savingThread ? "…" : "Crear"}</button>
                    <button onClick={() => { setShowThreadForm(false); setNewThreadTitle(""); }} style={{ padding: "8px 12px", background: "#f1f5f9", border: "none", borderRadius: 8, cursor: "pointer", color: "#64748b" }}>✕</button>
                  </div>
                </div>
              )}
            </div>

            {threads.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 0", color: "#94a3b8", fontSize: "0.85rem" }}>Sin hilos aún.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {threads.map(t => (
                  <div key={t.id} onClick={() => openThread(t)} style={{ background: activeThread?.id === t.id ? "#f0f4ff" : "#fff", borderRadius: 10, border: activeThread?.id === t.id ? "2px solid #004aad" : "1px solid #e2e8f0", padding: "12px 14px", cursor: "pointer" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                      {t.isPinned && <span title="Fijado" style={{ fontSize: "0.75rem" }}>📌</span>}
                      {t.isLocked && <span title="Bloqueado" style={{ fontSize: "0.75rem" }}>🔒</span>}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</div>
                        <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 2 }}>{t.author.firstName} {t.author.lastName} · {t._count.posts} respuesta(s)</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 4, marginTop: 8 }} onClick={e => e.stopPropagation()}>
                      <button onClick={() => togglePin(t)} style={{ padding: "3px 8px", border: "1px solid #e2e8f0", borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: "0.65rem", color: "#475569" }}>{t.isPinned ? "Desfijar" : "Fijar"}</button>
                      <button onClick={() => toggleLock(t)} style={{ padding: "3px 8px", border: "1px solid #e2e8f0", borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: "0.65rem", color: "#475569" }}>{t.isLocked ? "Desbloquear" : "Bloquear"}</button>
                      <button onClick={() => deleteThread(t.id)} style={{ padding: "3px 8px", border: "1px solid #fee2e2", borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: "0.65rem", color: "#dc2626" }}>Eliminar</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            {!activeThread ? (
              <div style={{ textAlign: "center", padding: "60px 24px", background: "#f8fafc", borderRadius: 14, border: "2px dashed #e2e8f0", color: "#94a3b8" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: 8 }}>💬</div>
                <div style={{ fontWeight: 600 }}>Selecciona un hilo para ver los mensajes</div>
              </div>
            ) : (
              <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                <div style={{ padding: "16px 20px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  <div style={{ fontWeight: 800, fontSize: "1rem", color: "#1e293b" }}>{activeThread.title}</div>
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: 2 }}>Por {activeThread.author.firstName} {activeThread.author.lastName}</div>
                </div>
                {loadingPosts ? (
                  <div style={{ padding: "32px 0", textAlign: "center", color: "#94a3b8" }}>Cargando…</div>
                ) : (
                  <div style={{ padding: "16px 20px", maxHeight: 500, overflowY: "auto" }}>
                    {posts.length === 0 ? (
                      <div style={{ color: "#94a3b8", fontSize: "0.85rem", textAlign: "center", padding: "24px 0" }}>Sin respuestas aún.</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        {posts.map(post => <PostCard key={post.id} post={post} onDelete={pid => deletePost(pid, activeThread.id)} onReply={pid => { setReplyTo(pid); setReplyContent(""); }} />)}
                      </div>
                    )}
                    {replyTo && (
                      <div style={{ background: "#f0f4ff", borderRadius: 10, padding: 12, border: "1px solid #c7d7f0", marginTop: 14 }}>
                        <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#004aad", marginBottom: 6 }}>Respondiendo a un mensaje</div>
                        <textarea placeholder="Tu respuesta…" value={replyContent} onChange={e => setReplyContent(e.target.value)} rows={3} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid #c7d7f0", fontSize: "0.85rem", marginBottom: 8, boxSizing: "border-box", resize: "vertical" }} />
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => createPost(activeThread.id, replyContent, replyTo)} disabled={savingPost} style={{ padding: "8px 16px", background: "#004aad", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: "0.82rem" }}>{savingPost ? "…" : "Responder"}</button>
                          <button onClick={() => { setReplyTo(null); setReplyContent(""); }} style={{ padding: "8px 12px", background: "#f1f5f9", border: "none", borderRadius: 8, cursor: "pointer", color: "#64748b" }}>Cancelar</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {!activeThread.isLocked && (
                  <div style={{ padding: "14px 20px", borderTop: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#374151", marginBottom: 6 }}>Nuevo mensaje</div>
                    <textarea placeholder="Escribe tu mensaje…" value={newPostContent} onChange={e => setNewPostContent(e.target.value)} rows={3} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: "0.85rem", marginBottom: 8, boxSizing: "border-box", resize: "vertical" }} />
                    <button onClick={() => createPost(activeThread.id, newPostContent)} disabled={savingPost} style={{ padding: "9px 20px", background: "#004aad", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: "0.85rem" }}>{savingPost ? "Enviando…" : "Publicar mensaje"}</button>
                  </div>
                )}
                {activeThread.isLocked && (
                  <div style={{ padding: "12px 20px", borderTop: "1px solid #e2e8f0", background: "#fef2f2", color: "#dc2626", fontSize: "0.82rem", textAlign: "center", fontWeight: 600 }}>🔒 Este hilo está bloqueado.</div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
