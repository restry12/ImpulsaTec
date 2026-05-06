import { useState, useEffect } from "react";
import { Link } from "react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import logoImage from "../../assets/17a2f6b30bc584421f868b1534160753545e9968.png";

type Habilidad = { id: number; nombre: string; validada: boolean }
type Certificacion = { id: number; nombre: string; institucion: string | null; validada: boolean }
type EmpresaDir = {
  id: number
  nombre: string
  rubro: string
  descripcion: string | null
  logoUrl: string | null
}
type Estudiante = {
  id: number
  nombre: string
  apellido: string
  especialidad: string
  descripcion: string | null
  fotoUrl: string | null
  disponible: boolean
  tipoDisponibilidad: "PASANTIA" | "FREELANCE" | "AMBOS"
  habilidades: Habilidad[]
  certificaciones: Certificacion[]
  colegio: { nombre: string }
}

type PostColegio = {
  id: number
  contenido: string
  mediaUrl: string | null
  mediaType: 'IMAGEN' | 'VIDEO' | null
  creadoEn: string
  administrador: {
    nombre: string
    colegio: { nombre: string; logoUrl: string | null }
  } | null
}

const API_URL = import.meta.env.VITE_API_URL

const especialidades = ["Electricidad", "Mecánica", "Electrónica", "Refrigeración", "Informática"]

/* Monograma editorial */
const coloresMonograma = ['#C94A2A', '#3F6A3A', '#262C3D', '#8E3018', '#575A68', '#2E4E2B']
const colorMonograma = (nombre: string) =>
  coloresMonograma[nombre.charCodeAt(0) % coloresMonograma.length]

const Monograma = ({ nombre, apellido, size = 48 }: { nombre: string; apellido: string; size?: number }) => {
  const iniciales = `${nombre[0] ?? ''}${apellido[0] ?? ''}`.toUpperCase()
  const c = colorMonograma(nombre)
  return (
    <div
      className="shrink-0 flex items-center justify-center font-display text-bone"
      style={{ width: size, height: size, background: c, borderRadius: size > 56 ? 8 : 6, fontSize: size * 0.42 }}
    >
      {iniciales}
    </div>
  )
}

interface FormContacto {
  nombreRemitente: string
  emailRemitente: string
  mensaje: string
}

/* Íconos SVG compactos */
const IcoSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
  </svg>
)
const IcoArrow = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14" /><path d="m13 5 7 7-7 7" />
  </svg>
)
const IcoShield = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" /><path d="m9 12 2 2 4-4" />
  </svg>
)
const IcoX = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 6l12 12" /><path d="M18 6 6 18" />
  </svg>
)
const IcoClock = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
  </svg>
)
const IcoCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" />
  </svg>
)
const IcoSend = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4 20-7z" />
  </svg>
)

function tiempoRelativo(fecha: string) {
  const diff = Date.now() - new Date(fecha).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return "Ahora mismo"
  if (min < 60) return `Hace ${min} min`
  if (min < 1440) return `Hace ${Math.floor(min / 60)}h`
  return `Hace ${Math.floor(min / 1440)} día${Math.floor(min / 1440) > 1 ? "s" : ""}`
}

