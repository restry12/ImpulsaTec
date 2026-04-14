import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  LayoutDashboard, Users, CheckSquare, MessageSquare, BarChart3,
  Bell, Search, Menu, TrendingUp, UserCheck, LogOut, Loader2, Briefcase, Building2, ExternalLink
} from "lucide-react";
import { Link, useNavigate } from "react-router";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Switch } from "./ui/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { useAuth } from "../context/AuthContext";
import logoImage from "../../assets/17a2f6b30bc584421f868b1534160753545e9968.png";

type Habilidad = { id: number; nombre: string; validada: boolean }
type Certificacion = { id: number; nombre: string; institucion: string | null; validada: boolean }
type PostulacionAdmin = {
  id: number
  estado: "PENDIENTE" | "ACEPTADA" | "RECHAZADA"
  creadoEn: string
  estudiante: { id: number; nombre: string; apellido: string; especialidad: string }
  oferta: { id: number; titulo: string; empresa: { id: number; nombre: string } }
}
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
type EmpresaAdmin = {
  id: number
  nombre: string
  rubro: string
  descripcion: string | null
  logoUrl: string | null
  creadoEn: string
  ofertas: { id: number; titulo: string; especialidad: string; creadoEn: string }[]
}

const API_URL = import.meta.env.VITE_API_URL

const gradientesAvatar = [
  "from-blue-500 to-blue-700", "from-purple-500 to-purple-700",
  "from-emerald-500 to-emerald-700", "from-orange-500 to-orange-700",
  "from-rose-500 to-rose-700", "from-cyan-500 to-cyan-700",
]
const gradienteAvatar = (nombre: string) =>
  gradientesAvatar[nombre.charCodeAt(0) % gradientesAvatar.length]

const seccionesMenu = [
  { icon: LayoutDashboard, label: "Dashboard", color: "text-[#0F172A]" },
  { icon: Users, label: "Estudiantes", color: "text-blue-600" },
  { icon: CheckSquare, label: "Validaciones", color: "text-emerald-600" },
  { icon: Briefcase, label: "Postulaciones", color: "text-amber-600" },
  { icon: Building2, label: "Empresas", color: "text-indigo-600" },
  { icon: MessageSquare, label: "Muro", color: "text-purple-600" },
  { icon: BarChart3, label: "Métricas", color: "text-rose-600" },
]

