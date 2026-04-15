# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ImpulsaTec es una red social estilo LinkedIn **exclusiva del Centro Educacional Cardenal José María Caro**, que conecta a sus estudiantes técnicos con empresas para pasantías. El proyecto tiene dos workspaces independientes:

- **`server/`** — Express.js REST API with Prisma ORM (PostgreSQL)
- **`talentofront/`** — React SPA with Vite, Tailwind CSS v4, and shadcn/ui components

## Development Commands

### Backend (`server/`)
```bash
cd server
npm install
npm run dev        # nodemon index.js, runs on port 3000
npx prisma migrate dev   # run migrations
npx prisma generate      # regenerate Prisma client
npx prisma studio        # open Prisma GUI
```

### Frontend (`talentofront/`)
```bash
cd talentofront
pnpm install       # uses pnpm (pnpm-workspace.yaml present)
pnpm dev           # Vite dev server (typically http://localhost:5173)
pnpm build         # production build
```

## Architecture

### Backend
- Entry point: `server/index.js` — Express app con CORS, JSON y las rutas montadas bajo `/api/`
- **Rutas disponibles:**
  - `POST /api/auth/registro` — crea Usuario + perfil según rol en una transacción
  - `POST /api/auth/login` — devuelve JWT con `{ token, rol, id }`. Rate limiting: máx 10 intentos por IP cada 15 min (`express-rate-limit`)
  - `GET /api/colegios` — lista colegios disponibles (para el registro)
  - `GET /api/estudiantes` — acepta `?disponible=true` y `?especialidad=`
  - `GET /api/estudiantes/me` — perfil del estudiante autenticado con habilidades, certificaciones y colegio (JWT ESTUDIANTE)
  - `PATCH /api/estudiantes/me` — edita `descripcion` y `fotoUrl` del estudiante autenticado (JWT ESTUDIANTE)
  - `GET /api/estudiantes/:id` — perfil público con postulaciones
  - `POST /api/estudiantes/habilidades/me` — estudiante agrega una habilidad propia; queda `validada: false` (JWT ESTUDIANTE)
  - `POST /api/estudiantes/certificaciones/me` — estudiante agrega una certificación propia (JWT ESTUDIANTE)
  - `DELETE /api/estudiantes/habilidades/:id` — estudiante elimina una habilidad propia (JWT ESTUDIANTE, verifica ownership)
  - `DELETE /api/estudiantes/certificaciones/:id` — estudiante elimina una certificación propia (JWT ESTUDIANTE, verifica ownership)
  - `PATCH /api/estudiantes/habilidades/:id` — valida/invalida una habilidad (JWT ADMINISTRADOR)
  - `PATCH /api/estudiantes/certificaciones/:id` — valida/invalida una certificación (JWT ADMINISTRADOR)
  - `PATCH /api/estudiantes/:id/disponible` — actualiza disponibilidad (JWT ADMINISTRADOR)
  - `GET /api/empresas` — acepta `?rubro=`
  - `GET /api/empresas/me` — perfil de la empresa autenticada con sus ofertas activas (JWT EMPRESA)
  - `PATCH /api/empresas/me` — edita `descripcion`, `logoUrl` y `rubro` de la empresa autenticada (JWT EMPRESA)
  - `GET /api/empresas/:id` — perfil público con ofertas activas y sus postulaciones
  - `GET /api/ofertas` — directorio público de ofertas activas; acepta `?especialidad=` y `?busqueda=`
  - `GET /api/ofertas/empresa/me` — todas las ofertas de la empresa autenticada (activas e inactivas) con `_count.postulaciones` (JWT EMPRESA)
  - `POST /api/ofertas` — empresa crea una oferta de pasantía (JWT EMPRESA)
  - `PATCH /api/ofertas/:id` — empresa edita o desactiva una oferta propia (JWT EMPRESA)
  - `POST /api/postulaciones` — estudiante postula a una oferta (JWT ESTUDIANTE)
  - `GET /api/postulaciones/me` — postulaciones del estudiante autenticado con oferta + empresa + `actualizadoEn` (JWT ESTUDIANTE)
  - `GET /api/postulaciones` — todas las postulaciones con estudiante + oferta + empresa (JWT ADMINISTRADOR)
  - `PATCH /api/postulaciones/:id` — actualiza estado `PENDIENTE | ACEPTADA | RECHAZADA` (JWT ADMINISTRADOR)
  - `POST /api/contactos` — empresa registra contacto directo a un estudiante con mensaje opcional (JWT EMPRESA)
  - `GET /api/posts` — feed público, últimos 50 posts con datos del autor (nombre, apellido, fotoUrl, especialidad)
  - `POST /api/posts` — estudiante crea un post en el feed (JWT ESTUDIANTE)
