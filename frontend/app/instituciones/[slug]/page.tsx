import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ slug: string }>
}

interface Institucion {
  id: string
  name: string
  slug: string
  email?: string | null
  phone?: string | null
  logoUrl?: string | null
}

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api'

async function fetchInstitucion(slug: string): Promise<Institucion | null> {
  try {
    const res = await fetch(`${API}/schools/public/${slug}`, { cache: 'no-store' })
    if (!res.ok) return null
    const json = await res.json()
    return json?.data ?? json
  } catch {
    return null
  }
}

export default async function InstitucionPage({ params }: Props) {
  const { slug } = await params
  const institucion = await fetchInstitucion(slug)
  if (!institucion) notFound()

  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex items-center gap-4 mb-6">
        {institucion.logoUrl && (
          <img src={institucion.logoUrl} alt={institucion.name} className="h-16 w-16 object-contain" />
        )}
        <h1 className="text-3xl font-bold">{institucion.name}</h1>
      </div>
      <div className="text-gray-600 space-y-1">
        {institucion.email && <p>Correo: {institucion.email}</p>}
        {institucion.phone && <p>Teléfono: {institucion.phone}</p>}
      </div>
    </main>
  )
}
