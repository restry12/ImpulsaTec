const express = require('express')
const prisma = require('../prismaClient')
const verificarToken = require('../middleware/verificarToken')

const router = express.Router()

// GET /api/estudiantes
// Devuelve todos los estudiantes con sus habilidades y colegio
// Acepta ?disponible=true, ?especialidad= y ?tipoDisponibilidad= para filtrar
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
      select: {
        id: true,
        nombre: true,
        apellido: true,
        especialidad: true,
        descripcion: true,
        fotoUrl: true,
        disponible: true,
        tipoDisponibilidad: true,
        creadoEn: true,
        colegio: { select: { nombre: true } },
        habilidades: { select: { id: true, nombre: true, validada: true } },
        certificaciones: { select: { id: true, nombre: true, institucion: true, validada: true } },
      },
      orderBy: { creadoEn: 'desc' },
    })

    res.json(estudiantes)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al obtener estudiantes' })
  }
})

// GET /api/estudiantes/me — Devuelve el perfil del estudiante autenticado
router.get('/me', verificarToken, async (req, res) => {
  if (req.usuario.rol !== 'ESTUDIANTE') {
    return res.status(403).json({ error: 'Solo los estudiantes pueden acceder a este endpoint' })
  }

  try {
    const estudiante = await prisma.estudiante.findUnique({
      where: { usuarioId: req.usuario.id },
      include: {
        habilidades: true,
        certificaciones: true,
        colegio: { select: { nombre: true } },
      },
    })

    if (!estudiante) {
      return res.status(404).json({ error: 'Perfil de estudiante no encontrado' })
    }

    res.json(estudiante)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al obtener perfil' })
  }
})

// PATCH /api/estudiantes/me — Estudiante actualiza su propio perfil
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

// GET /api/estudiantes/:id
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id)

  try {
    const estudiante = await prisma.estudiante.findUnique({
      where: { id },
      include: {
        habilidades: true,
        certificaciones: true,
        colegio: { select: { nombre: true } },
        postulaciones: {
          include: { oferta: { select: { titulo: true, empresa: { select: { nombre: true } } } } },
        },
      },
    })

    if (!estudiante) {
      return res.status(404).json({ error: 'Estudiante no encontrado' })
    }

    res.json(estudiante)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al obtener estudiante' })
  }
})

// POST /api/estudiantes/habilidades/me — Estudiante agrega una habilidad propia
router.post('/habilidades/me', verificarToken, async (req, res) => {
  if (req.usuario.rol !== 'ESTUDIANTE') {
    return res.status(403).json({ error: 'Solo los estudiantes pueden agregar habilidades' })
  }

  const { nombre } = req.body
  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ error: 'nombre es requerido' })
  }

  try {
    const estudiante = await prisma.estudiante.findUnique({ where: { usuarioId: req.usuario.id } })
    if (!estudiante) return res.status(404).json({ error: 'Perfil no encontrado' })

    const habilidad = await prisma.habilidad.create({
      data: { nombre: nombre.trim(), estudianteId: estudiante.id, validada: false },
    })

    res.status(201).json(habilidad)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al agregar habilidad' })
  }
})

// POST /api/estudiantes/certificaciones/me — Estudiante agrega una certificación propia
router.post('/certificaciones/me', verificarToken, async (req, res) => {
  if (req.usuario.rol !== 'ESTUDIANTE') {
    return res.status(403).json({ error: 'Solo los estudiantes pueden agregar certificaciones' })
  }

  const { nombre, institucion, fechaObtencion } = req.body
  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ error: 'nombre es requerido' })
  }

  try {
    const estudiante = await prisma.estudiante.findUnique({ where: { usuarioId: req.usuario.id } })
    if (!estudiante) return res.status(404).json({ error: 'Perfil no encontrado' })

    const certificacion = await prisma.certificacion.create({
      data: {
        nombre: nombre.trim(),
        estudianteId: estudiante.id,
        validada: false,
        ...(institucion?.trim() && { institucion: institucion.trim() }),
        ...(fechaObtencion && { fechaObtencion: new Date(fechaObtencion) }),
      },
    })

    res.status(201).json(certificacion)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al agregar certificación' })
  }
})