- **⚠️ Orden de rutas en Express:** las rutas `/me` y `/habilidades/me` deben ir ANTES de `/:id` para evitar que Express interprete "me" como un ID. Aplicado en `estudiantes.js` y `empresas.js`. Lo mismo aplica a `/empresa/me` en `ofertas.js`.
- `server/middleware/verificarToken.js` — middleware JWT (Bearer token en Authorization header)
- `server/prismaClient.js` — instancia singleton de PrismaClient usando `@prisma/adapter-pg` (requerido por Prisma v7 "client engine")
- `server/.env` requiere `DATABASE_URL` y `JWT_SECRET`
- **Nota Prisma v7:** el `schema.prisma` no incluye `url` en el datasource; la URL se pasa al runtime vía `new PrismaClient({ adapter })` con `PrismaPg` + `Pool` de `pg`

### Database Schema (`server/prisma/schema.prisma`)
Modelos principales:
- `Usuario` — entidad base de auth con enum `Rol` (`ESTUDIANTE`, `EMPRESA`, `ADMINISTRADOR`, `VISITANTE`)
- `Estudiante` — 1:1 con Usuario; tiene habilidades, certificaciones, postulaciones, posts
- `Empresa` — 1:1 con Usuario; publica `Oferta`s
- `Colegio` — el colegio (Centro Educacional Cardenal José María Caro); vinculado a Administrador y Estudiante. **Solo existe un colegio en la plataforma** — no pedir al estudiante que lo seleccione en el registro; asignar automáticamente el primero del endpoint `/api/colegios`
- `Habilidad` — tiene `nombre` y `validada: Boolean @default(false)`
- `Certificacion` — tiene `nombre`, `institucion`, `fechaObtencion` y `validada: Boolean @default(false)`
- `Postulacion` — join entre Estudiante y Oferta; estado: `PENDIENTE | ACEPTADA | RECHAZADA`; tiene `actualizadoEn @updatedAt` para detectar cambios de estado
- `Post` — publicación del feed; tiene `contenido`, `estudianteId`, `creadoEn`
- `Contacto` — contacto directo de Empresa a Estudiante

### Frontend
- Entry: `talentofront/src/main.tsx` → `App.tsx` → `RouterProvider`
- `App.tsx` envuelve todo con `<ProveedorAuth>` (contexto de autenticación)
- **Rutas** en `src/app/routes.tsx` con React Router v7:
  - `/` → `PublicDirectory` — directorio público (sin auth requerida)
  - `/login` → `LoginPage` — inicio de sesión
  - `/registro` → `RegisterPage` — registro (tabs: Estudiante / Empresa); usa `Controller` de react-hook-form para los Select de especialidad y rubro
  - `/estudiante` → `StudentDashboard` — protegida, solo rol `ESTUDIANTE`
  - `/empresa` → `CompanyDashboard` — protegida, solo rol `EMPRESA`
  - `/colegio` → `SchoolAdminPanel` — protegida, solo rol `ADMINISTRADOR`
  - `/empresas/:id` → `CompanyPublicPage` — pública, perfil de empresa con ofertas y botón postular
- Componentes de página en `src/app/components/`
- shadcn/ui components en `src/app/components/ui/` — **no modificar manualmente**
- Contexto de auth en `src/app/context/AuthContext.tsx`
- Path alias `@` resuelve a `talentofront/src/`
- Tailwind CSS v4 (via `@tailwindcss/vite` plugin, sin PostCSS config)

### Auth (`src/app/context/AuthContext.tsx`)
Provee a toda la app mediante `useAuth()`:
- `sesion` — `{ token, rol, id } | null`, persistido en `localStorage`
- `iniciarSesion(email, password)` — llama a `POST /api/auth/login` y guarda la sesión
- `registrar(datos)` — llama a `POST /api/auth/registro` y guarda la sesión automáticamente
- `cerrarSesion()` — limpia `localStorage` y resetea el estado

