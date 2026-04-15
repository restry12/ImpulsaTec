# Demo Viernes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dejar ImpulsaTec listo para demo escolar el viernes 2026-04-18, mostrando los 4 roles (visitante, estudiante, empresa, admin) sin bugs ni pantallas rotas.

**Architecture:** Primero infraestructura base (env var + toaster), luego cambios de schema y backend, después bugs críticos, y finalmente features nuevas. Cada task es independiente salvo donde se indican dependencias.

**Tech Stack:** Express.js + Prisma v7 (PostgreSQL) · React + Vite + Tailwind v4 · shadcn/ui · sonner (toasts) · react-hook-form · React Router v7

---

## Estado de ejecución (actualizado 2026-04-14)

| Task | Estado | Commits |
|---|---|---|
| Task 1: VITE_API_URL | ✅ COMPLETO | `be99d68`, `bdb8140` |
| Task 2: Toaster en App.tsx | ✅ COMPLETO | incluido en sesión |
| Task 3: Schema Prisma + migración | ⏳ PENDIENTE — empezar aquí |
| Task 4: GET /contactos/me + POST /publico | ⏳ PENDIENTE |
| Task 5: tipoDisponibilidad en backend | ⏳ PENDIENTE |
| Task 6: Fix contacto en PublicDirectory | ⏳ PENDIENTE |
| Task 7: Fix likes persistence | ⏳ PENDIENTE |
| Task 8: Fix duplicados + toasts | ⏳ PENDIENTE |
| Task 9: Fix errores en RegisterPage | ⏳ PENDIENTE |
| Task 10: Vista freelance en PublicDirectory | ⏳ PENDIENTE |
| Task 11: Mis Contactos en StudentDashboard | ⏳ PENDIENTE |
| Task 12: tipoDisponibilidad en editar perfil | ⏳ PENDIENTE |
| Task 13: Stats reales en admin | ⏳ PENDIENTE |
| Task 14: Toast en CompanyDashboard | ⏳ PENDIENTE |
| Task 15: Tab Empresas en Directorio Público | ⏳ PENDIENTE |

**SHA base del plan:** `80d4d68`
**Último commit conocido:** `bdb8140` (fix .gitignore frontend)

---

## Mapa de archivos

| Archivo | Cambios |
|---|---|
| `talentofront/.env` | Crear con `VITE_API_URL` |
| `talentofront/src/app/App.tsx` | Agregar `<Toaster />` |
| `talentofront/src/app/context/AuthContext.tsx` | Usar `VITE_API_URL` |
| `talentofront/src/app/components/PublicDirectory.tsx` | VITE_API_URL + fix contacto + toggle freelance + badges |
| `talentofront/src/app/components/StudentDashboard.tsx` | VITE_API_URL + fix likes + fix duplicados + toasts + Mis Contactos + tipoDisponibilidad edit |
| `talentofront/src/app/components/RegisterPage.tsx` | VITE_API_URL + errores descriptivos |
| `talentofront/src/app/components/SchoolAdminPanel.tsx` | VITE_API_URL + stats eager |
| `talentofront/src/app/components/CompanyDashboard.tsx` | VITE_API_URL + toast contacto |
| `talentofront/src/app/components/CompanyPublicPage.tsx` | VITE_API_URL |
| `server/prisma/schema.prisma` | Agregar `TipoDisponibilidad` enum + campo en `Estudiante`; hacer `empresaId` opcional en `Contacto` + campos remitente |
| `server/rutas/contactos.js` | Agregar `GET /me` y `POST /publico` |
| `server/rutas/estudiantes.js` | Filtro `tipoDisponibilidad` en GET + aceptar campo en PATCH /me |

---

## Task 1: Configurar VITE_API_URL

**Dependencias:** ninguna. Hacer primero — todo el frontend lo necesita.

**Files:**
- Create: `talentofront/.env`
- Modify: `talentofront/src/app/context/AuthContext.tsx`
- Modify: `talentofront/src/app/components/PublicDirectory.tsx` (línea 30)
- Modify: `talentofront/src/app/components/StudentDashboard.tsx` (línea 74)
- Modify: `talentofront/src/app/components/RegisterPage.tsx` (línea 13)
- Modify: `talentofront/src/app/components/SchoolAdminPanel.tsx` (línea 51)
- Modify: `talentofront/src/app/components/CompanyDashboard.tsx` (línea 37)
- Modify: `talentofront/src/app/components/CompanyPublicPage.tsx` (línea 34)

- [ ] **Paso 1: Crear archivo .env**

```
# talentofront/.env
VITE_API_URL=http://localhost:3000
```

- [ ] **Paso 2: Reemplazar API_URL hardcodeada en todos los componentes**

En cada uno de los 6 componentes que tienen `const API_URL = "http://localhost:3000"`, reemplazar por:

```typescript
const API_URL = import.meta.env.VITE_API_URL
```

- [ ] **Paso 3: Actualizar AuthContext.tsx**

En `talentofront/src/app/context/AuthContext.tsx`, agregar al principio del archivo (antes de la función `ProveedorAuth`):

```typescript
const API_URL = import.meta.env.VITE_API_URL
```

Y reemplazar ambas URLs inline:

```typescript
// Antes:
const respuesta = await fetch('http://localhost:3000/api/auth/login', {
// Después:
const respuesta = await fetch(`${API_URL}/api/auth/login`, {
```

```typescript
// Antes:
const respuesta = await fetch('http://localhost:3000/api/auth/registro', {
// Después:
const respuesta = await fetch(`${API_URL}/api/auth/registro`, {
```

- [ ] **Paso 4: Verificar que la app levanta sin errores**

```bash
cd talentofront && pnpm dev
```

Abrir `http://localhost:5173`. No deben aparecer errores de consola relacionados a undefined API URL.

- [ ] **Paso 5: Commit**

