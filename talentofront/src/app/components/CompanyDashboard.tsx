import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Bell, Search, MessageSquare, Building2, FileText, Bookmark,
  TrendingUp, SlidersHorizontal, X, LogOut, Award, CheckCircle, Mail,
  Plus, Loader2, ToggleLeft, ToggleRight, Users, Pencil
} from "lucide-react";
import { Link, useNavigate } from "react-router";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent } from "./ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useAuth } from "../context/AuthContext";
import logoImage from "../../assets/17a2f6b30bc584421f868b1534160753545e9968.png";

type Habilidad = { id: number; nombre: string; validada: boolean }
type Certificacion = { id: number; nombre: string; institucion: string | null; validada: boolean }
type Estudiante = {
  id: number
  nombre: string
  apellido: string
  especialidad: string
  descripcion: string | null
  fotoUrl: string | null
  disponible: boolean
  habilidades: Habilidad[]
  certificaciones: Certificacion[]
  colegio: { nombre: string }
}

const API_URL = import.meta.env.VITE_API_URL

const especialidades = ["Electricidad", "Mecánica Industrial", "Electrónica", "Refrigeración", "Informática"]
const habilidadesBlandas = ["Trabajo en equipo", "Comunicación", "Responsabilidad", "Liderazgo", "Creatividad"]

const gradientesAvatar = [
  "from-blue-500 to-blue-700", "from-purple-500 to-purple-700",
  "from-emerald-500 to-emerald-700", "from-orange-500 to-orange-700",
  "from-rose-500 to-rose-700", "from-cyan-500 to-cyan-700",
]
const gradienteAvatar = (nombre: string) =>
  gradientesAvatar[nombre.charCodeAt(0) % gradientesAvatar.length]

type PerfilEmpresa = {
  id: number
  nombre: string
  rubro: string
  descripcion: string | null
  logoUrl: string | null
  ofertas: { id: number; titulo: string; especialidad: string }[]
}
type OfertaEmpresa = {
  id: number
  titulo: string
  descripcion: string
  especialidad: string
  activa: boolean
  creadoEn: string
  _count: { postulaciones: number }
}

