import { useState, useEffect, useRef } from "react";
import { PanelChat } from './PanelChat'
import { motion, AnimatePresence } from "motion/react";
import {
  Bell, Search, MessageSquare, Building2, FileText, Bookmark,
  TrendingUp, SlidersHorizontal, X, LogOut, Award, CheckCircle, Mail,
  Plus, Loader2, ToggleLeft, ToggleRight, Users, Pencil,
  Home, ThumbsUp, Share2, Paperclip, ImageIcon,
  MessageCircle, Trash2, MoreVertical, Send
} from "lucide-react";
import { toast } from "sonner";
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
import { Progress } from "./ui/progress";
import { subirMedia } from "../../lib/supabase";

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

type PostFeed = {
  id: number
  contenido: string
  mediaUrl: string | null
  mediaType: 'IMAGEN' | 'VIDEO' | null
  autorTipo: 'ESTUDIANTE' | 'EMPRESA' | 'ADMINISTRADOR'
  estudianteId: number | null
  empresaId: number | null
  administradorId: number | null
  creadoEn: string
  _count: { comentarios: number }
  estudiante: { id: number; nombre: string; apellido: string; fotoUrl: string | null; especialidad: string } | null
  empresa: { id: number; nombre: string; rubro: string; logoUrl: string | null } | null
}