### Rutas protegidas (`src/app/components/RutaProtegida.tsx`)
Redirige a `/login` si no hay sesión o el rol no coincide con `rolesPermitidos`.

### Colores y estilo del proyecto
- Azul oscuro principal: `#0F172A`
- Naranja acento: `#F97316`
- Azul claro: `#DBEAFE`, `#2563EB`
- Bordes suaves, tarjetas con `shadow-sm`, bordes `rounded-xl` / `rounded-2xl`

## Estado Actual

### Implementado y funcionando

**Auth y navegación**
- Login con JWT + rate limiting, registro para estudiante y empresa (fix: `Controller` de react-hook-form para los Select), logout desde cualquier vista, rutas protegidas por rol

**Directorio público (`/`)**
- Carga estudiantes desde la API, búsqueda en tiempo real, chips por especialidad, perfil completo en dialog con habilidades/certificaciones y estado de validación, formulario de contacto en vista secundaria (animada)

**Perfil público de empresa (`/empresas/:id`)**
- Banner degradado, logo/avatar, nombre, rubro, descripción
- Lista de ofertas activas con especialidad, descripción, contador de postulaciones
- Botón "Postular" si el usuario es ESTUDIANTE (marca "Postulado" si ya postuló), link "Iniciar sesión" si es visitante

**Dashboard estudiante (`/estudiante`)**
- Perfil real desde `GET /api/estudiantes/me`
- **Vista Feed**: posts reales desde `GET /api/posts`; publicar llama a `POST /api/posts`; tiempo relativo calculado en render; likes toggle local; botón compartir
- **Vista Oportunidades**: buscador de texto + chips de filtro por especialidad; grid de tarjetas de oferta con descripción, empresa (link al perfil público), contador de postulaciones y botón "Postular"; carga lazy desde `GET /api/ofertas`
- Navbar: botones "Inicio" / "Oportunidades" alternan entre vistas
- Sidebar izquierdo: habilidades (chip azul = validada, gris = pendiente) con botón `+` para agregar y `×` hover para eliminar; certificaciones igual; botón Descargar CV (`window.print()`)
- Sidebar derecho: "Oportunidades" (mini-lista del sidebar existente) + "Mis Postulaciones" con colores de estado
- **Notificaciones**: badge naranja en campana + badge "N nuevos" en card "Mis Postulaciones" cuando hay cambios de estado desde la última visita (persiste en `localStorage` por estudiante); items con cambios resaltados en naranja
- "Editar perfil" en menú del avatar → dialog que edita `descripcion` y `fotoUrl` vía `PATCH /api/estudiantes/me`

**Dashboard empresa (`/empresa`)**
- Perfil real desde `GET /api/empresas/me`
- Vista "Buscar Talento": búsqueda/filtros de estudiantes, dialog de perfil completo
- Vista "Mis Ofertas" (lazy load): grid de ofertas con estado activa/cerrada, crear oferta via `POST /api/ofertas`, toggle activa/inactiva via `PATCH /api/ofertas/:id`
- Contactar estudiante: captura `estudianteId` antes de cerrar el dialog y llama a `POST /api/contactos`
- "Editar perfil" en menú del avatar → dialog que edita `rubro`, `descripcion` y `logoUrl` vía `PATCH /api/empresas/me`

**Panel admin (`/colegio`)**
- Tabla de estudiantes desde la API, búsqueda, menú lateral
- Dialog "Validar": switches individuales por habilidad/certificación + toggle de disponibilidad; guarda con `PATCH` en paralelo y refleja cambios localmente
- Vista "Postulaciones" (lazy load): tabla con todas las postulaciones, botones Aceptar/Rechazar/Resetear via `PATCH /api/postulaciones/:id`
- Vista "Empresas" (lazy load): tabla con nombre, rubro, ofertas activas; botón "Ver perfil" navega a `/empresas/:id`; stat card "Empresas conectadas" con dato real

## Plan de Mejoras

### Problemas Críticos (urgente)

**Seguridad:**
- `http://localhost:3000` hardcodeado en todos los componentes del frontend — romperá en producción; solución: usar `VITE_API_URL` como variable de entorno
- CORS abierto a todos los orígenes (`app.use(cors())` sin restricciones)
- Sin validación de inputs en el backend (longitud de campos, formato de email, etc.)
- Sin rate limiting en endpoints que no son login
- Contraseñas sin validación en el backend (solo en frontend)

