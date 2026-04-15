import { Navigate } from 'react-router'
import { useAuth } from '../context/AuthContext'

interface Props {
  children: React.ReactNode
  rolesPermitidos: string[]
}

// Redirige al login si no hay sesión activa, o si el rol no está permitido
export function RutaProtegida({ children, rolesPermitidos }: Props) {
  const { sesion } = useAuth()

  if (!sesion) {
    return <Navigate to="/login" replace />
  }

  if (!rolesPermitidos.includes(sesion.rol)) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
