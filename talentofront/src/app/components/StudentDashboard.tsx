import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import {
  Bell, Search, Home, Users, Briefcase, MessageSquare,
  Plus, ThumbsUp, MessageCircle, Share2, Download, Sparkles,
  LogOut, User, Check, Loader2, ClipboardList, Award, Pencil,
  Building2, CheckCircle2, X, Mail, Paperclip, ImageIcon
} from "lucide-react";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent } from "./ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { useAuth } from "../context/AuthContext";
import logoImage from "../../assets/17a2f6b30bc584421f868b1534160753545e9968.png";
import { subirMedia } from "../../lib/supabase";
import { Progress } from "./ui/progress";

type PostFeed = {
  id: number
  contenido: string
  mediaUrl: string | null
  mediaType: 'IMAGEN' | 'VIDEO' | null
  autorTipo: 'ESTUDIANTE' | 'EMPRESA' | 'ADMINISTRADOR'
  creadoEn: string
  estudiante: {
    id: number
    nombre: string
    apellido: string
    fotoUrl: string | null
    especialidad: string
  } | null
  empresa: {
    id: number
    nombre: string
    rubro: string
    logoUrl: string | null
  } | null
}
type Oferta = { id: number; titulo: string; especialidad: string }
type Empresa = {
  id: number
  nombre: string
  rubro: string
  logoUrl: string | null
  ofertas: Oferta[]
}
type OfertaPublica = {
  id: number
  titulo: string
  descripcion: string
  especialidad: string
  creadoEn: string
  empresa: { id: number; nombre: string; rubro: string; logoUrl: string | null }
  _count: { postulaciones: number }
}
type PerfilEstudiante = {
  id: number
  nombre: string
  apellido: string
  especialidad: string
  descripcion: string | null
  fotoUrl: string | null
  disponible: boolean
  tipoDisponibilidad: "PASANTIA" | "FREELANCE" | "AMBOS"
  habilidades: { id: number; nombre: string; validada: boolean }[]
  certificaciones: { id: number; nombre: string; institucion: string | null; validada: boolean }[]
}
type ContactoRecibido = {
  id: number
  creadoEn: string
  mensaje: string | null
  nombreRemitente: string | null
  emailRemitente: string | null
  empresa: { nombre: string; logoUrl: string | null } | null
}
type Postulacion = {
  id: number
  estado: "PENDIENTE" | "ACEPTADA" | "RECHAZADA"
  creadoEn: string
  actualizadoEn: string
  oferta: {
    id: number
    titulo: string
    empresa: { id: number; nombre: string; logoUrl: string | null }
  }
}

const API_URL = import.meta.env.VITE_API_URL