**Bugs funcionales confirmados:**
- El formulario de "Contactar" en el Directorio Público muestra "Simulamos envío" y **no llama a la API real** (`POST /api/contactos`)
- Los **likes en posts desaparecen al recargar** — estado solo local, sin persistir en backend
- Contadores de estadísticas en el panel admin usan datos hardcodeados en algunos lugares
- Habilidades duplicadas posibles — sin restricción `UNIQUE(estudianteId, nombre)` en schema ni en UI

### Prioridad Alta — Funcionalidad faltante

| Feature | Quién lo necesita | Esfuerzo |
|---|---|---|
| Variables de entorno en frontend (`VITE_API_URL`) | Todos | Bajo |
| Toast notifications en operaciones silenciosas (`sonner` ya instalado) | Todos | Bajo |
| Paginación en feeds, listas de estudiantes, ofertas | Todos | Medio |
| `GET /api/contactos/me` + vista "Mis Contactos" para estudiante | Estudiante | Medio |
| Retirar postulación (`DELETE /api/postulaciones/:id`) | Estudiante | Bajo |
| Ver postulantes de una oferta específica (`GET /api/postulaciones?ofertaId=`) | Empresa | Medio |
| Dashboard admin con KPIs reales (endpoint de estadísticas) | Admin | Medio |
| Validación de inputs en backend (Zod o express-validator) | Backend | Medio |
| Búsqueda de empresas en el Directorio Público (actualmente solo estudiantes) | Todos | Bajo |

### Prioridad Media — UX/UI

- **Skeleton loaders** en vistas de carga lenta (Ofertas, Postulaciones en admin)
- **Navegación móvil** faltante en `CompanyDashboard` (navbar oculta con `hidden md:flex`)
- **Tabla admin no responsive** en móvil — necesita vista alternativa
- **"Descargar CV"** usa `window.print()` sin estilos de impresión definidos
- **Error messages genéricos** — no distingue "email ya registrado" de "error del servidor" en registro
- **Sin feedback visual** al eliminar habilidades/certificaciones (operación silenciosa)
- **Deduplicación de habilidades** — validar en UI antes de enviar al backend

### Prioridad Media — Backend

| Mejora | Impacto |
|---|---|
| Middleware centralizador de errores en `server/index.js` | Código más limpio, mensajes consistentes |
| Índices en DB: `email`, `especialidad`, `estado`, `activa`, `disponible` | Rendimiento en queries frecuentes |
| Constraint `UNIQUE` en `Postulacion(estudianteId, ofertaId)` | Integridad de datos (actualmente solo validado en código) |
| Constraint `UNIQUE` en `Habilidad(estudianteId, nombre)` | Evitar duplicados |
| Logging de requests con `morgan` | Debugging en producción |
| Endpoint `GET /api/contactos/me` — lista contactos recibidos por estudiante | Feature faltante con modelo existente |
| Soft deletes en Posts (`deletedAt`) | Permitir recuperación |

### Prioridad Baja — Features futuras

- Recuperación de contraseña via email
- Notificaciones en tiempo real (WebSocket o polling)
- Historial de pasantías completadas
- Rating de pasantías empresa ↔ estudiante
- Tests unitarios e integración (ninguno existe actualmente)
- Documentación de la API (Swagger/OpenAPI)
- Exportación de datos del admin (CSV, Excel)
- Búsqueda full-text en ofertas y estudiantes

---

## Reglas de Código

- **Simplicidad ante todo**: código directo y sin abstracciones innecesarias. Si algo se usa una sola vez, escríbelo donde se necesita.
- **Sin funciones helper innecesarias**: no crear utilidades o wrappers para operaciones que solo ocurren en un lugar.
- **Comentarios en español**: cualquier comentario en el código debe escribirse en español.
- **Nombres en camelCase en español**: variables, funciones y parámetros se nombran en camelCase usando palabras en español (ej. `obtenerEstudiantes`, `nombreUsuario`, `estaDisponible`). Excepción: componentes React en PascalCase siguiendo la convención de React.
- **Un solo colegio**: la plataforma es exclusiva del Centro Educacional Cardenal José María Caro. No mostrar selector de colegio al usuario; asignar automáticamente desde la API.
- **Select con react-hook-form**: usar siempre `Controller` de react-hook-form para los componentes `Select` de shadcn/ui. El patrón `setValue` + `<input type="hidden">` no funciona correctamente con la validación en submit.