export function CompanyDashboard() {
  const { sesion, cerrarSesion } = useAuth()
  const navegar = useNavigate()
  const [perfil, setPerfil] = useState<PerfilEmpresa | null>(null)
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState("")
  const [especialidadFiltro, setEspecialidadFiltro] = useState("")
  const [mostrarFiltros, setMostrarFiltros] = useState(false)
  // Perfil estudiante seleccionado
  const [estudianteSel, setEstudianteSel] = useState<Estudiante | null>(null)
  // ID del estudiante a contactar (se captura antes de cerrar el dialog de perfil)
  const [estudianteContactoId, setEstudianteContactoId] = useState<number | null>(null)
  // Dialog contactar estudiante
  const [mostrarChat, setMostrarChat] = useState(false)
  const [mensajeChat, setMensajeChat] = useState("")
  const [chatEnviado, setChatEnviado] = useState(false)
  const [enviandoContacto, setEnviandoContacto] = useState(false)
  // Editar perfil empresa
  const [mostrarEditarPerfil, setMostrarEditarPerfil] = useState(false)
  const [editDesc, setEditDesc] = useState("")
  const [editLogo, setEditLogo] = useState("")
  const [editRubro, setEditRubro] = useState("")
  const [guardandoPerfil, setGuardandoPerfil] = useState(false)
  // Vista activa: buscar talento o mis ofertas
  const [vistaActiva, setVistaActiva] = useState<"buscar" | "ofertas">("buscar")
  // Gestión de ofertas
  const [misOfertas, setMisOfertas] = useState<OfertaEmpresa[]>([])
  const [cargandoOfertas, setCargandoOfertas] = useState(false)
  const [ofertasCargadas, setOfertasCargadas] = useState(false)
  const [mostrarCrearOferta, setMostrarCrearOferta] = useState(false)
  const [nuevaTitulo, setNuevaTitulo] = useState("")
  const [nuevaDescripcion, setNuevaDescripcion] = useState("")
  const [nuevaEspecialidad, setNuevaEspecialidad] = useState("")
  const [guardandoOferta, setGuardandoOferta] = useState(false)
  const [toggling, setToggling] = useState<number | null>(null)

  useEffect(() => {
    // Carga el perfil real de la empresa autenticada
    if (!sesion) return
    fetch(`${API_URL}/api/empresas/me`, {
      headers: { Authorization: `Bearer ${sesion.token}` },
    })
      .then(res => res.json())
      .then(datos => setPerfil(datos))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const params = new URLSearchParams()
    if (especialidadFiltro) params.set("especialidad", especialidadFiltro)

    setCargando(true)
    fetch(`${API_URL}/api/estudiantes?${params}`)
      .then(res => res.json())
      .then(datos => { setEstudiantes(datos); setCargando(false) })
      .catch(() => setCargando(false))
  }, [especialidadFiltro])

  const estudiantesFiltrados = estudiantes.filter(est => {
    const texto = busqueda.toLowerCase()
    return (
      est.nombre.toLowerCase().includes(texto) ||
      est.apellido.toLowerCase().includes(texto) ||
      est.habilidades.some(h => h.nombre.toLowerCase().includes(texto))
    )
  })

  const hayFiltrosActivos = busqueda || especialidadFiltro

  const limpiarFiltros = () => {
    setBusqueda("")
    setEspecialidadFiltro("")
  }

  const enviarContacto = async () => {
    if (!sesion || !mensajeChat.trim() || !estudianteContactoId) return
    setEnviandoContacto(true)
    try {
      const res = await fetch(`${API_URL}/api/contactos`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${sesion.token}` },
        body: JSON.stringify({ estudianteId: estudianteContactoId, mensaje: mensajeChat.trim() }),
      })
      if (res.ok) {
        setChatEnviado(true)
        setTimeout(() => {
          setMostrarChat(false)
          setChatEnviado(false)
          setMensajeChat("")
          setEstudianteContactoId(null)
        }, 1800)
      }
    } catch {
      // Error de red
    } finally {
      setEnviandoContacto(false)
    }
  }

  const abrirEditarPerfil = () => {
    setEditDesc(perfil?.descripcion ?? "")
    setEditLogo(perfil?.logoUrl ?? "")
    setEditRubro(perfil?.rubro ?? "")
    setMostrarEditarPerfil(true)
  }

  const guardarPerfil = async () => {
    if (!sesion) return
    setGuardandoPerfil(true)
    try {
      const res = await fetch(`${API_URL}/api/empresas/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${sesion.token}` },
        body: JSON.stringify({ descripcion: editDesc, logoUrl: editLogo, rubro: editRubro }),
      })
      if (res.ok) {
        const actualizado = await res.json()
        setPerfil(prev => prev ? { ...prev, descripcion: actualizado.descripcion, logoUrl: actualizado.logoUrl, rubro: actualizado.rubro } : prev)
        setMostrarEditarPerfil(false)
      }
    } catch {
      // Error de red
    } finally {
      setGuardandoPerfil(false)
    }
  }

  // Carga las ofertas la primera vez que se entra a esa vista
  const abrirVistaOfertas = () => {
    setVistaActiva("ofertas")
    if (ofertasCargadas || !sesion) return
    setCargandoOfertas(true)
    fetch(`${API_URL}/api/ofertas/empresa/me`, {
      headers: { Authorization: `Bearer ${sesion.token}` },
    })
      .then(res => res.json())
      .then((datos: OfertaEmpresa[]) => {
        setMisOfertas(datos)
        setOfertasCargadas(true)
        setCargandoOfertas(false)
      })
      .catch(() => setCargandoOfertas(false))
  }

  const crearOferta = async () => {
    if (!sesion || !nuevaTitulo.trim() || !nuevaDescripcion.trim() || !nuevaEspecialidad) return
    setGuardandoOferta(true)
    try {
      const res = await fetch(`${API_URL}/api/ofertas`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${sesion.token}` },
        body: JSON.stringify({ titulo: nuevaTitulo, descripcion: nuevaDescripcion, especialidad: nuevaEspecialidad }),
      })
      if (res.ok) {
        const nueva: OfertaEmpresa = await res.json()
        setMisOfertas(prev => [nueva, ...prev])
        // Actualiza el conteo en el perfil del sidebar
        setPerfil(prev => prev ? { ...prev, ofertas: [{ id: nueva.id, titulo: nueva.titulo, especialidad: nueva.especialidad }, ...prev.ofertas] } : prev)
        setMostrarCrearOferta(false)
        setNuevaTitulo("")
        setNuevaDescripcion("")
        setNuevaEspecialidad("")
      }
    } catch {
      // Error de red
    } finally {
      setGuardandoOferta(false)
    }
  }

  const toggleActiva = async (oferta: OfertaEmpresa) => {
    if (!sesion) return
    setToggling(oferta.id)
    try {
      const res = await fetch(`${API_URL}/api/ofertas/${oferta.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${sesion.token}` },
        body: JSON.stringify({ activa: !oferta.activa }),
      })
      if (res.ok) {
        const actualizada: OfertaEmpresa = await res.json()
        setMisOfertas(prev => prev.map(o => o.id === oferta.id ? actualizada : o))
        // Sincroniza el conteo en el sidebar
        if (!oferta.activa) {
          setPerfil(prev => prev ? { ...prev, ofertas: [...prev.ofertas, { id: oferta.id, titulo: oferta.titulo, especialidad: oferta.especialidad }] } : prev)
        } else {
          setPerfil(prev => prev ? { ...prev, ofertas: prev.ofertas.filter(o => o.id !== oferta.id) } : prev)
        }
      }
    } catch {
      // Error de red
    } finally {
      setToggling(null)
    }
  }

  const cerrarSesionYRedirigir = () => {
    cerrarSesion()
    navegar("/login", { replace: true })
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── NAVBAR ─────────────────────────────────────────── */}
      <nav className="bg-[#0F172A] text-white px-6 py-3.5 sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link to="/">
              <img src={logoImage} alt="ImpulsaTec" className="h-9 bg-white rounded-lg px-2 py-1" />
            </Link>
            <div className="hidden md:flex items-center gap-5 text-sm">
              <button
                onClick={() => setVistaActiva("buscar")}
                className={`flex items-center gap-1.5 transition-colors ${vistaActiva === "buscar" ? "text-white font-semibold" : "text-white/70 hover:text-white"}`}
              >
                <Search className="w-4 h-4" />
                <span>Buscar Talento</span>
              </button>
              <button
                onClick={abrirVistaOfertas}
                className={`flex items-center gap-1.5 transition-colors ${vistaActiva === "ofertas" ? "text-white font-semibold" : "text-white/70 hover:text-white"}`}
              >
                <FileText className="w-4 h-4" />
                <span>Mis Ofertas</span>
                {perfil && perfil.ofertas.length > 0 && (
                  <span className="bg-[#F97316] text-white text-xs px-1.5 py-0.5 rounded-full font-bold leading-none">
                    {perfil.ofertas.length}
                  </span>
                )}
              </button>
              {[
                { icon: Bookmark, label: "Guardados" },
                { icon: MessageSquare, label: "Mensajes" },
              ].map(({ icon: Icon, label }) => (
                <button key={label} className="flex items-center gap-1.5 text-white/70 hover:text-white transition-colors">
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative p-1.5 hover:bg-white/10 rounded-lg transition-colors">
              <Bell className="w-5 h-5" />
            </button>

            {/* Avatar con menú */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="w-8 h-8 border-2 border-white/30 cursor-pointer">
                  {perfil?.logoUrl && <AvatarImage src={perfil.logoUrl} />}
                  <AvatarFallback className="bg-white/20 text-white text-xs font-bold">
                    {perfil?.nombre[0] ?? "E"}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-3 py-2 text-sm font-medium text-gray-900">{perfil?.nombre ?? "—"}</div>
                <div className="px-3 pb-2 text-xs text-gray-500">{perfil?.rubro ?? "—"}</div>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer" onClick={abrirEditarPerfil}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Editar perfil
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer text-red-600 focus:text-red-600"
                  onClick={cerrarSesionYRedirigir}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-5">

          {/* ── SIDEBAR IZQUIERDO ───────────────────────────── */}
          <aside className="col-span-12 lg:col-span-3 space-y-4">
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Card className="border-0 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-5">
                    <Avatar className="w-14 h-14 rounded-xl">
                      {perfil?.logoUrl && <AvatarImage src={perfil.logoUrl} />}
                      <AvatarFallback className="rounded-xl bg-[#DBEAFE] text-[#0F172A] font-bold">
                        {perfil?.nombre[0] ?? "E"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-bold text-sm text-gray-900">{perfil?.nombre ?? "—"}</h3>
                      <p className="text-xs text-gray-400">{perfil?.rubro ?? "—"}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {[
                      { label: "Encontrados", valor: cargando ? "..." : `${estudiantesFiltrados.length}`, icon: Search, color: "bg-blue-50 text-blue-700" },
                      { label: "Guardados", valor: "—", icon: Bookmark, color: "bg-purple-50 text-purple-700" },
                      { label: "Ofertas activas", valor: perfil ? `${perfil.ofertas.length}` : "—", icon: TrendingUp, color: "bg-[#DBEAFE] text-[#0F172A]" },
                    ].map(stat => (
                      <div key={stat.label} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <div>
                          <p className="text-xs text-gray-500">{stat.label}</p>
                          <p className="text-lg font-bold text-gray-900">{stat.valor}</p>
                        </div>
                        <div className={`p-2 rounded-lg ${stat.color}`}>
                          <stat.icon className="w-4 h-4" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Chat con el colegio */}
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <button
                    className="w-full flex items-center gap-2.5 justify-center text-[#0F172A] hover:text-[#2563EB] py-1 transition-colors"
                    onClick={() => setMostrarChat(true)}
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span className="text-sm font-medium">Chat con el colegio</span>
                  </button>
                </CardContent>
              </Card>
            </motion.div>
          </aside>

          {/* ── CONTENIDO PRINCIPAL ─────────────────────────── */}
          <main className="col-span-12 lg:col-span-9">

          {/* ══ VISTA: MIS OFERTAS ═══════════════════════════ */}
          {vistaActiva === "ofertas" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Mis Ofertas</h2>
                  <p className="text-sm text-gray-500">Gestiona tus pasantías publicadas</p>
                </div>
                <Button
                  className="bg-[#F97316] hover:bg-[#EA580C] text-white rounded-xl gap-2"
                  onClick={() => setMostrarCrearOferta(true)}
                >
                  <Plus className="w-4 h-4" />
                  Nueva Oferta
                </Button>
              </div>

              {/* Cargando */}
              {cargandoOfertas && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl p-5 animate-pulse border border-gray-100 h-40" />
                  ))}
                </div>
              )}

              {/* Sin ofertas */}
              {ofertasCargadas && misOfertas.length === 0 && (
                <div className="text-center py-20 text-gray-400">
                  <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Sin ofertas publicadas</p>
                  <p className="text-sm mt-1">Crea tu primera oferta de pasantía</p>
                </div>
              )}

              {/* Grid de ofertas */}
              {ofertasCargadas && misOfertas.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <AnimatePresence mode="popLayout">
                    {misOfertas.map((oferta, i) => (
                      <motion.div
                        key={oferta.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.3, delay: i * 0.04 }}
                      >
                        <Card className={`border shadow-sm hover:shadow-md transition-all h-full ${oferta.activa ? "border-gray-100" : "border-gray-200 opacity-60"}`}>
                          <div className={`h-1 w-full rounded-t-xl ${oferta.activa ? "bg-[#F97316]" : "bg-gray-300"}`} />
                          <CardContent className="p-5 flex flex-col gap-3 h-full">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-bold text-sm text-gray-900 line-clamp-2 flex-1">{oferta.titulo}</h3>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                                oferta.activa ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-gray-100 text-gray-500"
                              }`}>
                                {oferta.activa ? "Activa" : "Cerrada"}
                              </span>
                            </div>

                            <span className="text-xs bg-[#DBEAFE] text-[#0F172A] px-2.5 py-1 rounded-full font-medium w-fit">
                              {oferta.especialidad}
                            </span>

                            <p className="text-xs text-gray-500 line-clamp-2 flex-1">{oferta.descripcion}</p>

                            <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-auto">
                              <Users className="w-3.5 h-3.5" />
                              <span>{oferta._count.postulaciones} postulación{oferta._count.postulaciones !== 1 ? "es" : ""}</span>
                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              className={`w-full h-8 text-xs rounded-lg gap-1.5 ${
                                oferta.activa
                                  ? "border-gray-200 text-gray-600 hover:border-red-300 hover:text-red-600"
                                  : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                              }`}
                              onClick={() => toggleActiva(oferta)}
                              disabled={toggling === oferta.id}
                            >
                              {toggling === oferta.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : oferta.activa ? (
                                <><ToggleLeft className="w-3.5 h-3.5" /> Cerrar oferta</>
                              ) : (
                                <><ToggleRight className="w-3.5 h-3.5" /> Reabrir oferta</>
                              )}
                            </Button>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          )}

          {/* ══ VISTA: BUSCAR TALENTO ════════════════════════ */}
          {vistaActiva === "buscar" && (<>

            {/* Buscador y filtros */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-0 shadow-sm mb-5">
                <CardContent className="p-4">
                  <div className="flex gap-3 mb-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Buscar por nombre o habilidad..."
                        className="pl-9 bg-gray-50 border-gray-200 rounded-xl h-10 text-sm"
                        value={busqueda}
                        onChange={e => setBusqueda(e.target.value)}
                      />
                    </div>
                    <Button
                      variant="outline"
                      className={`h-10 px-4 rounded-xl border-gray-200 text-sm gap-2 ${mostrarFiltros ? "bg-[#0F172A] text-white border-[#0F172A]" : ""}`}
                      onClick={() => setMostrarFiltros(!mostrarFiltros)}
                    >
                      <SlidersHorizontal className="w-4 h-4" />
                      Filtros
                      {hayFiltrosActivos && (
                        <span className="w-2 h-2 bg-[#F97316] rounded-full" />
                      )}
                    </Button>
                    {hayFiltrosActivos && (
                      <Button
                        variant="ghost"
                        className="h-10 px-3 rounded-xl text-gray-400 hover:text-gray-700 text-sm gap-1"
                        onClick={limpiarFiltros}
                      >
                        <X className="w-3.5 h-3.5" />
                        Limpiar
                      </Button>
                    )}
                  </div>

                  <AnimatePresence>
                    {mostrarFiltros && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-3 border-t border-gray-100 space-y-3">
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Especialidad</p>
                            <div className="flex flex-wrap gap-2">
                              {especialidades.map(esp => (
                                <button
                                  key={esp}
                                  onClick={() => setEspecialidadFiltro(prev => prev === esp ? "" : esp)}
                                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer ${
                                    especialidadFiltro === esp
                                      ? "bg-[#0F172A] text-white shadow-sm scale-105"
                                      : "bg-gray-100 text-gray-600 hover:bg-[#DBEAFE] hover:text-[#0F172A]"
                                  }`}
                                >
                                  {esp}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Habilidades blandas</p>
                            <div className="flex flex-wrap gap-2">
                              {habilidadesBlandas.map(hab => (
                                <button
                                  key={hab}
                                  onClick={() => setBusqueda(hab)}
                                  className="px-3 py-1.5 bg-gray-100 hover:bg-[#DBEAFE] hover:text-[#0F172A] text-gray-600 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer"
                                >
                                  {hab}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>

            {/* Encabezado resultados */}
            <div className="flex items-center justify-between mb-4 px-1">
              <p className="text-sm text-gray-500">
                {cargando ? "Buscando..." : (
                  <>
                    <span className="font-semibold text-gray-900">{estudiantesFiltrados.length}</span>
                    {" "}estudiante{estudiantesFiltrados.length !== 1 ? "s" : ""} encontrado{estudiantesFiltrados.length !== 1 ? "s" : ""}
                    {especialidadFiltro && <span className="text-[#0F172A]"> en {especialidadFiltro}</span>}
                  </>
                )}
              </p>
            </div>

            {/* Cargando */}
            {cargando && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl p-5 animate-pulse border border-gray-100">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-gray-200 rounded-full" />
                      <div className="h-4 bg-gray-200 rounded w-28" />
                      <div className="h-3 bg-gray-100 rounded w-20" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!cargando && estudiantesFiltrados.length === 0 && (
              <div className="text-center py-20 text-gray-400">
                <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Sin resultados</p>
                <p className="text-sm mt-1">Prueba cambiando los filtros de búsqueda</p>
              </div>
            )}

            {/* Grid de estudiantes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {estudiantesFiltrados.map((est, i) => (
                  <motion.div
                    key={est.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3, delay: i * 0.04 }}
                    whileHover={{ y: -4, transition: { duration: 0.18 } }}
                  >
                    <Card className="border border-gray-100 shadow-sm hover:shadow-lg transition-shadow duration-300 overflow-hidden h-full">
                      <div className={`h-1 w-full bg-gradient-to-r ${gradienteAvatar(est.nombre)}`} />
                      <CardContent className="p-5">
                        <div className="flex flex-col items-center text-center">
                          <div className="relative mb-3">
                            <Avatar className="w-16 h-16">
                              {est.fotoUrl && <AvatarImage src={est.fotoUrl} />}
                              <AvatarFallback className={`bg-gradient-to-br ${gradienteAvatar(est.nombre)} text-white font-bold text-lg`}>
                                {est.nombre[0]}{est.apellido[0]}
                              </AvatarFallback>
                            </Avatar>
                            {est.disponible && (
                              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white" />
                            )}
                          </div>

                          <h3 className="font-bold text-sm text-gray-900 mb-0.5">{est.nombre} {est.apellido}</h3>
                          <p className="text-xs text-[#0F172A] font-medium uppercase tracking-wide mb-3">{est.especialidad}</p>

                          {est.habilidades.length > 0 && (
                            <div className="flex flex-wrap gap-1 justify-center mb-3">
                              {est.habilidades.slice(0, 3).map(h => (
                                <span key={h.id} className="text-xs bg-[#DBEAFE] text-[#0F172A] px-2 py-0.5 rounded-full font-medium">
                                  {h.nombre}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center gap-1 text-xs text-gray-400 mb-4">
                            <Building2 className="w-3 h-3" />
                            <span className="line-clamp-1">{est.colegio.nombre.split(" ").slice(0, 3).join(" ")}…</span>
                          </div>

                          <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium mb-4 ${
                            est.disponible
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-gray-100 text-gray-500 border border-gray-200"
                          }`}>
                            {est.disponible ? "● Disponible" : "En pasantía"}
                          </span>

                          {/* Ver perfil completo → abre dialog */}
                          <Button
                            className="w-full bg-[#F97316] hover:bg-[#EA580C] text-white text-xs rounded-lg h-8 font-semibold"
                            onClick={() => setEstudianteSel(est)}
                          >
                            Ver perfil completo
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </>)}
          </main>
        </div>
      </div>

      {/* ── DIÁLOGO: Crear nueva oferta ─────────────────────── */}
      <Dialog open={mostrarCrearOferta} onOpenChange={abierto => { if (!abierto) { setMostrarCrearOferta(false); setNuevaTitulo(""); setNuevaDescripcion(""); setNuevaEspecialidad("") } }}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Nueva oferta de pasantía</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="nuevaTitulo">Título *</Label>
              <Input
                id="nuevaTitulo"
                placeholder="Ej: Pasantía en Mantención Eléctrica"
                value={nuevaTitulo}
                onChange={e => setNuevaTitulo(e.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label>Especialidad *</Label>
              <Select value={nuevaEspecialidad} onValueChange={setNuevaEspecialidad}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Selecciona una especialidad" />
                </SelectTrigger>
                <SelectContent>
                  {especialidades.map(esp => (
                    <SelectItem key={esp} value={esp}>{esp}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nuevaDescripcion">Descripción *</Label>
              <Textarea
                id="nuevaDescripcion"
                placeholder="Describe las actividades, requisitos y beneficios de la pasantía..."
                rows={4}
                value={nuevaDescripcion}
                onChange={e => setNuevaDescripcion(e.target.value)}
                className="resize-none"
              />
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={() => setMostrarCrearOferta(false)} disabled={guardandoOferta}>
                Cancelar
              </Button>
              <Button
                className="bg-[#0F172A] hover:bg-[#2563EB] text-white"
                onClick={crearOferta}
                disabled={!nuevaTitulo.trim() || !nuevaDescripcion.trim() || !nuevaEspecialidad || guardandoOferta}
              >
                {guardandoOferta && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Publicar oferta
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── DIÁLOGO: Perfil completo del estudiante ─────────── */}
      <Dialog open={!!estudianteSel} onOpenChange={abierto => { if (!abierto) setEstudianteSel(null) }}>
        {estudianteSel && (
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
            <DialogHeader>
              <DialogTitle>{estudianteSel.nombre} {estudianteSel.apellido}</DialogTitle>
            </DialogHeader>
            <div className="space-y-5 pt-2">
              {/* Cabecera */}
              <div className={`bg-gradient-to-br ${gradienteAvatar(estudianteSel.nombre)} rounded-xl p-5 text-white`}>
                <div className="flex items-center gap-4">
                  <Avatar className="w-20 h-20 border-4 border-white/30 shadow-lg">
                    {estudianteSel.fotoUrl && <AvatarImage src={estudianteSel.fotoUrl} />}
                    <AvatarFallback className="bg-white/20 text-white font-bold text-2xl">
                      {estudianteSel.nombre[0]}{estudianteSel.apellido[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-xl font-bold mb-0.5">{estudianteSel.nombre} {estudianteSel.apellido}</h2>
                    <p className="text-sm text-white/80 font-medium uppercase tracking-wide">{estudianteSel.especialidad}</p>
                    <div className="flex items-center gap-1.5 mt-2 text-white/70 text-xs">
                      <Award className="w-3.5 h-3.5" />
                      <span>{estudianteSel.colegio.nombre}</span>
                    </div>
                  </div>
                </div>
                {estudianteSel.descripcion && (
                  <p className="mt-3 text-sm text-white/80 leading-relaxed">{estudianteSel.descripcion}</p>
                )}
              </div>

              {/* Habilidades */}
              {estudianteSel.habilidades.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3 text-sm uppercase tracking-wide">Habilidades</h3>
                  <div className="flex flex-wrap gap-2">
                    {estudianteSel.habilidades.map(h => (
                      <span key={h.id} className="text-sm bg-[#DBEAFE] text-[#0F172A] px-3 py-1.5 rounded-full font-medium">
                        {h.nombre}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Certificaciones */}
              {estudianteSel.certificaciones.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3 text-sm uppercase tracking-wide">Certificaciones técnicas</h3>
                  <div className="space-y-2">
                    {estudianteSel.certificaciones.map(cert => (
                      <div key={cert.id} className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-gray-800">{cert.nombre}</p>
                          {cert.institucion && <p className="text-xs text-gray-500">{cert.institucion}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Botón contactar */}
              <Button
                className="w-full bg-[#F97316] hover:bg-[#EA580C] text-white rounded-xl"
                onClick={() => {
                  setEstudianteContactoId(estudianteSel.id)
                  setEstudianteSel(null)
                  setMostrarChat(true)
                }}
              >
                <Mail className="w-4 h-4 mr-2" />
                Contactar estudiante
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* ── DIÁLOGO: Contactar estudiante ───────────────────── */}
      <Dialog open={mostrarChat} onOpenChange={abierto => { if (!abierto) { setMostrarChat(false); setMensajeChat(""); setChatEnviado(false); setEstudianteContactoId(null) } }}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Contactar estudiante</DialogTitle>
          </DialogHeader>
          {chatEnviado ? (
            <div className="py-8 text-center space-y-2">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
              <p className="font-semibold text-gray-900">Contacto registrado</p>
              <p className="text-sm text-gray-500">El colegio coordinará el contacto pronto.</p>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <div className="space-y-1">
                <Label htmlFor="mensajeEmpresa">Mensaje (opcional)</Label>
                <Textarea
                  id="mensajeEmpresa"
                  placeholder="Describe la oportunidad o el motivo del contacto..."
                  rows={4}
                  value={mensajeChat}
                  onChange={e => setMensajeChat(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { setMostrarChat(false); setMensajeChat(""); setEstudianteContactoId(null) }} disabled={enviandoContacto}>
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-[#0F172A] hover:bg-[#2563EB] text-white"
                  onClick={enviarContacto}
                  disabled={enviandoContacto}
                >
                  {enviandoContacto ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Mail className="w-4 h-4 mr-2" />}
                  Enviar contacto
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── DIÁLOGO: Editar perfil empresa ──────────────────── */}
      <Dialog open={mostrarEditarPerfil} onOpenChange={abierto => { if (!abierto) setMostrarEditarPerfil(false) }}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Editar perfil de empresa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="editRubro">Rubro</Label>
              <Input
                id="editRubro"
                placeholder="Ej: Construcción, Electricidad, TI..."
                value={editRubro}
                onChange={e => setEditRubro(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="editDesc">Descripción</Label>
              <Textarea
                id="editDesc"
                placeholder="Cuéntale a los estudiantes sobre tu empresa..."
                rows={3}
                value={editDesc}
                onChange={e => setEditDesc(e.target.value)}
                className="resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="editLogo">URL del logo (opcional)</Label>
              <Input
                id="editLogo"
                placeholder="https://..."
                value={editLogo}
                onChange={e => setEditLogo(e.target.value)}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setMostrarEditarPerfil(false)} disabled={guardandoPerfil}>
                Cancelar
              </Button>
              <Button
                className="bg-[#0F172A] hover:bg-[#2563EB] text-white"
                onClick={guardarPerfil}
                disabled={guardandoPerfil}
              >
                {guardandoPerfil && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Guardar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
