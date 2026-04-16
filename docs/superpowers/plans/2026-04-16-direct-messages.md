# Direct Messages (DMs) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar mensajería directa estilo Instagram entre empresas↔estudiantes y estudiantes↔estudiantes, accesible desde el navbar de cada dashboard.

**Architecture:** Dos nuevos modelos Prisma (`Conversacion` + `MensajeDirecto`) con una ruta REST en `/api/conversaciones`. En el frontend, un componente `PanelDMs.tsx` con dos capas (lista de hilos → hilo individual) reemplaza el placeholder "Mensajes" en ambos dashboards. El flujo "Contactar" de empresa se integra para abrir automáticamente el hilo DM.

**Tech Stack:** Express.js + Prisma ORM (PostgreSQL), React 18 + TypeScript, Tailwind CSS v4, motion/react, shadcn/ui, sonner (toasts)

---

## Mapa de archivos

| Acción | Archivo | Responsabilidad |
|--------|---------|-----------------|
| Modificar | `server/prisma/schema.prisma` | Agregar `TipoConversacion`, `Conversacion`, `MensajeDirecto` |
| Crear | `server/rutas/conversaciones.js` | Endpoints CRUD de conversaciones y mensajes directos |
| Modificar | `server/rutas/contactos.js` | `POST /api/contactos` crea también hilo DM y devuelve `conversacionId` |
| Modificar | `server/index.js` | Montar `rutasConversaciones` en `/api/conversaciones` |
| Crear | `talentofront/src/app/components/PanelDMs.tsx` | Panel lateral DM con lista de hilos + vista de hilo individual |
| Modificar | `talentofront/src/app/components/CompanyDashboard.tsx` | Botón "Mensajes" → `PanelDMs`; botón "Contactar" → abre hilo DM |
| Modificar | `talentofront/src/app/components/StudentDashboard.tsx` | Botón "Mensajes" → `PanelDMs` con tabs; botón "Enviar mensaje" en perfil de estudiante |

---

## Task 1: Agregar modelos al schema de Prisma

**Files:**
- Modify: `server/prisma/schema.prisma`

- [ ] **Step 1: Agregar enum y modelos al final del schema**

Abrir `server/prisma/schema.prisma` y agregar al final del archivo:

```prisma
// ─── CONVERSACIONES DIRECTAS (DMs) ───────────────────────────

enum TipoConversacion {
  EMPRESA_ESTUDIANTE
  ESTUDIANTE_ESTUDIANTE
}

model Conversacion {
  id            Int              @id @default(autoincrement())
  tipo          TipoConversacion
  empresaId     Int?
  estudiante1Id Int
  estudiante2Id Int?
  creadoEn      DateTime         @default(now())

  empresa       Empresa?    @relation(fields: [empresaId], references: [id], onDelete: Cascade)
  estudiante1   Estudiante  @relation("conv_est1", fields: [estudiante1Id], references: [id])
  estudiante2   Estudiante? @relation("conv_est2", fields: [estudiante2Id], references: [id])
  mensajes      MensajeDirecto[]
}

model MensajeDirecto {
  id                 Int      @id @default(autoincrement())
  conversacionId     Int
  contenido          String
  autorTipo          Rol
  emisorEmpresaId    Int?
  emisorEstudianteId Int?
  leido              Boolean  @default(false)
  creadoEn           DateTime @default(now())

  conversacion       Conversacion @relation(fields: [conversacionId], references: [id], onDelete: Cascade)
  emisorEmpresa      Empresa?     @relation("dm_emisor_empresa", fields: [emisorEmpresaId], references: [id])
  emisorEstudiante   Estudiante?  @relation("dm_emisor_estudiante", fields: [emisorEstudianteId], references: [id])
}
```

También agregar las relaciones inversas en los modelos existentes. En el modelo `Empresa` agregar:
```prisma
  conversaciones      Conversacion[]
  mensajesDirectosEmitidos MensajeDirecto[] @relation("dm_emisor_empresa")
```

