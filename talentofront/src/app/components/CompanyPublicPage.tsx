import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  ArrowLeft, Building2, Briefcase, MapPin, Loader2, AlertCircle, CheckCircle2
} from "lucide-react";
import { useParams, useNavigate, Link } from "react-router";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { Card, CardContent } from "./ui/card";
import { useAuth } from "../context/AuthContext";
import logoImage from "../../assets/17a2f6b30bc584421f868b1534160753545e9968.png";

type OfertaPublica = {
  id: number
  titulo: string
  descripcion: string
  especialidad: string
  activa: boolean
  creadoEn: string
  postulaciones: { id: number; estado: string }[]
}

type EmpresaPublica = {
  id: number
  nombre: string
  rubro: string
  descripcion: string | null
  logoUrl: string | null
  creadoEn: string
  ofertas: OfertaPublica[]
}

const API_URL = import.meta.env.VITE_API_URL

const gradientesEmpresa = [
  "from-blue-500 to-blue-700", "from-purple-500 to-purple-700",
  "from-emerald-500 to-emerald-700", "from-orange-500 to-orange-700",
  "from-rose-500 to-rose-700", "from-cyan-500 to-cyan-700",
]
const gradienteEmpresa = (nombre: string) =>
  gradientesEmpresa[nombre.charCodeAt(0) % gradientesEmpresa.length]