export function PublicDirectory() {
  const [tabActivo, setTabActivo] = useState<"estudiantes" | "empresas">("estudiantes")
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState("")
  const [filtroEsp, setFiltroEsp] = useState("")
  const [filtroTipo, setFiltroTipo] = useState<"TODOS" | "PASANTIA" | "FREELANCE">("TODOS")
  const [empresas, setEmpresas] = useState<EmpresaDir[]>([])
  const [cargandoEmpresas, setCargandoEmpresas] = useState(false)
  const [empresasCargadas, setEmpresasCargadas] = useState(false)
  const [estudianteSel, setEstudianteSel] = useState<Estudiante | null>(null)
  const [formContacto, setFormContacto] = useState<FormContacto>({ nombreRemitente: "", emailRemitente: "", mensaje: "" })
  const [enviandoContacto, setEnviandoContacto] = useState(false)
  const [contactoEnviado, setContactoEnviado] = useState(false)
  const [vistaContacto, setVistaContacto] = useState(false)
  const [novedadesColegio, setNovedadesColegio] = useState<PostColegio[]>([])

  useEffect(() => {
    fetch(`${API_URL}/api/posts/colegio`)
      .then(res => res.json())
      .then((datos: unknown) => { setNovedadesColegio(Array.isArray(datos) ? datos : []) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    // Carga estudiantes y empresas en paralelo para que el contador aparezca de inmediato
    Promise.all([
      fetch(`${API_URL}/api/estudiantes`).then(r => { if (!r.ok) throw new Error("Error al cargar estudiantes"); return r.json() }),
      fetch(`${API_URL}/api/empresas`).then(r => r.json()),
    ])
      .then(([dataEstudiantes, dataEmpresas]: [Estudiante[], EmpresaDir[]]) => {
        setEstudiantes(dataEstudiantes)
        setEmpresas(dataEmpresas)
        setEmpresasCargadas(true)
        setCargando(false)
      })
      .catch(err => { setError(err.message); setCargando(false) })
  }, [])

  const enviarContacto = async () => {
    if (!formContacto.nombreRemitente || !formContacto.emailRemitente || !formContacto.mensaje) return
    if (!estudianteSel) return
    setEnviandoContacto(true)
    try {
      const res = await fetch(`${API_URL}/api/contactos/publico`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estudianteId: estudianteSel.id,
          nombreRemitente: formContacto.nombreRemitente,
          emailRemitente: formContacto.emailRemitente,
          mensaje: formContacto.mensaje,
        }),
      })
      if (res.ok) setContactoEnviado(true)
    } catch {
      setContactoEnviado(true)
    } finally {
      setEnviandoContacto(false)
    }
  }

  const abrirPerfil = (est: Estudiante) => {
    setEstudianteSel(est)
    setFormContacto({ nombreRemitente: "", emailRemitente: "", mensaje: "" })
    setContactoEnviado(false)
    setVistaContacto(false)
  }

  const estudiantesFiltrados = estudiantes.filter(est => {
    const texto = busqueda.toLowerCase()
    const coincideTexto = !texto || (
      est.nombre.toLowerCase().includes(texto) ||
      est.apellido.toLowerCase().includes(texto) ||
      est.especialidad.toLowerCase().includes(texto) ||
      est.habilidades.some(h => h.nombre.toLowerCase().includes(texto))
    )
    const coincideEsp = !filtroEsp || est.especialidad === filtroEsp
    const coincideTipo = filtroTipo === "TODOS" || est.tipoDisponibilidad === filtroTipo || est.tipoDisponibilidad === "AMBOS"
    return coincideTexto && coincideEsp && coincideTipo
  })

  /* etiqueta de disponibilidad */
  const labelDisp = (t: Estudiante["tipoDisponibilidad"]) =>
    t === "PASANTIA" ? "Pasantía" : t === "FREELANCE" ? "Freelance" : "Ambos"

  return (
    <div className="min-h-screen" style={{ background: '#F6F3EC', color: '#0B0F1A' }}>

      {/* ── ANUNCIO ───────────────────────────────────────── */}
      <div style={{ background: '#0B0F1A', color: '#EDE7D8' }} className="text-[12px]">
        <div className="max-w-[1240px] mx-auto px-6 h-9 flex items-center gap-3 overflow-hidden">
          <span className="smallcaps font-semibold" style={{ color: '#C94A2A' }}>Novedad</span>
          <span className="opacity-80">Programa de Formación Dual 2026 — postulaciones abiertas.</span>
          <span className="ml-auto hidden md:flex items-center gap-1 opacity-60">
            <IcoClock /> Actualizado hoy
          </span>
        </div>
      </div>

      {/* ── NAV PÚBLICO ───────────────────────────────────── */}
      <header className="border-b hairline" style={{ background: '#F6F3EC' }}>
        <div className="max-w-[1240px] mx-auto px-6 h-[72px] flex items-center">
          <div className="flex items-center gap-3">
            <img src={logoImage} alt="Cardenal Caro" className="h-11 bg-white rounded px-1.5 py-1 border hairline shrink-0" />
            <div>
              <div className="font-display text-[22px] leading-none" style={{ color: '#0B0F1A' }}>ImpulsaTec</div>
              <div className="smallcaps text-[9px] mt-0.5" style={{ color: 'rgba(11,15,26,0.5)' }}>Centro Cardenal José María Caro</div>
            </div>
          </div>
          <nav className="ml-12 hidden md:flex items-center gap-8 text-[13px]" style={{ color: 'rgba(11,15,26,0.7)' }}>
            <a className="hover:text-ink cursor-pointer">Estudiantes</a>
            <a className="hover:text-ink cursor-pointer">Empresas</a>
            <a className="hover:text-ink cursor-pointer">Colegio</a>
            <a className="hover:text-ink cursor-pointer">Novedades</a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/login">
              <button className="hover-lift inline-flex items-center justify-center gap-1.5 rounded-full font-medium h-10 px-4 text-[13px] bg-transparent border hairline" style={{ color: '#0B0F1A' }}>
                Iniciar sesión
              </button>
            </Link>
            <Link to="/registro">
              <button className="hover-lift inline-flex items-center justify-center gap-1.5 rounded-full font-medium h-10 px-4 text-[13px]" style={{ background: '#0B0F1A', color: '#F6F3EC' }}>
                Crear cuenta <IcoArrow />
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="bone-grain">
        <div className="max-w-[1240px] mx-auto px-6 pt-16 pb-20 grid grid-cols-12 gap-10">
          <div className="col-span-12 lg:col-span-8">
            <div className="flex items-center gap-2 mb-7">
              <div className="w-6 h-px" style={{ background: 'rgba(11,15,26,0.4)' }} />
              <span className="smallcaps text-[11px] font-semibold" style={{ color: 'rgba(11,15,26,0.6)' }}>Edición 2026 · N°04</span>
            </div>
            <h1 className="font-display leading-[0.92] tracking-tight -mt-2" style={{ fontSize: 'clamp(56px, 9vw, 120px)', color: '#0B0F1A' }}>
              Talento técnico
              <br />
              <span className="italic">que construye</span>
              <br />
              Chile.
            </h1>
            <p className="mt-8 max-w-[560px] text-[17px] leading-[1.55]" style={{ color: 'rgba(11,15,26,0.7)' }}>
              El directorio oficial del Centro Educacional Cardenal José María Caro. Estudiantes certificados en electricidad, mecánica, electrónica, refrigeración e informática — listos para pasantías y contrataciones.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <button
                className="hover-lift inline-flex items-center gap-2 rounded-full font-medium h-12 px-6 text-[14px]"
                style={{ background: '#C94A2A', color: '#F6F3EC' }}
                onClick={() => document.getElementById('directorio')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Explorar talento <IcoArrow />
              </button>
              <Link to="/login">
                <button className="hover-lift inline-flex items-center gap-2 rounded-full font-medium h-12 px-6 text-[14px] border" style={{ borderColor: '#0B0F1A', color: '#0B0F1A', background: 'transparent' }}>
                  Soy empresa — publicar oferta
                </button>
              </Link>
            </div>

            {/* Stats inline */}
            <div className="mt-14 grid grid-cols-3 max-w-[600px] gap-0 border-t hairline">
              {[
                { n: cargando ? '···' : String(estudiantes.length).padStart(3, '0'), l: 'Estudiantes activos' },
                { n: cargando ? '··' : String(estudiantes.filter(e => e.disponible).length).padStart(2, '0'), l: 'Disponibles ahora' },
                { n: empresasCargadas ? String(empresas.length).padStart(2, '0') : '··', l: 'Empresas conectadas' },
              ].map((s, i) => (
                <div key={i} className={`py-5 ${i !== 0 ? 'border-l hairline pl-5' : ''}`}>
                  <div className="font-display leading-none" style={{ fontSize: 44, color: '#0B0F1A' }}>{s.n}</div>
                  <div className="smallcaps text-[10.5px] mt-2" style={{ color: 'rgba(11,15,26,0.55)' }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Tarjeta lateral */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
            <div className="border hairline rounded-lg overflow-hidden" style={{ background: '#FBFAF6' }}>
              <div className="relative p-5 text-bone" style={{ background: '#0B0F1A' }}>
                <div className="smallcaps text-[10px] font-semibold mb-2" style={{ color: '#C94A2A' }}>Perfil destacado</div>
                {estudiantes[0] ? (
                  <div className="flex items-start gap-3">
                    <Monograma nombre={estudiantes[0].nombre} apellido={estudiantes[0].apellido} size={64} />
                    <div>
                      <div className="font-display text-[26px] leading-tight text-bone">{estudiantes[0].nombre}<br />{estudiantes[0].apellido}</div>
                      <div className="smallcaps text-[10px] mt-1" style={{ color: 'rgba(246,243,236,0.6)' }}>{estudiantes[0].especialidad}</div>
                    </div>
                  </div>
                ) : (
                  <div className="h-16 flex items-center">
                    <span className="text-bone/40 text-[13px]">Cargando perfil…</span>
                  </div>
                )}
                <div className="absolute top-4 right-4 flex items-center gap-1.5 text-[11px]" style={{ color: '#DFE8DA' }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#3F6A3A' }} /> Disponible
                </div>
              </div>
              {estudiantes[0] && (
                <div className="p-5 space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {estudiantes[0].habilidades.slice(0, 4).map(h => (
                      <span key={h.id} className="text-[11px] px-2 py-0.5 rounded-sm" style={{ background: '#EDE7D8', color: 'rgba(11,15,26,0.75)' }}>{h.nombre}</span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t hairline">
                    <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'rgba(11,15,26,0.55)' }}>
                      <IcoShield /> <span>{estudiantes[0].certificaciones.length} certificaciones</span>
                    </div>
                    <button className="text-[12px] font-medium flex items-center gap-1" style={{ color: '#C94A2A' }} onClick={() => abrirPerfil(estudiantes[0])}>
                      Ver perfil <IcoArrow />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="border hairline rounded-lg p-4 flex items-center gap-3" style={{ background: '#FBFAF6' }}>
              <div className="w-10 h-10 flex items-center justify-center rounded-md" style={{ background: '#F2DAD0', color: '#C94A2A' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M13 2 3 14h7l-1 8 10-12h-7z" /></svg>
              </div>
              <div className="flex-1">
                <div className="text-[13px] font-medium" style={{ color: '#0B0F1A' }}>Lanzamiento 2026</div>
                <div className="text-[11px]" style={{ color: 'rgba(11,15,26,0.55)' }}>Programa Formación Dual abierto</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── MARQUEE EMPRESAS ─────────────────────────────── */}
      {empresas.length > 0 && (
        <section className="border-y hairline py-5 overflow-hidden" style={{ background: '#FBFAF6' }}>
          <div className="flex items-center gap-10 whitespace-nowrap marquee" style={{ color: 'rgba(11,15,26,0.5)' }}>
            {[...Array(2)].flatMap((_, r) => empresas.map(emp => (
              <div key={`${emp.id}-${r}`} className="flex items-center gap-2.5 px-6 shrink-0">
                <div className="w-6 h-6 rounded-sm" style={{ background: colorMonograma(emp.nombre) }} />
                <span className="font-display text-[22px]">{emp.nombre}</span>
                <span className="text-[10px] smallcaps">· {emp.rubro}</span>
              </div>
            )))}
          </div>
        </section>
      )}

      {/* ── DIRECTORIO ───────────────────────────────────── */}
      <section id="directorio" className="max-w-[1240px] mx-auto px-6 py-14">
        <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
          <div>
            <div className="smallcaps text-[11px] font-semibold" style={{ color: 'rgba(11,15,26,0.55)' }}>01 · Directorio</div>
            <h2 className="font-display mt-2 leading-[1.02]" style={{ fontSize: 'clamp(36px, 5vw, 56px)', color: '#0B0F1A' }}>
              Explora el talento<br />por especialidad.
            </h2>
          </div>
          <div className="flex items-center gap-1 border hairline rounded-full p-1" style={{ background: '#FBFAF6' }}>
            {(["estudiantes", "empresas"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setTabActivo(tab)}
                className="px-4 h-8 rounded-full text-[12px] font-medium transition-colors"
                style={{
                  background: tabActivo === tab ? '#0B0F1A' : 'transparent',
                  color: tabActivo === tab ? '#F6F3EC' : 'rgba(11,15,26,0.6)'
                }}
              >
                {tab === "estudiantes" ? "Estudiantes" : "Empresas"}
                {tab === "estudiantes" && <span className="opacity-60 ml-1">({estudiantes.length})</span>}
              </button>
            ))}
          </div>
        </div>

        {tabActivo === "estudiantes" && (
          <>
            {/* Búsqueda + filtro tipo */}
            <div className="mb-6 flex flex-col md:flex-row items-stretch gap-3">
              <div className="flex-1 flex items-center gap-2 px-4 h-12 border hairline-strong rounded-full text-[14px]" style={{ background: '#FBFAF6' }}>
                <span style={{ color: 'rgba(11,15,26,0.5)' }}><IcoSearch /></span>
                <input
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  placeholder="Busca por nombre, habilidad o especialidad…"
                  className="flex-1 bg-transparent outline-none placeholder:text-ink/40"
                  style={{ fontSize: 14 }}
                />
                {busqueda && (
                  <button onClick={() => setBusqueda('')} style={{ color: 'rgba(11,15,26,0.4)' }}><IcoX /></button>
                )}
              </div>
              <div className="flex items-center gap-1 border hairline rounded-full p-1 w-fit" style={{ background: '#FBFAF6' }}>
                {(["TODOS", "PASANTIA", "FREELANCE"] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setFiltroTipo(t)}
                    className="px-4 h-10 rounded-full text-[12px] font-medium transition-colors"
                    style={{
                      background: filtroTipo === t ? '#0B0F1A' : 'transparent',
                      color: filtroTipo === t ? '#F6F3EC' : 'rgba(11,15,26,0.6)'
                    }}
                  >
                    {t === 'TODOS' ? 'Todos' : t === 'PASANTIA' ? 'Pasantía' : 'Freelance'}
                  </button>
                ))}
              </div>
            </div>

            {/* Chips especialidad */}
            <div className="flex flex-wrap gap-2 mb-8">
              <button
                onClick={() => setFiltroEsp('')}
                className="hover-lift text-[12px] font-medium tracking-wide px-3 py-1.5 rounded-full border transition-colors"
                style={{
                  background: filtroEsp === '' ? '#0B0F1A' : 'transparent',
                  color: filtroEsp === '' ? '#F6F3EC' : '#0B0F1A',
                  borderColor: filtroEsp === '' ? '#0B0F1A' : 'rgba(11,15,26,0.15)'
                }}
              >
                Todas las especialidades
              </button>
              {especialidades.map(esp => (
                <button
                  key={esp}
                  onClick={() => setFiltroEsp(filtroEsp === esp ? '' : esp)}
                  className="hover-lift text-[12px] font-medium tracking-wide px-3 py-1.5 rounded-full border transition-colors"
                  style={{
                    background: filtroEsp === esp ? '#0B0F1A' : 'transparent',
                    color: filtroEsp === esp ? '#F6F3EC' : '#0B0F1A',
                    borderColor: filtroEsp === esp ? '#0B0F1A' : 'rgba(11,15,26,0.15)'
                  }}
                >
                  {esp}
                </button>
              ))}
            </div>

            {/* Contador */}
            <div className="mb-4 flex items-center justify-between">
              <div className="font-mono-data text-[12px]" style={{ color: 'rgba(11,15,26,0.55)' }}>
                {String(estudiantesFiltrados.length).padStart(3, '0')} / {String(estudiantes.length).padStart(3, '0')} resultados
              </div>
            </div>

            {/* Loading */}
            {cargando && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="border hairline rounded-lg p-5 animate-pulse" style={{ background: '#FBFAF6', height: 200 }} />
                ))}
              </div>
            )}

            {error && (
              <div className="text-center py-16">
                <p style={{ color: '#C94A2A' }} className="mb-3">{error}</p>
                <button onClick={() => window.location.reload()} className="text-[13px] border hairline rounded-full px-4 h-9">Reintentar</button>
              </div>
            )}

            {!cargando && !error && estudiantesFiltrados.length === 0 && (
              <div className="text-center py-20" style={{ color: 'rgba(11,15,26,0.4)' }}>
                <p className="text-[17px]">Sin resultados{busqueda ? ` para "${busqueda}"` : ''}.</p>
              </div>
            )}

            {/* Grid estudiantes */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {estudiantesFiltrados.map(est => (
                <article
                  key={est.id}
                  onClick={() => abrirPerfil(est)}
                  className="hover-lift cursor-pointer border hairline rounded-lg p-5"
                  style={{ background: '#FBFAF6' }}
                >
                  <div className="flex items-start justify-between">
                    <Monograma nombre={est.nombre} apellido={est.apellido} size={56} />
                    <div className="flex items-center gap-1.5 text-[11px]">
                      {est.disponible ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#3F6A3A' }} />
                          <span className="font-medium" style={{ color: '#2E4E2B' }}>Disponible</span>
                        </>
                      ) : (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(11,15,26,0.25)' }} />
                          <span style={{ color: 'rgba(11,15,26,0.5)' }}>En pasantía</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="font-display text-[22px] leading-tight" style={{ color: '#0B0F1A' }}>{est.nombre} {est.apellido}</div>
                    <div className="smallcaps text-[10.5px] mt-1" style={{ color: 'rgba(11,15,26,0.55)' }}>
                      {est.especialidad} · {labelDisp(est.tipoDisponibilidad)}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {est.habilidades.slice(0, 3).map(h => (
                      <span key={h.id} className="text-[11px] px-2 py-0.5 rounded-sm" style={{ background: '#EDE7D8', color: 'rgba(11,15,26,0.8)' }}>
                        {h.nombre}
                      </span>
                    ))}
                    {est.habilidades.length > 3 && (
                      <span className="text-[11px] px-1.5" style={{ color: 'rgba(11,15,26,0.4)' }}>+{est.habilidades.length - 3}</span>
                    )}
                  </div>

                  <div className="mt-5 pt-4 border-t hairline flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[11px]" style={{ color: 'rgba(11,15,26,0.55)' }}>
                      <IcoShield />
                      <span className="smallcaps">{est.certificaciones.filter(c => c.validada).length} cert. validadas</span>
                    </div>
                    <div className="text-[12px] font-medium flex items-center gap-1" style={{ color: '#0B0F1A' }}>
                      Ver perfil <IcoArrow />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}

        {tabActivo === "empresas" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {cargandoEmpresas && [...Array(6)].map((_, i) => (
              <div key={i} className="border hairline rounded-lg p-6 animate-pulse h-36" style={{ background: '#FBFAF6' }} />
            ))}
            {empresas.map(emp => (
              <Link key={emp.id} to={`/empresas/${emp.id}`}>
                <div className="hover-lift border hairline rounded-lg p-6 cursor-pointer h-full" style={{ background: '#FBFAF6' }}>
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-md shrink-0 flex items-center justify-center font-display text-[22px]"
                      style={{ background: colorMonograma(emp.nombre), color: '#F6F3EC' }}>
                      {emp.nombre[0]}
                    </div>
                    <div className="flex-1">
                      <div className="font-display text-[22px] leading-tight">{emp.nombre}</div>
                      <div className="smallcaps text-[10.5px] mt-1" style={{ color: 'rgba(11,15,26,0.55)' }}>{emp.rubro}</div>
                    </div>
                  </div>
                  {emp.descripcion && (
                    <p className="text-[13px] mt-4 leading-relaxed line-clamp-2" style={{ color: 'rgba(11,15,26,0.65)' }}>
                      {emp.descripcion}
                    </p>
                  )}
                  <div className="mt-4 pt-4 border-t hairline flex items-center justify-between text-[12px]">
                    <span style={{ color: 'rgba(11,15,26,0.6)' }}>Ver empresa</span>
                    <span className="font-medium flex items-center gap-1" style={{ color: '#C94A2A' }}>
                      Visitar <IcoArrow />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ── CÓMO FUNCIONA ────────────────────────────────── */}
      <section className="border-t hairline text-bone" style={{ background: '#0B0F1A' }}>
        <div className="max-w-[1240px] mx-auto px-6 py-20 grid grid-cols-12 gap-10">
          <div className="col-span-12 md:col-span-5">
            <div className="smallcaps text-[11px] font-semibold" style={{ color: '#C94A2A' }}>02 · Cómo funciona</div>
            <h2 className="font-display leading-[1.02] mt-3 text-bone" style={{ fontSize: 'clamp(36px, 5vw, 60px)' }}>
              Tres actores,<br />una sola red.
            </h2>
            <p className="mt-6 max-w-[380px] text-[15px] leading-relaxed" style={{ color: 'rgba(246,243,236,0.7)' }}>
              ImpulsaTec conecta a estudiantes, colegios y empresas en una sola plataforma. El colegio valida; los estudiantes postulan; las empresas contratan.
            </p>
          </div>
          <div className="col-span-12 md:col-span-7 grid grid-cols-1 gap-0 border-t" style={{ borderColor: 'rgba(246,243,236,0.15)' }}>
            {[
              { n: '01', t: 'Estudiantes', d: 'Publica tu perfil, habilidades y certificaciones. Postula a ofertas reales con un clic.', link: true, label: 'Soy estudiante', to: '/registro' },
              { n: '02', t: 'Empresas', d: 'Accede a talento validado por el colegio. Publica ofertas y contacta directamente.', link: true, label: 'Soy empresa', to: '/registro' },
              { n: '03', t: 'Colegio', d: 'Administra el directorio, valida habilidades y conecta tu comunidad educativa.', link: false, label: '', to: '/' },
            ].map(row => (
              <div
                key={row.n}
                className="py-7 grid grid-cols-12 gap-4 items-baseline px-2 -mx-2 rounded"
                style={{ borderBottom: '1px solid rgba(246,243,236,0.15)' }}
              >
                <div className="col-span-2 font-mono-data text-[12px]" style={{ color: '#C94A2A' }}>{row.n}</div>
                <div className="col-span-3 font-display text-[28px] leading-tight text-bone">{row.t}</div>
                <div className="col-span-5 text-[13.5px] leading-relaxed" style={{ color: 'rgba(246,243,236,0.7)' }}>{row.d}</div>
                <div className="col-span-2 text-right">
                  {row.link && (
                    <Link to={row.to}>
                      <button className="text-[12px] font-medium flex items-center gap-1 justify-end ml-auto text-bone hover:text-terra">
                        {row.label} <IcoArrow />
                      </button>
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── NOVEDADES DEL COLEGIO ────────────────────────── */}
      {novedadesColegio.length > 0 && (
        <section className="max-w-[1240px] mx-auto px-6 py-20">
          <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
            <div>
              <div className="smallcaps text-[11px] font-semibold" style={{ color: 'rgba(11,15,26,0.55)' }}>03 · Novedades</div>
              <h2 className="font-display text-[48px] leading-tight mt-2" style={{ color: '#0B0F1A' }}>Desde el colegio</h2>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {novedadesColegio.slice(0, 3).map(novedad => (
              <article key={novedad.id} className="hover-lift border hairline rounded-lg overflow-hidden cursor-pointer" style={{ background: '#FBFAF6' }}>
                {novedad.mediaUrl && novedad.mediaType === 'IMAGEN' && (
                  <img src={novedad.mediaUrl} alt="" className="w-full h-44 object-cover" loading="lazy" />
                )}
                {novedad.mediaUrl && novedad.mediaType === 'VIDEO' && (
                  <video src={novedad.mediaUrl} className="w-full h-44 object-cover" />
                )}
                {!novedad.mediaUrl && (
                  <div className="h-44 placeholder-stripe" style={{ background: '#EDE7D8' }}>
                    <div className="h-full flex items-end p-3">
                      <span className="font-mono-data text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(246,243,236,0.8)', color: 'rgba(11,15,26,0.5)' }}>imagen</span>
                    </div>
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-center gap-2 text-[11px] mb-3" style={{ color: 'rgba(11,15,26,0.55)' }}>
                    <span className="smallcaps font-semibold" style={{ color: '#C94A2A' }}>Novedad</span>
                    <span className="divider-dot" />
                    {tiempoRelativo(novedad.creadoEn)}
                  </div>
                  <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(11,15,26,0.75)' }}>{novedad.contenido}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ── CTA EMPRESAS ─────────────────────────────────── */}
      <section className="border-t hairline text-bone" style={{ background: '#C94A2A' }}>
        <div className="max-w-[1240px] mx-auto px-6 py-20 grid grid-cols-12 gap-8 items-end">
          <div className="col-span-12 md:col-span-8">
            <div className="smallcaps text-[11px]" style={{ color: 'rgba(246,243,236,0.7)' }}>04 · Para empresas</div>
            <h2 className="font-display leading-[0.95] mt-3 text-bone" style={{ fontSize: 'clamp(44px, 7vw, 80px)' }}>
              Encuentra talento<br />que ya sabe <span className="italic">hacer.</span>
            </h2>
          </div>
          <div className="col-span-12 md:col-span-4 flex flex-col gap-3">
            <p className="text-[14px] leading-relaxed" style={{ color: 'rgba(246,243,236,0.85)' }}>
              Crea tu cuenta gratis, publica tu primera oferta en minutos y recibe postulaciones validadas por el colegio.
            </p>
            <Link to="/registro">
              <button className="hover-lift inline-flex items-center gap-2 rounded-full font-medium h-12 px-6 text-[14px] w-fit"
                style={{ background: '#0B0F1A', color: '#F6F3EC' }}>
                Crear cuenta de empresa <IcoArrow />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────── */}
      <footer style={{ background: '#0B0F1A', color: 'rgba(246,243,236,0.7)' }}>
        <div className="max-w-[1240px] mx-auto px-6 py-14">
          <div className="grid grid-cols-12 gap-8 pb-10 border-b" style={{ borderColor: 'rgba(246,243,236,0.1)' }}>
            <div className="col-span-12 md:col-span-5">
              <div className="flex items-center gap-2.5 mb-4">
                <img src={logoImage} alt="Logo" className="h-9 bg-white rounded px-1 py-0.5" />
                <div className="font-display text-[22px] text-bone">ImpulsaTec</div>
              </div>
              <p className="text-[13px] leading-relaxed max-w-sm">
                Directorio oficial del Centro Educacional Cardenal José María Caro.<br />
                Conectando talento técnico con oportunidades reales en Chile.
              </p>
            </div>
            {[
              { t: 'Estudiantes', l: ['Crear perfil', 'Buscar pasantías', 'Recursos', 'Postulaciones'] },
              { t: 'Empresas', l: ['Publicar oferta', 'Buscar talento', 'Contratación'] },
              { t: 'Contacto', l: ['info@impulsatec.cl', '+56 9 2346 1235', 'Santiago, Chile'] },
            ].map(col => (
              <div key={col.t} className="col-span-6 md:col-span-2">
                <div className="smallcaps text-[11px] font-semibold mb-4 block" style={{ color: 'rgba(246,243,236,0.55)' }}>{col.t}</div>
                <ul className="space-y-2 mt-3">
                  {col.l.map(x => (
                    <li key={x}><a className="text-[13px] hover:text-bone cursor-pointer">{x}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between pt-6 text-[11px]" style={{ color: 'rgba(246,243,236,0.5)' }}>
            <div>© 2026 ImpulsaTec · Todos los derechos reservados</div>
            <div className="flex items-center gap-5">
              <a className="hover:text-bone cursor-pointer">Términos</a>
              <a className="hover:text-bone cursor-pointer">Privacidad</a>
            </div>
          </div>
        </div>
      </footer>

      {/* ── DIÁLOGO: Perfil completo ──────────────────────── */}
      <Dialog open={!!estudianteSel} onOpenChange={abierto => { if (!abierto) setEstudianteSel(null) }}>
        {estudianteSel && (
          <DialogContent className="max-w-[680px] max-h-[90vh] overflow-y-auto rounded-lg p-0 border hairline">
            <DialogHeader className="sr-only">
              <DialogTitle>{estudianteSel.nombre} {estudianteSel.apellido}</DialogTitle>
            </DialogHeader>

            {!vistaContacto ? (
              /* Vista perfil */
              <div>
                <div className="relative px-8 pt-8 pb-6 text-bone" style={{ background: '#0B0F1A' }}>
                  <button
                    onClick={() => setEstudianteSel(null)}
                    className="absolute top-4 right-4 p-1.5 rounded-full"
                    style={{ color: 'rgba(246,243,236,0.6)' }}
                  >
                    <IcoX />
                  </button>
                  <div className="flex items-start gap-5">
                    <Monograma nombre={estudianteSel.nombre} apellido={estudianteSel.apellido} size={88} />
                    <div>
                      <div className="smallcaps text-[10px] font-semibold" style={{ color: '#C94A2A' }}>Perfil validado</div>
                      <div className="font-display text-[44px] leading-none mt-2 text-bone">
                        {estudianteSel.nombre}<br />{estudianteSel.apellido}
                      </div>
                      <div className="smallcaps text-[10.5px] mt-3" style={{ color: 'rgba(246,243,236,0.6)' }}>
                        {estudianteSel.especialidad} · {labelDisp(estudianteSel.tipoDisponibilidad)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-8 space-y-7">
                  {estudianteSel.descripcion && (
                    <p className="text-[14px] leading-relaxed" style={{ color: 'rgba(11,15,26,0.75)' }}>
                      {estudianteSel.descripcion}
                    </p>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-3 border-y hairline">
                    {[
                      { n: estudianteSel.habilidades.length, l: 'Habilidades' },
                      { n: estudianteSel.certificaciones.length, l: 'Certificaciones' },
                      { n: estudianteSel.habilidades.filter(h => h.validada).length, l: 'Validadas' },
                    ].map((s, i) => (
                      <div key={i} className={`py-4 text-center ${i !== 0 ? 'border-l hairline' : ''}`}>
                        <div className="font-display text-[32px] leading-none">{s.n}</div>
                        <div className="smallcaps text-[10px] mt-1.5" style={{ color: 'rgba(11,15,26,0.55)' }}>{s.l}</div>
                      </div>
                    ))}
                  </div>

                  {/* Habilidades */}
                  {estudianteSel.habilidades.length > 0 && (
                    <div>
                      <div className="smallcaps text-[11px] font-semibold mb-3" style={{ color: 'rgba(11,15,26,0.55)' }}>Habilidades</div>
                      <div className="space-y-2">
                        {estudianteSel.habilidades.map(h => (
                          <div key={h.id} className="flex items-center justify-between py-2.5 px-3 border hairline rounded-md" style={{ background: '#F6F3EC' }}>
                            <div className="flex items-center gap-2.5">
                              <div className="w-1.5 h-1.5 rounded-full" style={{ background: h.validada ? '#3F6A3A' : 'rgba(11,15,26,0.25)' }} />
                              <span className="text-[13px]">{h.nombre}</span>
                            </div>
                            <span className="smallcaps text-[10px] font-semibold" style={{ color: h.validada ? '#2E4E2B' : 'rgba(11,15,26,0.4)' }}>
                              {h.validada ? 'Validada' : 'Pendiente'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Certificaciones */}
                  {estudianteSel.certificaciones.length > 0 && (
                    <div>
                      <div className="smallcaps text-[11px] font-semibold mb-3" style={{ color: 'rgba(11,15,26,0.55)' }}>Certificaciones</div>
                      <div className="space-y-2">
                        {estudianteSel.certificaciones.map(cert => (
                          <div key={cert.id} className="flex items-center gap-3 p-3 border rounded-md"
                            style={{ background: cert.validada ? '#DFE8DA' : '#F6F3EC', borderColor: cert.validada ? 'rgba(63,106,58,0.2)' : 'rgba(11,15,26,0.12)' }}>
                            <div className="w-8 h-8 rounded-sm flex items-center justify-center shrink-0 text-bone"
                              style={{ background: cert.validada ? '#3F6A3A' : '#EDE7D8', color: cert.validada ? '#F6F3EC' : 'rgba(11,15,26,0.4)' }}>
                              <IcoShield />
                            </div>
                            <div className="flex-1">
                              <div className="text-[13px] font-medium">{cert.nombre}</div>
                              {cert.institucion && <div className="text-[11px]" style={{ color: 'rgba(11,15,26,0.55)' }}>{cert.institucion}</div>}
                            </div>
                            <span className="smallcaps text-[10px] font-semibold" style={{ color: cert.validada ? '#2E4E2B' : 'rgba(11,15,26,0.4)' }}>
                              {cert.validada ? 'Validada' : 'Pendiente'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    className="hover-lift w-full h-12 rounded-full font-medium text-[14px] flex items-center justify-center gap-2"
                    style={{ background: '#C94A2A', color: '#F6F3EC' }}
                    onClick={() => setVistaContacto(true)}
                  >
                    Contactar vía el colegio <IcoArrow />
                  </button>
                </div>
              </div>
            ) : (
              /* Vista contacto */
              <div className="p-8 space-y-5">
                <button
                  onClick={() => setVistaContacto(false)}
                  className="text-[12px] flex items-center gap-1"
                  style={{ color: 'rgba(11,15,26,0.55)' }}
                >
                  ← Volver al perfil
                </button>
                <div>
                  <div className="font-display text-[32px] leading-tight">Contactar a {estudianteSel.nombre}</div>
                  <p className="text-[13px] mt-1" style={{ color: 'rgba(11,15,26,0.6)' }}>El colegio coordinará el contacto directamente con el estudiante.</p>
                </div>

                {contactoEnviado ? (
                  <div className="text-center py-10 space-y-3">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto" style={{ background: '#DFE8DA', color: '#3F6A3A' }}>
                      <IcoCheck />
                    </div>
                    <p className="font-semibold">¡Solicitud enviada!</p>
                    <p className="text-[13px]" style={{ color: 'rgba(11,15,26,0.6)' }}>El colegio se pondrá en contacto contigo pronto.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="smallcaps text-[11px] font-semibold mb-1.5" style={{ color: 'rgba(11,15,26,0.55)' }}>Tu nombre</div>
                        <input
                          placeholder="Nombre y apellido"
                          className="w-full border hairline-strong rounded-md px-3 h-10 text-[13px] outline-none focus:border-ink"
                          style={{ background: '#FBFAF6' }}
                          value={formContacto.nombreRemitente}
                          onChange={e => setFormContacto(prev => ({ ...prev, nombreRemitente: e.target.value }))}
                        />
                      </div>
                      <div>
                        <div className="smallcaps text-[11px] font-semibold mb-1.5" style={{ color: 'rgba(11,15,26,0.55)' }}>Email corporativo</div>
                        <input
                          type="email"
                          placeholder="tu@empresa.cl"
                          className="w-full border hairline-strong rounded-md px-3 h-10 text-[13px] outline-none focus:border-ink"
                          style={{ background: '#FBFAF6' }}
                          value={formContacto.emailRemitente}
                          onChange={e => setFormContacto(prev => ({ ...prev, emailRemitente: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="smallcaps text-[11px] font-semibold mb-1.5" style={{ color: 'rgba(11,15,26,0.55)' }}>Mensaje</div>
                      <textarea
                        rows={4}
                        placeholder="Cuéntanos sobre la oportunidad de pasantía o proyecto freelance…"
                        className="w-full border hairline-strong rounded-md px-3 py-2.5 text-[13px] outline-none focus:border-ink resize-none"
                        style={{ background: '#FBFAF6' }}
                        value={formContacto.mensaje}
                        onChange={e => setFormContacto(prev => ({ ...prev, mensaje: e.target.value }))}
                      />
                    </div>
                    <button
                      className="hover-lift w-full h-12 rounded-full font-medium text-[14px] flex items-center justify-center gap-2 disabled:opacity-50"
                      style={{ background: '#C94A2A', color: '#F6F3EC' }}
                      onClick={enviarContacto}
                      disabled={enviandoContacto || !formContacto.nombreRemitente || !formContacto.emailRemitente || !formContacto.mensaje}
                    >
                      {enviandoContacto ? 'Enviando…' : <>Enviar solicitud <IcoSend /></>}
                    </button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
