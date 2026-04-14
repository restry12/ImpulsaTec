import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router'
import { useForm, Controller } from 'react-hook-form'
import { useAuth } from '../context/AuthContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { Label } from './ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Loader2 } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL

const especialidades = ['Electricidad', 'Mecánica Industrial', 'Electrónica', 'Refrigeración', 'Informática']
const rubros = ['Construcción', 'Minería', 'Manufactura', 'Energía', 'Tecnología', 'Transporte', 'Servicios', 'Agricultura', 'Otros']

const RUTAS_POR_ROL: Record<string, string> = {
  ESTUDIANTE: '/estudiante',
  EMPRESA: '/empresa',
  ADMINISTRADOR: '/colegio',
}

interface FormEstudiante {
  nombre: string
  apellido: string
  email: string
  password: string
  confirmar: string
  especialidad: string
}

interface FormEmpresa {
  nombre: string
  email: string
  password: string
  confirmar: string
  rubro: string
}

interface Colegio {
  id: number
  nombre: string
  comuna: string
}

export function RegisterPage() {
  const { registrar } = useAuth()
  const navegar = useNavigate()
  const [tab, setTab] = useState<'estudiante' | 'empresa'>('estudiante')
  // El colegio es único: Centro Educacional Cardenal José María Caro
  const [colegioId, setColegioId] = useState<number | null>(null)
  const [errorServidor, setErrorServidor] = useState('')
  const [cargando, setCargando] = useState(false)

  // Formulario estudiante
  const formEst = useForm<FormEstudiante>()
  // Formulario empresa
  const formEmp = useForm<FormEmpresa>()

  // Obtiene el id del único colegio de la plataforma
  useEffect(() => {
    fetch(`${API_URL}/api/colegios`)
      .then(res => res.json())
      .then((datos: Colegio[]) => { if (datos[0]) setColegioId(datos[0].id) })
      .catch(() => {})
  }, [])

  const registrarEstudiante = async (datos: FormEstudiante) => {
    if (datos.password !== datos.confirmar) {
      formEst.setError('confirmar', { message: 'Las contraseñas no coinciden' })
      return
    }
    if (!colegioId) {
      setErrorServidor('No se pudo conectar con el servidor. Intenta nuevamente.')
      return
    }
    setErrorServidor('')
    setCargando(true)
    try {
      await registrar({
        email: datos.email,
        password: datos.password,
        rol: 'ESTUDIANTE',
        nombre: datos.nombre,
        apellido: datos.apellido,
        especialidad: datos.especialidad,
        colegioId,
      })
      navegar(RUTAS_POR_ROL['ESTUDIANTE'], { replace: true })
    } catch (error) {
      setErrorServidor(error instanceof Error ? error.message : 'Error al registrar')
    } finally {
      setCargando(false)
    }
  }

  const registrarEmpresa = async (datos: FormEmpresa) => {
    if (datos.password !== datos.confirmar) {
      formEmp.setError('confirmar', { message: 'Las contraseñas no coinciden' })
      return
    }
    setErrorServidor('')
    setCargando(true)
    try {
      await registrar({
        email: datos.email,
        password: datos.password,
        rol: 'EMPRESA',
        nombre: datos.nombre,
        rubro: datos.rubro,
      })
      navegar(RUTAS_POR_ROL['EMPRESA'], { replace: true })
    } catch (error) {
      setErrorServidor(error instanceof Error ? error.message : 'Error al registrar')
    } finally {
      setCargando(false)
    }
  }

  const limpiarError = () => setErrorServidor('')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-10">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">ImpulsaTec</CardTitle>
          <CardDescription>Crea tu cuenta para comenzar</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={v => { setTab(v as typeof tab); limpiarError() }}>
            <TabsList className="grid grid-cols-2 w-full mb-6">
              <TabsTrigger value="estudiante">Soy Estudiante</TabsTrigger>
              <TabsTrigger value="empresa">Soy Empresa</TabsTrigger>
            </TabsList>

            {/* ── FORMULARIO ESTUDIANTE ─────────────────────── */}
            <TabsContent value="estudiante">
              <form onSubmit={formEst.handleSubmit(registrarEstudiante)} noValidate className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="nombre">Nombre</Label>
                    <Input
                      id="nombre"
                      placeholder="Juan"
                      autoComplete="given-name"
                      {...formEst.register('nombre', { required: 'Campo obligatorio' })}
                    />
                    {formEst.formState.errors.nombre && (
                      <p className="text-xs text-red-500">{formEst.formState.errors.nombre.message}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="apellido">Apellido</Label>
                    <Input
                      id="apellido"
                      placeholder="Pérez"
                      autoComplete="family-name"
                      {...formEst.register('apellido', { required: 'Campo obligatorio' })}
                    />
                    {formEst.formState.errors.apellido && (
                      <p className="text-xs text-red-500">{formEst.formState.errors.apellido.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="emailEst">Correo electrónico</Label>
                  <Input
                    id="emailEst"
                    type="email"
                    placeholder="correo@ejemplo.com"
                    autoComplete="email"
                    {...formEst.register('email', {
                      required: 'Campo obligatorio',
                      pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Correo inválido' },
                    })}
                  />
                  {formEst.formState.errors.email && (
                    <p className="text-xs text-red-500">{formEst.formState.errors.email.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="passEst">Contraseña</Label>
                    <Input
                      id="passEst"
                      type="password"
                      placeholder="••••••••"
                      autoComplete="new-password"
                      {...formEst.register('password', {
                        required: 'Campo obligatorio',
                        minLength: { value: 6, message: 'Mínimo 6 caracteres' },
                      })}
                    />
                    {formEst.formState.errors.password && (
                      <p className="text-xs text-red-500">{formEst.formState.errors.password.message}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="confirmarEst">Confirmar</Label>
                    <Input
                      id="confirmarEst"
                      type="password"
                      placeholder="••••••••"
                      autoComplete="new-password"
                      {...formEst.register('confirmar', { required: 'Campo obligatorio' })}
                    />
                    {formEst.formState.errors.confirmar && (
                      <p className="text-xs text-red-500">{formEst.formState.errors.confirmar.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>Especialidad</Label>
                  <Controller
                    control={formEst.control}
                    name="especialidad"
                    rules={{ required: 'Selecciona una especialidad' }}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value ?? ''}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona tu especialidad" />
                        </SelectTrigger>
                        <SelectContent>
                          {especialidades.map(esp => (
                            <SelectItem key={esp} value={esp}>{esp}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {formEst.formState.errors.especialidad && (
                    <p className="text-xs text-red-500">{formEst.formState.errors.especialidad.message}</p>
                  )}
                </div>

                {errorServidor && (
                  <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3">
                    <p className="text-sm text-red-600">{errorServidor}</p>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={cargando}>
                  {cargando ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Crear cuenta de estudiante
                </Button>
              </form>
            </TabsContent>

            {/* ── FORMULARIO EMPRESA ────────────────────────── */}
            <TabsContent value="empresa">
              <form onSubmit={formEmp.handleSubmit(registrarEmpresa)} noValidate className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="nombreEmp">Nombre de la empresa</Label>
                  <Input
                    id="nombreEmp"
                    placeholder="Ej: Electro Servicios SA"
                    autoComplete="organization"
                    {...formEmp.register('nombre', { required: 'Campo obligatorio' })}
                  />
                  {formEmp.formState.errors.nombre && (
                    <p className="text-xs text-red-500">{formEmp.formState.errors.nombre.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="emailEmp">Correo electrónico</Label>
                  <Input
                    id="emailEmp"
                    type="email"
                    placeholder="contacto@empresa.cl"
                    autoComplete="email"
                    {...formEmp.register('email', {
                      required: 'Campo obligatorio',
                      pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Correo inválido' },
                    })}
                  />
                  {formEmp.formState.errors.email && (
                    <p className="text-xs text-red-500">{formEmp.formState.errors.email.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="passEmp">Contraseña</Label>
                    <Input
                      id="passEmp"
                      type="password"
                      placeholder="••••••••"
                      autoComplete="new-password"
                      {...formEmp.register('password', {
                        required: 'Campo obligatorio',
                        minLength: { value: 6, message: 'Mínimo 6 caracteres' },
                      })}
                    />
                    {formEmp.formState.errors.password && (
                      <p className="text-xs text-red-500">{formEmp.formState.errors.password.message}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="confirmarEmp">Confirmar</Label>
                    <Input
                      id="confirmarEmp"
                      type="password"
                      placeholder="••••••••"
                      autoComplete="new-password"
                      {...formEmp.register('confirmar', { required: 'Campo obligatorio' })}
                    />
                    {formEmp.formState.errors.confirmar && (
                      <p className="text-xs text-red-500">{formEmp.formState.errors.confirmar.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>Rubro</Label>
                  <Controller
                    control={formEmp.control}
                    name="rubro"
                    rules={{ required: 'Selecciona un rubro' }}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value ?? ''}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona el rubro de tu empresa" />
                        </SelectTrigger>
                        <SelectContent>
                          {rubros.map(r => (
                            <SelectItem key={r} value={r}>{r}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {formEmp.formState.errors.rubro && (
                    <p className="text-xs text-red-500">{formEmp.formState.errors.rubro.message}</p>
                  )}
                </div>

                {errorServidor && (
                  <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3">
                    <p className="text-sm text-red-600">{errorServidor}</p>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={cargando}>
                  {cargando ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Crear cuenta de empresa
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <p className="mt-5 text-center text-sm text-gray-500">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-[#0F172A] font-medium hover:underline">
              Inicia sesión
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
