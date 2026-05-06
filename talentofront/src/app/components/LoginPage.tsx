import { useState } from 'react'
import { useNavigate, Link } from 'react-router'
import { useForm } from 'react-hook-form'
import { useAuth } from '../context/AuthContext'
import logoImage from '../../assets/17a2f6b30bc584421f868b1534160753545e9968.png'

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
    <div className="min-h-screen grid grid-cols-12">
      {/* Panel izquierdo — formulario */}
      <div className="col-span-12 md:col-span-6 lg:col-span-5 flex flex-col px-8 md:px-16 py-10 bg-bone border-r hairline">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 mb-2">
          <img
            src={logoImage}
            alt="Cardenal Caro"
            className="h-10 bg-white rounded px-1.5 py-0.5 border hairline"
          />
          <div>
            <div className="font-display text-[22px] leading-none text-ink">ImpulsaTec</div>
            <div className="smallcaps text-[9px] text-ink/50 mt-0.5">Centro Cardenal José María Caro</div>
          </div>
        </Link>

        <div className="flex-1 flex flex-col justify-center max-w-[420px] mx-auto w-full">
          <div className="smallcaps text-[11px] font-semibold text-ink/55 mb-2">Bienvenida de vuelta</div>
          <h1 className="font-display text-[52px] leading-[0.98] text-ink">
            Inicia sesión<br />en tu cuenta.
          </h1>
          <p className="text-[14px] text-ink/60 mt-4 leading-relaxed">
            Accede a tu perfil, postulaciones y mensajes. Usa tu correo institucional o empresarial.
          </p>

          <form onSubmit={handleSubmit(alEnviar)} noValidate className="mt-10 space-y-4">
            <div>
              <div className="smallcaps text-[11px] font-semibold text-ink/55 mb-1.5">Correo electrónico</div>
              <input
                id="email"
                type="email"
                placeholder="tu@correo.cl"
                autoComplete="email"
                className="w-full border hairline-strong rounded-md px-3 h-10 text-[13px] bg-bone-50 outline-none focus:border-ink placeholder:text-ink/40"
                {...register('email', {
                  required: 'El correo es obligatorio',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Ingresa un correo válido',
                  },
                })}
              />
              {errors.email && (
                <p className="text-[12px] text-terra mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="smallcaps text-[11px] font-semibold text-ink/55">Contraseña</div>
                <span className="text-[11px] text-terra hover:text-terra-600 cursor-pointer">
                  ¿Olvidaste tu contraseña?
                </span>
              </div>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full border hairline-strong rounded-md px-3 h-10 text-[13px] bg-bone-50 outline-none focus:border-ink"
                {...register('password', {
                  required: 'La contraseña es obligatoria',
                  minLength: { value: 6, message: 'Mínimo 6 caracteres' },
                })}
              />
              {errors.password && (
                <p className="text-[12px] text-terra mt-1">{errors.password.message}</p>
              )}
            </div>

            {errorServidor && (
              <div className="rounded-md bg-terra-100 border border-terra/20 px-4 py-3">
                <p className="text-[13px] text-terra-700">{errorServidor}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={cargando}
              className="hover-lift w-full h-12 bg-ink text-bone rounded-full text-[14px] font-medium flex items-center justify-center gap-2 hover:bg-ink-800 disabled:opacity-60"
            >
              {cargando ? 'Ingresando…' : 'Iniciar sesión →'}
            </button>
          </form>

          <div className="my-8 flex items-center gap-3 text-[11px] text-ink/40">
            <div className="flex-1 h-px bg-ink/10" />
            <span className="smallcaps">o</span>
            <div className="flex-1 h-px bg-ink/10" />
          </div>

          <p className="text-center text-[12px] text-ink/55">
            ¿No tienes cuenta?{' '}
            <Link to="/registro" className="font-medium text-ink hover:text-terra">
              Regístrate aquí
            </Link>
          </p>
        </div>

        <div className="text-[10px] text-ink/40 flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <rect x="4" y="11" width="16" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          Tu información está protegida por el colegio
        </div>
      </div>

      {/* Panel derecho — editorial oscuro */}
      <div className="hidden md:block md:col-span-6 lg:col-span-7 bg-ink text-bone relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'radial-gradient(#F6F3EC 1px, transparent 1px)', backgroundSize: '32px 32px' }}
        />
        <div className="relative h-full flex flex-col justify-between p-12 md:p-16">
          <div className="smallcaps text-[11px] text-terra font-semibold">
            ImpulsaTec · 2026
          </div>

          <div className="text-center flex flex-col items-center">
            <div className="font-display italic text-[40px] md:text-[52px] leading-[1.05] text-bone max-w-[520px]">
              "El colegio nos enseña lo técnico. ImpulsaTec nos conecta con el mundo real."
            </div>
          </div>

          <div className="grid grid-cols-3 border-t border-bone/15 pt-6">
            {[
              { n: '142', l: 'Estudiantes' },
              { n: '38',  l: 'Empresas' },
              { n: '217', l: 'Pasantías activas' },
            ].map((s, i) => (
              <div key={i} className={i !== 0 ? 'border-l border-bone/15 pl-4' : ''}>
                <div className="font-display text-[40px] leading-none">{s.n}</div>
                <div className="smallcaps text-[10px] text-bone/55 mt-2">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