```bash
git add talentofront/.env talentofront/src/app/context/AuthContext.tsx \
  talentofront/src/app/components/PublicDirectory.tsx \
  talentofront/src/app/components/StudentDashboard.tsx \
  talentofront/src/app/components/RegisterPage.tsx \
  talentofront/src/app/components/SchoolAdminPanel.tsx \
  talentofront/src/app/components/CompanyDashboard.tsx \
  talentofront/src/app/components/CompanyPublicPage.tsx
git commit -m "feat: usar VITE_API_URL en lugar de localhost hardcodeado"
```

---

## Task 2: Agregar Toaster a App.tsx

**Dependencias:** ninguna.

**Files:**
- Modify: `talentofront/src/app/App.tsx`

- [ ] **Paso 1: Agregar Toaster de sonner**

```typescript
// talentofront/src/app/App.tsx
import { RouterProvider } from 'react-router';
import { router } from './routes';
import { ProveedorAuth } from './context/AuthContext';
import { Toaster } from 'sonner';

export default function App() {
  return (
    <ProveedorAuth>
      <RouterProvider router={router} />
      <Toaster richColors position="bottom-right" />
    </ProveedorAuth>
  );
}
```

- [ ] **Paso 2: Verificar que el Toaster carga sin errores**

```bash
cd talentofront && pnpm dev
```

En consola del navegador no debe haber errores.

- [ ] **Paso 3: Commit**

```bash
git add talentofront/src/app/App.tsx
git commit -m "feat: agregar Toaster de sonner a App"
```

---

## Task 3: Schema Prisma — tipoDisponibilidad + contacto público

**Dependencias:** ninguna en frontend. Requerido antes de Tasks 4 y 5.

**Files:**
- Modify: `server/prisma/schema.prisma`

- [ ] **Paso 1: Actualizar schema.prisma**

Agregar el enum `TipoDisponibilidad` y el campo en `Estudiante`, y hacer `empresaId` opcional en `Contacto`:

```prisma
// Después del enum EstadoPostulacion, agregar:
enum TipoDisponibilidad {
  PASANTIA
  FREELANCE
  AMBOS
}
```

En el modelo `Estudiante`, agregar el campo después de `disponible`:

```prisma
model Estudiante {
  id               Int      @id @default(autoincrement())
  nombre           String
  apellido         String
  especialidad     String
  descripcion      String?
  fotoUrl          String?
  disponible       Boolean  @default(true)
  tipoDisponibilidad TipoDisponibilidad @default(PASANTIA)
  usuarioId        Int      @unique
  colegioId        Int
  creadoEn         DateTime @default(now())

  usuario         Usuario      @relation(fields: [usuarioId], references: [id])
  colegio         Colegio      @relation(fields: [colegioId], references: [id])
  habilidades     Habilidad[]
  certificaciones Certificacion[]
  postulaciones   Postulacion[]
  contactos       Contacto[]
  posts           Post[]
}
```

En el modelo `Contacto`, hacer `empresaId` opcional y agregar campos de remitente:

```prisma
model Contacto {
  id               Int      @id @default(autoincrement())
  empresaId        Int?
  estudianteId     Int
  mensaje          String?
  nombreRemitente  String?
  emailRemitente   String?
  creadoEn         DateTime @default(now())

  empresa          Empresa?    @relation(fields: [empresaId], references: [id])
  estudiante       Estudiante  @relation(fields: [estudianteId], references: [id])
}
```

- [ ] **Paso 2: Correr migración**

```bash
cd server
npx prisma migrate dev --name add_tipo_disponibilidad_y_contacto_publico
```

Salida esperada:
```
✔ Generated Prisma Client
The following migration(s) have been created and applied...
```

- [ ] **Paso 3: Verificar que el servidor levanta**

```bash
cd server && npm run dev
```

Esperado: `Servidor en puerto 3000` sin errores de Prisma.

- [ ] **Paso 4: Commit**

```bash
git add server/prisma/schema.prisma server/prisma/migrations/
git commit -m "feat: agregar tipoDisponibilidad a Estudiante y contacto público sin JWT"
```

---

## Task 4: Backend — GET /api/contactos/me + POST /api/contactos/publico

**Dependencias:** Task 3 completado.

**Files:**
- Modify: `server/rutas/contactos.js`

- [ ] **Paso 1: Agregar GET /api/contactos/me y POST /api/contactos/publico**

Reemplazar el contenido de `server/rutas/contactos.js` por:

```javascript
const express = require('express')
const prisma = require('../prismaClient')
const verificarToken = require('../middleware/verificarToken')

const router = express.Router()

// GET /api/contactos/me — Estudiante ve los contactos que ha recibido
router.get('/me', verificarToken, async (req, res) => {
  if (req.usuario.rol !== 'ESTUDIANTE') {
    return res.status(403).json({ error: 'Solo los estudiantes pueden ver sus contactos' })
  }

  try {
    const estudiante = await prisma.estudiante.findUnique({ where: { usuarioId: req.usuario.id } })
    if (!estudiante) return res.status(404).json({ error: 'Perfil no encontrado' })

    const contactos = await prisma.contacto.findMany({
      where: { estudianteId: estudiante.id },
      include: {
        empresa: { select: { nombre: true, logoUrl: true } },
      },
      orderBy: { creadoEn: 'desc' },
    })

    res.json(contactos)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al obtener contactos' })
  }
})

// POST /api/contactos — Empresa contacta directamente a un estudiante (requiere JWT EMPRESA)
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

    const contacto = await prisma.contacto.create({
      data: {
        empresaId: empresa.id,
        estudianteId: parseInt(estudianteId),
        mensaje: mensaje?.trim() || null,
      },
    })

    res.status(201).json(contacto)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al registrar contacto' })
  }
})

// POST /api/contactos/publico — Visitante sin cuenta contacta a un estudiante
router.post('/publico', async (req, res) => {
  const { estudianteId, nombreRemitente, emailRemitente, mensaje } = req.body

  if (!estudianteId || !nombreRemitente || !emailRemitente || !mensaje) {
    return res.status(400).json({ error: 'estudianteId, nombreRemitente, emailRemitente y mensaje son requeridos' })
  }

  try {
    const contacto = await prisma.contacto.create({
      data: {
        estudianteId: parseInt(estudianteId),
        nombreRemitente: nombreRemitente.trim(),
        emailRemitente: emailRemitente.trim().toLowerCase(),
        mensaje: mensaje.trim(),
      },
    })

    res.status(201).json(contacto)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al enviar contacto' })
  }
})

module.exports = router
```

