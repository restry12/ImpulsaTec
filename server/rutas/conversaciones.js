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
  if (req.usuario.rol === 'ADMINISTRADOR') {
    const admin = await prisma.administrador.findUnique({ where: { usuarioId: req.usuario.id } })
    return admin && conv.administradorId === admin.id
  }
  if (req.usuario.rol === 'ESTUDIANTE') {
    const estudiante = await prisma.estudiante.findUnique({ where: { usuarioId: req.usuario.id } })
    return estudiante && (conv.estudiante1Id === estudiante.id || conv.estudiante2Id === estudiante.id)
  }
  return false
}

// Función auxiliar: construye el objeto contraparte según tipo y rol del autenticado
function construirContraparte(conv, rolActual, idActual) {
  if (conv.tipo === 'EMPRESA_ESTUDIANTE') {
    if (rolActual === 'EMPRESA') {
      return { id: conv.estudiante1.id, nombre: `${conv.estudiante1.nombre} ${conv.estudiante1.apellido}`, logoUrl: conv.estudiante1.fotoUrl }
    }
    return { id: conv.empresa.id, nombre: conv.empresa.nombre, logoUrl: conv.empresa.logoUrl }
  }
  if (conv.tipo === 'ADMINISTRADOR_ESTUDIANTE') {
    if (rolActual === 'ADMINISTRADOR') {
      return { id: conv.estudiante1.id, nombre: `${conv.estudiante1.nombre} ${conv.estudiante1.apellido}`, logoUrl: conv.estudiante1.fotoUrl }
    }
    // El estudiante ve al admin como contraparte — devolver el nombre del colegio
    return { id: conv.administrador.id, nombre: conv.administrador.colegio?.nombre ?? conv.administrador.nombre, logoUrl: conv.administrador.colegio?.logoUrl ?? null }
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
        contraparte: construirContraparte(conv, 'EMPRESA', empresa.id),
        ultimoMensaje: conv.mensajes[0] ? { contenido: conv.mensajes[0].contenido, creadoEn: conv.mensajes[0].creadoEn } : null,
        noLeidos: conv._count.mensajes,
      })))
    }

    if (req.usuario.rol === 'ESTUDIANTE') {
      const estudiante = await prisma.estudiante.findUnique({ where: { usuarioId: req.usuario.id } })
      if (!estudiante) return res.status(404).json({ error: 'Perfil de estudiante no encontrado' })

      const [convEmpresa, convEstudiante, convAdmin] = await Promise.all([
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
        prisma.conversacion.findMany({
          where: { tipo: 'ADMINISTRADOR_ESTUDIANTE', estudiante1Id: estudiante.id },
          include: {
            administrador: { select: { id: true, nombre: true, colegio: { select: { nombre: true, logoUrl: true } } } },
            estudiante1: { select: { id: true, nombre: true, apellido: true, fotoUrl: true } },
            mensajes: { orderBy: { creadoEn: 'desc' }, take: 1 },
            _count: { select: { mensajes: { where: { autorTipo: 'ADMINISTRADOR', leido: false } } } },
          },
          orderBy: { creadoEn: 'desc' },
        }),
      ])

      const resultado = [
        ...convEmpresa.map(conv => ({
          id: conv.id,
          tipo: conv.tipo,
          contraparte: construirContraparte(conv, 'ESTUDIANTE', estudiante.id),
          ultimoMensaje: conv.mensajes[0] ? { contenido: conv.mensajes[0].contenido, creadoEn: conv.mensajes[0].creadoEn } : null,
          noLeidos: conv._count.mensajes,
        })),
        ...convEstudiante.map(conv => ({
          id: conv.id,
          tipo: conv.tipo,
          contraparte: construirContraparte(conv, 'ESTUDIANTE', estudiante.id),
          ultimoMensaje: conv.mensajes[0] ? { contenido: conv.mensajes[0].contenido, creadoEn: conv.mensajes[0].creadoEn } : null,
          noLeidos: conv._count.mensajes,
        })),
        ...convAdmin.map(conv => ({
          id: conv.id,
          tipo: conv.tipo,
          contraparte: construirContraparte(conv, 'ESTUDIANTE', estudiante.id),
          ultimoMensaje: conv.mensajes[0] ? { contenido: conv.mensajes[0].contenido, creadoEn: conv.mensajes[0].creadoEn } : null,
          noLeidos: conv._count.mensajes,
        })),
      ]

      return res.json(resultado)
    }

    if (req.usuario.rol === 'ADMINISTRADOR') {
      const admin = await prisma.administrador.findUnique({ where: { usuarioId: req.usuario.id } })
      if (!admin) return res.status(404).json({ error: 'Perfil de administrador no encontrado' })

      const convs = await prisma.conversacion.findMany({
        where: { tipo: 'ADMINISTRADOR_ESTUDIANTE', administradorId: admin.id },
        include: {
          administrador: { select: { id: true, nombre: true } },
          estudiante1: { select: { id: true, nombre: true, apellido: true, fotoUrl: true } },
          mensajes: { orderBy: { creadoEn: 'desc' }, take: 1 },
          _count: { select: { mensajes: { where: { autorTipo: 'ESTUDIANTE', leido: false } } } },
        },
        orderBy: { creadoEn: 'desc' },
      })

      return res.json(convs.map(conv => ({
        id: conv.id,
        tipo: conv.tipo,
        contraparte: construirContraparte(conv, 'ADMINISTRADOR', admin.id),
        ultimoMensaje: conv.mensajes[0] ? { contenido: conv.mensajes[0].contenido, creadoEn: conv.mensajes[0].creadoEn } : null,
        noLeidos: conv._count.mensajes,
      })))
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
        administrador: { select: { id: true, nombre: true, colegio: { select: { nombre: true, logoUrl: true } } } },
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

      // Buscar hilo existente (find-or-create para idempotencia)
      let conv = await prisma.conversacion.findFirst({
        where: { tipo: 'EMPRESA_ESTUDIANTE', empresaId: empresa.id, estudiante1Id: estudianteIdParsed },
      })

      if (!conv) {
        conv = await prisma.conversacion.create({
          data: { tipo: 'EMPRESA_ESTUDIANTE', empresaId: empresa.id, estudiante1Id: estudianteIdParsed },
        })
        return res.status(201).json({ id: conv.id })
      }

      return res.json({ id: conv.id })
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
        return res.status(201).json({ id: conv.id })
      }

      return res.json({ id: conv.id })
    }

    if (req.usuario.rol === 'ADMINISTRADOR') {
      const admin = await prisma.administrador.findUnique({ where: { usuarioId: req.usuario.id } })
      if (!admin) return res.status(404).json({ error: 'Perfil de administrador no encontrado' })

      // Buscar hilo existente (find-or-create para idempotencia)
      let conv = await prisma.conversacion.findFirst({
        where: { tipo: 'ADMINISTRADOR_ESTUDIANTE', administradorId: admin.id, estudiante1Id: estudianteIdParsed },
      })
      if (!conv) {
        conv = await prisma.conversacion.create({
          data: { tipo: 'ADMINISTRADOR_ESTUDIANTE', administradorId: admin.id, estudiante1Id: estudianteIdParsed },
        })
        return res.status(201).json({ id: conv.id })
      }
      return res.json({ id: conv.id })
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
        administrador: true,
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
    let emisorAdministradorId = null

    if (req.usuario.rol === 'EMPRESA') {
      const empresa = await prisma.empresa.findUnique({ where: { usuarioId: req.usuario.id } })
      emisorEmpresaId = empresa.id
    } else if (req.usuario.rol === 'ADMINISTRADOR') {
      const admin = await prisma.administrador.findUnique({ where: { usuarioId: req.usuario.id } })
      emisorAdministradorId = admin.id
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
        emisorAdministradorId,
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

    if (req.usuario.rol === 'EMPRESA' || req.usuario.rol === 'ADMINISTRADOR') {
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