// PATCH /api/estudiantes/habilidades/:id — Valida o invalida una habilidad (solo ADMINISTRADOR)
router.patch('/habilidades/:id', verificarToken, async (req, res) => {
  if (req.usuario.rol !== 'ADMINISTRADOR') {
    return res.status(403).json({ error: 'Solo los administradores pueden validar habilidades' })
  }

  const id = parseInt(req.params.id)
  const { validada } = req.body

  if (typeof validada !== 'boolean') {
    return res.status(400).json({ error: 'validada debe ser un booleano' })
  }

  try {
    const habilidad = await prisma.habilidad.update({ where: { id }, data: { validada } })
    res.json(habilidad)
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Habilidad no encontrada' })
    console.error(error)
    res.status(500).json({ error: 'Error al actualizar habilidad' })
  }
})

// PATCH /api/estudiantes/certificaciones/:id — Valida o invalida una certificación (solo ADMINISTRADOR)
router.patch('/certificaciones/:id', verificarToken, async (req, res) => {
  if (req.usuario.rol !== 'ADMINISTRADOR') {
    return res.status(403).json({ error: 'Solo los administradores pueden validar certificaciones' })
  }

  const id = parseInt(req.params.id)
  const { validada } = req.body

  if (typeof validada !== 'boolean') {
    return res.status(400).json({ error: 'validada debe ser un booleano' })
  }

  try {
    const certificacion = await prisma.certificacion.update({ where: { id }, data: { validada } })
    res.json(certificacion)
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Certificación no encontrada' })
    console.error(error)
    res.status(500).json({ error: 'Error al actualizar certificación' })
  }
})

// PATCH /api/estudiantes/:id/disponible — Actualiza disponibilidad (solo ADMINISTRADOR)
router.patch('/:id/disponible', verificarToken, async (req, res) => {
  if (req.usuario.rol !== 'ADMINISTRADOR') {
    return res.status(403).json({ error: 'Solo los administradores pueden actualizar la disponibilidad' })
  }

  const id = parseInt(req.params.id)
  const { disponible } = req.body

  if (typeof disponible !== 'boolean') {
    return res.status(400).json({ error: 'disponible debe ser un booleano' })
  }

  try {
    const estudiante = await prisma.estudiante.update({
      where: { id },
      data: { disponible },
    })
    res.json(estudiante)
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Estudiante no encontrado' })
    }
    console.error(error)
    res.status(500).json({ error: 'Error al actualizar disponibilidad' })
  }
})

// DELETE /api/estudiantes/habilidades/:id — Estudiante elimina una habilidad propia
router.delete('/habilidades/:id', verificarToken, async (req, res) => {
  if (req.usuario.rol !== 'ESTUDIANTE') {
    return res.status(403).json({ error: 'Solo los estudiantes pueden eliminar sus habilidades' })
  }

  const id = parseInt(req.params.id)

  try {
    // Verifica que la habilidad le pertenezca al estudiante autenticado
    const estudiante = await prisma.estudiante.findUnique({ where: { usuarioId: req.usuario.id } })
    if (!estudiante) return res.status(404).json({ error: 'Perfil no encontrado' })

    const habilidad = await prisma.habilidad.findUnique({ where: { id } })
    if (!habilidad) return res.status(404).json({ error: 'Habilidad no encontrada' })
    if (habilidad.estudianteId !== estudiante.id) {
      return res.status(403).json({ error: 'No tienes permiso para eliminar esta habilidad' })
    }

    await prisma.habilidad.delete({ where: { id } })
    res.status(204).send()
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al eliminar habilidad' })
  }
})

// DELETE /api/estudiantes/certificaciones/:id — Estudiante elimina una certificación propia
router.delete('/certificaciones/:id', verificarToken, async (req, res) => {
  if (req.usuario.rol !== 'ESTUDIANTE') {
    return res.status(403).json({ error: 'Solo los estudiantes pueden eliminar sus certificaciones' })
  }

  const id = parseInt(req.params.id)

  try {
    const estudiante = await prisma.estudiante.findUnique({ where: { usuarioId: req.usuario.id } })
    if (!estudiante) return res.status(404).json({ error: 'Perfil no encontrado' })

    const certificacion = await prisma.certificacion.findUnique({ where: { id } })
    if (!certificacion) return res.status(404).json({ error: 'Certificación no encontrada' })
    if (certificacion.estudianteId !== estudiante.id) {
      return res.status(403).json({ error: 'No tienes permiso para eliminar esta certificación' })
    }

    await prisma.certificacion.delete({ where: { id } })
    res.status(204).send()
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al eliminar certificación' })
  }
})

module.exports = router