**⚠️ Importante:** la ruta `/publico` debe registrarse en `server/index.js` ANTES de que Express intente interpretar `publico` como un parámetro. Como el router de contactos ya está montado en `/api/contactos`, la ruta `/publico` dentro del router tiene precedencia correcta.

- [ ] **Paso 2: Verificar endpoint GET /me con curl**

```bash
# Primero obtener un token válido de estudiante:
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"estudiante@test.cl","password":"123456"}' | jq .token
# Luego usar el token:
curl http://localhost:3000/api/contactos/me \
  -H "Authorization: Bearer <TOKEN>"
```

Esperado: array JSON (puede estar vacío `[]`).

- [ ] **Paso 3: Verificar endpoint POST /publico**

```bash
curl -s -X POST http://localhost:3000/api/contactos/publico \
  -H "Content-Type: application/json" \
  -d '{"estudianteId":1,"nombreRemitente":"Juan","emailRemitente":"juan@test.cl","mensaje":"Hola"}' | jq .
```

Esperado: objeto contacto con `id`, `creadoEn`, etc.

- [ ] **Paso 4: Commit**

```bash
git add server/rutas/contactos.js
git commit -m "feat: agregar GET /api/contactos/me y POST /api/contactos/publico"
```

---

## Task 5: Backend — tipoDisponibilidad en estudiantes

**Dependencias:** Task 3 completado.

**Files:**
- Modify: `server/rutas/estudiantes.js`

- [ ] **Paso 1: Agregar filtro tipoDisponibilidad en GET /api/estudiantes**

En `server/rutas/estudiantes.js`, en el handler `router.get('/', ...)`, agregar el filtro junto a `disponible` y `especialidad`:

```javascript
// GET /api/estudiantes
router.get('/', async (req, res) => {
  const { disponible, especialidad, tipoDisponibilidad } = req.query

  const filtros = {}
  if (disponible !== undefined) {
    filtros.disponible = disponible === 'true'
  }
  if (especialidad) {
    filtros.especialidad = { contains: especialidad, mode: 'insensitive' }
  }
  if (tipoDisponibilidad && ['PASANTIA', 'FREELANCE', 'AMBOS'].includes(tipoDisponibilidad)) {
    if (tipoDisponibilidad === 'PASANTIA') {
      filtros.tipoDisponibilidad = { in: ['PASANTIA', 'AMBOS'] }
    } else if (tipoDisponibilidad === 'FREELANCE') {
      filtros.tipoDisponibilidad = { in: ['FREELANCE', 'AMBOS'] }
    }
    // Si es AMBOS no filtramos — mostramos todos
  }

  try {
    const estudiantes = await prisma.estudiante.findMany({
      where: filtros,
      include: {
        habilidades: true,
        colegio: { select: { nombre: true } },
        certificaciones: true,
      },
      orderBy: { creadoEn: 'desc' },
    })

    res.json(estudiantes)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al obtener estudiantes' })
  }
})
```

- [ ] **Paso 2: Aceptar tipoDisponibilidad en PATCH /api/estudiantes/me**

En el handler `router.patch('/me', ...)`, agregar el campo:

```javascript
router.patch('/me', verificarToken, async (req, res) => {
  if (req.usuario.rol !== 'ESTUDIANTE') {
    return res.status(403).json({ error: 'Solo los estudiantes pueden editar su perfil' })
  }

  const { descripcion, fotoUrl, tipoDisponibilidad } = req.body
  const data = {}
  if (descripcion !== undefined) data.descripcion = descripcion?.trim() || null
  if (fotoUrl !== undefined) data.fotoUrl = fotoUrl?.trim() || null
  if (tipoDisponibilidad && ['PASANTIA', 'FREELANCE', 'AMBOS'].includes(tipoDisponibilidad)) {
    data.tipoDisponibilidad = tipoDisponibilidad
  }

  if (Object.keys(data).length === 0) {
    return res.status(400).json({ error: 'No hay campos para actualizar' })
  }

  try {
    const estudiante = await prisma.estudiante.update({
      where: { usuarioId: req.usuario.id },
      data,
      include: { habilidades: true, certificaciones: true, colegio: { select: { nombre: true } } },
    })
    res.json(estudiante)
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Perfil no encontrado' })
    console.error(error)
    res.status(500).json({ error: 'Error al actualizar perfil' })
  }
})
```

- [ ] **Paso 3: Verificar filtro con curl**

```bash
curl "http://localhost:3000/api/estudiantes?tipoDisponibilidad=FREELANCE" | jq length
```

Esperado: número >= 0 (puede ser 0 si no hay estudiantes con tipo FREELANCE aún).

- [ ] **Paso 4: Commit**

```bash
git add server/rutas/estudiantes.js
git commit -m "feat: filtro tipoDisponibilidad en GET estudiantes y PATCH /me"
```

---

## Task 6: Fix — formulario de contacto en PublicDirectory

**Dependencias:** Task 1 (VITE_API_URL) + Task 4 (endpoint público).

**Files:**
- Modify: `talentofront/src/app/components/PublicDirectory.tsx`

- [ ] **Paso 1: Actualizar tipo FormContacto y función enviarContacto**

En `PublicDirectory.tsx`, cambiar el tipo `FormContacto` para reflejar los campos correctos:

```typescript
interface FormContacto {
  nombreRemitente: string
  emailRemitente: string
  mensaje: string
}
```

Actualizar el estado inicial:
```typescript
const [formContacto, setFormContacto] = useState<FormContacto>({ 
  nombreRemitente: "", 
  emailRemitente: "", 
  mensaje: "" 
})
```

