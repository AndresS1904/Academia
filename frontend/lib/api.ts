const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
const BACKEND = BASE.replace(/\/api$/, "");

/** Convierte URLs relativas de uploads (/uploads/...) a URL absoluta del backend */
export function mediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${BACKEND}${url}`;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
    credentials: "include", // ← Cookie httpOnly enviada automáticamente
  });

  const json = await res.json();

  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined" && !window.location.pathname.startsWith("/auth/")) {
      window.dispatchEvent(new CustomEvent("acae:session-expired"));
    }
    const msg = json?.message ?? json?.error ?? `Error ${res.status}`;
    throw new Error(Array.isArray(msg) ? msg.join(", ") : msg);
  }
  return json?.data ?? json;
}

async function uploadFile<T>(path: string, formData: FormData): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    body: formData,
    credentials: "include",
  });
  const json = await res.json();
  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined" && !window.location.pathname.startsWith("/auth/")) {
      window.dispatchEvent(new CustomEvent("acae:session-expired"));
    }
    const msg = json?.message ?? json?.error ?? `Error ${res.status}`;
    throw new Error(Array.isArray(msg) ? msg.join(", ") : msg);
  }
  return json?.data ?? json;
}

export const api = {
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  upload: <T>(path: string, formData: FormData) => uploadFile<T>(path, formData),
  postForm: <T>(path: string, formData: FormData) => uploadFile<T>(path, formData),
};