En el modelo `Estudiante` agregar:
```prisma
  conversaciones1     Conversacion[]  @relation("conv_est1")
  conversaciones2     Conversacion[]  @relation("conv_est2")
  mensajesDirectosEmitidos MensajeDirecto[] @relation("dm_emisor_estudiante")
```

- [ ] **Step 2: Correr la migración**

```bash
cd server
npx prisma migrate dev --name add_conversaciones_dm
```

Resultado esperado: migración aplicada sin errores, nuevas tablas `Conversacion` y `MensajeDirecto` creadas en la DB.

- [ ] **Step 3: Regenerar el cliente Prisma**

```bash
npx prisma generate
```

- [ ] **Step 4: Verificar que el servidor arranca sin errores**

```bash
npm run dev
```

Resultado esperado: `Servidor en puerto 3000` sin errores de Prisma.

- [ ] **Step 5: Commit**

```bash
cd ..
git add server/prisma/schema.prisma server/prisma/migrations/
git commit -m "feat: agregar modelos Conversacion y MensajeDirecto al schema"
```

---

## Task 2: Crear ruta `/api/conversaciones`

**Files:**
- Create: `server/rutas/conversaciones.js`

- [ ] **Step 1: Crear el archivo con los 5 endpoints**

Crear `server/rutas/conversaciones.js`:

```javascript
const express = require('express')
const prisma = require('../prismaClient')
const verificarToken = require('../middleware/verificarToken')

const router = express.Router()

// Función auxiliar: verifica que el usuario autenticado sea participante del hilo
async function esParticipante(conv, req) {
  if (req.usuario.rol === 'EMPRESA') {
    const empresa = await prisma.empresa.findUnique({ where: { usuarioId: req.usuario.id } })
    return empresa && conv.empresaId === empresa.id
  }
  if (req.usuario.rol === 'ESTUDIANTE') {
    const estudiante = await prisma.estudiante.findUnique({ where: { usuarioId: req.usuario.id } })
    return estudiante && (conv.estudiante1Id === estudiante.id || conv.estudiante2Id === estudiante.id)
  }
  return false
}

// Función auxiliar: construye el objeto contraparte según tipo y rol del autenticado
function buildContraparte(conv, rolActual, idActual) {
  if (conv.tipo === 'EMPRESA_ESTUDIANTE') {
    if (rolActual === 'EMPRESA') {
      return { id: conv.estudiante1.id, nombre: `${conv.estudiante1.nombre} ${conv.estudiante1.apellido}`, logoUrl: conv.estudiante1.fotoUrl }
    }
    return { id: conv.empresa.id, nombre: conv.empresa.nombre, logoUrl: conv.empresa.logoUrl }
  }
  // ESTUDIANTE_ESTUDIANTE
  if (conv.estudiante1Id === idActual) {
    return { id: conv.estudiante2.id, nombre: `${conv.estudiante2.nombre} ${conv.estudiante2.apellido}`, logoUrl: conv.estudiante2.fotoUrl }
  }
  return { id: conv.estudiante1.id, nombre: `${conv.estudiante1.nombre} ${conv.estudiante1.apellido}`, logoUrl: conv.estudiante1.fotoUrl }
}

// GET /api/conversaciones — lista de hilos del usuario autenticado
router.get('/', verificarToken, async (req, res) => {
  try {
    let conversaciones = []

    if (req.usuario.rol === 'EMPRESA') {
      const empresa = await prisma.empresa.findUnique({ where: { usuarioId: req.usuario.id } })
      if (!empresa) return res.status(404).json({ error: 'Perfil de empresa no encontrado' })

      conversaciones = await prisma.conversacion.findMany({
        where: { empresaId: empresa.id },
        include: {
          empresa: { select: { id: true, nombre: true, logoUrl: true } },
          estudiante1: { select: { id: true, nombre: true, apellido: true, fotoUrl: true } },
          mensajes: { orderBy: { creadoEn: 'desc' }, take: 1 },
          _count: { select: { mensajes: { where: { autorTipo: 'ESTUDIANTE', leido: false } } } },
        },
        orderBy: { creadoEn: 'desc' },
      })

      return res.json(conversaciones.map(conv => ({
        id: conv.id,
        tipo: conv.tipo,
        contraparte: buildContraparte(conv, 'EMPRESA', empresa.id),
        ultimoMensaje: conv.mensajes[0] ? { contenido: conv.mensajes[0].contenido, creadoEn: conv.mensajes[0].creadoEn } : null,
        noLeidos: conv._count.mensajes,
      })))
    }

    if (req.usuario.rol === 'ESTUDIANTE') {
      const estudiante = await prisma.estudiante.findUnique({ where: { usuarioId: req.usuario.id } })
      if (!estudiante) return res.status(404).json({ error: 'Perfil de estudiante no encontrado' })

      const [convEmpresa, convEstudiante] = await Promise.all([
        prisma.conversacion.findMany({
          where: { tipo: 'EMPRESA_ESTUDIANTE', estudiante1Id: estudiante.id },
          include: {
            empresa: { select: { id: true, nombre: true, logoUrl: true } },
            estudiante1: { select: { id: true, nombre: true, apellido: true, fotoUrl: true } },
            mensajes: { orderBy: { creadoEn: 'desc' }, take: 1 },
            _count: { select: { mensajes: { where: { autorTipo: 'EMPRESA', leido: false } } } },
          },
          orderBy: { creadoEn: 'desc' },
        }),
        prisma.conversacion.findMany({
          where: {
            tipo: 'ESTUDIANTE_ESTUDIANTE',
            OR: [{ estudiante1Id: estudiante.id }, { estudiante2Id: estudiante.id }],
          },
          include: {
            estudiante1: { select: { id: true, nombre: true, apellido: true, fotoUrl: true } },
            estudiante2: { select: { id: true, nombre: true, apellido: true, fotoUrl: true } },
            mensajes: { orderBy: { creadoEn: 'desc' }, take: 1 },
            _count: {
              select: {
                mensajes: {
                  where: {
                    autorTipo: 'ESTUDIANTE',
                    leido: false,
                    NOT: { emisorEstudianteId: estudiante.id },
                  },
                },
              },
            },
          },
          orderBy: { creadoEn: 'desc' },
        }),
      ])

      const resultado = [
        ...convEmpresa.map(conv => ({
          id: conv.id,
          tipo: conv.tipo,
          contraparte: buildContraparte(conv, 'ESTUDIANTE', estudiante.id),
          ultimoMensaje: conv.mensajes[0] ? { contenido: conv.mensajes[0].contenido, creadoEn: conv.mensajes[0].creadoEn } : null,
          noLeidos: conv._count.mensajes,
        })),
        ...convEstudiante.map(conv => ({
          id: conv.id,
          tipo: conv.tipo,
          contraparte: buildContraparte(conv, 'ESTUDIANTE', estudiante.id),
          ultimoMensaje: conv.mensajes[0] ? { contenido: conv.mensajes[0].contenido, creadoEn: conv.mensajes[0].creadoEn } : null,
          noLeidos: conv._count.mensajes,
        })),
      ]

      return res.json(resultado)
    }

    return res.status(403).json({ error: 'Acceso no permitido' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al obtener conversaciones' })
  }
})

// GET /api/conversaciones/:id — mensajes de un hilo
router.get('/:id', verificarToken, async (req, res) => {
  const id = parseInt(req.params.id)
  if (isNaN(id)) return res.status(400).json({ error: 'id inválido' })

  try {
    const conv = await prisma.conversacion.findUnique({
      where: { id },
      include: {
        empresa: { select: { id: true, nombre: true, logoUrl: true } },
        estudiante1: { select: { id: true, nombre: true, apellido: true, fotoUrl: true } },
        estudiante2: { select: { id: true, nombre: true, apellido: true, fotoUrl: true } },
        mensajes: { orderBy: { creadoEn: 'asc' } },
      },
    })
    if (!conv) return res.status(404).json({ error: 'Conversación no encontrada' })

    if (!(await esParticipante(conv, req))) {
      return res.status(403).json({ error: 'No tienes acceso a esta conversación' })
    }

    res.json(conv.mensajes)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al obtener mensajes' })
  }
})

// POST /api/conversaciones — crea o devuelve hilo existente
// EMPRESA: { estudianteId }
// ESTUDIANTE: { estudianteId } (del otro estudiante)
router.post('/', verificarToken, async (req, res) => {
  const { estudianteId } = req.body

  if (!estudianteId || isNaN(parseInt(estudianteId))) {
    return res.status(400).json({ error: 'estudianteId es requerido' })
  }

  const estudianteIdParsed = parseInt(estudianteId)

  try {
    if (req.usuario.rol === 'EMPRESA') {
      const empresa = await prisma.empresa.findUnique({ where: { usuarioId: req.usuario.id } })
      if (!empresa) return res.status(404).json({ error: 'Perfil de empresa no encontrado' })

      // Buscar hilo existente
      let conv = await prisma.conversacion.findFirst({
        where: { tipo: 'EMPRESA_ESTUDIANTE', empresaId: empresa.id, estudiante1Id: estudianteIdParsed },
      })

      if (!conv) {
        conv = await prisma.conversacion.create({
          data: { tipo: 'EMPRESA_ESTUDIANTE', empresaId: empresa.id, estudiante1Id: estudianteIdParsed },
        })
      }

      return res.status(201).json({ id: conv.id })
    }

    if (req.usuario.rol === 'ESTUDIANTE') {
      const estudiante = await prisma.estudiante.findUnique({ where: { usuarioId: req.usuario.id } })
      if (!estudiante) return res.status(404).json({ error: 'Perfil de estudiante no encontrado' })

      if (estudiante.id === estudianteIdParsed) {
        return res.status(400).json({ error: 'No puedes iniciar un hilo contigo mismo' })
      }

      // Par ordenado para idempotencia
      const est1Id = Math.min(estudiante.id, estudianteIdParsed)
      const est2Id = Math.max(estudiante.id, estudianteIdParsed)

      let conv = await prisma.conversacion.findFirst({
        where: { tipo: 'ESTUDIANTE_ESTUDIANTE', estudiante1Id: est1Id, estudiante2Id: est2Id },
      })

      if (!conv) {
        conv = await prisma.conversacion.create({
          data: { tipo: 'ESTUDIANTE_ESTUDIANTE', estudiante1Id: est1Id, estudiante2Id: est2Id },
        })
      }

      return res.status(201).json({ id: conv.id })
    }

    return res.status(403).json({ error: 'Acceso no permitido' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al crear conversación' })
  }
})

// POST /api/conversaciones/:id/mensajes — enviar mensaje al hilo
router.post('/:id/mensajes', verificarToken, async (req, res) => {
  const id = parseInt(req.params.id)
  if (isNaN(id)) return res.status(400).json({ error: 'id inválido' })

  const { contenido } = req.body
  if (!contenido?.trim()) return res.status(400).json({ error: 'contenido es requerido' })

  try {
    const conv = await prisma.conversacion.findUnique({
      where: { id },
      include: {
        empresa: true,
        estudiante1: true,
        estudiante2: true,
      },
    })
    if (!conv) return res.status(404).json({ error: 'Conversación no encontrada' })

    if (!(await esParticipante(conv, req))) {
      return res.status(403).json({ error: 'No tienes acceso a esta conversación' })
    }

    let emisorEmpresaId = null
    let emisorEstudianteId = null

    if (req.usuario.rol === 'EMPRESA') {
      const empresa = await prisma.empresa.findUnique({ where: { usuarioId: req.usuario.id } })
      emisorEmpresaId = empresa.id
    } else {
      const estudiante = await prisma.estudiante.findUnique({ where: { usuarioId: req.usuario.id } })
      emisorEstudianteId = estudiante.id
    }

    const mensaje = await prisma.mensajeDirecto.create({
      data: {
        conversacionId: id,
        contenido: contenido.trim(),
        autorTipo: req.usuario.rol,
        emisorEmpresaId,
        emisorEstudianteId,
      },
    })

    res.status(201).json(mensaje)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al enviar mensaje' })
  }
})

// PATCH /api/conversaciones/:id/leido — marca mensajes del otro participante como leídos
router.patch('/:id/leido', verificarToken, async (req, res) => {
  const id = parseInt(req.params.id)
  if (isNaN(id)) return res.status(400).json({ error: 'id inválido' })

  try {
    const conv = await prisma.conversacion.findUnique({ where: { id } })
    if (!conv) return res.status(404).json({ error: 'Conversación no encontrada' })

    if (!(await esParticipante(conv, req))) {
      return res.status(403).json({ error: 'No tienes acceso a esta conversación' })
    }

    if (req.usuario.rol === 'EMPRESA') {
      await prisma.mensajeDirecto.updateMany({
        where: { conversacionId: id, autorTipo: 'ESTUDIANTE', leido: false },
        data: { leido: true },
      })
    } else {
      const estudiante = await prisma.estudiante.findUnique({ where: { usuarioId: req.usuario.id } })
      await prisma.mensajeDirecto.updateMany({
        where: {
          conversacionId: id,
          leido: false,
          NOT: { emisorEstudianteId: estudiante.id },
        },
        data: { leido: true },
      })
    }

    res.json({ ok: true })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al marcar mensajes como leídos' })
  }
})

module.exports = router
```