export function CompanyPublicPage() {
  const { id } = useParams<{ id: string }>()
  const { sesion } = useAuth()
  const navegar = useNavigate()

  const [empresa, setEmpresa] = useState<EmpresaPublica | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(false)

  // IDs de ofertas a las que el estudiante ya postuló
  const [yaPostuladas, setYaPostuladas] = useState<Set<number>>(new Set())
  const [postulando, setPostulando] = useState<number | null>(null)

  useEffect(() => {
    if (!id) return
    setCargando(true)
    fetch(`${API_URL}/api/empresas/${id}`)
      .then(res => {
        if (!res.ok) throw new Error()
        return res.json()
      })
      .then((datos: EmpresaPublica) => {
        setEmpresa(datos)
        setCargando(false)
      })
      .catch(() => { setError(true); setCargando(false) })
  }, [id])

  // Si es estudiante autenticado, carga sus postulaciones para saber cuáles ya hizo
  useEffect(() => {
    if (sesion?.rol !== "ESTUDIANTE") return
    fetch(`${API_URL}/api/postulaciones/me`, {
      headers: { Authorization: `Bearer ${sesion.token}` },
    })
      .then(res => res.json())
      .then((datos: { oferta: { id: number } }[]) => {
        setYaPostuladas(new Set(datos.map(p => p.oferta.id)))
      })
      .catch(() => {})
  }, [sesion])

  const postular = async (ofertaId: number) => {
    if (!sesion) return
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
        setYaPostuladas(prev => new Set(prev).add(ofertaId))
      }
    } catch {
      // Error de red, ignoramos silenciosamente
    } finally {
      setPostulando(null)
    }
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-[#F6F3EC] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm">Cargando perfil de empresa...</p>
        </div>
      </div>
    )
  }

  if (error || !empresa) {
    return (
      <div className="min-h-screen bg-[#F6F3EC] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <AlertCircle className="w-8 h-8" />
          <p className="text-sm font-medium">Empresa no encontrada</p>
          <Button variant="outline" size="sm" onClick={() => navegar(-1)} className="mt-1">
            <ArrowLeft className="w-4 h-4 mr-2" /> Volver
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F6F3EC]">

      {/* ── NAVBAR ─────────────────────────────────────── */}
      <nav className="bg-[#0B0F1A] text-white px-6 py-3.5 sticky top-0 z-50 shadow-lg">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navegar(-1)}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Link to="/">
              <img src={logoImage} alt="ImpulsaTec" className="h-9 bg-white rounded-lg px-2 py-1" />
            </Link>
          </div>
          <span className="text-sm text-white/60">Perfil de empresa</span>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* ── CABECERA DE EMPRESA ─────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
            {/* Banner */}
            <div className={`h-24 bg-gradient-to-r ${gradienteEmpresa(empresa.nombre)}`} />
            <CardContent className="px-6 pb-6">
              <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-10 mb-4">
                <Avatar className="w-20 h-20 border-4 border-white shadow-md rounded-2xl shrink-0">
                  {empresa.logoUrl ? (
                    <AvatarImage src={empresa.logoUrl} alt={empresa.nombre} className="object-cover" />
                  ) : null}
                  <AvatarFallback className={`bg-gradient-to-br ${gradienteEmpresa(empresa.nombre)} text-white text-2xl font-bold rounded-2xl`}>
                    {empresa.nombre[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="sm:mb-1 min-w-0 flex-1">
                  <h1 className="text-xl font-bold text-gray-900 leading-tight">{empresa.nombre}</h1>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs bg-[#DBEAFE] text-[#0B0F1A] border-0">
                      {empresa.rubro}
                    </Badge>
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Briefcase className="w-3.5 h-3.5" />
                      {empresa.ofertas.length} {empresa.ofertas.length === 1 ? "oferta activa" : "ofertas activas"}
                    </span>
                  </div>
                </div>
              </div>

              {empresa.descripcion && (
                <p className="text-sm text-gray-600 leading-relaxed">{empresa.descripcion}</p>
              )}
              {!empresa.descripcion && (
                <p className="text-sm text-gray-300 italic">Esta empresa aún no ha agregado una descripción.</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* ── OFERTAS DE PASANTÍA ─────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Briefcase className="w-5 h-5 text-[#C94A2A]" />
            <h2 className="text-base font-bold text-gray-900">Ofertas de pasantía</h2>
            <Badge variant="secondary" className="text-xs ml-1">{empresa.ofertas.length}</Badge>
          </div>

          {empresa.ofertas.length === 0 ? (
            <Card className="border border-gray-100 shadow-sm rounded-2xl">
              <CardContent className="py-12 text-center text-gray-400">
                <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No hay ofertas activas en este momento.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {empresa.ofertas.map((oferta, i) => {
                const yaPostulo = yaPostuladas.has(oferta.id)
                const estaPostulando = postulando === oferta.id
                const totalPostulaciones = oferta.postulaciones.length

                return (
                  <motion.div
                    key={oferta.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 + i * 0.07 }}
                  >
                    <Card className="border border-gray-100 shadow-sm rounded-2xl hover:shadow-md transition-shadow">
                      <CardContent className="p-5">
                        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1.5">
                              <h3 className="text-sm font-bold text-gray-900">{oferta.titulo}</h3>
                              <Badge className="text-xs bg-[#DBEAFE] text-[#0B0F1A] border-0 hover:bg-[#DBEAFE]">
                                {oferta.especialidad}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-500 line-clamp-2 mb-2">{oferta.descripcion}</p>
                            <div className="flex items-center gap-3 text-xs text-gray-400">
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" />
                                {empresa.nombre}
                              </span>
                              <span className="flex items-center gap-1">
                                <Building2 className="w-3.5 h-3.5" />
                                {totalPostulaciones} {totalPostulaciones === 1 ? "postulación" : "postulaciones"}
                              </span>
                            </div>
                          </div>

                          <div className="shrink-0">
                            {sesion?.rol === "ESTUDIANTE" ? (
                              yaPostulo ? (
                                <Button
                                  size="sm"
                                  disabled
                                  className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50 h-8 text-xs rounded-xl px-4"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                                  Postulado
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => postular(oferta.id)}
                                  disabled={estaPostulando}
                                  className="bg-[#C94A2A] hover:bg-[#B33E22] text-white h-8 text-xs rounded-xl px-4"
                                >
                                  {estaPostulando
                                    ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                                    : null}
                                  Postular
                                </Button>
                              )
                            ) : sesion === null ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navegar("/login")}
                                className="h-8 text-xs rounded-xl px-4 border-gray-200"
                              >
                                Iniciar sesión
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
