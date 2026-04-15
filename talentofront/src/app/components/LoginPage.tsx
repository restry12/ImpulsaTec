import { useState } from 'react'
import { useNavigate, Link } from 'react-router'
import { useForm } from 'react-hook-form'
import { useAuth } from '../context/AuthContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { Label } from './ui/label'

interface FormularioLogin {
  email: string
  password: string
}

const RUTAS_POR_ROL: Record<string, string> = {
  ESTUDIANTE: '/estudiante',
  EMPRESA: '/empresa',
  ADMINISTRADOR: '/colegio',
}

export function LoginPage() {
  const { iniciarSesion } = useAuth()
  const navegar = useNavigate()
  const [errorServidor, setErrorServidor] = useState('')
  const [cargando, setCargando] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormularioLogin>()

  const alEnviar = async (datos: FormularioLogin) => {
    setErrorServidor('')
    setCargando(true)
    try {
      await iniciarSesion(datos.email, datos.password)
      // La sesión ya fue guardada en el contexto; leemos el rol desde localStorage
      const sesion = JSON.parse(localStorage.getItem('sesion') || '{}')
      const ruta = RUTAS_POR_ROL[sesion.rol] || '/'
      navegar(ruta, { replace: true })
    } catch (error) {
      setErrorServidor(error instanceof Error ? error.message : 'Error al iniciar sesión')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">ImpulsaTec</CardTitle>
          <CardDescription>Inicia sesión con tu cuenta</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(alEnviar)} noValidate className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="correo@ejemplo.com"
                autoComplete="email"
                {...register('email', {
                  required: 'El correo es obligatorio',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Ingresa un correo válido',
                  },
                })}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                {...register('password', {
                  required: 'La contraseña es obligatoria',
                  minLength: { value: 6, message: 'Mínimo 6 caracteres' },
                })}
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>

            {errorServidor && (
              <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3">
                <p className="text-sm text-red-600">{errorServidor}</p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={cargando}>
              {cargando ? 'Ingresando...' : 'Iniciar sesión'}
            </Button>
          </form>
          <p className="mt-5 text-center text-sm text-gray-500">
            ¿No tienes cuenta?{' '}
            <Link to="/registro" className="text-[#0F172A] font-medium hover:underline">
              Regístrate
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