- [ ] **Step 2: Montar la ruta en `server/index.js`**

En `server/index.js`, agregar después de la importación de `rutasMensajes`:

```javascript
const rutasConversaciones = require('./rutas/conversaciones')
```

Y después de `app.use('/api/mensajes', rutasMensajes)`:

```javascript
app.use('/api/conversaciones', rutasConversaciones)
```

- [ ] **Step 3: Verificar que el servidor arranca sin errores**

```bash
cd server && npm run dev
```

Resultado esperado: `Servidor en puerto 3000` sin errores.

- [ ] **Step 4: Commit**

```bash
git add server/rutas/conversaciones.js server/index.js
git commit -m "feat: agregar endpoints /api/conversaciones para DMs"
```

---

## Task 3: Actualizar `POST /api/contactos` para abrir hilo DM

**Files:**
- Modify: `server/rutas/contactos.js`

- [ ] **Step 1: Actualizar el handler `POST /api/contactos`**

En `server/rutas/contactos.js`, reemplazar el handler `POST /` completo por:

```javascript
router.post('/', verificarToken, async (req, res) => {
  if (req.usuario.rol !== 'EMPRESA') {
    return res.status(403).json({ error: 'Solo las empresas pueden enviar contactos' })
  }

  const { estudianteId, mensaje } = req.body
  if (!estudianteId) {
    return res.status(400).json({ error: 'estudianteId es requerido' })
  }

  try {
    const empresa = await prisma.empresa.findUnique({ where: { usuarioId: req.usuario.id } })
    if (!empresa) return res.status(404).json({ error: 'Perfil no encontrado' })

    const estudianteIdParsed = parseInt(estudianteId)

    // Crear contacto
    const contacto = await prisma.contacto.create({
      data: {
        empresaId: empresa.id,
        estudianteId: estudianteIdParsed,
        mensaje: mensaje?.trim() || null,
      },
    })

    // Crear o reutilizar hilo DM
    let conv = await prisma.conversacion.findFirst({
      where: { tipo: 'EMPRESA_ESTUDIANTE', empresaId: empresa.id, estudiante1Id: estudianteIdParsed },
    })

    if (!conv) {
      conv = await prisma.conversacion.create({
        data: { tipo: 'EMPRESA_ESTUDIANTE', empresaId: empresa.id, estudiante1Id: estudianteIdParsed },
      })
    }

    // Si hay mensaje inicial, crearlo como MensajeDirecto
    if (mensaje?.trim()) {
      await prisma.mensajeDirecto.create({
        data: {
          conversacionId: conv.id,
          contenido: mensaje.trim(),
          autorTipo: 'EMPRESA',
          emisorEmpresaId: empresa.id,
        },
      })
    }

    res.status(201).json({ contacto, conversacionId: conv.id })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al registrar contacto' })
  }
})
```