Reemplazar la función `enviarContacto` (línea 77-84):

```typescript
const enviarContacto = async () => {
  if (!formContacto.nombreRemitente || !formContacto.emailRemitente || !formContacto.mensaje) return
  if (!estudianteSel) return
  setEnviandoContacto(true)
  try {
    const res = await fetch(`${API_URL}/api/contactos/publico`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        estudianteId: estudianteSel.id,
        nombreRemitente: formContacto.nombreRemitente,
        emailRemitente: formContacto.emailRemitente,
        mensaje: formContacto.mensaje,
      }),
    })
    if (res.ok) {
      setContactoEnviado(true)
    }
  } catch {
    // Error de red silencioso — igual marcamos como enviado para UX optimista
    setContactoEnviado(true)
  } finally {
    setEnviandoContacto(false)
  }
}
```

También en `abrirPerfil`:
```typescript
const abrirPerfil = (est: Estudiante) => {
  setEstudianteSel(est)
  setFormContacto({ nombreRemitente: "", emailRemitente: "", mensaje: "" })
  setContactoEnviado(false)
  setVistaContacto(false)
}
```

- [ ] **Paso 2: Actualizar el formulario JSX**

En la sección del formulario de contacto (alrededor de línea 558), reemplazar los inputs de `empresa` y `emailContacto` por `nombreRemitente` y `emailRemitente`:

```tsx
<div className="grid grid-cols-2 gap-3">
  <div className="space-y-1">
    <Label htmlFor="nombreRemitente" className="text-xs">Tu nombre</Label>
    <Input
      id="nombreRemitente"
      placeholder="Juan Pérez"
      value={formContacto.nombreRemitente}
      onChange={e => setFormContacto(prev => ({ ...prev, nombreRemitente: e.target.value }))}
    />
  </div>
  <div className="space-y-1">
    <Label htmlFor="emailRemitente" className="text-xs">Tu email</Label>
    <Input
      id="emailRemitente"
      type="email"
      placeholder="juan@empresa.cl"
      value={formContacto.emailRemitente}
      onChange={e => setFormContacto(prev => ({ ...prev, emailRemitente: e.target.value }))}
    />
  </div>
</div>
```

Y actualizar el `disabled` del botón:
```tsx
disabled={enviandoContacto || !formContacto.nombreRemitente || !formContacto.emailRemitente || !formContacto.mensaje}
```

- [ ] **Paso 3: Probar en navegador**

1. Abrir `http://localhost:5173`
2. Hacer click en "Ver perfil completo" de cualquier estudiante
3. Hacer click en "Contactar vía el colegio"
4. Completar nombre, email y mensaje
5. Enviar — debe aparecer la pantalla de confirmación "¡Solicitud enviada!"
6. Verificar en `server` que el contacto se creó: `curl http://localhost:3000/api/contactos/me` (con JWT de estudiante)

- [ ] **Paso 4: Commit**

```bash
git add talentofront/src/app/components/PublicDirectory.tsx
git commit -m "fix: conectar formulario de contacto a API real en Directorio Público"
```

---

## Task 7: Fix — likes persistence en StudentDashboard

**Dependencias:** Task 1 (VITE_API_URL).

**Files:**
- Modify: `talentofront/src/app/components/StudentDashboard.tsx`

- [ ] **Paso 1: Inicializar likesActivos desde localStorage**

En `StudentDashboard.tsx`, reemplazar la inicialización de `likesActivos` (línea 86) por:

```typescript
const [likesActivos, setLikesActivos] = useState<Set<number>>(() => {
  const clave = `impulsa_likes_${sesion?.id}`
  try {
    const guardado = localStorage.getItem(clave)
    return guardado ? new Set<number>(JSON.parse(guardado)) : new Set<number>()
  } catch {
    return new Set<number>()
  }
})
```

- [ ] **Paso 2: Persistir likes al alternar**

Reemplazar la función `alternarLike` (línea 192-209) por:

```typescript
const alternarLike = (postId: number) => {
  setLikesActivos(prev => {
    const siguiente = new Set(prev)
    if (siguiente.has(postId)) {
      siguiente.delete(postId)
    } else {
      siguiente.add(postId)
    }
    // Persiste en localStorage
    const clave = `impulsa_likes_${sesion?.id}`
    localStorage.setItem(clave, JSON.stringify([...siguiente]))
    return siguiente
  })
}
```

- [ ] **Paso 3: Verificar en navegador**

1. Ir a `/estudiante` como estudiante autenticado
2. Dar like a un post
3. Recargar la página (`F5`)
4. El like debe seguir activo (botón con fill azul)

- [ ] **Paso 4: Commit**

```bash
git add talentofront/src/app/components/StudentDashboard.tsx
git commit -m "fix: persistir likes en localStorage para que sobrevivan recargas"
```

---

## Task 8: Fix — habilidades duplicadas + toast al eliminar

**Dependencias:** Task 1 (VITE_API_URL) + Task 2 (Toaster).

**Files:**
- Modify: `talentofront/src/app/components/StudentDashboard.tsx`

- [ ] **Paso 1: Agregar import de toast**

Al inicio de `StudentDashboard.tsx`, agregar:

```typescript
import { toast } from "sonner"
```

- [ ] **Paso 2: Validar duplicados antes de agregar habilidad**

En la función `agregarItem` (línea 297), agregar validación antes del fetch:

```typescript
const agregarItem = async () => {
  if (!sesion || !nuevoNombre.trim() || !tipoAgregar) return

  // Bloquear duplicados
  if (tipoAgregar === "habilidad" && perfil) {
    const duplicado = perfil.habilidades.some(
      h => h.nombre.toLowerCase() === nuevoNombre.trim().toLowerCase()
    )
    if (duplicado) {
      toast.error("Ya tienes esta habilidad registrada")
      return
    }
  }

  setGuardandoItem(true)
  // ... resto de la función sin cambios
```

- [ ] **Paso 3: Agregar toast de éxito al agregar**

