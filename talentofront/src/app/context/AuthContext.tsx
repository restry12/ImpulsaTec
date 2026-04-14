import { createContext, useContext, useState, useCallback } from 'react'

interface SesionUsuario {
  token: string
  rol: string
  id: number
}

interface DatosRegistro {
  email: string
  password: string
  rol: string
  nombre: string
  apellido?: string
  especialidad?: string
  rubro?: string
  colegioId?: number
}

interface ContextoAuth {
  sesion: SesionUsuario | null
  iniciarSesion: (email: string, password: string) => Promise<void>
  registrar: (datos: DatosRegistro) => Promise<void>
  cerrarSesion: () => void
}

const ContextoAuth = createContext<ContextoAuth | null>(null)

const API_URL = import.meta.env.VITE_API_URL

export function ProveedorAuth({ children }: { children: React.ReactNode }) {
  const [sesion, setSesion] = useState<SesionUsuario | null>(() => {
    try {
      const guardada = localStorage.getItem('sesion')
      return guardada ? JSON.parse(guardada) : null
    } catch {
      return null
    }
  })

  const iniciarSesion = useCallback(async (email: string, password: string) => {
    const respuesta = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    const datos = await respuesta.json()

    if (!respuesta.ok) {
      throw new Error(datos.error || 'Error al iniciar sesión')
    }

    localStorage.setItem('sesion', JSON.stringify(datos))
    setSesion(datos)
  }, [])

  const registrar = useCallback(async (datos: DatosRegistro) => {
    const respuesta = await fetch(`${API_URL}/api/auth/registro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos),
    })

    const body = await respuesta.json()

    if (!respuesta.ok) {
      throw new Error(body.error || 'Error al registrar')
    }

    localStorage.setItem('sesion', JSON.stringify(body))
    setSesion(body)
  }, [])

  const cerrarSesion = useCallback(() => {
    localStorage.removeItem('sesion')
    setSesion(null)
  }, [])

  return (
    <ContextoAuth.Provider value={{ sesion, iniciarSesion, registrar, cerrarSesion }}>
      {children}
    </ContextoAuth.Provider>
  )
}

export function useAuth() {
  const contexto = useContext(ContextoAuth)
  if (!contexto) throw new Error('useAuth debe usarse dentro de ProveedorAuth')
  return contexto
}
