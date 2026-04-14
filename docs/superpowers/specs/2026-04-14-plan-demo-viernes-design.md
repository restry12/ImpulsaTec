# Plan de Acción — Demo Escolar Viernes

**Fecha:** 2026-04-14
**Objetivo:** Dejar ImpulsaTec listo para presentación escolar el viernes 2026-04-18
**Enfoque:** Corregir bugs críticos + conectar features a medias + pulido visual
**Roles a demostrar:** Estudiante, Empresa, Administrador

---

## Contexto

ImpulsaTec es una red social estilo LinkedIn exclusiva del Centro Educacional Cardenal José María Caro. La demo mostrará los 3 roles en vivo. El criterio de priorización es: **estabilidad primero, luego impacto visual**.

**Regla de oro:** Si algo toma más de 2 horas y no estaba en el plan, se descarta.

---

## Sección 1 — Bugs Críticos (Martes)

Bugs que arruinarían la demo si no se corrigen.

| Bug | Impacto | Archivo(s) |
|---|---|---|
| Formulario "Contactar" en Directorio Público dice "Simulamos envío" y no llama a la API | Empresa contacta estudiante pero no ocurre nada real | `PublicDirectory.tsx` |
| Likes de posts desaparecen al recargar | Estudiante da like, recarga, y se borra | `StudentDashboard.tsx` |
| Habilidades duplicadas permitidas | En demo se puede agregar "JavaScript" dos veces sin error | `StudentDashboard.tsx` + backend |
| Sin feedback al eliminar habilidades/certificaciones | Se borra en silencio, parece que no funcionó | `StudentDashboard.tsx` |
| Mensajes de error genéricos en registro | Si falla en demo, no se sabe por qué | `RegisterPage.tsx` |

---

## Sección 2 — Features a Medias (Miércoles AM)

Features que ya tienen soporte en backend pero sin UI completa.

| Feature | Qué falta | Archivos involucrados |
|---|---|---|
| **"Mis Contactos"** para estudiante | Vista en sidebar derecho del dashboard que llame a `GET /api/contactos/me` (endpoint a crear) | `StudentDashboard.tsx`, `server/routes/contactos.js` |
| **Toast notifications** | Conectar `sonner` (ya instalado) en operaciones silenciosas: postular, agregar habilidad, contactar | `StudentDashboard.tsx`, `CompanyDashboard.tsx` |
| **Tab "Empresas"** en Directorio Público | Agregar tab que llame a `GET /api/empresas` junto al tab de estudiantes | `PublicDirectory.tsx` |
| **Feedback visual** al contactar estudiante | Confirmación clara después de `POST /api/contactos` en CompanyDashboard | `CompanyDashboard.tsx` |
| **`VITE_API_URL`** en frontend | Mover `http://localhost:3000` a variable de entorno para que funcione en cualquier máquina | Todos los componentes, `.env` nuevo |

---

## Sección 3 — Pulido Visual (Miércoles PM)

Detalles que hacen el proyecto verse profesional y terminado.

| Mejora | Dónde | Efecto en demo |
|---|---|---|
| **Skeleton loaders** en vistas de carga lenta | Vista Ofertas, Postulaciones admin, Empresas admin | Evita pantallas en blanco |
| **Estilos de impresión** para "Descargar CV" | `StudentDashboard.tsx` + CSS `@media print` | El botón existe pero el resultado es feo |
| **Mensajes de error descriptivos** en registro/login | `RegisterPage.tsx`, `LoginPage.tsx` | "Email ya registrado" en vez de "Error 400" |
| **Stats reales** en panel admin | `SchoolAdminPanel.tsx` stat cards | Números reales en vez de hardcodeados |
| **Navegación móvil** en CompanyDashboard | Navbar oculta con `hidden md:flex` | Si demuestran desde tablet/móvil se ve roto |

> Si el miércoles se acumula, los skeleton loaders y navegación móvil son los primeros en sacrificar.

---

## Sección 4 — Cronograma

| Día | Foco | Entregable |
|---|---|---|
| **Martes 15** | Bugs críticos | 5 bugs corregidos, formulario de contacto funcional |
| **Miércoles 16** | Features a medias + pulido | "Mis Contactos", tab Empresas, toasts, VITE_API_URL, skeletons |
| **Jueves 17** | Buffer + ensayo completo | Demo de los 3 roles de principio a fin sin errores |
| **Viernes 18** | Presentación | Solo fixes críticos si aparece algo roto |

---

## Flujo de demo sugerido

1. **Visitante** — abrir Directorio Público, buscar estudiante, buscar empresa
2. **Estudiante** — login, ver feed, publicar post, buscar oferta, postular, ver "Mis Postulaciones", agregar habilidad
3. **Empresa** — login, buscar talento, contactar estudiante, crear oferta, ver postulantes
4. **Admin** — login, validar habilidades de estudiante, aceptar postulación, ver empresas

---

## Fuera de alcance (esta semana)

- Recuperación de contraseña
- Paginación
- Tests
- Validación de inputs en backend
- WebSockets / notificaciones en tiempo real
- Exportación de datos
