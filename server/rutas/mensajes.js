const express = require('express')
const prisma = require('../prismaClient')
const verificarToken = require('../middleware/verificarToken')

const router = express.Router()

// GET /api/mensajes
// EMPRESA: devuelve su hilo con el colegio (todos los mensajes del hilo ordenados por creadoEn asc)
// ADMINISTRADOR sin ?empresaId: devuelve resumen de todos los hilos (última mensaje + no leídos)
// ADMINISTRADOR con ?empresaId=X: devuelve el hilo completo de esa empresa
router.get('/', verificarToken, async (req, res) => {
  try {
    if (req.usuario.rol === 'EMPRESA') {
      const empresa = await prisma.empresa.findUnique({ where: { usuarioId: req.usuario.id } })
      if (!empresa) return res.status(404).json({ error: 'Perfil de empresa no encontrado' })

      const mensajes = await prisma.mensaje.findMany({
        where: { empresaId: empresa.id },
        orderBy: { creadoEn: 'asc' },
      })
      return res.json(mensajes)
    }

    if (req.usuario.rol === 'ADMINISTRADOR') {
      const { empresaId } = req.query

      if (empresaId) {
        const parsedEmpresaId = parseInt(empresaId)
        if (isNaN(parsedEmpresaId)) return res.status(400).json({ error: 'empresaId debe ser un número' })

        const mensajes = await prisma.mensaje.findMany({
          where: { empresaId: parsedEmpresaId },
          orderBy: { creadoEn: 'asc' },
        })
        return res.json(mensajes)
      }

      // Resumen de todos los hilos: último mensaje + count de no leídos por empresa
      const empresasConMensajes = await prisma.empresa.findMany({
        where: { mensajes: { some: {} } },
        select: {
          id: true,
          nombre: true,
          logoUrl: true,
          mensajes: {
            orderBy: { creadoEn: 'desc' },
            take: 1,
            select: { contenido: true, autorTipo: true, creadoEn: true },
          },
          _count: {
            select: {
              mensajes: { where: { autorTipo: 'EMPRESA', leido: false } },
            },
          },
        },
      })

      // Ordenar por recencia (último mensaje)
      empresasConMensajes.sort((a, b) => {
        const fechaA = a.mensajes[0]?.creadoEn ?? new Date(0)
        const fechaB = b.mensajes[0]?.creadoEn ?? new Date(0)
        return new Date(fechaB).getTime() - new Date(fechaA).getTime()
      })

      return res.json(empresasConMensajes)
    }

    return res.status(403).json({ error: 'Acceso no permitido' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al obtener mensajes' })
  }
})

// POST /api/mensajes
// EMPRESA: envía mensaje al colegio (empresaId resuelto desde el token)
// ADMINISTRADOR: envía mensaje a una empresa (requiere empresaId en el body)
router.post('/', verificarToken, async (req, res) => {
  const { contenido, empresaId } = req.body

  if (!contenido?.trim()) {
    return res.status(400).json({ error: 'contenido es requerido' })
  }

  try {
    if (req.usuario.rol === 'EMPRESA') {
      const empresa = await prisma.empresa.findUnique({ where: { usuarioId: req.usuario.id } })
      if (!empresa) return res.status(404).json({ error: 'Perfil de empresa no encontrado' })

      const mensaje = await prisma.mensaje.create({
        data: {
          empresaId: empresa.id,
          contenido: contenido.trim(),
          autorTipo: 'EMPRESA',
        },
      })
      return res.status(201).json(mensaje)
    }

    if (req.usuario.rol === 'ADMINISTRADOR') {
      if (!empresaId || isNaN(parseInt(empresaId))) return res.status(400).json({ error: 'empresaId debe ser un número válido' })

      const mensaje = await prisma.mensaje.create({
        data: {
          empresaId: parseInt(empresaId),
          contenido: contenido.trim(),
          autorTipo: 'ADMINISTRADOR',
        },
      })
      return res.status(201).json(mensaje)
    }

    return res.status(403).json({ error: 'Acceso no permitido' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al enviar mensaje' })
  }
})

// PATCH /api/mensajes/leido/:empresaId
// Marca como leídos los mensajes no leídos del lado contrario al que hace el request
// EMPRESA → marca leídos los mensajes con autorTipo = ADMINISTRADOR de su hilo
// ADMINISTRADOR → marca leídos los mensajes con autorTipo = EMPRESA del hilo indicado
router.patch('/leido/:empresaId', verificarToken, async (req, res) => {
  const empresaId = parseInt(req.params.empresaId)
  if (isNaN(empresaId)) return res.status(400).json({ error: 'empresaId debe ser un número' })

  try {
    if (req.usuario.rol === 'EMPRESA') {
      const empresa = await prisma.empresa.findUnique({ where: { usuarioId: req.usuario.id } })
      if (!empresa || empresa.id !== empresaId) {
        return res.status(403).json({ error: 'No tienes permiso' })
      }

      await prisma.mensaje.updateMany({
        where: { empresaId, autorTipo: 'ADMINISTRADOR', leido: false },
        data: { leido: true },
      })
      return res.json({ ok: true })
    }

    if (req.usuario.rol === 'ADMINISTRADOR') {
      await prisma.mensaje.updateMany({
        where: { empresaId, autorTipo: 'EMPRESA', leido: false },
        data: { leido: true },
      })
      return res.json({ ok: true })
    }

    return res.status(403).json({ error: 'Acceso no permitido' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al marcar mensajes como leídos' })
  }
})

module.exports = router
