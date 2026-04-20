import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, Send, Loader2, ArrowLeft, MessageSquareDashed } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Button } from './ui/button'
import { Badge } from './ui/badge'

const API_URL = import.meta.env.VITE_API_URL

type Hilo = {
  id: number
  tipo: 'EMPRESA_ESTUDIANTE' | 'ESTUDIANTE_ESTUDIANTE'
  contraparte: { id: number; nombre: string; logoUrl: string | null }
  ultimoMensaje: { contenido: string; creadoEn: string } | null
  noLeidos: number
}

type MensajeDM = {
  id: number
  conversacionId: number
  contenido: string
  autorTipo: 'EMPRESA' | 'ESTUDIANTE'
  emisorEmpresaId: number | null
  emisorEstudianteId: number | null
  leido: boolean
  creadoEn: string
}

interface Props {
  abierto: boolean
  onCerrar: () => void
  rolActual: 'EMPRESA' | 'ESTUDIANTE'
  token: string
  hiloInicialId?: number | null
  onBadgeChange?: (count: number) => void
  miId?: number
}

function tiempoRelativo(fecha: string): string {
  const diff = Date.now() - new Date(fecha).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'ahora'
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

function iniciales(nombre: string): string {
  return nombre
    .split(' ')
    .filter(p => p.length > 0)
    .slice(0, 2)
    .map(p => p[0])
    .join('')
    .toUpperCase()
}

export function PanelDMs({ abierto, onCerrar, rolActual, token, hiloInicialId, onBadgeChange, miId }: Props) {
  const [hilos, setHilos] = useState<Hilo[]>([])
  const [tabActiva, setTabActiva] = useState<'EMPRESA_ESTUDIANTE' | 'ESTUDIANTE_ESTUDIANTE'>('EMPRESA_ESTUDIANTE')
  const [hiloActivo, setHiloActivo] = useState<Hilo | null>(null)
  const [mensajes, setMensajes] = useState<MensajeDM[]>([])
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [cargandoHilos, setCargandoHilos] = useState(false)
  const [cargandoMensajes, setCargandoMensajes] = useState(false)
  const refScroll = useRef<HTMLDivElement>(null)
  const refInput = useRef<HTMLTextAreaElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hiloInicialAbierto = useRef(false)

  const cargarHilos = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/conversaciones`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const datos: Hilo[] = await res.json()
        setHilos(datos)
        const totalNoLeidos = datos.filter(h => h.noLeidos > 0).length
        onBadgeChange?.(totalNoLeidos)
      }
    } catch {}
  }, [token, onBadgeChange])

  const cargarMensajes = useCallback(async (hiloId: number) => {
    try {
      const res = await fetch(`${API_URL}/api/conversaciones/${hiloId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const datos: MensajeDM[] = await res.json()
        setMensajes(datos)
      }
    } catch {}
  }, [token])

  const marcarLeidos = useCallback(async (hiloId: number) => {
    try {
      await fetch(`${API_URL}/api/conversaciones/${hiloId}/leido`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch {}
  }, [token])

  // Carga inicial y polling de hilos
  useEffect(() => {
    if (!abierto) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }
    setCargandoHilos(true)
    cargarHilos().then(() => setCargandoHilos(false))
    intervalRef.current = setInterval(cargarHilos, 4000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [abierto, cargarHilos])

  const abrirHilo = useCallback(async (hilo: Hilo) => {
    setHiloActivo(hilo)
    setCargandoMensajes(true)
    await cargarMensajes(hilo.id)
    setCargandoMensajes(false)
    await marcarLeidos(hilo.id)
    await cargarHilos()
    setTimeout(() => refInput.current?.focus(), 100)
  }, [cargarMensajes, marcarLeidos, cargarHilos])

  // Abrir hilo inicial si se pasa hiloInicialId (solo una vez por apertura del panel)
  useEffect(() => {
    if (!abierto || !hiloInicialId || hilos.length === 0 || hiloInicialAbierto.current) return
    const hilo = hilos.find(h => h.id === hiloInicialId)
    if (hilo) {
      hiloInicialAbierto.current = true
      abrirHilo(hilo)
    }
  }, [abierto, hiloInicialId, hilos, abrirHilo])

  // Reset al cerrar
  useEffect(() => {
    if (!abierto) {
      setHiloActivo(null)
      setMensajes([])
      setTexto('')
      hiloInicialAbierto.current = false
    }
  }, [abierto])

  // Scroll al último mensaje
  useEffect(() => {
    if (refScroll.current) {
      refScroll.current.scrollTop = refScroll.current.scrollHeight
    }
  }, [mensajes])

  // Polling de mensajes cuando hay hilo activo
  useEffect(() => {
    if (!hiloActivo) return
    const iv = setInterval(() => cargarMensajes(hiloActivo.id), 4000)
    return () => clearInterval(iv)
  }, [hiloActivo, cargarMensajes])

  const volverALista = () => {
    setHiloActivo(null)
    setMensajes([])
    setTexto('')
    cargarHilos()
  }

  const enviar = async () => {
    if (!texto.trim() || enviando || !hiloActivo) return
    setEnviando(true)
    try {
      const res = await fetch(`${API_URL}/api/conversaciones/${hiloActivo.id}/mensajes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ contenido: texto.trim() }),
      })
      if (res.ok) {
        const nuevo: MensajeDM = await res.json()
        setMensajes(prev => [...prev, nuevo])
        setTexto('')
        refInput.current?.focus()
      }
    } catch {
      toast.error('No se pudo enviar el mensaje')
    }
    setEnviando(false)
  }

  const alPresionarTecla = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      enviar()
    }
  }

  const hilosFiltrados = rolActual === 'EMPRESA'
    ? hilos
    : hilos.filter(h => h.tipo === tabActiva)

  const esMioElMensaje = (m: MensajeDM): boolean => {
    if (rolActual === 'EMPRESA') return m.autorTipo === 'EMPRESA'
    // En hilos ESTUDIANTE_ESTUDIANTE, ambos tienen autorTipo ESTUDIANTE — usar emisorEstudianteId
    if (m.emisorEstudianteId !== null && miId !== undefined) {
      return m.emisorEstudianteId === miId
    }
    return m.autorTipo === 'ESTUDIANTE'
  }

  return (
    <AnimatePresence>
      {abierto && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-40"
            onClick={onCerrar}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed right-0 top-0 h-full w-[380px] max-w-full bg-white z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3.5 bg-[#0F172A] text-white shrink-0">
              {hiloActivo ? (
                <>
                  <button
                    onClick={volverALista}
                    className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <Avatar className="w-9 h-9 border-2 border-white/20">
                    {hiloActivo.contraparte.logoUrl && <AvatarImage src={hiloActivo.contraparte.logoUrl} />}
                    <AvatarFallback className="bg-white/20 text-white text-xs font-bold">
                      {iniciales(hiloActivo.contraparte.nombre)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{hiloActivo.contraparte.nombre}</p>
                    <p className="text-xs text-white/60">Mensaje directo</p>
                  </div>
                </>
              ) : (
                <div className="flex-1">
                  <p className="font-semibold text-sm">Mensajes</p>
                </div>
              )}
              <button
                onClick={onCerrar}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs (solo estudiante, solo en lista) */}
            {rolActual === 'ESTUDIANTE' && !hiloActivo && (
              <div className="flex border-b border-gray-100 shrink-0">
                {(['EMPRESA_ESTUDIANTE', 'ESTUDIANTE_ESTUDIANTE'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setTabActiva(tab)}
                    className={`flex-1 py-2.5 text-xs font-semibold transition-colors relative ${
                      tabActiva === tab ? 'text-[#0F172A]' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {tab === 'EMPRESA_ESTUDIANTE' ? 'Empresas' : 'Estudiantes'}
                    {tabActiva === tab && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F97316]" />
                    )}
                    {(() => {
                      const noLeidos = hilos.filter(h => h.tipo === tab && h.noLeidos > 0).length
                      return noLeidos > 0 ? (
                        <span className="ml-1 bg-[#F97316] text-white text-[10px] px-1 rounded-full">{noLeidos}</span>
                      ) : null
                    })()}
                  </button>
                ))}
              </div>
            )}

            {/* Cuerpo */}
            {!hiloActivo ? (
              // Vista lista de hilos
              <div className="flex-1 overflow-y-auto">
                {cargandoHilos ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  </div>
                ) : hilosFiltrados.length === 0 ? (
                  <div className="text-center py-16 text-gray-400 px-6">
                    <MessageSquareDashed className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">Sin conversaciones</p>
                    <p className="text-xs mt-1 text-gray-400">
                      {rolActual === 'EMPRESA'
                        ? 'Contacta estudiantes para iniciar una conversación.'
                        : tabActiva === 'EMPRESA_ESTUDIANTE'
                          ? 'Las empresas te escribirán aquí.'
                          : 'Busca un estudiante para escribirle.'}
                    </p>
                  </div>
                ) : (
                  hilosFiltrados.map(hilo => (
                    <button
                      key={hilo.id}
                      onClick={() => abrirHilo(hilo)}
                      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors border-b border-gray-50 text-left"
                    >
                      <Avatar className="w-10 h-10 shrink-0">
                        {hilo.contraparte.logoUrl && <AvatarImage src={hilo.contraparte.logoUrl} />}
                        <AvatarFallback className="bg-[#DBEAFE] text-[#2563EB] text-xs font-bold">
                          {iniciales(hilo.contraparte.nombre)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-sm truncate ${hilo.noLeidos > 0 ? 'font-semibold text-[#0F172A]' : 'font-medium text-gray-700'}`}>
                            {hilo.contraparte.nombre}
                          </p>
                          {hilo.ultimoMensaje && (
                            <span className="text-[11px] text-gray-400 shrink-0">
                              {tiempoRelativo(hilo.ultimoMensaje.creadoEn)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <p className={`text-xs truncate ${hilo.noLeidos > 0 ? 'text-[#0F172A]' : 'text-gray-400'}`}>
                            {hilo.ultimoMensaje?.contenido ?? 'Sin mensajes aún'}
                          </p>
                          {hilo.noLeidos > 0 && (
                            <Badge className="bg-[#F97316] text-white text-[10px] h-4 min-w-4 px-1 shrink-0">
                              {hilo.noLeidos}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            ) : (
              // Vista hilo individual
              <>
                <div
                  ref={refScroll}
                  className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50"
                >
                  {cargandoMensajes ? (
                    <div className="flex justify-center py-10">
                      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    </div>
                  ) : mensajes.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                      <p className="text-sm">Aún no hay mensajes.</p>
                      <p className="text-xs mt-1">Escribe el primero abajo.</p>
                    </div>
                  ) : (
                    mensajes.map(m => {
                      const esMio = esMioElMensaje(m)
                      return (
                        <div key={m.id} className={`flex ${esMio ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${
                            esMio
                              ? 'bg-[#F97316] text-white rounded-br-sm'
                              : 'bg-[#0F172A] text-white rounded-bl-sm'
                          }`}>
                            <p>{m.contenido}</p>
                            <p className="text-xs mt-1 text-white/60 text-right">
                              {tiempoRelativo(m.creadoEn)}
                            </p>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                <div className="px-4 py-3 border-t border-gray-100 bg-white shrink-0">
                  <div className="flex items-end gap-2">
                    <textarea
                      ref={refInput}
                      value={texto}
                      onChange={e => setTexto(e.target.value)}
                      onKeyDown={alPresionarTecla}
                      placeholder="Escribe un mensaje... (Enter para enviar)"
                      rows={1}
                      className="flex-1 resize-none rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]/40 focus:border-[#F97316] min-h-[40px] max-h-[120px] overflow-y-auto"
                      style={{ height: 'auto' }}
                      onInput={e => {
                        const el = e.currentTarget
                        el.style.height = 'auto'
                        el.style.height = `${Math.min(el.scrollHeight, 120)}px`
                      }}
                    />
                    <Button
                      onClick={enviar}
                      disabled={!texto.trim() || enviando}
                      className="bg-[#F97316] hover:bg-[#EA580C] text-white rounded-xl h-10 w-10 p-0 shrink-0"
                    >
                      {enviando
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Send className="w-4 h-4" />
                      }
                    </Button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
