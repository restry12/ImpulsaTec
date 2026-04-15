import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, Mail, CheckCircle, Award, ArrowRight, Zap, GraduationCap, Briefcase, Star, ChevronLeft, Newspaper, Loader2 } from "lucide-react";
import { Link } from "react-router";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent } from "./ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
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

// Color de avatar según inicial del nombre
const gradientesAvatar = [
  "from-blue-500 to-blue-700",
  "from-purple-500 to-purple-700",
  "from-emerald-500 to-emerald-700",
  "from-orange-500 to-orange-700",
  "from-rose-500 to-rose-700",
  "from-cyan-500 to-cyan-700",
  "from-amber-500 to-amber-700",
]
const gradienteAvatar = (nombre: string) =>
  gradientesAvatar[nombre.charCodeAt(0) % gradientesAvatar.length]

// Estado del formulario de contacto para un estudiante específico
interface FormContacto {
  nombreRemitente: string
  emailRemitente: string
  mensaje: string
}

export function PublicDirectory() {
  const [tabActivo, setTabActivo] = useState<"estudiantes" | "empresas">("estudiantes")
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState("")
  const [filtroTipo, setFiltroTipo] = useState<"TODOS" | "PASANTIA" | "FREELANCE">("TODOS")
  const [empresas, setEmpresas] = useState<EmpresaDir[]>([])
  const [cargandoEmpresas, setCargandoEmpresas] = useState(false)
  const [empresasCargadas, setEmpresasCargadas] = useState(false)
  // Diálogo de perfil: qué estudiante está seleccionado
  const [estudianteSel, setEstudianteSel] = useState<Estudiante | null>(null)
  // Formulario de contacto
  const [formContacto, setFormContacto] = useState<FormContacto>({ nombreRemitente: "", emailRemitente: "", mensaje: "" })
  const [enviandoContacto, setEnviandoContacto] = useState(false)
  const [contactoEnviado, setContactoEnviado] = useState(false)
  const [vistaContacto, setVistaContacto] = useState(false)
  const [novedadesColegio, setNovedadesColegio] = useState<PostColegio[]>([])
  const [cargandoNovedades, setCargandoNovedades] = useState(true)

  useEffect(() => {
    fetch(`${API_URL}/api/posts/colegio`)
      .then(res => res.json())
      .then((datos: unknown) => {
        setNovedadesColegio(Array.isArray(datos) ? datos : [])
        setCargandoNovedades(false)
      })
      .catch(() => setCargandoNovedades(false))
  }, [])

  useEffect(() => {
    fetch(`${API_URL}/api/estudiantes`)
      .then(res => {
        if (!res.ok) throw new Error("Error al cargar estudiantes")
        return res.json()
      })
      .then(datos => { setEstudiantes(datos); setCargando(false) })
      .catch(err => { setError(err.message); setCargando(false) })
  }, [])

  useEffect(() => {
    if (tabActivo !== "empresas" || empresasCargadas) return
    setCargandoEmpresas(true)
    fetch(`${API_URL}/api/empresas`)
      .then(res => res.json())
      .then((datos: EmpresaDir[]) => {
        setEmpresas(datos)
        setEmpresasCargadas(true)
        setCargandoEmpresas(false)
      })
      .catch(() => setCargandoEmpresas(false))
  }, [tabActivo])

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
      if (res.ok) {
        setContactoEnviado(true)
      }
    } catch {
      // Error de red silencioso — igual marcamos como enviado para UX optimista
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
    const coincideTexto = (
      est.nombre.toLowerCase().includes(texto) ||
      est.apellido.toLowerCase().includes(texto) ||
      est.especialidad.toLowerCase().includes(texto) ||
      est.habilidades.some(h => h.nombre.toLowerCase().includes(texto))
    )
    const coincideTipo = (
      filtroTipo === "TODOS" ||
      est.tipoDisponibilidad === filtroTipo ||
      est.tipoDisponibilidad === "AMBOS"
    )
    return coincideTexto && coincideTipo
  })

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative bg-[#0F172A] text-white overflow-hidden">
        {/* Fondo decorativo */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0F172A] via-[#1E3A8A] to-[#172554]" />
        <div className="animar-brillar absolute -top-24 -left-24 w-96 h-96 bg-[#F97316]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="animar-brillar absolute -bottom-16 -right-16 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none" style={{ animationDelay: "2s" }} />
        <div className="animar-flotar absolute top-16 right-24 w-16 h-16 bg-white/10 rounded-2xl rotate-12 pointer-events-none hidden lg:block" />
        <div className="animar-flotar2 absolute bottom-24 left-16 w-10 h-10 bg-[#F97316]/30 rounded-xl -rotate-6 pointer-events-none hidden lg:block" />

        {/* Enlace al panel admin */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-5 flex justify-end">
          <Link to="/colegio">
            <Button variant="outline" size="sm" className="bg-white/10 hover:bg-white/20 text-white border-white/30 backdrop-blur-sm">
              Panel Admin
            </Button>
          </Link>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 pb-20 pt-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6 flex flex-col items-center"
          >
            <div className="relative mb-5">
              <div className="absolute inset-0 bg-white/20 rounded-xl blur-xl" />
              <img
                src={logoImage}
                alt="Centro Educacional Cardenal José María Caro"
                className="relative h-20 bg-white rounded-xl px-4 py-2 shadow-xl"
              />
            </div>
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="text-3xl md:text-5xl font-bold leading-tight mb-3 max-w-3xl"
            >
              Centro Educacional<br />
              <span className="text-[#F97316]">Cardenal José María Caro</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="text-xl text-white/80 font-medium tracking-wide"
            >
              Talento Técnico que impulsa Chile
            </motion.p>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="text-base text-white/70 mb-8 max-w-2xl mx-auto leading-relaxed"
          >
            Conectamos estudiantes técnicos con empresas que buscan talento real,
            certificado y listo para aportar desde el primer día.
          </motion.p>

          {/* Buscador */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.45 }}
            className="max-w-2xl mx-auto mb-6"
          >
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 transition-colors group-focus-within:text-[#0F172A]" />
              <Input
                placeholder="Busca por especialidad, habilidad o nombre..."
                className="pl-12 pr-32 py-6 text-base bg-white text-gray-900 shadow-xl border-0 rounded-xl focus-visible:ring-[#F97316]"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
              />
              <Button className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#F97316] hover:bg-[#EA580C] text-white rounded-lg px-5">
                Buscar
              </Button>
            </div>
          </motion.div>

          {/* Chips de especialidad */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.55 }}
            className="flex flex-wrap gap-2 justify-center"
          >
            {especialidades.map(esp => (
              <button
                key={esp}
                onClick={() => setBusqueda(busqueda === esp ? "" : esp)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer border ${
                  busqueda === esp
                    ? "bg-[#F97316] border-[#F97316] text-white shadow-md scale-105"
                    : "bg-white/10 border-white/20 text-white hover:bg-white/20"
                }`}
              >
                {esp}
              </button>
            ))}
          </motion.div>

          {/* Toggle Pasantía / Freelance */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.65 }}
            className="flex gap-2 justify-center mt-3"
          >
            {(["TODOS", "PASANTIA", "FREELANCE"] as const).map(tipo => (
              <button
                key={tipo}
                onClick={() => setFiltroTipo(tipo)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer border ${
                  filtroTipo === tipo
                    ? "bg-white border-white text-[#0F172A] shadow-md scale-105"
                    : "bg-white/10 border-white/20 text-white hover:bg-white/20"
                }`}
              >
                {tipo === "TODOS" ? "Todos" : tipo === "PASANTIA" ? "Pasantía" : "Freelance"}
              </button>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────────── */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="grid grid-cols-3 gap-6 text-center">
            {[
              { valor: cargando ? "..." : `${estudiantes.length}`, label: "Estudiantes técnicos", color: "text-[#0F172A]" },
              { valor: cargando ? "..." : `${estudiantes.filter(e => e.disponible).length}`, label: "Disponibles ahora", color: "text-emerald-600" },
              { valor: "—", label: "Empresas conectadas", color: "text-[#F97316]" },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 * i }}
              >
                <p className={`text-4xl font-bold ${stat.color} mb-1`}>{stat.valor}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TABS Estudiantes / Empresas ──────────────────────── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1">
            {(["estudiantes", "empresas"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setTabActivo(tab)}
                className={`px-6 py-4 text-sm font-semibold border-b-2 transition-colors ${
                  tabActivo === tab
                    ? "border-[#F97316] text-[#F97316]"
                    : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
              >
                {tab === "estudiantes" ? "Estudiantes" : "Empresas"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── GRID EMPRESAS ────────────────────────────────────── */}
      {tabActivo === "empresas" && (
        <section className="max-w-7xl mx-auto px-6 py-14">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Empresas conectadas</h2>
          {cargandoEmpresas && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse h-32" />
              ))}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {empresas.map(emp => (
              <Link key={emp.id} to={`/empresas/${emp.id}`}>
                <Card className="hover:shadow-lg transition-shadow h-full border border-gray-100">
                  <CardContent className="p-6 flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#DBEAFE] flex items-center justify-center shrink-0 font-bold text-[#0F172A] text-lg">
                      {emp.logoUrl
                        ? <img src={emp.logoUrl} alt={emp.nombre} className="w-full h-full object-cover rounded-xl" />
                        : emp.nombre[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{emp.nombre}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{emp.rubro}</p>
                      {emp.descripcion && (
                        <p className="text-xs text-gray-400 mt-1.5 line-clamp-2">{emp.descripcion}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── DIRECTORIO ───────────────────────────────────────── */}
      {tabActivo === "estudiantes" && (
      <section className="max-w-7xl mx-auto px-6 py-14">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Talento Disponible</h2>
            <p className="text-sm text-gray-500">
              {busqueda
                ? `${estudiantesFiltrados.length} resultado${estudiantesFiltrados.length !== 1 ? "s" : ""} para "${busqueda}"`
                : "Estudiantes técnicos con habilidades certificadas"}
            </p>
          </div>
          {busqueda && (
            <Button variant="outline" size="sm" onClick={() => setBusqueda("")}>
              Limpiar filtro
            </Button>
          )}
        </div>

        {cargando && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-20 h-20 bg-gray-200 rounded-full" />
                  <div className="h-4 bg-gray-200 rounded w-32" />
                  <div className="h-3 bg-gray-100 rounded w-24" />
                  <div className="flex gap-2 mt-2">
                    <div className="h-6 bg-gray-100 rounded-full w-16" />
                    <div className="h-6 bg-gray-100 rounded-full w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="text-center py-16">
            <p className="text-red-500 mb-3">{error}</p>
            <Button variant="outline" onClick={() => window.location.reload()}>Reintentar</Button>
          </div>
        )}

        <AnimatePresence mode="wait">
          {!cargando && !error && estudiantesFiltrados.length === 0 && (
            <motion.div
              key="vacio"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-20 text-gray-400"
            >
              <Zap className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">
                {busqueda ? `Sin resultados para "${busqueda}"` : "No hay estudiantes registrados aún."}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {estudiantesFiltrados.map((est, i) => {
            const nombreCompleto = `${est.nombre} ${est.apellido}`
            return (
              <motion.div
                key={est.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.05, ease: "easeOut" }}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
              >
                <Card className="overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition-shadow duration-300 h-full">
                  {/* Franja superior de color */}
                  <div className={`h-1.5 w-full bg-gradient-to-r ${gradienteAvatar(est.nombre)}`} />
                  <CardContent className="p-6">
                    <div className="flex flex-col items-center text-center">
                      <div className="relative mb-4">
                        <Avatar className="w-20 h-20">
                          {est.fotoUrl && <AvatarImage src={est.fotoUrl} />}
                          <AvatarFallback className={`bg-gradient-to-br ${gradienteAvatar(est.nombre)} text-white font-bold text-xl`}>
                            {est.nombre[0]}{est.apellido[0]}
                          </AvatarFallback>
                        </Avatar>
                        {est.disponible && (
                          <span className="absolute bottom-0.5 right-0.5 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white" title="Disponible" />
                        )}
                      </div>

                      <h3 className="font-semibold text-gray-900 text-base mb-0.5">{nombreCompleto}</h3>
                      <p className="text-xs font-medium text-[#0F172A] mb-2 uppercase tracking-wide">{est.especialidad}</p>

                      {/* Badge tipo disponibilidad */}
                      <div className="mb-3">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          est.tipoDisponibilidad === "FREELANCE"
                            ? "bg-purple-100 text-purple-700"
                            : est.tipoDisponibilidad === "AMBOS"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-blue-100 text-blue-700"
                        }`}>
                          {est.tipoDisponibilidad === "PASANTIA" ? "Pasantía"
                            : est.tipoDisponibilidad === "FREELANCE" ? "Freelance"
                            : "Pasantía & Freelance"}
                        </span>
                      </div>

                      {est.habilidades.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 justify-center mb-4">
                          {est.habilidades.slice(0, 3).map(h => (
                            <span key={h.id} className="text-xs bg-[#DBEAFE] text-[#0F172A] px-2.5 py-1 rounded-full font-medium">
                              {h.nombre}
                            </span>
                          ))}
                          {est.habilidades.length > 3 && (
                            <span className="text-xs text-gray-400 px-2 py-1">+{est.habilidades.length - 3}</span>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 text-emerald-600 text-xs mb-5">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Validado por {est.colegio.nombre.split(" ").slice(0, 3).join(" ")}…</span>
                      </div>

                      <Button
                        className="w-full bg-[#0F172A] hover:bg-[#2563EB] text-white rounded-lg text-sm font-medium transition-all duration-200"
                        onClick={() => abrirPerfil(est)}
                      >
                        Ver perfil completo
                        <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </section>
      )} {/* fin tabActivo === "estudiantes" */}

      {/* ── DIÁLOGO: Perfil completo ────────────────────────── */}
      <Dialog open={!!estudianteSel} onOpenChange={abierto => { if (!abierto) setEstudianteSel(null) }}>
        {estudianteSel && (
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-0">
            <DialogHeader className="sr-only">
              <DialogTitle>{estudianteSel.nombre} {estudianteSel.apellido}</DialogTitle>
            </DialogHeader>

            <AnimatePresence mode="wait">
              {!vistaContacto ? (
                // ── VISTA PERFIL ────────────────────────────────
                <motion.div
                  key="perfil"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.22 }}
                >
                  {/* Banner + avatar */}
                  <div className={`relative bg-gradient-to-br ${gradienteAvatar(estudianteSel.nombre)} px-6 pt-8 pb-16`}>
                    <div className="flex items-start gap-4">
                      <Avatar className="w-24 h-24 border-4 border-white/30 shadow-xl shrink-0">
                        {estudianteSel.fotoUrl && <AvatarImage src={estudianteSel.fotoUrl} />}
                        <AvatarFallback className="bg-white/20 text-white font-bold text-3xl">
                          {estudianteSel.nombre[0]}{estudianteSel.apellido[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-white pt-1">
                        <h2 className="text-2xl font-bold leading-tight">
                          {estudianteSel.nombre} {estudianteSel.apellido}
                        </h2>
                        <p className="text-white/80 text-sm font-medium mt-0.5 uppercase tracking-wide">
                          {estudianteSel.especialidad}
                        </p>
                        <div className="flex items-center gap-1.5 mt-2 text-white/70 text-xs">
                          <GraduationCap className="w-3.5 h-3.5" />
                          <span>{estudianteSel.colegio.nombre}</span>
                        </div>
                      </div>
                    </div>
                    {/* Badge disponibilidad */}
                    <div className="absolute bottom-4 right-5">
                      <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${
                        estudianteSel.disponible
                          ? "bg-emerald-500/20 border-emerald-300/40 text-white"
                          : "bg-white/10 border-white/20 text-white/70"
                      }`}>
                        {estudianteSel.disponible ? "● Disponible para pasantía" : "En pasantía"}
                      </span>
                    </div>
                  </div>

                  <div className="px-6 py-5 space-y-5">
                    {/* Descripción */}
                    {estudianteSel.descripcion && (
                      <div>
                        <p className="text-sm text-gray-700 leading-relaxed">{estudianteSel.descripcion}</p>
                      </div>
                    )}

                    {/* Estadísticas rápidas */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100">
                        <Star className="w-4 h-4 mx-auto mb-1 text-blue-600" />
                        <p className="text-lg font-bold text-gray-900">{estudianteSel.habilidades.length}</p>
                        <p className="text-xs text-gray-500">Habilidades</p>
                        <p className="text-xs text-blue-600 font-medium">{estudianteSel.habilidades.filter(h => h.validada).length} validadas</p>
                      </div>
                      <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100">
                        <Award className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
                        <p className="text-lg font-bold text-gray-900">{estudianteSel.certificaciones.length}</p>
                        <p className="text-xs text-gray-500">Certificaciones</p>
                        <p className="text-xs text-emerald-600 font-medium">{estudianteSel.certificaciones.filter(c => c.validada).length} validadas</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                        <Briefcase className="w-4 h-4 mx-auto mb-1 text-[#0F172A]" />
                        <p className="text-sm font-bold text-gray-900 leading-tight">{estudianteSel.especialidad}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Especialidad</p>
                      </div>
                    </div>

                    {/* Habilidades — listado con validación */}
                    {estudianteSel.habilidades.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400">Habilidades</h3>
                          <span className="text-xs text-gray-400">
                            {estudianteSel.habilidades.filter(h => h.validada).length}/{estudianteSel.habilidades.length} validadas por el colegio
                          </span>
                        </div>
                        <div className="space-y-2">
                          {estudianteSel.habilidades.map(h => (
                            <div
                              key={h.id}
                              className={`flex items-center justify-between px-3 py-2.5 rounded-xl border ${
                                h.validada ? "bg-blue-50 border-blue-100" : "bg-gray-50 border-gray-100"
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <div className={`w-2 h-2 rounded-full shrink-0 ${h.validada ? "bg-blue-500" : "bg-gray-300"}`} />
                                <span className="text-sm font-medium text-gray-800">{h.nombre}</span>
                              </div>
                              {h.validada ? (
                                <span className="text-xs font-medium text-blue-600 flex items-center gap-1">
                                  <CheckCircle className="w-3.5 h-3.5" /> Validada
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400">Pendiente</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Certificaciones — listado con validación */}
                    {estudianteSel.certificaciones.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400">Certificaciones técnicas</h3>
                          <span className="text-xs text-gray-400">
                            {estudianteSel.certificaciones.filter(c => c.validada).length}/{estudianteSel.certificaciones.length} validadas
                          </span>
                        </div>
                        <div className="space-y-2">
                          {estudianteSel.certificaciones.map(cert => (
                            <div
                              key={cert.id}
                              className={`flex items-center gap-3 p-3 rounded-xl border ${
                                cert.validada ? "bg-emerald-50 border-emerald-100" : "bg-gray-50 border-gray-100"
                              }`}
                            >
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                cert.validada ? "bg-emerald-500" : "bg-gray-200"
                              }`}>
                                <CheckCircle className={`w-4 h-4 ${cert.validada ? "text-white" : "text-gray-400"}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-800">{cert.nombre}</p>
                                {cert.institucion && (
                                  <p className="text-xs text-gray-500 mt-0.5">{cert.institucion}</p>
                                )}
                              </div>
                              {cert.validada ? (
                                <span className="text-xs font-medium text-emerald-600 shrink-0">Validada</span>
                              ) : (
                                <span className="text-xs text-gray-400 shrink-0">Pendiente</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* CTA contactar */}
                    <div className="pt-1 border-t border-gray-100">
                      <Button
                        className="w-full bg-[#F97316] hover:bg-[#EA580C] text-white rounded-xl h-11 text-sm font-semibold"
                        onClick={() => setVistaContacto(true)}
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        Contactar vía el colegio
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ) : (
                // ── VISTA FORMULARIO DE CONTACTO ────────────────
                <motion.div
                  key="contacto"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.22 }}
                  className="px-6 py-6 space-y-4"
                >
                  <button
                    onClick={() => setVistaContacto(false)}
                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors mb-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Volver al perfil
                  </button>

                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Contactar a {estudianteSel.nombre}</h2>
                    <p className="text-sm text-gray-500 mt-0.5">El colegio coordinará el contacto con el estudiante.</p>
                  </div>

                  {contactoEnviado ? (
                    <div className="text-center py-10 space-y-3">
                      <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle className="w-7 h-7 text-emerald-600" />
                      </div>
                      <p className="font-semibold text-gray-900">¡Solicitud enviada!</p>
                      <p className="text-sm text-gray-500">El colegio se pondrá en contacto contigo pronto.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="nombreRemitente" className="text-xs">Tu nombre</Label>
                          <Input
                            id="nombreRemitente"
                            placeholder="Juan Pérez"
                            value={formContacto.nombreRemitente}
                            onChange={e => setFormContacto(prev => ({ ...prev, nombreRemitente: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="emailRemitente" className="text-xs">Tu email</Label>
                          <Input
                            id="emailRemitente"
                            type="email"
                            placeholder="juan@empresa.cl"
                            value={formContacto.emailRemitente}
                            onChange={e => setFormContacto(prev => ({ ...prev, emailRemitente: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="mensaje" className="text-xs">Mensaje</Label>
                        <Textarea
                          id="mensaje"
                          placeholder="Cuéntanos sobre la oportunidad de pasantía..."
                          rows={4}
                          value={formContacto.mensaje}
                          onChange={e => setFormContacto(prev => ({ ...prev, mensaje: e.target.value }))}
                        />
                      </div>
                      <Button
                        className="w-full bg-[#F97316] hover:bg-[#EA580C] text-white rounded-xl h-11"
                        onClick={enviarContacto}
                        disabled={enviandoContacto || !formContacto.nombreRemitente || !formContacto.emailRemitente || !formContacto.mensaje}
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        {enviandoContacto ? "Enviando..." : "Enviar solicitud"}
                      </Button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </DialogContent>
        )}
      </Dialog>

      {/* ── SECCIÓN: NOVEDADES DEL COLEGIO ────────────────────── */}
      <section className="mt-16 pb-16">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-[#0F172A] rounded-lg flex items-center justify-center">
              <Newspaper className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#0F172A]">Novedades del colegio</h2>
              <p className="text-xs text-gray-400">Anuncios oficiales del Centro Educacional Cardenal José María Caro</p>
            </div>
          </div>

          {cargandoNovedades && (
            <div className="flex items-center justify-center py-10 text-gray-400 gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Cargando novedades...</span>
            </div>
          )}

          {!cargandoNovedades && novedadesColegio.length === 0 && (
            <div className="py-10 text-center text-gray-400">
              <Newspaper className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No hay novedades publicadas aún.</p>
            </div>
          )}

          <div className="space-y-4">
            {novedadesColegio.map(novedad => {
              const diff = Date.now() - new Date(novedad.creadoEn).getTime()
              const min = Math.floor(diff / 60000)
              const tiempo = min < 1 ? "Ahora mismo"
                : min < 60 ? `Hace ${min} min`
                : min < 1440 ? `Hace ${Math.floor(min / 60)}h`
                : `Hace ${Math.floor(min / 1440)} día${Math.floor(min / 1440) > 1 ? "s" : ""}`

              return (
                <Card key={novedad.id} className="border-0 shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex gap-3 mb-3">
                      <Avatar className="w-10 h-10 shrink-0">
                        {novedad.administrador?.colegio.logoUrl && (
                          <AvatarImage src={novedad.administrador.colegio.logoUrl} />
                        )}
                        <AvatarFallback>
                          {novedad.administrador?.colegio.nombre[0] ?? "C"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-semibold text-sm text-gray-900">
                          {novedad.administrador?.colegio.nombre ?? "Colegio"}
                        </h4>
                        <p className="text-xs text-gray-400 mt-0.5">{tiempo}</p>
                      </div>
                    </div>

                    <p className="text-sm text-gray-700 leading-relaxed">{novedad.contenido}</p>

                    {novedad.mediaUrl && novedad.mediaType === 'IMAGEN' && (
                      <div className="mt-3 rounded-xl overflow-hidden border border-gray-100">
                        <img
                          src={novedad.mediaUrl}
                          alt="Imagen de novedad"
                          className="w-full max-h-80 object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}
                    {novedad.mediaUrl && novedad.mediaType === 'VIDEO' && (
                      <div className="mt-3 rounded-xl overflow-hidden border border-gray-100">
                        <video src={novedad.mediaUrl} controls className="w-full max-h-80" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="relative bg-[#0F172A] text-white py-20 overflow-hidden">
        <div className="animar-brillar absolute -top-20 right-0 w-80 h-80 bg-[#F97316]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-[#F97316] font-semibold text-sm uppercase tracking-widest mb-3">¿Buscas talento?</p>
            <h2 className="text-3xl font-bold mb-4">Conecta con el talento técnico de Chile</h2>
            <p className="text-white/70 text-base mb-8 leading-relaxed">
              Accede a perfiles completos, publica ofertas de pasantía y contrata
              talento técnico certificado directamente desde el colegio.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/empresa">
                <Button size="lg" className="bg-[#F97316] hover:bg-[#EA580C] text-white px-8 rounded-xl font-semibold shadow-lg shadow-orange-900/30">
                  Registrar empresa
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link to="/estudiante">
                <Button size="lg" variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/30 px-8 rounded-xl backdrop-blur-sm">
                  Soy estudiante
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer className="bg-gray-950 text-white">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-white/10">
            <div className="md:col-span-1">
              <img src={logoImage} alt="Logo" className="h-11 bg-white rounded-lg px-2 py-1.5 mb-4" />
              <p className="text-gray-400 text-sm leading-relaxed">
                Conectando talento técnico con oportunidades reales en Chile.
              </p>
            </div>
            {[
              {
                titulo: "Estudiantes",
                links: ["Crear perfil", "Buscar pasantías", "Recursos"],
              },
              {
                titulo: "Empresas",
                links: ["Publicar oferta", "Buscar talento", "Planes"],
              },
              {
                titulo: "Contacto",
                links: ["info@impulsatec.cl", "+569 2346 1235", "Santiago, Chile"],
              },
            ].map(col => (
              <div key={col.titulo}>
                <h4 className="font-semibold text-sm uppercase tracking-wide text-gray-300 mb-3">{col.titulo}</h4>
                <ul className="space-y-2">
                  {col.links.map(link => (
                    <li key={link}>
                      <a href="#" className="text-gray-500 hover:text-white text-sm transition-colors">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="text-center text-gray-600 text-xs mt-8">
            © 2026 ImpulsaTec · Centro Educacional Cardenal José María Caro. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  )
}
