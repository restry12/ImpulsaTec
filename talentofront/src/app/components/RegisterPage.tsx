import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router'
import { useForm, Controller } from 'react-hook-form'
import { useAuth } from '../context/AuthContext'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import logoImage from '../../assets/17a2f6b30bc584421f868b1534160753545e9968.png'

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

/* Campo de input editorial */
const Campo = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
  <div>
    <div className="smallcaps text-[11px] font-semibold mb-1.5" style={{ color: 'rgba(11,15,26,0.55)' }}>{label}</div>
    {children}
    {error && <p className="text-[12px] mt-1" style={{ color: '#C94A2A' }}>{error}</p>}
  </div>
)

const inputCls = "w-full border hairline-strong rounded-md px-3 h-10 text-[13px] outline-none focus:border-ink placeholder:text-ink/40"

export function RegisterPage() {
  const { registrar } = useAuth()
  const navegar = useNavigate()
  const [rol, setRol] = useState<'ESTUDIANTE' | 'EMPRESA'>('ESTUDIANTE')
  const [colegioId, setColegioId] = useState<number | null>(null)
  const [errorServidor, setErrorServidor] = useState('')
  const [cargando, setCargando] = useState(false)

  const formEst = useForm<FormEstudiante>()
  const formEmp = useForm<FormEmpresa>()

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

  return (
    <div className="min-h-screen bone-grain" style={{ color: '#0B0F1A' }}>
      {/* Header */}
      <div className="max-w-[1240px] mx-auto px-6 py-8 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <img src={logoImage} alt="Cardenal Caro" className="h-10 bg-white rounded px-1.5 py-0.5 border hairline shrink-0" />
          <div className="font-display text-[22px] leading-none">ImpulsaTec</div>
        </Link>
        <Link to="/login" className="text-[13px]" style={{ color: 'rgba(11,15,26,0.6)' }}>
          ¿Ya tienes cuenta? <span className="font-medium" style={{ color: '#0B0F1A' }}>Inicia sesión</span>
        </Link>
      </div>

      <div className="max-w-[720px] mx-auto px-6 pt-6 pb-20">
        {/* Título */}
        <div className="text-center mb-10">
          <div className="smallcaps text-[11px] font-semibold mb-2" style={{ color: 'rgba(11,15,26,0.55)' }}>Crea tu cuenta</div>
          <h1 className="font-display leading-[1.02]" style={{ fontSize: 'clamp(40px, 7vw, 56px)', color: '#0B0F1A' }}>
            ¿Cómo vas a<br /><span className="italic">usar ImpulsaTec?</span>
          </h1>
        </div>

        {/* Selector de rol */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
          {[
            {
              id: 'ESTUDIANTE' as const,
              titulo: 'Soy estudiante',
              desc: 'Busco pasantías o freelance.',
              icono: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="8" r="4" /><path d="M3 21v-1a6 6 0 0 1 12 0v1" />
                  <path d="M19 8a3 3 0 1 1-3 3" /><path d="M22 21v-1a5 5 0 0 0-4-4.9" />
                </svg>
              ),
            },
            {
              id: 'EMPRESA' as const,
              titulo: 'Soy empresa',
              desc: 'Quiero contratar talento técnico.',
              icono: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="3" width="16" height="18" rx="1" />
                  <path d="M9 8h.01M15 8h.01M9 12h.01M15 12h.01M9 16h.01M15 16h.01" />
                </svg>
              ),
            },
          ].map(r => (
            <button
              key={r.id}
              onClick={() => { setRol(r.id); setErrorServidor('') }}
              className="text-left p-5 border rounded-lg transition-all"
              style={{
                background: rol === r.id ? '#0B0F1A' : '#FBFAF6',
                borderColor: rol === r.id ? '#0B0F1A' : 'rgba(11,15,26,0.12)',
                color: rol === r.id ? '#F6F3EC' : '#0B0F1A',
              }}
            >
              <div style={{ color: rol === r.id ? '#C94A2A' : 'rgba(11,15,26,0.55)' }}>{r.icono}</div>
              <div className="font-display text-[20px] mt-3 leading-tight">{r.titulo}</div>
              <div className="text-[11.5px] mt-1" style={{ color: rol === r.id ? 'rgba(246,243,236,0.65)' : 'rgba(11,15,26,0.55)' }}>
                {r.desc}
              </div>
            </button>
          ))}
        </div>

        {/* Formulario */}
        <div className="border hairline rounded-lg p-8" style={{ background: '#FBFAF6' }}>
          {rol === 'ESTUDIANTE' ? (
            <form onSubmit={formEst.handleSubmit(registrarEstudiante)} noValidate className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Campo label="Nombre" error={formEst.formState.errors.nombre?.message}>
                  <input
                    className={inputCls}
                    style={{ background: '#F6F3EC' }}
                    placeholder="Matías"
                    autoComplete="given-name"
                    {...formEst.register('nombre', { required: 'Campo obligatorio' })}
                  />
                </Campo>
                <Campo label="Apellido" error={formEst.formState.errors.apellido?.message}>
                  <input
                    className={inputCls}
                    style={{ background: '#F6F3EC' }}
                    placeholder="Rojas"
                    autoComplete="family-name"
                    {...formEst.register('apellido', { required: 'Campo obligatorio' })}
                  />
                </Campo>
              </div>

              <Campo label="Correo electrónico" error={formEst.formState.errors.email?.message}>
                <input
                  type="email"
                  className={inputCls}
                  style={{ background: '#F6F3EC' }}
                  placeholder="tu@correo.cl"
                  autoComplete="email"
                  {...formEst.register('email', {
                    required: 'Campo obligatorio',
                    pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Correo inválido' },
                  })}
                />
              </Campo>

              <div className="grid grid-cols-2 gap-4">
                <Campo label="Especialidad" error={formEst.formState.errors.especialidad?.message}>
                  <Controller
                    control={formEst.control}
                    name="especialidad"
                    rules={{ required: 'Selecciona una especialidad' }}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value ?? ''}>
                        <SelectTrigger className="border hairline-strong rounded-md h-10 text-[13px]" style={{ background: '#F6F3EC' }}>
                          <SelectValue placeholder="Especialidad" />
                        </SelectTrigger>
                        <SelectContent>
                          {especialidades.map(esp => (
                            <SelectItem key={esp} value={esp}>{esp}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Campo>
                <div className="invisible" />
              </div>

              <Campo label="Contraseña" error={formEst.formState.errors.password?.message}>
                <input
                  type="password"
                  className={inputCls}
                  style={{ background: '#F6F3EC' }}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  {...formEst.register('password', {
                    required: 'Campo obligatorio',
                    minLength: { value: 6, message: 'Mínimo 6 caracteres' },
                  })}
                />
              </Campo>

              <Campo label="Confirmar contraseña" error={formEst.formState.errors.confirmar?.message}>
                <input
                  type="password"
                  className={inputCls}
                  style={{ background: '#F6F3EC' }}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  {...formEst.register('confirmar', { required: 'Campo obligatorio' })}
                />
              </Campo>

              {errorServidor && (
                <div className="rounded-md px-4 py-3 border" style={{ background: '#F2DAD0', borderColor: 'rgba(201,74,42,0.2)' }}>
                  <p className="text-[13px]" style={{ color: '#8E3018' }}>{errorServidor}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={cargando}
                className="hover-lift w-full h-12 rounded-full font-medium text-[14px] flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ background: '#0B0F1A', color: '#F6F3EC' }}
              >
                {cargando ? 'Creando cuenta…' : 'Crear mi cuenta →'}
              </button>
            </form>
          ) : (
            <form onSubmit={formEmp.handleSubmit(registrarEmpresa)} noValidate className="space-y-4">
              <Campo label="Nombre de la empresa" error={formEmp.formState.errors.nombre?.message}>
                <input
                  className={inputCls}
                  style={{ background: '#F6F3EC' }}
                  placeholder="Electro Servicios SA"
                  autoComplete="organization"
                  {...formEmp.register('nombre', { required: 'Campo obligatorio' })}
                />
              </Campo>

              <Campo label="Correo electrónico" error={formEmp.formState.errors.email?.message}>
                <input
                  type="email"
                  className={inputCls}
                  style={{ background: '#F6F3EC' }}
                  placeholder="contacto@empresa.cl"
                  autoComplete="email"
                  {...formEmp.register('email', {
                    required: 'Campo obligatorio',
                    pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Correo inválido' },
                  })}
                />
              </Campo>

              <Campo label="Rubro" error={formEmp.formState.errors.rubro?.message}>
                <Controller
                  control={formEmp.control}
                  name="rubro"
                  rules={{ required: 'Selecciona un rubro' }}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
                      <SelectTrigger className="border hairline-strong rounded-md h-10 text-[13px]" style={{ background: '#F6F3EC' }}>
                        <SelectValue placeholder="Rubro de tu empresa" />
                      </SelectTrigger>
                      <SelectContent>
                        {rubros.map(r => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Campo>

              <Campo label="Contraseña" error={formEmp.formState.errors.password?.message}>
                <input
                  type="password"
                  className={inputCls}
                  style={{ background: '#F6F3EC' }}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  {...formEmp.register('password', {
                    required: 'Campo obligatorio',
                    minLength: { value: 6, message: 'Mínimo 6 caracteres' },
                  })}
                />
              </Campo>

              <Campo label="Confirmar contraseña" error={formEmp.formState.errors.confirmar?.message}>
                <input
                  type="password"
                  className={inputCls}
                  style={{ background: '#F6F3EC' }}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  {...formEmp.register('confirmar', { required: 'Campo obligatorio' })}
                />
              </Campo>

              {errorServidor && (
                <div className="rounded-md px-4 py-3 border" style={{ background: '#F2DAD0', borderColor: 'rgba(201,74,42,0.2)' }}>
                  <p className="text-[13px]" style={{ color: '#8E3018' }}>{errorServidor}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={cargando}
                className="hover-lift w-full h-12 rounded-full font-medium text-[14px] flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ background: '#0B0F1A', color: '#F6F3EC' }}
              >
                {cargando ? 'Creando cuenta…' : 'Crear mi cuenta →'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