Después de `cerrarDialogoAgregar()` (línea 330), agregar:

```typescript
if (res.ok) {
  const nuevo = await res.json()
  setPerfil(prev => {
    if (!prev) return prev
    if (tipoAgregar === "habilidad") {
      return { ...prev, habilidades: [...prev.habilidades, nuevo] }
    } else {
      return { ...prev, certificaciones: [...prev.certificaciones, nuevo] }
    }
  })
  cerrarDialogoAgregar()
  toast.success(tipoAgregar === "habilidad" ? "Habilidad agregada" : "Certificación agregada")
}
```

- [ ] **Paso 4: Agregar toast al eliminar**

En la función `eliminarItem` (línea 339), agregar toast después de actualizar el perfil:

```typescript
if (res.ok || res.status === 204) {
  setPerfil(prev => {
    if (!prev) return prev
    if (tipo === "habilidad") {
      return { ...prev, habilidades: prev.habilidades.filter(h => h.id !== id) }
    } else {
      return { ...prev, certificaciones: prev.certificaciones.filter(c => c.id !== id) }
    }
  })
  toast.success(tipo === "habilidad" ? "Habilidad eliminada" : "Certificación eliminada")
}
```

- [ ] **Paso 5: Agregar toast al postular**

En la función `postular` (línea 221), agregar toast en el `if (res.ok)`:

```typescript
if (res.ok) {
  // ... código existente ...
  setPostuladas(prev => new Set(prev).add(ofertaId))
  toast.success("¡Postulación enviada!")
} else if (res.status === 409) {
  setPostuladas(prev => new Set(prev).add(ofertaId))
  toast.info("Ya estabas postulado a esta oferta")
}
```

- [ ] **Paso 6: Verificar en navegador**

1. Agregar una habilidad — debe aparecer toast verde "Habilidad agregada"
2. Intentar agregar la misma habilidad — debe aparecer toast rojo "Ya tienes esta habilidad registrada"
3. Eliminar una habilidad — debe aparecer toast verde "Habilidad eliminada"
4. Postular a una oferta — debe aparecer toast verde "¡Postulación enviada!"

- [ ] **Paso 7: Commit**

```bash
git add talentofront/src/app/components/StudentDashboard.tsx
git commit -m "fix: bloquear habilidades duplicadas y agregar toast feedback en StudentDashboard"
```

---

## Task 9: Fix — mensajes de error descriptivos en RegisterPage

**Dependencias:** Task 1 (VITE_API_URL).

**Files:**
- Modify: `talentofront/src/app/components/RegisterPage.tsx`

- [ ] **Paso 1: Mejorar manejo de errores en AuthContext**

El error viene del `registrar` function en AuthContext. Verificar cómo lanza errores. En `AuthContext.tsx`, buscar el bloque `registrar`:

Si el backend devuelve `{ error: "El email ya está registrado" }` con status 400, necesitamos que AuthContext propague ese mensaje. Reemplazar el manejo de error en `registrar`:

```typescript
// En AuthContext.tsx, en la función registrar:
if (!respuesta.ok) {
  const datos = await respuesta.json().catch(() => ({}))
  throw new Error(datos.error || 'Error al registrar. Intenta nuevamente.')
}
```

- [ ] **Paso 2: Verificar que el backend devuelve mensaje específico para email duplicado**

En `server/rutas/auth.js`, buscar el catch de la creación de usuario. Agregar detección de error de email único de Prisma:

```javascript
// En el catch del POST /registro:
} catch (error) {
  if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
    return res.status(400).json({ error: 'El email ya está registrado' })
  }
  console.error(error)
  res.status(500).json({ error: 'Error al crear la cuenta. Intenta nuevamente.' })
}
```

- [ ] **Paso 3: Verificar en navegador**

1. Intentar registrar con un email que ya existe
2. Debe aparecer el mensaje "El email ya está registrado" en el formulario
3. Con un error de servidor genérico debe mostrar "Error al crear la cuenta. Intenta nuevamente."

- [ ] **Paso 4: Commit**

```bash
git add talentofront/src/app/context/AuthContext.tsx server/rutas/auth.js
git commit -m "fix: mensajes de error descriptivos en registro (email duplicado)"
```

---

## Task 10: Vista freelance — toggle + badges en PublicDirectory

**Dependencias:** Task 1 (VITE_API_URL) + Task 3 (schema) + Task 6 (contacto fix).

**Files:**
- Modify: `talentofront/src/app/components/PublicDirectory.tsx`

- [ ] **Paso 1: Actualizar tipo Estudiante para incluir tipoDisponibilidad**

En `PublicDirectory.tsx`, actualizar el tipo `Estudiante`:

```typescript
type Estudiante = {
  id: number
  nombre: string
  apellido: string
  especialidad: string
  descripcion: string | null
  fotoUrl: string | null
  disponible: boolean
  tipoDisponibilidad: "PASANTIA" | "FREELANCE" | "AMBOS"
  habilidades: Habilidad[]
  certificaciones: Certificacion[]
  colegio: { nombre: string }
}
```

- [ ] **Paso 2: Agregar estado del filtro de tipo**

Debajo de `const [busqueda, setBusqueda] = useState("")`, agregar:

```typescript
const [filtroTipo, setFiltroTipo] = useState<"TODOS" | "PASANTIA" | "FREELANCE">("TODOS")
```

- [ ] **Paso 3: Actualizar lógica de filtrado**

Reemplazar `estudiantesFiltrados` para incluir el filtro de tipo:

```typescript
const estudiantesFiltrados = estudiantes.filter(est => {
  const texto = busqueda.toLowerCase()
  const coincideTexto = (
    est.nombre.toLowerCase().includes(texto) ||
    est.apellido.toLowerCase().includes(texto) ||
    est.especialidad.toLowerCase().includes(texto) ||
    est.habilidades.some(h => h.nombre.toLowerCase().includes(texto))
  )
  const coincideTipo = (
    filtroTipo === "TODOS" ||
    est.tipoDisponibilidad === filtroTipo ||
    est.tipoDisponibilidad === "AMBOS"
  )
  return coincideTexto && coincideTipo
})
```

