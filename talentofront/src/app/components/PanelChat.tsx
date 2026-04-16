import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, Send, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Button } from './ui/button'

const API_URL = import.meta.env.VITE_API_URL

type Mensaje = {
  id: number
  empresaId: number
  contenido: string
  autorTipo: 'EMPRESA' | 'ADMINISTRADOR'
  leido: boolean
  creadoEn: string
}

interface Props {
  abierto: boolean
  onCerrar: () => void
  empresaId: number
  autorActual: 'EMPRESA' | 'ADMINISTRADOR'
  nombreContraparte: string
  logoContraparte?: string | null
  token: string
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

export function PanelChat({ abierto, onCerrar, empresaId, autorActual, nombreContraparte, logoContraparte, token }: Props) {
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [cargando, setCargando] = useState(false)
  const refScroll = useRef<HTMLDivElement>(null)
  const refInput = useRef<HTMLTextAreaElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const cargarMensajes = useCallback(async () => {
    try {
      const url = autorActual === 'ADMINISTRADOR'
        ? `${API_URL}/api/mensajes?empresaId=${empresaId}`
        : `${API_URL}/api/mensajes`
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const datos: Mensaje[] = await res.json()
        setMensajes(datos)
      }
    } catch {}
  }, [empresaId, autorActual, token])

  const marcarLeidos = useCallback(async () => {
    try {
      await fetch(`${API_URL}/api/mensajes/leido/${empresaId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch {}
  }, [empresaId, token])

  useEffect(() => {
    if (!abierto) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }

    setCargando(true)
    cargarMensajes().then(() => {
      setCargando(false)
      marcarLeidos()
      refInput.current?.focus()
    })

    intervalRef.current = setInterval(() => {
      cargarMensajes()
    }, 4000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [abierto, cargarMensajes, marcarLeidos])

  // Scroll al último mensaje cuando cambia la lista
  useEffect(() => {
    if (refScroll.current) {
      refScroll.current.scrollTop = refScroll.current.scrollHeight
    }
  }, [mensajes])

  const enviar = async () => {
    if (!texto.trim() || enviando) return
    setEnviando(true)
    try {
      const body: Record<string, unknown> = { contenido: texto.trim() }
      if (autorActual === 'ADMINISTRADOR') body.empresaId = empresaId

      const res = await fetch(`${API_URL}/api/mensajes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const nuevo: Mensaje = await res.json()
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

  const inicialesContraparte = nombreContraparte
    .split(' ')
    .filter(p => p.length > 0)
    .slice(0, 2)
    .map(p => p[0])
    .join('')
    .toUpperCase()

  return (
    <AnimatePresence>
      {abierto && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-40"
            onClick={onCerrar}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed right-0 top-0 h-full w-[380px] max-w-full bg-white z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3.5 bg-[#0F172A] text-white shrink-0">
              <Avatar className="w-9 h-9 border-2 border-white/20">
                {logoContraparte && <AvatarImage src={logoContraparte} />}
                <AvatarFallback className="bg-white/20 text-white text-xs font-bold">
                  {inicialesContraparte}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{nombreContraparte}</p>
                <p className="text-xs text-white/60">Chat privado</p>
              </div>
              <button
                onClick={onCerrar}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Área de mensajes */}
            <div
              ref={refScroll}
              className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50"
            >
              {cargando ? (
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
                  const esMio = m.autorTipo === autorActual
                  return (
                    <div key={m.id} className={`flex ${esMio ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${
                        esMio
                          ? 'bg-[#F97316] text-white rounded-br-sm'
                          : 'bg-[#0F172A] text-white rounded-bl-sm'
                      }`}>
                        <p>{m.contenido}</p>
                        <p className={`text-xs mt-1 ${esMio ? 'text-white/60' : 'text-white/50'} text-right`}>
                          {tiempoRelativo(m.creadoEn)}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Input */}
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
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
