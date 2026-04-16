# Diseño: Mensajería Directa (DMs) Empresa ↔ Estudiante y Estudiante ↔ Estudiante

**Fecha:** 2026-04-16  
**Estado:** Aprobado

---

## Resumen

Implementar un sistema de mensajes directos (DMs) al estilo Instagram para la plataforma ImpulsaTec. Las empresas pueden iniciar hilos con estudiantes; los estudiantes pueden responder a empresas y también iniciar hilos entre ellos. Se accede desde el botón "Mensajes" en el navbar de empresa y estudiante. El chat empresa↔colegio existente permanece separado e intacto.

---

## Reglas de negocio

- Solo las **empresas** pueden iniciar un hilo con un estudiante.
- Los **estudiantes** pueden iniciar hilos con otros estudiantes.
- Los estudiantes solo pueden responder hilos que una empresa inició (no pueden iniciar con empresas).
- El botón "Contactar" en el perfil de un estudiante (vista empresa) crea automáticamente el hilo DM y envía el mensaje inicial.
- Un hilo empresa↔estudiante es único por par (idempotente).
- Un hilo estudiante↔estudiante es único por par ordenado de IDs.
- El badge en el navbar muestra el **número de hilos** (no mensajes) con mensajes no leídos.

---

## Base de datos

### Nuevos modelos en `schema.prisma`

```prisma
enum TipoConversacion {
  EMPRESA_ESTUDIANTE
  ESTUDIANTE_ESTUDIANTE
}

model Conversacion {
  id            Int              @id @default(autoincrement())
  tipo          TipoConversacion
  empresaId     Int?
  estudiante1Id Int              // participante estudiante (o iniciador en S-S)
  estudiante2Id Int?             // segundo estudiante (solo en ESTUDIANTE_ESTUDIANTE)
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
  autorTipo          Rol      // EMPRESA | ESTUDIANTE
  emisorEmpresaId    Int?
  emisorEstudianteId Int?
  leido              Boolean  @default(false)
  creadoEn           DateTime @default(now())

  conversacion       Conversacion @relation(fields: [conversacionId], references: [id], onDelete: Cascade)
  emisorEmpresa      Empresa?     @relation(fields: [emisorEmpresaId], references: [id])
  emisorEstudiante   Estudiante?  @relation(fields: [emisorEstudianteId], references: [id])
}
```

### Cambio en `Contacto`

`POST /api/contactos` crea el `Contacto` existente **y** crea/reutiliza una `Conversacion` tipo `EMPRESA_ESTUDIANTE`, agregando el mensaje inicial como `MensajeDirecto`. El endpoint devuelve `{ contacto, conversacionId }` para que el frontend pueda abrir el hilo directamente.

---

## API

Ruta nueva: `server/rutas/conversaciones.js`, montada en `/api/conversaciones`.

### Endpoints

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| `GET` | `/api/conversaciones` | EMPRESA, ESTUDIANTE | Lista de hilos del usuario autenticado con último mensaje, hora y count no leídos |
| `GET` | `/api/conversaciones/:id` | EMPRESA, ESTUDIANTE | Mensajes de un hilo (verifica participación) |
| `POST` | `/api/conversaciones` | EMPRESA, ESTUDIANTE | Crea o devuelve hilo existente. Empresa: `{ estudianteId }`. Estudiante: `{ estudianteId }` del otro estudiante |
| `POST` | `/api/conversaciones/:id/mensajes` | EMPRESA, ESTUDIANTE | Envía mensaje al hilo (verifica participación) |
| `PATCH` | `/api/conversaciones/:id/leido` | EMPRESA, ESTUDIANTE | Marca como leídos los mensajes del otro participante |

### Seguridad
- Todos los endpoints requieren JWT (`verificarToken`).
- Antes de devolver/escribir en un hilo, verificar que el usuario autenticado sea uno de los participantes.
- Un estudiante no puede crear un hilo con una empresa (devuelve 403).

### Respuesta de `GET /api/conversaciones`

```json
[
  {
    "id": 1,
    "tipo": "EMPRESA_ESTUDIANTE",
    "contraparte": { "id": 5, "nombre": "Tech S.A.", "logoUrl": null },
    "ultimoMensaje": { "contenido": "Hola, te contactamos...", "creadoEn": "..." },
    "noLeidos": 2
  }
]
```

Para el estudiante, devuelve un array unificado con `tipo` para que el frontend separe en tabs.

---

## Frontend

### Componente nuevo: `PanelDMs.tsx`

Panel lateral deslizante (mismo estilo spring animation que `PanelChat`). Dos capas:

**Capa 1 — Lista de hilos:**
- Header: "Mensajes" + botón cerrar.
- Para estudiante: tabs "Empresas" / "Estudiantes".
- Cada fila: avatar + nombre contraparte + último mensaje truncado + hora relativa + badge naranja de no leídos.
- Click en fila → navega a Capa 2.

**Capa 2 — Hilo individual:**
- Header: avatar + nombre contraparte + botón "← Volver".
- Burbujas: mis mensajes (naranja #F97316, derecha), mensajes del otro (#0F172A, izquierda).
- Input textarea + botón enviar (mismo patrón que `PanelChat`).
- Enter envía, Shift+Enter nueva línea.
- Polling cada 4s mientras está abierto.
- Al abrir el hilo, llama a `PATCH /api/conversaciones/:id/leido`.

### Cambios en `CompanyDashboard.tsx`

- Botón **"Mensajes"** en navbar: abre `PanelDMs`. Badge = número de hilos con no leídos.
- Botón **"Chat con el colegio"** (en sidebar y navbar): sin cambios, sigue usando `PanelChat`.
- Botón **"Contactar"**: llama a `POST /api/contactos`, recibe `conversacionId`, abre `PanelDMs` directo en ese hilo.

### Cambios en `StudentDashboard.tsx`

- Botón **"Mensajes"** en navbar: activa `PanelDMs`. Badge = total de hilos con no leídos (ambas tabs).
- `PanelDMs` muestra tabs "Empresas" y "Estudiantes".
- En el directorio o feed, si el estudiante ve el perfil de otro estudiante, aparece botón "Enviar mensaje" que abre `PanelDMs` en ese hilo (creándolo si no existe).

---

## Flujo de datos

```
Empresa hace clic "Contactar" en perfil de estudiante
  → POST /api/contactos  →  crea Contacto + Conversacion + MensajeDirecto inicial
  → frontend recibe conversacionId
  → abre PanelDMs en el hilo

Empresa en PanelDMs lista sus hilos
  → GET /api/conversaciones  →  lista con último mensaje y no leídos
  → clic en hilo  →  GET /api/conversaciones/:id
  → PATCH /api/conversaciones/:id/leido (marca leídos)
  → polling cada 4s

Estudiante abre PanelDMs
  → GET /api/conversaciones  →  lista unificada con campo "tipo"
  → tab "Empresas" filtra tipo EMPRESA_ESTUDIANTE
  → tab "Estudiantes" filtra tipo ESTUDIANTE_ESTUDIANTE
```

---

## Fuera de alcance

- Mensajes multimedia (solo texto en DMs).
- Notificaciones push (el polling es suficiente para la escala actual).
- Estudiante iniciando hilo con empresa.
- Borrar mensajes o conversaciones.