- [ ] **Paso 4: Agregar toggle de tipo en la UI**

Justo después de los chips de especialidad (después del `</motion.div>` que cierra los chips), agregar el toggle:

```tsx
{/* Toggle Pasantía / Freelance */}
<motion.div
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.4, delay: 0.65 }}
  className="flex gap-2 justify-center mt-3"
>
  {(["TODOS", "PASANTIA", "FREELANCE"] as const).map(tipo => (
    <button
      key={tipo}
      onClick={() => setFiltroTipo(tipo)}
      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer border ${
        filtroTipo === tipo
          ? "bg-white border-white text-[#0F172A] shadow-md scale-105"
          : "bg-white/10 border-white/20 text-white hover:bg-white/20"
      }`}
    >
      {tipo === "TODOS" ? "Todos" : tipo === "PASANTIA" ? "Pasantía" : "Freelance"}
    </button>
  ))}
</motion.div>
```

- [ ] **Paso 5: Agregar badge en cada tarjeta de estudiante**

Dentro del `CardContent` de cada tarjeta, justo después del nombre y especialidad (después de `<p className="text-xs font-medium text-[#0F172A]...`), agregar:

```tsx
{/* Badge tipo disponibilidad */}
<div className="mb-3">
  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
    est.tipoDisponibilidad === "FREELANCE"
      ? "bg-purple-100 text-purple-700"
      : est.tipoDisponibilidad === "AMBOS"
      ? "bg-amber-100 text-amber-700"
      : "bg-blue-100 text-blue-700"
  }`}>
    {est.tipoDisponibilidad === "PASANTIA" ? "Pasantía"
      : est.tipoDisponibilidad === "FREELANCE" ? "Freelance"
      : "Pasantía & Freelance"}
  </span>
</div>
```

- [ ] **Paso 6: Verificar en navegador**

1. Abrir `http://localhost:5173`
2. Ver los 3 botones de toggle en el hero
3. Hacer click en "Freelance" — solo deben aparecer estudiantes con `FREELANCE` o `AMBOS`
4. Cada tarjeta debe mostrar el badge de tipo
5. El filtro debe funcionar junto con la búsqueda de texto

- [ ] **Paso 7: Commit**

```bash
git add talentofront/src/app/components/PublicDirectory.tsx
git commit -m "feat: toggle freelance/pasantía y badges en Directorio Público"
```

---

## Task 11: Mis Contactos en StudentDashboard

**Dependencias:** Task 1 + Task 2 + Task 4 (endpoint /contactos/me).

**Files:**
- Modify: `talentofront/src/app/components/StudentDashboard.tsx`

- [ ] **Paso 1: Agregar tipo y estado para contactos**

En `StudentDashboard.tsx`, agregar el tipo al inicio del archivo (junto a los otros tipos):

```typescript
type ContactoRecibido = {
  id: number
  creadoEn: string
  mensaje: string | null
  nombreRemitente: string | null
  emailRemitente: string | null
  empresa: { nombre: string; logoUrl: string | null } | null
}
```

Agregar estado después de `const [misPostulaciones, ...]`:

```typescript
const [misContactos, setMisContactos] = useState<ContactoRecibido[]>([])
```

- [ ] **Paso 2: Cargar contactos en useEffect**

Dentro del `useEffect` inicial (junto a las otras cargas), agregar:

```typescript
fetch(`${API_URL}/api/contactos/me`, { headers })
  .then(res => res.json())
  .then((datos: ContactoRecibido[]) => setMisContactos(datos))
  .catch(() => {})
```

- [ ] **Paso 3: Agregar sección "Mis Contactos" en el sidebar derecho**

En el sidebar derecho (buscar la sección con "Mis Postulaciones"), agregar una nueva card después de la de postulaciones:

```tsx
{/* Mis Contactos */}
<Card className="border border-gray-100 shadow-sm">
  <CardContent className="p-4">
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
        <Mail className="w-4 h-4 text-[#F97316]" />
        Mis Contactos
      </h3>
      {misContactos.length > 0 && (
        <span className="text-xs bg-[#F97316] text-white px-2 py-0.5 rounded-full font-semibold">
          {misContactos.length}
        </span>
      )}
    </div>
    {misContactos.length === 0 ? (
      <p className="text-xs text-gray-400 italic">Aún no has recibido contactos</p>
    ) : (
      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
        {misContactos.slice(0, 5).map(c => (
          <div key={c.id} className="text-xs p-2.5 bg-orange-50 rounded-xl border border-orange-100">
            <p className="font-semibold text-gray-800 truncate">
              {c.empresa?.nombre ?? c.nombreRemitente ?? "Contacto"}
            </p>
            {c.mensaje && (
              <p className="text-gray-500 mt-0.5 line-clamp-2">{c.mensaje}</p>
            )}
            <p className="text-gray-400 mt-1">
              {new Date(c.creadoEn).toLocaleDateString("es-CL", { day: "numeric", month: "short" })}
            </p>
          </div>
        ))}
      </div>
    )}
  </CardContent>
</Card>
```

Agregar `Mail` al import de lucide si no está (verificar línea 2 de imports).

- [ ] **Paso 4: Verificar en navegador**

1. Iniciar sesión como estudiante
2. El sidebar derecho debe mostrar la card "Mis Contactos"
3. Si no hay contactos: mensaje "Aún no has recibido contactos"
4. Si hay: se listan con nombre del remitente, mensaje y fecha

- [ ] **Paso 5: Commit**

```bash
git add talentofront/src/app/components/StudentDashboard.tsx
git commit -m "feat: agregar sección Mis Contactos en sidebar del dashboard estudiantil"
```

---

## Task 12: tipoDisponibilidad en dialog editar perfil

**Dependencias:** Task 1 + Task 5 (backend PATCH acepta campo).

**Files:**
- Modify: `talentofront/src/app/components/StudentDashboard.tsx`

