const express = require('express')
const prisma = require('../prismaClient')
const verificarToken = require('../middleware/verificarToken')

const router = express.Router()

// GET /api/postulaciones/me — Postulaciones del estudiante autenticado
router.get('/me', verificarToken, async (req, res) => {
  if (req.usuario.rol !== 'ESTUDIANTE') {
    return res.status(403).json({ error: 'Solo los estudiantes pueden ver sus postulaciones' })
  }

  try {
    const estudiante = await prisma.estudiante.findUnique({ where: { usuarioId: req.usuario.id } })
    if (!estudiante) return res.status(404).json({ error: 'Perfil no encontrado' })

    const postulaciones = await prisma.postulacion.findMany({
      where: { estudianteId: estudiante.id },
      include: {
        oferta: {
          include: { empresa: { select: { id: true, nombre: true, logoUrl: true } } },
        },
      },
      orderBy: { creadoEn: 'desc' },
    })

    res.json(postulaciones)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al obtener postulaciones' })
  }
})

// GET /api/postulaciones — Todas las postulaciones (solo ADMINISTRADOR)
router.get('/', verificarToken, async (req, res) => {
  if (req.usuario.rol !== 'ADMINISTRADOR') {
    return res.status(403).json({ error: 'Solo los administradores pueden ver todas las postulaciones' })
  }

  try {
    const postulaciones = await prisma.postulacion.findMany({
      include: {
        estudiante: { select: { id: true, nombre: true, apellido: true, especialidad: true } },
        oferta: {
          include: { empresa: { select: { id: true, nombre: true } } },
        },
      },
      orderBy: { creadoEn: 'desc' },
    })

    res.json(postulaciones)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al obtener postulaciones' })
  }
})

// PATCH /api/postulaciones/:id — Actualiza el estado de una postulación (solo ADMINISTRADOR)
router.patch('/:id', verificarToken, async (req, res) => {
  if (req.usuario.rol !== 'ADMINISTRADOR') {
    return res.status(403).json({ error: 'Solo los administradores pueden actualizar postulaciones' })
  }

  const id = parseInt(req.params.id)
  const { estado } = req.body

  if (!['PENDIENTE', 'ACEPTADA', 'RECHAZADA'].includes(estado)) {
    return res.status(400).json({ error: 'Estado inválido. Debe ser PENDIENTE, ACEPTADA o RECHAZADA' })
  }

  try {
    const postulacion = await prisma.postulacion.update({ where: { id }, data: { estado } })
    res.json(postulacion)
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Postulación no encontrada' })
    console.error(error)
    res.status(500).json({ error: 'Error al actualizar postulación' })
  }
})

// POST /api/postulaciones — Estudiante postula a una oferta
router.post('/', verificarToken, async (req, res) => {
  if (req.usuario.rol !== 'ESTUDIANTE') {
    return res.status(403).json({ error: 'Solo los estudiantes pueden postular' })
  }

  const { ofertaId } = req.body
  if (!ofertaId) {
    return res.status(400).json({ error: 'ofertaId es requerido' })
  }

  try {
    const estudiante = await prisma.estudiante.findUnique({ where: { usuarioId: req.usuario.id } })
    if (!estudiante) {
      return res.status(404).json({ error: 'Perfil de estudiante no encontrado' })
    }

    const yaPostulo = await prisma.postulacion.findFirst({
      where: { estudianteId: estudiante.id, ofertaId: parseInt(ofertaId) },
    })
    if (yaPostulo) {
      return res.status(409).json({ error: 'Ya postulaste a esta oferta' })
    }

    const postulacion = await prisma.postulacion.create({
      data: { estudianteId: estudiante.id, ofertaId: parseInt(ofertaId) },
    })

    res.status(201).json(postulacion)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al crear postulación' })
  }
})

module.exports = router