type Comentario = {
  id: number
  contenido: string
  autorTipo: 'ESTUDIANTE' | 'EMPRESA' | 'ADMINISTRADOR'
  estudianteId: number | null
  empresaId: number | null
  administradorId: number | null
  creadoEn: string
  estudiante: { id: number; nombre: string; apellido: string; fotoUrl: string | null } | null
  empresa: { id: number; nombre: string; logoUrl: string | null } | null
  administrador: { id: number; nombre: string; colegio: { nombre: string; logoUrl: string | null } } | null
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

type PostulanteOferta = {
  id: number
  estado: string
  creadoEn: string
  estudiante: Estudiante
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
  // Editar perfil empresa
  const [mostrarEditarPerfil, setMostrarEditarPerfil] = useState(false)
  const [editDesc, setEditDesc] = useState("")
  const [editLogo, setEditLogo] = useState("")
  const [editRubro, setEditRubro] = useState("")
  const [guardandoPerfil, setGuardandoPerfil] = useState(false)
  // Vista activa: buscar talento o mis ofertas
  const [vistaActiva, setVistaActiva] = useState<"buscar" | "ofertas" | "feed">("buscar")
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
  // Chat con el colegio
  const [panelChatAbierto, setPanelChatAbierto] = useState(false)
  const [mensajesNoLeidos, setMensajesNoLeidos] = useState(0)
  // Ver postulantes de una oferta
  const [ofertaPostulantesId, setOfertaPostulantesId] = useState<number | null>(null)
  const [postulantes, setPostulantes] = useState<PostulanteOferta[]>([])
  const [cargandoPostulantes, setCargandoPostulantes] = useState(false)

  // Feed compartido
  const [posts, setPosts] = useState<PostFeed[]>([])
  const [cargandoPosts, setCargandoPosts] = useState(false)
  const [postsCargados, setPostsCargados] = useState(false)

  // Comentarios inline por post
  const [comentariosAbiertos, setComentariosAbiertos] = useState<Set<number>>(new Set())
  const [comentariosPorPost, setComentariosPorPost] = useState<Record<number, Comentario[]>>({})
  const [textosComentario, setTextosComentario] = useState<Record<number, string>>({})
  const [enviandoComentario, setEnviandoComentario] = useState<Set<number>>(new Set())

  // Crear publicación en el feed
  const [mostrarCrearPost, setMostrarCrearPost] = useState(false)
  const [textoPost, setTextoPost] = useState("")
  const [enviandoPost, setEnviandoPost] = useState(false)
  const [archivoMedia, setArchivoMedia] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [subiendoMedia, setSubiendoMedia] = useState(false)
  const refInputArchivo = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Carga el perfil real de la empresa autenticada
    if (!sesion) return
    fetch(`${API_URL}/api/empresas/me`, {
      headers: { Authorization: `Bearer ${sesion.token}` },
    })
      .then(res => res.json())
      .then(datos => setPerfil(datos))
      .catch(() => {})

    // Cargar count de mensajes no leídos del colegio
    if (sesion) {
      fetch(`${API_URL}/api/mensajes`, {
        headers: { Authorization: `Bearer ${sesion.token}` },
      })
        .then(res => res.json())
        .then((datos: { autorTipo: string; leido: boolean }[]) => {
          if (Array.isArray(datos)) {
            setMensajesNoLeidos(datos.filter(m => m.autorTipo === 'ADMINISTRADOR' && !m.leido).length)
          }
        })
        .catch(() => {})
    }
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

  useEffect(() => {
    if (vistaActiva !== "feed" || postsCargados) return
    setCargandoPosts(true)
    fetch(`${API_URL}/api/posts`)
      .then(res => res.json())
      .then((datos: PostFeed[]) => {
        setPosts(datos)
        setPostsCargados(true)
        setCargandoPosts(false)
      })
      .catch(() => setCargandoPosts(false))
  }, [vistaActiva])

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

  const verPostulantes = async (ofertaId: number) => {
    if (!sesion) return
    setOfertaPostulantesId(ofertaId)
    setCargandoPostulantes(true)
    setPostulantes([])
    try {
      const res = await fetch(`${API_URL}/api/postulaciones/oferta/${ofertaId}`, {
        headers: { Authorization: `Bearer ${sesion.token}` },
      })
      const datos = await res.json()
      setPostulantes(Array.isArray(datos) ? datos : [])
    } catch {
      toast.error('Error al cargar postulantes')
    } finally {
      setCargandoPostulantes(false)
    }
  }

  const seleccionarArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0]
    if (!archivo) return
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setArchivoMedia(archivo)
    setPreviewUrl(archivo.type.startsWith('image/') ? URL.createObjectURL(archivo) : null)
  }

  const quitarMedia = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setArchivoMedia(null)
    setPreviewUrl(null)
    if (refInputArchivo.current) refInputArchivo.current.value = ""
  }

  const publicarEnFeed = async () => {
    if (!textoPost.trim() || !sesion) return
    setEnviandoPost(true)
    try {
      let mediaUrl: string | null = null
      let mediaType: 'IMAGEN' | 'VIDEO' | null = null

      if (archivoMedia) {
        const resultado = await subirMedia(archivoMedia, 'EMPRESA', sesion.id, setSubiendoMedia)
        mediaUrl = resultado.url
        mediaType = resultado.tipo
      }

      const body: Record<string, unknown> = { contenido: textoPost.trim() }
      if (mediaUrl) { body.mediaUrl = mediaUrl; body.mediaType = mediaType }

      const res = await fetch(`${API_URL}/api/posts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sesion.token}`,
        },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const nuevoPost: PostFeed = await res.json()
        setPosts(prev => [nuevoPost, ...prev])
        setTextoPost("")
        quitarMedia()
        setMostrarCrearPost(false)
      } else {
        toast.error("No se pudo publicar. Inténtalo de nuevo.")
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al publicar")
    } finally {
      setEnviandoPost(false)
      setSubiendoMedia(false)
    }
  }

  async function toggleComentarios(postId: number) {
    if (comentariosAbiertos.has(postId)) {
      setComentariosAbiertos(prev => { const s = new Set(prev); s.delete(postId); return s })
      return
    }
    if (!comentariosPorPost[postId]) {
      try {
        const res = await fetch(`${API_URL}/api/posts/${postId}/comentarios`)
        const datos: Comentario[] = await res.json()
        setComentariosPorPost(prev => ({ ...prev, [postId]: datos }))
      } catch {
        setComentariosPorPost(prev => ({ ...prev, [postId]: [] }))
      }
    }
    setComentariosAbiertos(prev => new Set(prev).add(postId))
  }

  async function enviarComentario(postId: number) {
    const contenido = (textosComentario[postId] ?? '').trim()
    if (!contenido || !sesion) return
    setEnviandoComentario(prev => new Set(prev).add(postId))
    try {
      const res = await fetch(`${API_URL}/api/posts/${postId}/comentarios`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sesion.token}`,
        },
        body: JSON.stringify({ contenido }),
      })
      if (!res.ok) return
      const nuevo: Comentario = await res.json()
      setComentariosPorPost(prev => ({ ...prev, [postId]: [...(prev[postId] ?? []), nuevo] }))
      setTextosComentario(prev => ({ ...prev, [postId]: '' }))
      setPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, _count: { comentarios: p._count.comentarios + 1 } } : p
      ))
    } finally {
      setEnviandoComentario(prev => { const s = new Set(prev); s.delete(postId); return s })
    }
  }

  async function eliminarComentario(postId: number, comentarioId: number) {
    if (!sesion) return
    try {
      const res = await fetch(`${API_URL}/api/posts/${postId}/comentarios/${comentarioId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${sesion.token}` },
      })
      if (!res.ok) return
      setComentariosPorPost(prev => ({
        ...prev,
        [postId]: (prev[postId] ?? []).filter(c => c.id !== comentarioId),
      }))
      setPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, _count: { comentarios: Math.max(0, p._count.comentarios - 1) } } : p
      ))
    } catch {}
  }

  async function eliminarPost(postId: number) {
    if (!sesion) return
    try {
      const res = await fetch(`${API_URL}/api/posts/${postId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${sesion.token}` },
      })
      if (!res.ok) return
      setPosts(prev => prev.filter(p => p.id !== postId))
    } catch {}
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
              <button
                onClick={() => setVistaActiva("feed")}
                className={`flex items-center gap-1.5 transition-colors ${vistaActiva === "feed" ? "text-white font-semibold" : "text-white/70 hover:text-white"}`}
              >
                <Home className="w-4 h-4" />
                <span className="text-sm">Feed</span>
              </button>
              <button className="flex items-center gap-1.5 text-white/70 hover:text-white transition-colors">
                <Bookmark className="w-4 h-4" />
                <span>Guardados</span>
              </button>
              <button
                onClick={() => { setPanelChatAbierto(true); setMensajesNoLeidos(0) }}
                className="relative flex items-center gap-1.5 text-white/70 hover:text-white transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Mensajes</span>
                {mensajesNoLeidos > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-[#F97316] text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold leading-none">
                    {mensajesNoLeidos}
                  </span>
                )}
              </button>
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
                    onClick={() => { setPanelChatAbierto(true); setMensajesNoLeidos(0) }}
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

          {/* ── VISTA: FEED ────────────────────────────────────────── */}
          {vistaActiva === "feed" && (
            <div className="space-y-4">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex gap-3 items-center">
                    <Avatar className="w-10 h-10 shrink-0">
                      {perfil?.logoUrl && <AvatarImage src={perfil.logoUrl} />}
                      <AvatarFallback>{perfil?.nombre[0] ?? "?"}</AvatarFallback>
                    </Avatar>
                    <button
                      onClick={() => setMostrarCrearPost(true)}
                      className="flex-1 text-left px-4 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl text-sm text-gray-400 transition-colors"
                    >
                      ¿Qué quieres compartir sobre tu empresa?
                    </button>
                  </div>
                </CardContent>
              </Card>

              {cargandoPosts && (
                <div className="flex items-center justify-center py-12 text-gray-400 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Cargando publicaciones...</span>
                </div>
              )}

              {!cargandoPosts && postsCargados && posts.length === 0 && (
                <Card className="border-0 shadow-sm">
                  <CardContent className="py-12 text-center text-gray-400">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Aún no hay publicaciones en el feed.</p>
                  </CardContent>
                </Card>
              )}

              {posts.map(post => {
                const diff = Date.now() - new Date(post.creadoEn).getTime()
                const min = Math.floor(diff / 60000)
                const tiempo = min < 1 ? "Ahora mismo"
                  : min < 60 ? `Hace ${min} min`
                  : min < 1440 ? `Hace ${Math.floor(min / 60)}h`
                  : `Hace ${Math.floor(min / 1440)} día${Math.floor(min / 1440) > 1 ? "s" : ""}`

                const nombreAutor = post.autorTipo === 'ESTUDIANTE'
                  ? `${post.estudiante?.nombre} ${post.estudiante?.apellido}`
                  : (post.empresa?.nombre ?? "—")
                const subtituloAutor = post.autorTipo === 'ESTUDIANTE'
                  ? post.estudiante?.especialidad ?? ""
                  : post.empresa?.rubro ?? ""
                const fotoAutor = post.autorTipo === 'ESTUDIANTE'
                  ? post.estudiante?.fotoUrl
                  : post.empresa?.logoUrl

                return (
                  <Card key={post.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex gap-3 mb-3 items-start">
                        <Avatar className="w-10 h-10 shrink-0">
                          {fotoAutor && <AvatarImage src={fotoAutor} />}
                          <AvatarFallback>{nombreAutor[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm text-gray-900">{nombreAutor}</h4>
                          <p className="text-xs text-gray-400 mt-0.5">{subtituloAutor} · {tiempo}</p>
                        </div>
                        {(
                          (post.autorTipo === 'EMPRESA' && post.empresaId === perfil?.id) ||
                          sesion?.rol === 'ADMINISTRADOR'
                        ) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-600 gap-2"
                                onClick={() => eliminarPost(post.id)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Eliminar publicación
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>

                      <p className="text-sm text-gray-700 leading-relaxed">{post.contenido}</p>

                      {post.mediaUrl && post.mediaType === 'IMAGEN' && (
                        <div className="mt-3 rounded-xl overflow-hidden border border-gray-100">
                          <img src={post.mediaUrl} alt="Imagen del post" className="w-full max-h-80 object-cover" loading="lazy" />
                        </div>
                      )}
                      {post.mediaUrl && post.mediaType === 'VIDEO' && (
                        <div className="mt-3 rounded-xl overflow-hidden border border-gray-100">
                          <video src={post.mediaUrl} controls className="w-full max-h-80" />
                        </div>
                      )}

                      <div className="flex items-center gap-1 pt-3 mt-3 border-t border-gray-50">
                        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-gray-500 hover:text-[#0F172A] hover:bg-[#DBEAFE]/50 transition-all text-xs font-medium flex-1 justify-center">
                          <ThumbsUp className="w-3.5 h-3.5" />
                          <span>Me gusta</span>
                        </button>
                        <button
                          onClick={() => toggleComentarios(post.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all text-xs font-medium flex-1 justify-center ${
                            comentariosAbiertos.has(post.id)
                              ? "text-[#2563EB] bg-[#DBEAFE]/50"
                              : "text-gray-500 hover:text-[#0F172A] hover:bg-[#DBEAFE]/50"
                          }`}
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>{post._count?.comentarios ?? 0}</span>
                        </button>
                        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-gray-500 hover:text-[#0F172A] hover:bg-[#DBEAFE]/50 transition-all text-xs font-medium flex-1 justify-center">
                          <Share2 className="w-3.5 h-3.5" />
                          <span>Compartir</span>
                        </button>
                      </div>

                      {comentariosAbiertos.has(post.id) && (
                        <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                          {(comentariosPorPost[post.id] ?? []).length === 0 && (
                            <p className="text-xs text-gray-400 text-center py-2">Sé el primero en comentar</p>
                          )}
                          {(comentariosPorPost[post.id] ?? []).map(c => {
                            const nombreC = c.autorTipo === 'ESTUDIANTE'
                              ? `${c.estudiante?.nombre} ${c.estudiante?.apellido}`
                              : c.autorTipo === 'EMPRESA'
                              ? c.empresa?.nombre ?? "—"
                              : c.administrador?.colegio?.nombre ?? "Colegio"
                            const fotoC = c.autorTipo === 'ESTUDIANTE'
                              ? c.estudiante?.fotoUrl
                              : c.autorTipo === 'EMPRESA'
                              ? c.empresa?.logoUrl
                              : c.administrador?.colegio?.logoUrl
                            const esMioC =
                              (c.autorTipo === 'EMPRESA' && c.empresaId === perfil?.id) ||
                              sesion?.rol === 'ADMINISTRADOR'
                            const diffC = Date.now() - new Date(c.creadoEn).getTime()
                            const minC = Math.floor(diffC / 60000)
                            const tiempoC = minC < 1 ? "Ahora" : minC < 60 ? `${minC}m` : minC < 1440 ? `${Math.floor(minC / 60)}h` : `${Math.floor(minC / 1440)}d`
                            return (
                              <div key={c.id} className="flex gap-2 group">
                                <Avatar className="w-7 h-7 shrink-0">
                                  {fotoC && <AvatarImage src={fotoC} />}
                                  <AvatarFallback className="text-xs">{nombreC[0]}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-semibold text-gray-800">{nombreC}</span>
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs text-gray-400">{tiempoC}</span>
                                      {esMioC && (
                                        <button
                                          onClick={() => eliminarComentario(post.id, c.id)}
                                          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-gray-400 hover:text-red-500"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  <p className="text-xs text-gray-700 mt-0.5">{c.contenido}</p>
                                </div>
                              </div>
                            )
                          })}
                          <div className="flex gap-2 items-center">
                            <Avatar className="w-7 h-7 shrink-0">
                              {perfil?.logoUrl && <AvatarImage src={perfil.logoUrl} />}
                              <AvatarFallback className="text-xs">{perfil?.nombre[0] ?? "?"}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 flex gap-2">
                              <input
                                type="text"
                                value={textosComentario[post.id] ?? ''}
                                onChange={e => setTextosComentario(prev => ({ ...prev, [post.id]: e.target.value }))}
                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarComentario(post.id) } }}
                                placeholder="Escribe un comentario..."
                                className="flex-1 text-xs px-3 py-1.5 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/20"
                              />
                              <button
                                onClick={() => enviarComentario(post.id)}
                                disabled={!textosComentario[post.id]?.trim() || enviandoComentario.has(post.id)}
                                className="p-1.5 rounded-xl bg-[#0F172A] text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#2563EB] transition-colors"
                              >
                                {enviandoComentario.has(post.id)
                                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  : <Send className="w-3.5 h-3.5" />
                                }
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

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

                            {oferta._count.postulaciones > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full h-8 text-xs rounded-lg gap-1.5 border-[#DBEAFE] text-[#2563EB] hover:bg-[#DBEAFE]"
                                onClick={() => verPostulantes(oferta.id)}
                              >
                                <Users className="w-3.5 h-3.5" /> Ver postulantes
                              </Button>
                            )}

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
                onClick={async () => {
                  if (!sesion || !estudianteSel) return
                  try {
                    await fetch(`${API_URL}/api/contactos`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json", Authorization: `Bearer ${sesion.token}` },
                      body: JSON.stringify({ estudianteId: estudianteSel.id }),
                    })
                    toast.success("Contacto registrado correctamente")
                    setEstudianteSel(null)
                  } catch {
                    toast.error("Error al registrar el contacto")
                  }
                }}
              >
                <Mail className="w-4 h-4 mr-2" />
                Contactar estudiante
              </Button>
            </div>
          </DialogContent>
        )}
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

      {/* ── DIÁLOGO: Postulantes de una oferta ─────────────── */}
      <Dialog open={ofertaPostulantesId !== null} onOpenChange={abierto => { if (!abierto) { setOfertaPostulantesId(null); setPostulantes([]) } }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>Postulantes</DialogTitle>
          </DialogHeader>
          {cargandoPostulantes ? (
            <div className="py-10 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : postulantes.length === 0 ? (
            <div className="py-10 text-center text-gray-400">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Sin postulantes aún</p>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              {postulantes.map(p => (
                <div key={p.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                  <Avatar className="w-10 h-10 shrink-0">
                    {p.estudiante.fotoUrl && <AvatarImage src={p.estudiante.fotoUrl} />}
                    <AvatarFallback className={`bg-gradient-to-br ${gradienteAvatar(p.estudiante.nombre)} text-white font-bold text-sm`}>
                      {p.estudiante.nombre[0]}{p.estudiante.apellido[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate">{p.estudiante.nombre} {p.estudiante.apellido}</p>
                    <p className="text-xs text-gray-500">{p.estudiante.especialidad}</p>
                    {p.estudiante.habilidades.filter(h => h.validada).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {p.estudiante.habilidades.filter(h => h.validada).slice(0, 3).map(h => (
                          <span key={h.id} className="text-xs bg-[#DBEAFE] text-[#0F172A] px-2 py-0.5 rounded-full">{h.nombre}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs shrink-0"
                    onClick={() => {
                      setEstudianteSel(p.estudiante)
                      setOfertaPostulantesId(null)
                    }}
                  >
                    Ver perfil
                  </Button>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── DIÁLOGO: Crear publicación empresa ─────────────── */}
      <Dialog
        open={mostrarCrearPost}
        onOpenChange={open => {
          if (!open) { quitarMedia(); setTextoPost("") }
          setMostrarCrearPost(open)
        }}
      >
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>Crear publicación</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex gap-3 items-center">
              <Avatar className="w-10 h-10 shrink-0">
                {perfil?.logoUrl && <AvatarImage src={perfil.logoUrl} />}
                <AvatarFallback>{perfil?.nombre[0] ?? "?"}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-sm text-gray-900">{perfil?.nombre ?? "—"}</p>
                <p className="text-xs text-gray-400">{perfil?.rubro ?? "—"}</p>
              </div>
            </div>

            <Textarea
              placeholder="¿Qué quieres compartir sobre tu empresa?"
              rows={4}
              value={textoPost}
              onChange={e => setTextoPost(e.target.value)}
              className="resize-none"
              autoFocus
            />

            {previewUrl && (
              <div className="relative rounded-xl overflow-hidden border border-gray-100">
                <img src={previewUrl} alt="preview" className="w-full max-h-48 object-cover" />
                <button
                  onClick={quitarMedia}
                  className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {archivoMedia && !previewUrl && (
              <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 text-sm text-gray-700">
                <ImageIcon className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="truncate flex-1">{archivoMedia.name}</span>
                <button onClick={quitarMedia} className="text-gray-400 hover:text-gray-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {subiendoMedia && (
              <div className="space-y-1">
                <p className="text-xs text-gray-400">Subiendo archivo...</p>
                <Progress value={undefined} className="h-1.5 animate-pulse" />
              </div>
            )}

            <input
              ref={refInputArchivo}
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
              className="hidden"
              onChange={seleccionarArchivo}
            />

            <div className="flex gap-2 justify-between items-center">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => refInputArchivo.current?.click()}
                className="text-gray-500 hover:text-[#0F172A] gap-1.5"
                disabled={subiendoMedia || enviandoPost}
              >
                <Paperclip className="w-4 h-4" />
                <span className="text-xs">Adjuntar foto/video</span>
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { quitarMedia(); setTextoPost(""); setMostrarCrearPost(false) }}>
                  Cancelar
                </Button>
                <Button
                  className="bg-[#0F172A] hover:bg-[#2563EB] text-white"
                  onClick={publicarEnFeed}
                  disabled={!textoPost.trim() || enviandoPost || subiendoMedia}
                >
                  {(enviandoPost || subiendoMedia) ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Publicar
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── PANEL: Chat con el Colegio ──────────────────────── */}
      {sesion && perfil && (
        <PanelChat
          abierto={panelChatAbierto}
          onCerrar={() => setPanelChatAbierto(false)}
          empresaId={perfil.id}
          autorActual="EMPRESA"
          nombreContraparte="Colegio Cardenal José María Caro"
          token={sesion.token}
        />
      )}
    </div>
  )
}