- [ ] **Paso 1: Agregar tipoDisponibilidad al tipo PerfilEstudiante**

En el tipo `PerfilEstudiante` (línea 51), agregar el campo:

```typescript
type PerfilEstudiante = {
  id: number
  nombre: string
  apellido: string
  especialidad: string
  descripcion: string | null
  fotoUrl: string | null
  disponible: boolean
  tipoDisponibilidad: "PASANTIA" | "FREELANCE" | "AMBOS"
  habilidades: { id: number; nombre: string; validada: boolean }[]
  certificaciones: { id: number; nombre: string; institucion: string | null; validada: boolean }[]
}
```

- [ ] **Paso 2: Agregar estado para editar tipoDisponibilidad**

Junto a `editDesc` y `editFoto` (línea 96), agregar:

```typescript
const [editTipoDisponibilidad, setEditTipoDisponibilidad] = useState<"PASANTIA" | "FREELANCE" | "AMBOS">("PASANTIA")
```

- [ ] **Paso 3: Inicializar el estado al abrir el dialog**

En la función `abrirEditarPerfil` (línea 365):

```typescript
const abrirEditarPerfil = () => {
  setEditDesc(perfil?.descripcion ?? "")
  setEditFoto(perfil?.fotoUrl ?? "")
  setEditTipoDisponibilidad(perfil?.tipoDisponibilidad ?? "PASANTIA")
  setMostrarEditarPerfil(true)
}
```

- [ ] **Paso 4: Incluir el campo en guardarPerfil**

En la función `guardarPerfil` (línea 371), actualizar el body:

```typescript
body: JSON.stringify({ 
  descripcion: editDesc, 
  fotoUrl: editFoto,
  tipoDisponibilidad: editTipoDisponibilidad,
}),
```

- [ ] **Paso 5: Agregar selector en el dialog de editar perfil**

En el JSX del dialog "Editar perfil" (buscar `mostrarEditarPerfil`), agregar el selector de tipo de disponibilidad después del campo de foto:

```tsx
{/* Tipo de disponibilidad */}
<div className="space-y-1.5">
  <Label className="text-sm">Tipo de disponibilidad</Label>
  <div className="flex gap-2">
    {(["PASANTIA", "FREELANCE", "AMBOS"] as const).map(tipo => (
      <button
        key={tipo}
        type="button"
        onClick={() => setEditTipoDisponibilidad(tipo)}
        className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium border transition-all ${
          editTipoDisponibilidad === tipo
            ? "bg-[#0F172A] text-white border-[#0F172A]"
            : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
        }`}
      >
        {tipo === "PASANTIA" ? "Pasantía" : tipo === "FREELANCE" ? "Freelance" : "Ambos"}
      </button>
    ))}
  </div>