export function SchoolAdminPanel() {
  const { sesion, cerrarSesion } = useAuth()
  const navegar = useNavigate()
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState("")
  const [seccionActiva, setSeccionActiva] = useState("Dashboard")
  // Estado para la sección Postulaciones
  const [postulaciones, setPostulaciones] = useState<PostulacionAdmin[]>([])
  const [cargandoPostulaciones, setCargandoPostulaciones] = useState(false)
  const [postulacionesCargadas, setPostulacionesCargadas] = useState(false)
  const [actualizandoPostulacion, setActualizandoPostulacion] = useState<number | null>(null)
  // Estado para la sección Empresas
  const [empresas, setEmpresas] = useState<EmpresaAdmin[]>([])
  const [cargandoEmpresas, setCargandoEmpresas] = useState(false)
  const [empresasCargadas, setEmpresasCargadas] = useState(false)
  // Control del diálogo de validación
  const [estudianteValidar, setEstudianteValidar] = useState<Estudiante | null>(null)
  const [disponibleEdit, setDisponibleEdit] = useState(false)
  const [validacionesHab, setValidacionesHab] = useState<Record<number, boolean>>({})
  const [validacionesCert, setValidacionesCert] = useState<Record<number, boolean>>({})
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    fetch(`${API_URL}/api/estudiantes`)
      .then(res => res.json())
      .then(datos => { setEstudiantes(datos); setCargando(false) })
      .catch(() => setCargando(false))
  }, [])

  // Carga postulaciones la primera vez que se entra a esa sección
  useEffect(() => {
    if (seccionActiva !== "Postulaciones" || postulacionesCargadas || !sesion) return
    setCargandoPostulaciones(true)
    fetch(`${API_URL}/api/postulaciones`, {
      headers: { Authorization: `Bearer ${sesion.token}` },
    })
      .then(res => res.json())
      .then((datos: PostulacionAdmin[]) => {
        setPostulaciones(datos)
        setPostulacionesCargadas(true)
        setCargandoPostulaciones(false)
      })
      .catch(() => setCargandoPostulaciones(false))
  }, [seccionActiva])

  // Carga empresas la primera vez que se entra a esa sección
  useEffect(() => {
    if (seccionActiva !== "Empresas" || empresasCargadas) return
    setCargandoEmpresas(true)
    fetch(`${API_URL}/api/empresas`)
      .then(res => res.json())
      .then((datos: EmpresaAdmin[]) => {
        setEmpresas(datos)
        setEmpresasCargadas(true)
        setCargandoEmpresas(false)
      })
      .catch(() => setCargandoEmpresas(false))
  }, [seccionActiva])

  const actualizarEstadoPostulacion = async (postulacionId: number, nuevoEstado: PostulacionAdmin["estado"]) => {
    if (!sesion) return
    setActualizandoPostulacion(postulacionId)
    try {
      const res = await fetch(`${API_URL}/api/postulaciones/${postulacionId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sesion.token}`,
        },
        body: JSON.stringify({ estado: nuevoEstado }),
      })
      if (res.ok) {
        setPostulaciones(prev =>
          prev.map(p => p.id === postulacionId ? { ...p, estado: nuevoEstado } : p)
        )
      }
    } catch {
      // Error de red, ignoramos silenciosamente
    } finally {
      setActualizandoPostulacion(null)
    }
  }

  const estudiantesFiltrados = estudiantes.filter(est => {
    const texto = busqueda.toLowerCase()
    return (
      est.nombre.toLowerCase().includes(texto) ||
      est.apellido.toLowerCase().includes(texto) ||
      est.especialidad.toLowerCase().includes(texto)
    )
  })

  const totalDisponibles = estudiantes.filter(e => e.disponible).length

  const abrirValidar = (est: Estudiante) => {
    setEstudianteValidar(est)
    setDisponibleEdit(est.disponible)
    setValidacionesHab(Object.fromEntries(est.habilidades.map(h => [h.id, h.validada])))
    setValidacionesCert(Object.fromEntries(est.certificaciones.map(c => [c.id, c.validada])))
  }

  const guardarValidacion = async () => {
    if (!estudianteValidar || !sesion) return
    setGuardando(true)

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sesion.token}`,
    }

    try {
      // Envía en paralelo todos los cambios de validación
      await Promise.all([
        // Disponibilidad
        fetch(`${API_URL}/api/estudiantes/${estudianteValidar.id}/disponible`, {
          method: "PATCH", headers,
          body: JSON.stringify({ disponible: disponibleEdit }),
        }),
        // Habilidades
        ...Object.entries(validacionesHab).map(([id, validada]) =>
          fetch(`${API_URL}/api/estudiantes/habilidades/${id}`, {
            method: "PATCH", headers,
            body: JSON.stringify({ validada }),
          })
        ),
        // Certificaciones
        ...Object.entries(validacionesCert).map(([id, validada]) =>
          fetch(`${API_URL}/api/estudiantes/certificaciones/${id}`, {
            method: "PATCH", headers,
            body: JSON.stringify({ validada }),
          })
        ),
      ])

      // Refleja los cambios en el estado local sin recargar
      setEstudiantes(prev => prev.map(e => {
        if (e.id !== estudianteValidar.id) return e
        return {
          ...e,
          disponible: disponibleEdit,
          habilidades: e.habilidades.map(h => ({ ...h, validada: validacionesHab[h.id] ?? h.validada })),
          certificaciones: e.certificaciones.map(c => ({ ...c, validada: validacionesCert[c.id] ?? c.validada })),
        }
      }))
    } catch {
      // Error de red, ignoramos silenciosamente
    } finally {
      setGuardando(false)
      setEstudianteValidar(null)
    }
  }

  const cerrarSesionYRedirigir = () => {
    cerrarSesion()
    navegar("/login", { replace: true })
  }

  const statCards = [
    {
      label: "Total Estudiantes",
      valor: cargando ? "..." : `${estudiantes.length}`,
      icon: Users,
      color: "bg-blue-50 text-blue-600",
      borde: "border-blue-100",
    },
    {
      label: "Disponibles",
      valor: cargando ? "..." : `${totalDisponibles}`,
      icon: UserCheck,
      color: "bg-emerald-50 text-emerald-600",
      borde: "border-emerald-100",
    },
    {
      label: "Empresas conectadas",
      valor: empresasCargadas ? `${empresas.length}` : "—",
      icon: TrendingUp,
      color: "bg-[#DBEAFE] text-[#0F172A]",
      borde: "border-blue-100",
    },
    {
      label: "Postulaciones activas",
      valor: postulacionesCargadas ? `${postulaciones.filter(p => p.estado === "PENDIENTE").length}` : "—",
      icon: Briefcase,
      color: "bg-orange-50 text-orange-600",
      borde: "border-orange-100",
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── NAVBAR ─────────────────────────────────────────── */}
      <nav className="bg-[#0F172A] text-white px-6 py-3.5 sticky top-0 z-50 shadow-lg">
        <div className="max-w-full mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button className="lg:hidden p-1.5 hover:bg-white/10 rounded-lg">
              <Menu className="w-5 h-5" />
            </button>
            <Link to="/">
              <img src={logoImage} alt="ImpulsaTec" className="h-9 bg-white rounded-lg px-2 py-1" />
            </Link>
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
              <span className="text-sm text-white/70 font-medium">Panel Administrativo</span>
            </div>
          </div>
          <div className="flex-1 max-w-sm mx-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <Input
                placeholder="Buscar estudiante..."
                className="pl-9 bg-white/10 border-white/15 text-white placeholder:text-white/40 text-sm h-9 rounded-lg"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative p-1.5 hover:bg-white/10 rounded-lg transition-colors">
              <Bell className="w-5 h-5" />
              {estudiantes.length > 0 && (
                <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-[#F97316] rounded-full" />
              )}
            </button>

            {/* Avatar con menú */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold cursor-pointer hover:bg-white/30 transition-colors">
                  IT
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-3 py-2 text-sm font-medium text-gray-900">Administrador</div>
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

      <div className="flex">
        {/* ── MENÚ LATERAL ────────────────────────────────── */}
        <aside className="hidden lg:flex flex-col w-56 bg-white border-r border-gray-100 min-h-[calc(100vh-56px)] sticky top-[56px] shadow-sm">
          <nav className="p-3 space-y-1 flex-1">
            {seccionesMenu.map((item, i) => (
              <motion.button
                key={item.label}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                onClick={() => setSeccionActiva(item.label)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${
                  seccionActiva === item.label
                    ? "bg-[#0F172A] text-white shadow-md shadow-blue-900/20"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <div className={`p-1 rounded-lg ${seccionActiva === item.label ? "bg-white/20" : "bg-gray-100"}`}>
                  <item.icon className={`w-4 h-4 ${seccionActiva === item.label ? "text-white" : item.color}`} />
                </div>
                <span>{item.label}</span>
              </motion.button>
            ))}
          </nav>
          <div className="p-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center">ImpulsaTec v1.0</p>
          </div>
        </aside>

        {/* ── CONTENIDO PRINCIPAL ─────────────────────────── */}
        <main className="flex-1 p-5 min-w-0">

          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-900">{seccionActiva}</h2>
            <p className="text-sm text-gray-500">
              {seccionActiva === "Dashboard" && "Resumen general del sistema"}
              {seccionActiva === "Estudiantes" && "Gestiona los estudiantes registrados"}
              {seccionActiva === "Validaciones" && "Valida competencias y disponibilidad"}
              {seccionActiva === "Postulaciones" && "Gestiona las postulaciones de pasantía"}
              {seccionActiva === "Empresas" && "Empresas registradas en la plataforma"}
              {seccionActiva === "Muro" && "Publicaciones de la comunidad"}
              {seccionActiva === "Métricas" && "Estadísticas y reportes"}
            </p>
          </div>

          {/* Estadísticas */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
            {statCards.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.07 }}
              >
                <Card className={`border ${stat.borde} shadow-sm hover:shadow-md transition-shadow`}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs text-gray-500 font-medium mb-1">{stat.label}</p>
                        <p className="text-2xl font-bold text-gray-900">{stat.valor}</p>
                      </div>
                      <div className={`p-2 rounded-xl ${stat.color}`}>
                        <stat.icon className="w-5 h-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* ── SECCIÓN: Postulaciones ──────────────────────── */}
          {seccionActiva === "Postulaciones" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <Card className="border border-gray-100 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-amber-600" />
                    <span className="text-base font-bold text-gray-900">Postulaciones</span>
                    {postulacionesCargadas && (
                      <Badge variant="secondary" className="text-xs ml-1">{postulaciones.length}</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {cargandoPostulaciones && (
                    <div className="p-8 text-center text-gray-400 text-sm flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Cargando postulaciones...
                    </div>
                  )}
                  {postulacionesCargadas && postulaciones.length === 0 && (
                    <div className="p-10 text-center text-gray-400">
                      <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No hay postulaciones registradas.</p>
                    </div>
                  )}
                  {postulacionesCargadas && postulaciones.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50/70 hover:bg-gray-50/70">
                          <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide pl-5">Estudiante</TableHead>
                          <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Oferta</TableHead>
                          <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Empresa</TableHead>
                          <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</TableHead>
                          <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-right pr-5">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {postulaciones.map((post, i) => (
                          <motion.tr
                            key={post.id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: i * 0.04 }}
                            className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors"
                          >
                            <TableCell className="pl-5 py-3">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${gradienteAvatar(post.estudiante.nombre)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                                  {post.estudiante.nombre[0]}{post.estudiante.apellido[0]}
                                </div>
                                <div>
                                  <p className="font-semibold text-sm text-gray-900">{post.estudiante.nombre} {post.estudiante.apellido}</p>
                                  <p className="text-xs text-gray-400">{post.estudiante.especialidad}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm text-gray-800 font-medium line-clamp-1">{post.oferta.titulo}</p>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm text-gray-600">{post.oferta.empresa.nombre}</p>
                            </TableCell>
                            <TableCell>
                              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                                post.estado === "ACEPTADA"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : post.estado === "RECHAZADA"
                                  ? "bg-red-50 text-red-600 border border-red-200"
                                  : "bg-amber-50 text-amber-700 border border-amber-200"
                              }`}>
                                {post.estado === "ACEPTADA" ? "✓ Aceptada" : post.estado === "RECHAZADA" ? "✗ Rechazada" : "● Pendiente"}
                              </span>
                            </TableCell>
                            <TableCell className="text-right pr-5">
                              {actualizandoPostulacion === post.id ? (
                                <Loader2 className="w-4 h-4 animate-spin ml-auto text-gray-400" />
                              ) : (
                                <div className="flex gap-1.5 justify-end">
                                  {post.estado !== "ACEPTADA" && (
                                    <Button
                                      size="sm"
                                      className="h-7 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-2.5"
                                      onClick={() => actualizarEstadoPostulacion(post.id, "ACEPTADA")}
                                    >
                                      Aceptar
                                    </Button>
                                  )}
                                  {post.estado !== "RECHAZADA" && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-xs rounded-lg border-red-200 text-red-600 hover:bg-red-50 px-2.5"
                                      onClick={() => actualizarEstadoPostulacion(post.id, "RECHAZADA")}
                                    >
                                      Rechazar
                                    </Button>
                                  )}
                                  {post.estado !== "PENDIENTE" && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 text-xs rounded-lg text-gray-400 hover:text-gray-700 px-2"
                                      onClick={() => actualizarEstadoPostulacion(post.id, "PENDIENTE")}
                                    >
                                      Resetear
                                    </Button>
                                  )}
                                </div>
                              )}
                            </TableCell>
                          </motion.tr>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ── SECCIÓN: Empresas ──────────────────────────────── */}
          {seccionActiva === "Empresas" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <Card className="border border-gray-100 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-indigo-600" />
                    <span className="text-base font-bold text-gray-900">Empresas</span>
                    {empresasCargadas && (
                      <Badge variant="secondary" className="text-xs ml-1">{empresas.length}</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {cargandoEmpresas && (
                    <div className="p-8 text-center text-gray-400 text-sm flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Cargando empresas...
                    </div>
                  )}
                  {empresasCargadas && empresas.length === 0 && (
                    <div className="p-10 text-center text-gray-400">
                      <Building2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No hay empresas registradas.</p>
                    </div>
                  )}
                  {empresasCargadas && empresas.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50/70 hover:bg-gray-50/70">
                          <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide pl-5">Empresa</TableHead>
                          <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Rubro</TableHead>
                          <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ofertas activas</TableHead>
                          <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-right pr-5">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {empresas.map((emp, i) => (
                          <motion.tr
                            key={emp.id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: i * 0.04 }}
                            className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors"
                          >
                            <TableCell className="pl-5 py-3">
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradienteAvatar(emp.nombre)} flex items-center justify-center text-white text-sm font-bold shrink-0`}>
                                  {emp.nombre[0]}
                                </div>
                                <div>
                                  <p className="font-semibold text-sm text-gray-900">{emp.nombre}</p>
                                  {emp.descripcion && (
                                    <p className="text-xs text-gray-400 line-clamp-1 max-w-[180px]">{emp.descripcion}</p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs bg-[#DBEAFE] text-[#0F172A] px-2.5 py-1 rounded-full font-medium">
                                {emp.rubro}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                                emp.ofertas.length > 0
                                  ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                  : "bg-gray-100 text-gray-400 border border-gray-200"
                              }`}>
                                {emp.ofertas.length} {emp.ofertas.length === 1 ? "oferta" : "ofertas"}
                              </span>
                            </TableCell>
                            <TableCell className="text-right pr-5">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs rounded-lg border-gray-200 hover:border-indigo-400 hover:text-indigo-600 gap-1.5"
                                onClick={() => navegar(`/empresas/${emp.id}`)}
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                Ver perfil
                              </Button>
                            </TableCell>
                          </motion.tr>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ── SECCIÓN: Estudiantes / Validaciones / Dashboard ─ */}
          {seccionActiva !== "Postulaciones" && seccionActiva !== "Empresas" && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <Card className="border border-gray-100 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#0F172A]" />
                    <span className="text-base font-bold text-gray-900">Gestión de Estudiantes</span>
                    {!cargando && (
                      <Badge variant="secondary" className="text-xs ml-1">
                        {estudiantesFiltrados.length}
                      </Badge>
                    )}
                  </div>
                  {/* + Agregar → redirige al registro */}
                  <Button
                    className="bg-[#F97316] hover:bg-[#EA580C] text-white text-sm rounded-lg h-8 px-4"
                    onClick={() => navegar("/registro")}
                  >
                    + Agregar
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {cargando && (
                  <div className="p-8 text-center text-gray-400 text-sm">Cargando estudiantes...</div>
                )}
                {!cargando && estudiantesFiltrados.length === 0 && (
                  <div className="p-10 text-center text-gray-400">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">
                      {busqueda ? `Sin resultados para "${busqueda}"` : "No hay estudiantes registrados."}
                    </p>
                  </div>
                )}
                {!cargando && estudiantesFiltrados.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/70 hover:bg-gray-50/70">
                        <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide pl-5">Estudiante</TableHead>
                        <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Especialidad</TableHead>
                        <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Certificaciones</TableHead>
                        <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</TableHead>
                        <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-right pr-5">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {estudiantesFiltrados.map((est, i) => (
                        <motion.tr
                          key={est.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: i * 0.04 }}
                          className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors"
                        >
                          <TableCell className="pl-5 py-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${gradienteAvatar(est.nombre)} flex items-center justify-center text-white text-sm font-bold shrink-0`}>
                                {est.nombre[0]}{est.apellido[0]}
                              </div>
                              <div>
                                <p className="font-semibold text-sm text-gray-900">{est.nombre} {est.apellido}</p>
                                <p className="text-xs text-gray-400">{est.colegio.nombre.split(" ").slice(0,3).join(" ")}…</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs bg-[#DBEAFE] text-[#0F172A] px-2.5 py-1 rounded-full font-medium">
                              {est.especialidad}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 items-center">
                              {est.certificaciones.length > 0 ? (
                                <>
                                  {est.certificaciones.slice(0, 3).map(cert => (
                                    <div
                                      key={cert.id}
                                      className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shadow-sm"
                                      title={cert.nombre}
                                    >
                                      <CheckSquare className="w-3.5 h-3.5 text-white" />
                                    </div>
                                  ))}
                                  {est.certificaciones.length > 3 && (
                                    <span className="text-xs text-gray-400 ml-1">+{est.certificaciones.length - 3}</span>
                                  )}
                                </>
                              ) : (
                                <span className="text-xs text-gray-300">Sin certificar</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                              est.disponible
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-gray-100 text-gray-500 border border-gray-200"
                            }`}>
                              {est.disponible ? "● Disponible" : "En pasantía"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right pr-5">
                            {/* Validar → abre dialog controlado */}
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs rounded-lg border-gray-200 hover:border-[#0F172A] hover:text-[#0F172A]"
                              onClick={() => abrirValidar(est)}
                            >
                              Validar
                            </Button>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </motion.div>
          )}
        </main>
      </div>

      {/* ── DIÁLOGO: Validar competencias ───────────────────── */}
      <Dialog open={!!estudianteValidar} onOpenChange={abierto => { if (!abierto) setEstudianteValidar(null) }}>
        {estudianteValidar && (
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-base">
                Validar Competencias — {estudianteValidar.nombre} {estudianteValidar.apellido}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-5 py-3">
              {/* Cabecera */}
              <div className={`flex items-center gap-4 p-4 rounded-xl bg-gradient-to-br ${gradienteAvatar(estudianteValidar.nombre)}`}>
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-white text-xl font-bold shrink-0">
                  {estudianteValidar.nombre[0]}{estudianteValidar.apellido[0]}
                </div>
                <div className="text-white">
                  <p className="font-bold">{estudianteValidar.nombre} {estudianteValidar.apellido}</p>
                  <p className="text-sm text-white/80">{estudianteValidar.especialidad}</p>
                  <div className="flex gap-3 mt-1 text-xs text-white/70">
                    <span>{estudianteValidar.habilidades.length} habilidades</span>
                    <span>·</span>
                    <span>{estudianteValidar.certificaciones.length} certificaciones</span>
                  </div>
                </div>
              </div>

              {/* Habilidades */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Habilidades</h4>
                  <span className="text-xs text-gray-400">
                    {Object.values(validacionesHab).filter(Boolean).length}/{estudianteValidar.habilidades.length} validadas
                  </span>
                </div>
                {estudianteValidar.habilidades.length === 0 ? (
                  <p className="text-sm text-gray-400 py-3 text-center">Sin habilidades registradas.</p>
                ) : (
                  <div className="space-y-2">
                    {estudianteValidar.habilidades.map(hab => (
                      <div
                        key={hab.id}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                          validacionesHab[hab.id]
                            ? "bg-blue-50 border-blue-200"
                            : "bg-gray-50 border-gray-100"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-2 h-2 rounded-full ${validacionesHab[hab.id] ? "bg-blue-500" : "bg-gray-300"}`} />
                          <p className="text-sm font-medium text-gray-800">{hab.nombre}</p>
                        </div>
                        <Switch
                          checked={validacionesHab[hab.id] ?? false}
                          onCheckedChange={v => setValidacionesHab(prev => ({ ...prev, [hab.id]: v }))}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Certificaciones */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Certificaciones</h4>
                  <span className="text-xs text-gray-400">
                    {Object.values(validacionesCert).filter(Boolean).length}/{estudianteValidar.certificaciones.length} validadas
                  </span>
                </div>
                {estudianteValidar.certificaciones.length === 0 ? (
                  <p className="text-sm text-gray-400 py-3 text-center">Sin certificaciones registradas.</p>
                ) : (
                  <div className="space-y-2">
                    {estudianteValidar.certificaciones.map(cert => (
                      <div
                        key={cert.id}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                          validacionesCert[cert.id]
                            ? "bg-emerald-50 border-emerald-200"
                            : "bg-gray-50 border-gray-100"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${validacionesCert[cert.id] ? "bg-emerald-500" : "bg-gray-300"}`} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{cert.nombre}</p>
                            {cert.institucion && (
                              <p className="text-xs text-gray-400">{cert.institucion}</p>
                            )}
                          </div>
                        </div>
                        <Switch
                          checked={validacionesCert[cert.id] ?? false}
                          onCheckedChange={v => setValidacionesCert(prev => ({ ...prev, [cert.id]: v }))}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Disponibilidad */}
              <div className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                disponibleEdit ? "bg-emerald-50 border-emerald-200" : "bg-gray-50 border-gray-100"
              }`}>
                <div>
                  <p className="text-sm font-medium text-gray-800">Disponible para pasantía</p>
                  <p className="text-xs text-gray-400">Visible en el directorio público</p>
                </div>
                <Switch checked={disponibleEdit} onCheckedChange={setDisponibleEdit} />
              </div>

              <div className="flex gap-3 pt-1">
                <Button
                  className="flex-1 bg-[#0F172A] hover:bg-[#2563EB] text-white rounded-xl"
                  onClick={guardarValidacion}
                  disabled={guardando}
                >
                  {guardando ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Guardar cambios
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl"
                  onClick={() => setEstudianteValidar(null)}
                  disabled={guardando}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