export function StudentDashboard() {
  const { sesion, cerrarSesion } = useAuth()
  const navegar = useNavigate()
  const [perfil, setPerfil] = useState<PerfilEstudiante | null>(null)
  const [misPostulaciones, setMisPostulaciones] = useState<Postulacion[]>([])
  const [misContactos, setMisContactos] = useState<ContactoRecibido[]>([])
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  // Posts del feed (cargados desde la API)
  const [posts, setPosts] = useState<PostFeed[]>([])
  const [cargandoPosts, setCargandoPosts] = useState(true)
  const [likesActivos, setLikesActivos] = useState<Set<number>>(() => {
    const clave = `impulsa_likes_${sesion?.id}`
    try {
      const guardado = localStorage.getItem(clave)
      return guardado ? new Set<number>(JSON.parse(guardado)) : new Set<number>()
    } catch {
      return new Set<number>()
    }
  })
  // Estado de postulaciones enviadas (inicializado con las ya existentes en BD)
  const [postuladas, setPostuladas] = useState<Set<number>>(new Set())
  const [postulando, setPostulando] = useState<number | null>(null)
  // Crear publicación
  const [mostrarCrearPost, setMostrarCrearPost] = useState(false)
  const [textoPost, setTextoPost] = useState("")
  const [enviandoPost, setEnviandoPost] = useState(false)
  // Estado para adjuntar media al post
  const [archivoMedia, setArchivoMedia] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [subiendoMedia, setSubiendoMedia] = useState(false)
  const refInputArchivo = useRef<HTMLInputElement>(null)
  // Editar perfil propio
  const [mostrarEditarPerfil, setMostrarEditarPerfil] = useState(false)
  const [editDesc, setEditDesc] = useState("")
  const [editFoto, setEditFoto] = useState("")
  const [editTipoDisponibilidad, setEditTipoDisponibilidad] = useState<"PASANTIA" | "FREELANCE" | "AMBOS">("PASANTIA")
  const [guardandoPerfil, setGuardandoPerfil] = useState(false)
  // Agregar habilidad o certificación
  const [tipoAgregar, setTipoAgregar] = useState<"habilidad" | "certificacion" | null>(null)
  const [nuevoNombre, setNuevoNombre] = useState("")
  const [nuevaInstitucion, setNuevaInstitucion] = useState("")
  const [nuevaFecha, setNuevaFecha] = useState("")
  const [guardandoItem, setGuardandoItem] = useState(false)
  // Notificaciones de cambios en postulaciones desde la última visita
  const [notifPostulaciones, setNotifPostulaciones] = useState(0)
  // Timestamp de la visita anterior (para marcar items individuales en el render)
  const [tsUltimaVisita, setTsUltimaVisita] = useState<number | null>(null)
  // Vista activa: feed o búsqueda de ofertas
  const [vistaActiva, setVistaActiva] = useState<"feed" | "ofertas">("feed")
  const [ofertasPublicas, setOfertasPublicas] = useState<OfertaPublica[]>([])
  const [cargandoOfertas, setCargandoOfertas] = useState(false)
  const [ofertasCargadas, setOfertasCargadas] = useState(false)
  const [ofertasBusqueda, setOfertasBusqueda] = useState("")
  const [filtroEsp, setFiltroEsp] = useState("")

  useEffect(() => {
    if (!sesion) return
    const headers = { Authorization: `Bearer ${sesion.token}` }

    // Carga el perfil real del estudiante autenticado
    fetch(`${API_URL}/api/estudiantes/me`, { headers })
      .then(res => res.json())
      .then(datos => setPerfil(datos))
      .catch(() => {})

    // Carga las postulaciones ya enviadas para inicializar estado y mostrar "Mis Postulaciones"
    fetch(`${API_URL}/api/postulaciones/me`, { headers })
      .then(res => res.json())
      .then((datos: Postulacion[]) => {
        setMisPostulaciones(datos)
        setPostuladas(new Set(datos.map(p => p.oferta.id)))

        // Detecta cambios de estado desde la última visita
        const claveStorage = `impulsa_postulaciones_visto_${sesion?.id}`
        const ultimaVista = localStorage.getItem(claveStorage)
        if (ultimaVista) {
          const ts = new Date(ultimaVista).getTime()
          setTsUltimaVisita(ts)
          const cambios = datos.filter(p =>
            new Date(p.actualizadoEn).getTime() > ts &&
            new Date(p.actualizadoEn).getTime() > new Date(p.creadoEn).getTime()
          ).length
          setNotifPostulaciones(cambios)
        }
        // Guarda el timestamp actual para comparar en la próxima visita
        localStorage.setItem(claveStorage, new Date().toISOString())
      })
      .catch(() => {})

    fetch(`${API_URL}/api/empresas`)
      .then(res => res.json())
      .then(datos => setEmpresas(datos))
      .catch(() => {})

    // Carga los contactos recibidos por el estudiante
    fetch(`${API_URL}/api/contactos/me`, { headers })
      .then(res => res.json())
      .then((datos: ContactoRecibido[]) => setMisContactos(datos))
      .catch(() => {})

    // Carga los posts del feed
    fetch(`${API_URL}/api/posts`)
      .then(res => res.json())
      .then((datos: PostFeed[]) => { setPosts(datos); setCargandoPosts(false) })
      .catch(() => setCargandoPosts(false))
  }, [])

  // Carga el directorio de ofertas la primera vez que se entra a esa vista
  useEffect(() => {
    if (vistaActiva !== "ofertas" || ofertasCargadas) return
    setCargandoOfertas(true)
    fetch(`${API_URL}/api/ofertas`)
      .then(res => res.json())
      .then((datos: OfertaPublica[]) => {
        setOfertasPublicas(datos)
        setOfertasCargadas(true)
        setCargandoOfertas(false)
      })
      .catch(() => setCargandoOfertas(false))
  }, [vistaActiva])

  const ofertasDisponibles = empresas.flatMap(emp =>
    emp.ofertas.map(oferta => ({ ...oferta, empresa: emp }))
  )

  // Ofertas filtradas localmente en la vista de búsqueda
  const ofertasFiltradas = ofertasPublicas.filter(o => {
    const textoBusqueda = ofertasBusqueda.toLowerCase()
    const coincideTexto = !textoBusqueda ||
      o.titulo.toLowerCase().includes(textoBusqueda) ||
      o.descripcion.toLowerCase().includes(textoBusqueda) ||
      o.empresa.nombre.toLowerCase().includes(textoBusqueda)
    const coincideEsp = !filtroEsp || o.especialidad === filtroEsp
    return coincideTexto && coincideEsp
  })

  const alternarLike = (postId: number) => {
    setLikesActivos(prev => {
      const siguiente = new Set(prev)
      if (siguiente.has(postId)) {
        siguiente.delete(postId)
      } else {
        siguiente.add(postId)
      }
      // Persiste en localStorage
      const clave = `impulsa_likes_${sesion?.id}`
      localStorage.setItem(clave, JSON.stringify([...siguiente]))
      return siguiente
    })
  }

  const compartirPost = async (post: PostFeed) => {
    const autor = post.autorTipo === 'ESTUDIANTE'
      ? `${post.estudiante?.nombre} ${post.estudiante?.apellido}`
      : (post.empresa?.nombre ?? "Empresa")
    try {
      await navigator.share({ title: autor, text: post.contenido })
    } catch {
      await navigator.clipboard.writeText(post.contenido)
    }
  }

  const postular = async (ofertaId: number) => {
    if (!sesion) {
      navegar("/login")
      return
    }
    setPostulando(ofertaId)
    try {
      const res = await fetch(`${API_URL}/api/postulaciones`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sesion.token}`,
        },
        body: JSON.stringify({ ofertaId }),
      })
      if (res.ok) {
        const nuevaPostulacion: Postulacion = await res.json()
        // Busca datos de la oferta: primero en el sidebar, luego en la vista de búsqueda
        const ofertaSidebar = ofertasDisponibles.find(o => o.id === ofertaId)
        const ofertaBusqueda = ofertasPublicas.find(o => o.id === ofertaId)
        const empresa = ofertaSidebar?.empresa ?? ofertaBusqueda?.empresa
        if (empresa) {
          const postulacionEnriquecida: Postulacion = {
            ...nuevaPostulacion,
            oferta: {
              id: ofertaId,
              titulo: ofertaSidebar?.titulo ?? ofertaBusqueda?.titulo ?? "",
              empresa: { id: empresa.id, nombre: empresa.nombre, logoUrl: empresa.logoUrl },
            },
          }
          setMisPostulaciones(prev => [postulacionEnriquecida, ...prev])
        }
        setPostuladas(prev => new Set(prev).add(ofertaId))
        toast.success("¡Postulación enviada!")
      } else if (res.status === 409) {
        // Ya postulada desde otra sesión
        setPostuladas(prev => new Set(prev).add(ofertaId))
        toast.info("Ya estabas postulado a esta oferta")
      }
    } catch {
      // Error de red — igual marcamos para UX optimista
    } finally {
      setPostulando(null)
    }
  }

  const publicar = async () => {
    if (!textoPost.trim() || !sesion) return
    setEnviandoPost(true)
    try {
      let mediaUrl: string | null = null
      let mediaType: 'IMAGEN' | 'VIDEO' | null = null

      if (archivoMedia) {
        const resultado = await subirMedia(
          archivoMedia,
          'ESTUDIANTE',
          sesion.id,
          setSubiendoMedia
        )
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
        setArchivoMedia(null)
        setPreviewUrl(null)
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

  const seleccionarArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0]
    if (!archivo) return
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setArchivoMedia(archivo)
    if (archivo.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(archivo))
    } else {
      setPreviewUrl(null)
    }
  }

  const quitarMedia = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setArchivoMedia(null)
    setPreviewUrl(null)
    if (refInputArchivo.current) refInputArchivo.current.value = ""
  }

  const cerrarDialogoAgregar = () => {
    setTipoAgregar(null)
    setNuevoNombre("")
    setNuevaInstitucion("")
    setNuevaFecha("")
  }

  const agregarItem = async () => {
    if (!sesion || !nuevoNombre.trim() || !tipoAgregar) return

    // Bloquear duplicados de habilidades
    if (tipoAgregar === "habilidad" && perfil) {
      const duplicado = perfil.habilidades.some(
        h => h.nombre.toLowerCase() === nuevoNombre.trim().toLowerCase()
      )
      if (duplicado) {
        toast.error("Ya tienes esta habilidad registrada")
        return
      }
    }

    setGuardandoItem(true)

    const url = tipoAgregar === "habilidad"
      ? `${API_URL}/api/estudiantes/habilidades/me`
      : `${API_URL}/api/estudiantes/certificaciones/me`

    const body: Record<string, string> = { nombre: nuevoNombre.trim() }
    if (tipoAgregar === "certificacion") {
      if (nuevaInstitucion.trim()) body.institucion = nuevaInstitucion.trim()
      if (nuevaFecha) body.fechaObtencion = nuevaFecha
    }

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sesion.token}`,
        },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const nuevo = await res.json()
        setPerfil(prev => {
          if (!prev) return prev
          if (tipoAgregar === "habilidad") {
            return { ...prev, habilidades: [...prev.habilidades, nuevo] }
          } else {
            return { ...prev, certificaciones: [...prev.certificaciones, nuevo] }
          }
        })
        cerrarDialogoAgregar()
        toast.success(tipoAgregar === "habilidad" ? "Habilidad agregada" : "Certificación agregada")
      }
    } catch {
      // Error de red
    } finally {
      setGuardandoItem(false)
    }
  }

  const eliminarItem = async (tipo: "habilidad" | "certificacion", id: number) => {
    if (!sesion) return
    const url = tipo === "habilidad"
      ? `${API_URL}/api/estudiantes/habilidades/${id}`
      : `${API_URL}/api/estudiantes/certificaciones/${id}`

    try {
      const res = await fetch(url, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${sesion.token}` },
      })
      if (res.ok || res.status === 204) {
        setPerfil(prev => {
          if (!prev) return prev
          if (tipo === "habilidad") {
            return { ...prev, habilidades: prev.habilidades.filter(h => h.id !== id) }
          } else {
            return { ...prev, certificaciones: prev.certificaciones.filter(c => c.id !== id) }
          }
        })
        toast.success(tipo === "habilidad" ? "Habilidad eliminada" : "Certificación eliminada")
      }
    } catch {
      // Error de red
    }
  }

  const abrirEditarPerfil = () => {
    setEditDesc(perfil?.descripcion ?? "")
    setEditFoto(perfil?.fotoUrl ?? "")
    setEditTipoDisponibilidad(perfil?.tipoDisponibilidad ?? "PASANTIA")
    setMostrarEditarPerfil(true)
  }

  const guardarPerfil = async () => {
    if (!sesion) return
    setGuardandoPerfil(true)
    try {
      const res = await fetch(`${API_URL}/api/estudiantes/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${sesion.token}` },
        body: JSON.stringify({ descripcion: editDesc, fotoUrl: editFoto, tipoDisponibilidad: editTipoDisponibilidad }),
      })
      if (res.ok) {
        const actualizado = await res.json()
        setPerfil(actualizado)
        setMostrarEditarPerfil(false)
      }
    } catch {
      // Error de red
    } finally {
      setGuardandoPerfil(false)
    }
  }

  const descargarCV = () => {
    window.print()
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
                onClick={() => setVistaActiva("feed")}
                className={`flex items-center gap-1.5 transition-colors ${vistaActiva === "feed" ? "text-white font-semibold" : "text-white/70 hover:text-white"}`}
              >
                <Home className="w-4 h-4" />
                <span>Inicio</span>
              </button>
              <button
                onClick={() => setVistaActiva("ofertas")}
                className={`flex items-center gap-1.5 transition-colors ${vistaActiva === "ofertas" ? "text-white font-semibold" : "text-white/70 hover:text-white"}`}
              >
                <Briefcase className="w-4 h-4" />
                <span>Oportunidades</span>
              </button>
              <Link to="#" className="flex items-center gap-1.5 text-white/70 hover:text-white transition-colors">
                <Users className="w-4 h-4" />
                <span>Red</span>
              </Link>
              <Link to="#" className="flex items-center gap-1.5 text-white/70 hover:text-white transition-colors">
                <MessageSquare className="w-4 h-4" />
                <span>Mensajes</span>
              </Link>
            </div>
          </div>
          <div className="flex-1 max-w-sm mx-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <Input
                placeholder="Buscar..."
                className="pl-9 bg-white/10 border-white/15 text-white placeholder:text-white/40 text-sm h-9 rounded-lg focus-visible:ring-white/30"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="relative p-1.5 hover:bg-white/10 rounded-lg transition-colors"
              onClick={() => setNotifPostulaciones(0)}
              title={notifPostulaciones > 0 ? `${notifPostulaciones} postulación${notifPostulaciones > 1 ? "es" : ""} actualizada${notifPostulaciones > 1 ? "s" : ""}` : "Notificaciones"}
            >
              <Bell className="w-5 h-5" />
              {notifPostulaciones > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-[#F97316] rounded-full flex items-center justify-center text-[10px] font-bold text-white px-0.5">
                  {notifPostulaciones}
                </span>
              )}
            </button>

            {/* Avatar con menú */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="w-8 h-8 border-2 border-white/30 cursor-pointer">
                  {perfil?.fotoUrl && <AvatarImage src={perfil.fotoUrl} />}
                  <AvatarFallback className="bg-white/20 text-white text-xs">
                    {perfil?.nombre[0] ?? "?"}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-3 py-2 text-sm font-medium text-gray-900">
                  {perfil ? `${perfil.nombre} ${perfil.apellido}` : "—"}
                </div>
                <div className="px-3 pb-2 text-xs text-gray-500">{perfil?.especialidad ?? "—"}</div>
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

      {/* ── VISTA: Oportunidades (búsqueda de ofertas) ──────── */}
      {vistaActiva === "ofertas" && (
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Oportunidades de pasantía</h2>
              <p className="text-sm text-gray-500">Encuentra tu próxima pasantía técnica</p>
            </div>
          </div>

          {/* Buscador + filtro */}
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por título, empresa o descripción..."
                value={ofertasBusqueda}
                onChange={e => setOfertasBusqueda(e.target.value)}
                className="w-full pl-9 pr-4 h-10 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
              />
              {ofertasBusqueda && (
                <button onClick={() => setOfertasBusqueda("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Chips de especialidad */}
          <div className="flex flex-wrap gap-2 mb-5">
            {["", "Electricidad", "Mecánica Industrial", "Electrónica", "Refrigeración", "Informática"].map(esp => (
              <button
                key={esp}
                onClick={() => setFiltroEsp(esp)}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                  filtroEsp === esp
                    ? "bg-[#0F172A] text-white"
                    : "bg-white border border-gray-200 text-gray-600 hover:border-[#0F172A] hover:text-[#0F172A]"
                }`}
              >
                {esp || "Todas"}
              </button>
            ))}
          </div>

          {/* Resultados */}
          {cargandoOfertas && (
            <div className="flex items-center justify-center py-20 text-gray-400 gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Cargando ofertas...</span>
            </div>
          )}

          {ofertasCargadas && ofertasFiltradas.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">
                {ofertasBusqueda || filtroEsp ? "Sin resultados para los filtros aplicados" : "No hay ofertas disponibles"}
              </p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {ofertasFiltradas.map((oferta, i) => {
              const yaPostulo = postuladas.has(oferta.id)
              return (
                <motion.div
                  key={oferta.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                >
                  <Card className="border border-gray-100 shadow-sm rounded-2xl hover:shadow-md transition-shadow h-full">
                    <CardContent className="p-5 flex flex-col h-full">
                      {/* Cabecera empresa */}
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar className="w-10 h-10 rounded-xl shrink-0">
                          {oferta.empresa.logoUrl && <AvatarImage src={oferta.empresa.logoUrl} />}
                          <AvatarFallback className="rounded-xl bg-[#DBEAFE] text-[#0F172A] text-sm font-bold">
                            {oferta.empresa.nombre[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <button
                            onClick={() => navegar(`/empresas/${oferta.empresa.id}`)}
                            className="text-xs font-semibold text-gray-700 hover:text-[#2563EB] truncate block transition-colors"
                          >
                            {oferta.empresa.nombre}
                          </button>
                          <p className="text-xs text-gray-400">{oferta.empresa.rubro}</p>
                        </div>
                      </div>
                      {/* Título + especialidad */}
                      <h3 className="text-sm font-bold text-gray-900 mb-1">{oferta.titulo}</h3>
                      <Badge className="w-fit text-xs bg-[#DBEAFE] text-[#0F172A] border-0 hover:bg-[#DBEAFE] mb-2">
                        {oferta.especialidad}
                      </Badge>
                      <p className="text-xs text-gray-500 line-clamp-2 flex-1 mb-3">{oferta.descripcion}</p>
                      {/* Footer */}
                      <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-50">
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5" />
                          {oferta._count.postulaciones} postulaciones
                        </span>
                        {yaPostulo ? (
                          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Postulado
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => postular(oferta.id)}
                            disabled={postulando === oferta.id}
                            className="bg-[#F97316] hover:bg-[#EA580C] text-white text-xs h-7 rounded-lg px-3"
                          >
                            {postulando === oferta.id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : "Postular"}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── VISTA: Feed ─────────────────────────────────────── */}
      {vistaActiva === "feed" && (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-5">

          {/* ── SIDEBAR IZQUIERDO — Perfil ─────────────────── */}
          <aside className="col-span-12 lg:col-span-3">
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Card className="overflow-hidden border-0 shadow-sm">
                <div className="h-20 bg-gradient-to-br from-[#0F172A] to-[#2563EB] relative">
                  <div className="absolute inset-0 opacity-20"
                    style={{ backgroundImage: "radial-gradient(circle at 30% 50%, white 1px, transparent 1px)", backgroundSize: "20px 20px" }}
                  />
                </div>
                <CardContent className="pt-0 pb-5 px-5">
                  <div className="flex flex-col items-center -mt-10 text-center">
                    <Avatar className="w-20 h-20 border-4 border-white shadow-lg">
                      {perfil?.fotoUrl && <AvatarImage src={perfil.fotoUrl} />}
                      <AvatarFallback>{perfil?.nombre[0] ?? "?"}</AvatarFallback>
                    </Avatar>
                    <h3 className="mt-3 font-bold text-gray-900">
                      {perfil ? `${perfil.nombre} ${perfil.apellido}` : "—"}
                    </h3>
                    <p className="text-xs font-medium text-[#0F172A] uppercase tracking-wide mt-0.5">
                      {perfil?.especialidad ?? "—"}
                    </p>
                    <div className={`mt-3 px-3 py-1 rounded-full ${perfil?.disponible ? "bg-emerald-50" : "bg-gray-100"}`}>
                      <span className={`text-xs font-medium ${perfil?.disponible ? "text-emerald-700" : "text-gray-500"}`}>
                        {perfil?.disponible ? "● Disponible" : "● En pasantía"}
                      </span>
                    </div>
                  </div>

                  {/* Habilidades */}
                  <div className="mt-5">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Habilidades</h4>
                      <button
                        onClick={() => setTipoAgregar("habilidad")}
                        className="p-0.5 hover:bg-gray-100 rounded text-gray-400 hover:text-[#0F172A] transition-colors"
                        title="Agregar habilidad"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {perfil && perfil.habilidades.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {perfil.habilidades.map(hab => (
                          <span
                            key={hab.id}
                            className={`group flex items-center gap-1 text-xs pl-2.5 pr-1.5 py-1 rounded-full font-medium ${
                              hab.validada ? "bg-[#DBEAFE] text-[#2563EB]" : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {hab.nombre}
                            <button
                              onClick={() => eliminarItem("habilidad", hab.id)}
                              className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity rounded-full"
                              title="Eliminar"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">Sin habilidades aún</p>
                    )}
                  </div>

                  {/* Certificaciones */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Certificaciones</h4>
                      <button
                        onClick={() => setTipoAgregar("certificacion")}
                        className="p-0.5 hover:bg-gray-100 rounded text-gray-400 hover:text-[#0F172A] transition-colors"
                        title="Agregar certificación"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {perfil && perfil.certificaciones.length > 0 ? (
                      <div className="space-y-1.5">
                        {perfil.certificaciones.map(cert => (
                          <div
                            key={cert.id}
                            className={`group flex items-center gap-2 pl-2.5 pr-1.5 py-1.5 rounded-lg text-xs font-medium ${
                              cert.validada
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-gray-50 text-gray-500"
                            }`}
                          >
                            <Award className="w-3 h-3 shrink-0" />
                            <span className="truncate flex-1">{cert.nombre}</span>
                            <button
                              onClick={() => eliminarItem("certificacion", cert.id)}
                              className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity rounded-full shrink-0"
                              title="Eliminar"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">Sin certificaciones aún</p>
                    )}
                  </div>

                  {/* Descargar CV → abre diálogo de impresión del navegador */}
                  <Button
                    className="w-full mt-5 bg-[#F97316] hover:bg-[#EA580C] text-white text-sm rounded-lg"
                    onClick={descargarCV}
                  >
                    <Download className="w-3.5 h-3.5 mr-2" />
                    Descargar CV
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </aside>

          {/* ── FEED CENTRAL ───────────────────────────────── */}
          <main className="col-span-12 lg:col-span-6 space-y-4">
            {/* Crear publicación */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex gap-3 items-center">
                    <Avatar className="w-9 h-9 shrink-0">
                      {perfil?.fotoUrl && <AvatarImage src={perfil.fotoUrl} />}
                      <AvatarFallback>{perfil?.nombre[0] ?? "?"}</AvatarFallback>
                    </Avatar>
                    {/* Abre el diálogo de crear publicación */}
                    <button
                      className="flex-1 text-left px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-500 transition-colors"
                      onClick={() => setMostrarCrearPost(true)}
                    >
                      Comparte una actualización...
                    </button>
                    <button
                      className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
                      onClick={() => setMostrarCrearPost(true)}
                    >
                      <Sparkles className="w-4 h-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Posts — cargando */}
            {cargandoPosts && (
              <div className="flex items-center justify-center py-12 text-gray-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Cargando publicaciones...</span>
              </div>
            )}

            {/* Posts — sin resultados */}
            {!cargandoPosts && posts.length === 0 && (
              <Card className="border-0 shadow-sm">
                <CardContent className="py-12 text-center text-gray-400">
                  <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Aún no hay publicaciones. ¡Sé el primero en compartir algo!</p>
                </CardContent>
              </Card>
            )}

            {/* Posts — lista real */}
            {posts.map((post, i) => {
              const diff = Date.now() - new Date(post.creadoEn).getTime()
              const min = Math.floor(diff / 60000)
              const tiempo = min < 1 ? "Ahora mismo"
                : min < 60 ? `Hace ${min} min`
                : min < 1440 ? `Hace ${Math.floor(min / 60)}h`
                : `Hace ${Math.floor(min / 1440)} día${Math.floor(min / 1440) > 1 ? "s" : ""}`

              return (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.15 + i * 0.06 }}
                >
                  <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
                    <CardContent className="p-5">
                      <div className="flex gap-3 mb-3">
                        <Avatar className="w-10 h-10 shrink-0">
                          {post.autorTipo === 'ESTUDIANTE' && post.estudiante?.fotoUrl && (
                            <AvatarImage src={post.estudiante.fotoUrl} />
                          )}
                          {post.autorTipo === 'EMPRESA' && post.empresa?.logoUrl && (
                            <AvatarImage src={post.empresa.logoUrl} />
                          )}
                          <AvatarFallback>
                            {post.autorTipo === 'ESTUDIANTE'
                              ? (post.estudiante?.nombre[0] ?? "?")
                              : (post.empresa?.nombre[0] ?? "?")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm text-gray-900">
                            {post.autorTipo === 'ESTUDIANTE'
                              ? `${post.estudiante?.nombre} ${post.estudiante?.apellido}`
                              : post.empresa?.nombre ?? "—"}
                          </h4>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {post.autorTipo === 'ESTUDIANTE'
                              ? `${post.estudiante?.especialidad} · ${tiempo}`
                              : `${post.empresa?.rubro} · ${tiempo}`}
                          </p>
                        </div>
                      </div>

                      <p className="text-sm text-gray-700 leading-relaxed">{post.contenido}</p>

                      {post.mediaUrl && post.mediaType === 'IMAGEN' && (
                        <div className="mt-3 rounded-xl overflow-hidden border border-gray-100">
                          <img
                            src={post.mediaUrl}
                            alt="Imagen del post"
                            className="w-full max-h-80 object-cover"
                            loading="lazy"
                          />
                        </div>
                      )}
                      {post.mediaUrl && post.mediaType === 'VIDEO' && (
                        <div className="mt-3 rounded-xl overflow-hidden border border-gray-100">
                          <video
                            src={post.mediaUrl}
                            controls
                            className="w-full max-h-80"
                          />
                        </div>
                      )}

                      <div className="flex items-center gap-1 mt-4 pt-3 border-t border-gray-50">
                        {/* Like */}
                        <button
                          onClick={() => alternarLike(post.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all text-xs font-medium flex-1 justify-center ${
                            likesActivos.has(post.id)
                              ? "text-[#2563EB] bg-[#DBEAFE]/50"
                              : "text-gray-500 hover:text-[#0F172A] hover:bg-[#DBEAFE]/50"
                          }`}
                        >
                          <ThumbsUp className={`w-3.5 h-3.5 ${likesActivos.has(post.id) ? "fill-[#2563EB]" : ""}`} />
                          <span>{likesActivos.has(post.id) ? 1 : 0}</span>
                        </button>
                        {/* Comentar */}
                        <button
                          onClick={() => setMostrarCrearPost(true)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-gray-500 hover:text-[#0F172A] hover:bg-[#DBEAFE]/50 transition-all text-xs font-medium flex-1 justify-center"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Comentar</span>
                        </button>
                        {/* Compartir */}
                        <button
                          onClick={() => compartirPost(post)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-gray-500 hover:text-[#0F172A] hover:bg-[#DBEAFE]/50 transition-all text-xs font-medium flex-1 justify-center"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>Compartir</span>
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </main>

          {/* ── SIDEBAR DERECHO — Oportunidades + Mis Postulaciones ── */}
          <aside className="col-span-12 lg:col-span-3 space-y-4">
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <Card className="border-0 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-sm text-gray-900">Oportunidades</h3>
                    <Badge variant="secondary" className="text-xs">{ofertasDisponibles.length}</Badge>
                  </div>

                  {ofertasDisponibles.length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-xs">Sin ofertas disponibles</p>
                    </div>
                  )}

                  <div className="space-y-3">
                    {ofertasDisponibles.map((oferta, i) => (
                      <motion.div
                        key={oferta.id}
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: 0.3 + i * 0.07 }}
                        className="group p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100"
                      >
                        <div className="flex gap-3">
                          <Avatar className="w-10 h-10 rounded-lg shrink-0">
                            {oferta.empresa.logoUrl && <AvatarImage src={oferta.empresa.logoUrl} />}
                            <AvatarFallback className="rounded-lg bg-[#DBEAFE] text-[#0F172A] text-sm font-bold">
                              {oferta.empresa.nombre[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-xs text-gray-900 line-clamp-1">{oferta.titulo}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{oferta.empresa.nombre}</p>
                            <p className="text-xs text-[#0F172A] mt-0.5">{oferta.especialidad}</p>
                          </div>
                        </div>
                        {/* Botón Postular */}
                        {postuladas.has(oferta.id) ? (
                          <div className="w-full mt-2.5 flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 rounded-lg h-7 border border-emerald-200">
                            <Check className="w-3.5 h-3.5" />
                            Postulación enviada
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            className="w-full mt-2.5 bg-[#F97316] hover:bg-[#EA580C] text-white text-xs rounded-lg h-7"
                            onClick={() => postular(oferta.id)}
                            disabled={postulando === oferta.id}
                          >
                            {postulando === oferta.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              "Postular"
                            )}
                          </Button>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Card: Mis Postulaciones */}
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.25 }}
            >
              <Card
                className={`border-0 shadow-sm transition-shadow ${notifPostulaciones > 0 ? "ring-2 ring-[#F97316]/40" : ""}`}
                onClick={() => setNotifPostulaciones(0)}
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-gray-900">Mis Postulaciones</h3>
                      {notifPostulaciones > 0 && (
                        <span className="flex items-center gap-1 text-xs font-semibold text-white bg-[#F97316] px-2 py-0.5 rounded-full animate-pulse">
                          {notifPostulaciones} nuevo{notifPostulaciones > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    <Badge variant="secondary" className="text-xs">{misPostulaciones.length}</Badge>
                  </div>

                  {misPostulaciones.length === 0 && (
                    <div className="text-center py-6 text-gray-400">
                      <ClipboardList className="w-7 h-7 mx-auto mb-2 opacity-30" />
                      <p className="text-xs">Aún no has postulado</p>
                    </div>
                  )}

                  <div className="space-y-2.5">
                    {misPostulaciones.map(p => {
                      // Determina si esta postulación cambió desde la última visita
                      const esNuevo = tsUltimaVisita !== null
                        ? new Date(p.actualizadoEn).getTime() > tsUltimaVisita &&
                          new Date(p.actualizadoEn).getTime() > new Date(p.creadoEn).getTime()
                        : false

                      return (
                        <div
                          key={p.id}
                          className={`p-3 rounded-xl border transition-colors ${
                            esNuevo
                              ? "border-[#F97316]/30 bg-orange-50/60"
                              : "border-gray-100 bg-gray-50/60"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-semibold text-xs text-gray-900 line-clamp-1">{p.oferta.titulo}</p>
                              <p className="text-xs text-gray-500 mt-0.5">{p.oferta.empresa.nombre}</p>
                            </div>
                            {esNuevo && (
                              <span className="shrink-0 w-2 h-2 rounded-full bg-[#F97316] mt-1" />
                            )}
                          </div>
                          <div className="mt-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              p.estado === "ACEPTADA"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : p.estado === "RECHAZADA"
                                ? "bg-red-50 text-red-600 border border-red-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}>
                              {p.estado === "ACEPTADA" ? "✓ Aceptada" : p.estado === "RECHAZADA" ? "✗ Rechazada" : "● Pendiente"}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            {/* Card: Mis Contactos */}
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.35 }}
            >
              <Card className="border border-gray-100 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                      <Mail className="w-4 h-4 text-[#F97316]" />
                      Mis Contactos
                    </h3>
                    {misContactos.length > 0 && (
                      <span className="text-xs bg-[#F97316] text-white px-2 py-0.5 rounded-full font-semibold">
                        {misContactos.length}
                      </span>
                    )}
                  </div>
                  {misContactos.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">Aún no has recibido contactos</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {misContactos.slice(0, 5).map(c => (
                        <div key={c.id} className="text-xs p-2.5 bg-orange-50 rounded-xl border border-orange-100">
                          <p className="font-semibold text-gray-800 truncate">
                            {c.empresa?.nombre ?? c.nombreRemitente ?? "Contacto"}
                          </p>
                          {c.mensaje && (
                            <p className="text-gray-500 mt-0.5 line-clamp-2">{c.mensaje}</p>
                          )}
                          <p className="text-gray-400 mt-1">
                            {new Date(c.creadoEn).toLocaleDateString("es-CL", { day: "numeric", month: "short" })}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </aside>

        </div>
      </div>
      )} {/* fin vistaActiva === "feed" */}

      {/* ── FAB — Crear publicación ─────────────────────────── */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setMostrarCrearPost(true)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-[#F97316] hover:bg-[#EA580C] text-white rounded-full shadow-xl shadow-orange-900/30 flex items-center justify-center transition-colors"
      >
        <Plus className="w-6 h-6" />
      </motion.button>

      {/* ── DIÁLOGO: Agregar habilidad o certificación ─────── */}
      <Dialog open={tipoAgregar !== null} onOpenChange={abierto => { if (!abierto) cerrarDialogoAgregar() }}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              {tipoAgregar === "habilidad" ? "Agregar habilidad" : "Agregar certificación"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="nuevoNombre">Nombre *</Label>
              <Input
                id="nuevoNombre"
                placeholder={tipoAgregar === "habilidad" ? "Ej: Trabajo en equipo" : "Ej: Instalaciones Eléctricas"}
                value={nuevoNombre}
                onChange={e => setNuevoNombre(e.target.value)}
                onKeyDown={e => e.key === "Enter" && agregarItem()}
                autoFocus
              />
            </div>

            {tipoAgregar === "certificacion" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="nuevaInstitucion">Institución (opcional)</Label>
                  <Input
                    id="nuevaInstitucion"
                    placeholder="Ej: SENCE, Duoc UC"
                    value={nuevaInstitucion}
                    onChange={e => setNuevaInstitucion(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nuevaFecha">Fecha de obtención (opcional)</Label>
                  <Input
                    id="nuevaFecha"
                    type="date"
                    value={nuevaFecha}
                    onChange={e => setNuevaFecha(e.target.value)}
                  />
                </div>
              </>
            )}

            <p className="text-xs text-gray-400">
              Quedará pendiente de validación por el colegio.
            </p>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={cerrarDialogoAgregar} disabled={guardandoItem}>
                Cancelar
              </Button>
              <Button
                className="bg-[#0F172A] hover:bg-[#2563EB] text-white"
                onClick={agregarItem}
                disabled={!nuevoNombre.trim() || guardandoItem}
              >
                {guardandoItem && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Agregar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── DIÁLOGO: Editar perfil ──────────────────────────── */}
      <Dialog open={mostrarEditarPerfil} onOpenChange={abierto => { if (!abierto) setMostrarEditarPerfil(false) }}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Editar mi perfil</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="editDesc">Descripción</Label>
              <Textarea
                id="editDesc"
                placeholder="Cuéntale a las empresas sobre ti y tus habilidades..."
                rows={3}
                value={editDesc}
                onChange={e => setEditDesc(e.target.value)}
                className="resize-none"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="editFoto">URL de foto de perfil (opcional)</Label>
              <Input
                id="editFoto"
                placeholder="https://..."
                value={editFoto}
                onChange={e => setEditFoto(e.target.value)}
              />
            </div>
            {/* Tipo de disponibilidad */}
            <div className="space-y-1.5">
              <Label className="text-sm">Tipo de disponibilidad</Label>
              <div className="flex gap-2">
                {(["PASANTIA", "FREELANCE", "AMBOS"] as const).map(tipo => (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => setEditTipoDisponibilidad(tipo)}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium border transition-all ${
                      editTipoDisponibilidad === tipo
                        ? "bg-[#0F172A] text-white border-[#0F172A]"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    {tipo === "PASANTIA" ? "Pasantía" : tipo === "FREELANCE" ? "Freelance" : "Ambos"}
                  </button>
                ))}
              </div>
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

      {/* ── DIÁLOGO: Crear publicación ──────────────────────── */}
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
                {perfil?.fotoUrl && <AvatarImage src={perfil.fotoUrl} />}
                <AvatarFallback>{perfil?.nombre[0] ?? "?"}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-sm text-gray-900">
                  {perfil ? `${perfil.nombre} ${perfil.apellido}` : "—"}
                </p>
                <p className="text-xs text-gray-400">{perfil?.especialidad ?? "—"}</p>
              </div>
            </div>

            <Textarea
              placeholder="¿Qué quieres compartir hoy?"
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
                  onClick={publicar}
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
    </div>
  )
}