- [ ] **Step 2: Verificar que el servidor arranca sin errores**

```bash
cd server && npm run dev
```

- [ ] **Step 3: Commit**

```bash
git add server/rutas/contactos.js
git commit -m "feat: POST /api/contactos crea hilo DM automáticamente y devuelve conversacionId"
```

---

## Task 4: Crear componente `PanelDMs.tsx`

**Files:**
- Create: `talentofront/src/app/components/PanelDMs.tsx`

- [ ] **Step 1: Crear el componente**

Crear `talentofront/src/app/components/PanelDMs.tsx`:

```tsx
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

export function PanelDMs({ abierto, onCerrar, rolActual, token, hiloInicialId, onBadgeChange }: Props) {
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

  const cargarHilos = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/conversaciones`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const datos: Hilo[] = await res.json()
        setHilos(datos)
        const totalNoLeidos = new Set(datos.filter(h => h.noLeidos > 0).map(h => h.id)).size
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

  // Abrir hilo inicial si se pasa hiloInicialId
  useEffect(() => {
    if (!abierto || !hiloInicialId || hilos.length === 0) return
    const hilo = hilos.find(h => h.id === hiloInicialId)
    if (hilo) abrirHilo(hilo)
  }, [abierto, hiloInicialId, hilos])

  // Reset al cerrar
  useEffect(() => {
    if (!abierto) {
      setHiloActivo(null)
      setMensajes([])
      setTexto('')
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

  const abrirHilo = async (hilo: Hilo) => {
    setHiloActivo(hilo)
    setCargandoMensajes(true)
    await cargarMensajes(hilo.id)
    setCargandoMensajes(false)
    await marcarLeidos(hilo.id)
    await cargarHilos()
    setTimeout(() => refInput.current?.focus(), 100)
  }

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

  const esMioElMensaje = (m: MensajeDM) => m.autorTipo === rolActual

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
                <>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">Mensajes</p>
                  </div>
                </>
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
                    {/* Badge de no leídos en tab */}
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
```

- [ ] **Step 2: Verificar que el archivo compila sin errores TypeScript**

```bash
cd talentofront && pnpm build 2>&1 | head -30
```

Resultado esperado: sin errores de tipo en `PanelDMs.tsx`.

- [ ] **Step 3: Commit**

```bash
git add talentofront/src/app/components/PanelDMs.tsx
git commit -m "feat: crear componente PanelDMs para mensajería directa estilo Instagram"
```

---

## Task 5: Integrar `PanelDMs` en `CompanyDashboard`

**Files:**
- Modify: `talentofront/src/app/components/CompanyDashboard.tsx`

- [ ] **Step 1: Importar `PanelDMs` y agregar estado**

Al inicio de `CompanyDashboard.tsx`, añadir el import:

```tsx
import { PanelDMs } from './PanelDMs'
```

Dentro del componente, junto a los otros estados, agregar:

```tsx
const [panelDMsAbierto, setPanelDMsAbierto] = useState(false)
const [dmHiloInicial, setDmHiloInicial] = useState<number | null>(null)
const [dmsBadge, setDmsBadge] = useState(0)
```

- [ ] **Step 2: Actualizar el botón "Mensajes" en el navbar**

Buscar el botón del navbar que tiene `<MessageSquare>` y texto "Mensajes". Actualmente abre `setPanelChatAbierto`. Reemplazarlo para que abra `PanelDMs`:

```tsx
<button
  onClick={() => { setPanelDMsAbierto(true); setDmHiloInicial(null) }}
  className="relative flex items-center gap-1.5 text-white/70 hover:text-white transition-colors"
>
  <MessageSquare className="w-4 h-4" />
  <span>Mensajes</span>
  {dmsBadge > 0 && (
    <span className="absolute -top-1.5 -right-2 bg-[#F97316] text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold leading-none">
      {dmsBadge}
    </span>
  )}
</button>
```

- [ ] **Step 3: Actualizar el botón "Contactar estudiante"**

Buscar el `onClick` del botón "Contactar estudiante" (línea ~1374). El handler actual llama a `POST /api/contactos` y muestra un toast. Reemplazar el `onClick` por:

```tsx
onClick={async () => {
  if (!sesion || !estudianteSel) return
  try {
    const res = await fetch(`${API_URL}/api/contactos`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${sesion.token}` },
      body: JSON.stringify({ estudianteId: estudianteSel.id }),
    })
    if (!res.ok) throw new Error()
    const datos = await res.json()
    toast.success("Contacto registrado correctamente")
    setEstudianteSel(null)
    setDmHiloInicial(datos.conversacionId)
    setPanelDMsAbierto(true)
  } catch {
    toast.error("Error al registrar el contacto")
  }
}}
```

- [ ] **Step 4: Montar `PanelDMs` en el JSX**

Al final del JSX del componente, junto a donde está montado `PanelChat`, agregar:

```tsx
{sesion && perfil && (
  <PanelDMs
    abierto={panelDMsAbierto}
    onCerrar={() => { setPanelDMsAbierto(false); setDmHiloInicial(null) }}
    rolActual="EMPRESA"
    token={sesion.token}
    hiloInicialId={dmHiloInicial}
    onBadgeChange={setDmsBadge}
  />
)}
```

- [ ] **Step 5: Verificar compilación**

```bash
cd talentofront && pnpm build 2>&1 | head -30
```

- [ ] **Step 6: Commit**

```bash
git add talentofront/src/app/components/CompanyDashboard.tsx
git commit -m "feat: integrar PanelDMs en CompanyDashboard con badge y apertura desde Contactar"
```

---

## Task 6: Integrar `PanelDMs` en `StudentDashboard`

**Files:**
- Modify: `talentofront/src/app/components/StudentDashboard.tsx`

- [ ] **Step 1: Importar `PanelDMs` y agregar estado**

Al inicio de `StudentDashboard.tsx`, agregar:

```tsx
import { PanelDMs } from './PanelDMs'
```

Dentro del componente, agregar:

```tsx
const [panelDMsAbierto, setPanelDMsAbierto] = useState(false)
const [dmHiloInicial, setDmHiloInicial] = useState<number | null>(null)
const [dmsBadge, setDmsBadge] = useState(0)
```

- [ ] **Step 2: Actualizar el botón "Mensajes" en el navbar**

Buscar el `<Link to="#">` con `<MessageSquare>` y texto "Mensajes" en el navbar del StudentDashboard. Reemplazar el `<Link>` por un `<button>`:

```tsx
<button
  onClick={() => { setPanelDMsAbierto(true); setDmHiloInicial(null) }}
  className="relative flex items-center gap-1.5 text-white/70 hover:text-white transition-colors"
>
  <MessageSquare className="w-4 h-4" />
  <span>Mensajes</span>
  {dmsBadge > 0 && (
    <span className="absolute -top-1.5 -right-2 bg-[#F97316] text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold leading-none">
      {dmsBadge}
    </span>
  )}
</button>
```

- [ ] **Step 3: Agregar botón "Enviar mensaje" en el dialog de perfil de estudiante**

En `StudentDashboard`, buscar dónde se renderiza el dialog o panel de perfil de otro estudiante (si existe en la vista de estudiantes del feed o del directorio). Si en el StudentDashboard hay una sección donde se listan otros estudiantes y se puede ver su perfil, agregar al footer del dialog:

```tsx
<Button
  variant="outline"
  className="w-full rounded-xl h-10 text-sm border-[#0F172A] text-[#0F172A] hover:bg-[#0F172A] hover:text-white"
  onClick={async () => {
    if (!sesion || !estudianteSeleccionado) return
    try {
      const res = await fetch(`${API_URL}/api/conversaciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sesion.token}` },
        body: JSON.stringify({ estudianteId: estudianteSeleccionado.id }),
      })
      if (!res.ok) throw new Error()
      const datos = await res.json()
      setEstudianteSeleccionado(null)
      setDmHiloInicial(datos.id)
      setPanelDMsAbierto(true)
    } catch {
      toast.error('No se pudo abrir la conversación')
    }
  }}
>
  <MessageSquare className="w-4 h-4 mr-2" />
  Enviar mensaje
</Button>
```

> Nota: Si el StudentDashboard no tiene un dialog de perfil de otro estudiante expuesto, omitir este step — el botón se puede agregar en una iteración posterior.

- [ ] **Step 4: Montar `PanelDMs` en el JSX**

Al final del JSX del componente:

```tsx
{sesion && (
  <PanelDMs
    abierto={panelDMsAbierto}
    onCerrar={() => { setPanelDMsAbierto(false); setDmHiloInicial(null) }}
    rolActual="ESTUDIANTE"
    token={sesion.token}
    hiloInicialId={dmHiloInicial}
    onBadgeChange={setDmsBadge}
  />
)}
```

- [ ] **Step 5: Verificar compilación**

```bash
cd talentofront && pnpm build 2>&1 | head -30
```

- [ ] **Step 6: Commit**

```bash
git add talentofront/src/app/components/StudentDashboard.tsx
git commit -m "feat: integrar PanelDMs en StudentDashboard con tabs Empresas/Estudiantes"
```

---

## Task 7: Prueba end-to-end manual

- [ ] **Step 1: Arrancar backend y frontend**

```bash
# Terminal 1
cd server && npm run dev

# Terminal 2
cd talentofront && pnpm dev
```

- [ ] **Step 2: Flujo empresa → estudiante**

1. Iniciar sesión como empresa (`empresa@impulsa.cl` / `Empresa1234`)
2. Ir a "Buscar Talento", abrir perfil de un estudiante
3. Hacer clic en "Contactar estudiante" → debe cerrarse el dialog y abrirse `PanelDMs` en el hilo con ese estudiante
4. Escribir un mensaje y enviarlo (Enter)
5. Cerrar el panel, volver a abrir "Mensajes" → debe aparecer el hilo en la lista

- [ ] **Step 3: Flujo estudiante responde**

1. Iniciar sesión como estudiante (crear cuenta si no existe, o usar una existente)
2. Ir al navbar → "Mensajes" → tab "Empresas"
3. Debe aparecer el hilo de la empresa del paso anterior con badge de no leídos
4. Abrir el hilo → ver el mensaje de la empresa
5. Responder → badge debe desaparecer

- [ ] **Step 4: Flujo estudiante → estudiante**

1. Iniciar sesión como estudiante A
2. Abrir "Mensajes" → tab "Estudiantes" → debe estar vacío (sin hilos)
3. *(Si hay botón "Enviar mensaje" en algún perfil de estudiante)* usarlo para abrir un hilo con estudiante B
4. Verificar que estudiante B puede ver el hilo en su tab "Estudiantes"

- [ ] **Step 5: Verificar que "Chat con el colegio" sigue funcionando**

1. Iniciar sesión como empresa
2. Usar el botón "Chat con el colegio" en el sidebar → debe abrir `PanelChat` (el de siempre, sin cambios)