</div>
```

- [ ] **Paso 6: Verificar en navegador**

1. Iniciar sesión como estudiante
2. Abrir menú del avatar → "Editar perfil"
3. Ver los 3 botones de tipo disponibilidad
4. Seleccionar "Freelance" y guardar
5. El perfil debe actualizarse
6. En el Directorio Público, el estudiante debe aparecer al filtrar por "Freelance"

- [ ] **Paso 7: Commit**

```bash
git add talentofront/src/app/components/StudentDashboard.tsx
git commit -m "feat: agregar selector tipoDisponibilidad en dialog editar perfil"
```

---

## Task 13: Stats reales — carga eager en panel admin

**Dependencias:** Task 1 (VITE_API_URL).

**Files:**
- Modify: `talentofront/src/app/components/SchoolAdminPanel.tsx`

- [ ] **Paso 1: Cargar empresas y postulaciones en el useEffect inicial**

En `SchoolAdminPanel.tsx`, el `useEffect` actual solo carga `estudiantes`. Las empresas y postulaciones se cargan lazy cuando el usuario navega a esas secciones, lo que hace que las stat cards muestren "—" en el dashboard.

Agregar carga eager en el primer `useEffect`:

```typescript
useEffect(() => {
  fetch(`${API_URL}/api/estudiantes`)
    .then(res => res.json())
    .then(datos => { setEstudiantes(datos); setCargando(false) })
    .catch(() => setCargando(false))

  // Carga eager de empresas para stat cards
  fetch(`${API_URL}/api/empresas`)
    .then(res => res.json())
    .then((datos: EmpresaAdmin[]) => {
      setEmpresas(datos)
      setEmpresasCargadas(true)
    })
    .catch(() => {})
}, [])
```

**Nota:** Las postulaciones requieren JWT. Para la stat card de "Postulaciones activas", se puede agregar la carga aquí también si `sesion` está disponible. Si no, dejar el lazy load ya que el número se mostrará cuando el admin entre a esa sección.

- [ ] **Paso 2: Verificar en navegador**

1. Iniciar sesión como admin
2. En el Dashboard, la stat card "Empresas conectadas" debe mostrar el número real inmediatamente (no "—")
3. No deben aparecer errores en consola

- [ ] **Paso 3: Commit**

```bash
git add talentofront/src/app/components/SchoolAdminPanel.tsx
git commit -m "fix: cargar datos de empresas eagerly para mostrar stats reales en admin dashboard"
```

---

## Task 14: Toast en CompanyDashboard — confirmar contacto

**Dependencias:** Task 1 + Task 2 (Toaster).

**Files:**
- Modify: `talentofront/src/app/components/CompanyDashboard.tsx`

- [ ] **Paso 1: Agregar import de toast**

En `CompanyDashboard.tsx`, agregar:

```typescript
import { toast } from "sonner"
```

- [ ] **Paso 2: Agregar toast en la función enviarContacto (línea 143)**

En `CompanyDashboard.tsx`, la función `enviarContacto` ya maneja el if `res.ok`. Agregar toast dentro del bloque existente:

```typescript
const enviarContacto = async () => {
  if (!sesion || !mensajeChat.trim() || !estudianteContactoId) return
  setEnviandoContacto(true)
  try {
    const res = await fetch(`${API_URL}/api/contactos`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${sesion.token}` },
      body: JSON.stringify({ estudianteId: estudianteContactoId, mensaje: mensajeChat.trim() }),
    })
    if (res.ok) {
      setChatEnviado(true)
      toast.success("Contacto enviado al estudiante")
      setTimeout(() => {
        setMostrarChat(false)
        setChatEnviado(false)
        setMensajeChat("")
        setEstudianteContactoId(null)
      }, 1800)
    } else {
      toast.error("No se pudo enviar el contacto")
    }
  } catch {
    toast.error("Error de red al enviar contacto")
  } finally {
    setEnviandoContacto(false)
  }
}
```

- [ ] **Paso 3: Verificar en navegador**

1. Iniciar sesión como empresa
2. Buscar talento → ver perfil de un estudiante → "Contactar"
3. Enviar el mensaje → debe aparecer toast verde "Contacto enviado al estudiante"

- [ ] **Paso 4: Commit**

```bash
git add talentofront/src/app/components/CompanyDashboard.tsx
git commit -m "feat: toast de confirmación al contactar estudiante desde empresa"
```

---

## Task 15: Tab "Empresas" en Directorio Público

**Dependencias:** Task 1 (VITE_API_URL). Prioridad: media — hacer después de Tasks 6-14 si hay tiempo.

**Files:**
- Modify: `talentofront/src/app/components/PublicDirectory.tsx`

- [ ] **Paso 1: Agregar tipo Empresa y estado**

En `PublicDirectory.tsx`, agregar tipo y estado:

```typescript
type EmpresaDir = {
  id: number
  nombre: string
  rubro: string
  descripcion: string | null
  logoUrl: string | null
  creadoEn: string
}
```

Agregar debajo de `const [estudiantes, setEstudiantes] = useState<Estudiante[]>([])`:

```typescript
const [tabActivo, setTabActivo] = useState<"estudiantes" | "empresas">("estudiantes")
const [empresas, setEmpresas] = useState<EmpresaDir[]>([])
const [cargandoEmpresas, setCargandoEmpresas] = useState(false)
const [empresasCargadas, setEmpresasCargadas] = useState(false)
```

- [ ] **Paso 2: Cargar empresas al cambiar a ese tab**

Agregar un useEffect para cargar empresas lazy:

```typescript
useEffect(() => {
  if (tabActivo !== "empresas" || empresasCargadas) return
  setCargandoEmpresas(true)
  fetch(`${API_URL}/api/empresas`)
    .then(res => res.json())
    .then((datos: EmpresaDir[]) => {
      setEmpresas(datos)
      setEmpresasCargadas(true)
      setCargandoEmpresas(false)
    })
    .catch(() => setCargandoEmpresas(false))
}, [tabActivo])
```

- [ ] **Paso 3: Agregar tabs antes del directorio de estudiantes**

Justo antes de la sección `max-w-7xl mx-auto px-6 py-14`, agregar los tabs:

```tsx
{/* Tabs Estudiantes / Empresas */}
<div className="bg-white border-b border-gray-100">
  <div className="max-w-7xl mx-auto px-6">
    <div className="flex gap-1">
      {(["estudiantes", "empresas"] as const).map(tab => (
        <button
          key={tab}
          onClick={() => setTabActivo(tab)}
          className={`px-6 py-4 text-sm font-semibold border-b-2 transition-colors capitalize ${
            tabActivo === tab
              ? "border-[#F97316] text-[#F97316]"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          {tab === "estudiantes" ? "Estudiantes" : "Empresas"}
        </button>
      ))}
    </div>
  </div>
</div>
```

- [ ] **Paso 4: Agregar grid de empresas**

Dentro de la sección del directorio, mostrar condicionalmente:

```tsx
{/* Grid empresas */}
{tabActivo === "empresas" && (
  <section className="max-w-7xl mx-auto px-6 py-14">
    <h2 className="text-2xl font-bold text-gray-900 mb-8">Empresas conectadas</h2>
    {cargandoEmpresas && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse h-32" />
        ))}
      </div>
    )}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {empresas.map(emp => (
        <Link key={emp.id} to={`/empresas/${emp.id}`}>
          <Card className="hover:shadow-lg transition-shadow h-full border border-gray-100">
            <CardContent className="p-6 flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#DBEAFE] flex items-center justify-center shrink-0 font-bold text-[#0F172A] text-lg">
                {emp.nombre[0]}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate">{emp.nombre}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{emp.rubro}</p>
                {emp.descripcion && (
                  <p className="text-xs text-gray-400 mt-1.5 line-clamp-2">{emp.descripcion}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  </section>
)}
```

Envolver el directorio de estudiantes existente con `{tabActivo === "estudiantes" && (...)}`.

- [ ] **Paso 5: Verificar en navegador**

1. Abrir `http://localhost:5173`
2. Ver los 2 tabs "Estudiantes" / "Empresas"
3. Click en "Empresas" — carga y muestra grid de empresas con link a `/empresas/:id`
4. Click en una empresa → navega a perfil público

- [ ] **Paso 6: Commit**

```bash
git add talentofront/src/app/components/PublicDirectory.tsx
git commit -m "feat: agregar tab Empresas en Directorio Público"
```

---

## Verificación final antes del jueves

- [ ] Correr `pnpm dev` en `talentofront/` y `npm run dev` en `server/` simultáneamente
- [ ] Hacer el flujo completo de la demo:
  1. **Visitante** → Directorio Público → filtrar "Freelance" → ver perfil → contactar sin login
  2. **Estudiante** → login → feed → publicar post → like (recargar, debe persistir) → agregar habilidad → intentar duplicado → postular → ver "Mis Contactos"
  3. **Empresa** → login → buscar talento → contactar (toast) → crear oferta
  4. **Admin** → login → ver stats reales → validar habilidades → aceptar postulación
- [ ] Confirmar que no hay errores de consola en ningún flujo
- [ ] Commit final si hay ajustes menores

```bash
git log --oneline -10
```
