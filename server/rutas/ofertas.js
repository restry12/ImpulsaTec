const express = require('express')
const { z } = require('zod')
const prisma = require('../prismaClient')
const verificarToken = require('../middleware/verificarToken')

const router = express.Router()

// GET /api/ofertas — Directorio público de ofertas activas
// Filtros opcionales: ?especialidad=  ?busqueda=
router.get('/', async (req, res) => {
  const { especialidad, busqueda } = req.query

  const where = { activa: true }
  if (especialidad) {
    where.especialidad = { contains: especialidad, mode: 'insensitive' }
  }
  if (busqueda) {
    where.OR = [
      { titulo: { contains: busqueda, mode: 'insensitive' } },
      { descripcion: { contains: busqueda, mode: 'insensitive' } },
      { empresa: { nombre: { contains: busqueda, mode: 'insensitive' } } },
    ]
  }

  try {
    const ofertas = await prisma.oferta.findMany({
      where,
      include: {
        empresa: { select: { id: true, nombre: true, rubro: true, logoUrl: true } },
        _count: { select: { postulaciones: true } },
      },
      orderBy: { creadoEn: 'desc' },
    })
    res.json(ofertas)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al obtener ofertas' })
  }
})

// GET /api/ofertas/empresa/me — Todas las ofertas de la empresa autenticada (activas e inactivas)
router.get('/empresa/me', verificarToken, async (req, res) => {
  if (req.usuario.rol !== 'EMPRESA') {
    return res.status(403).json({ error: 'Solo las empresas pueden ver sus ofertas' })
  }

  try {
    const empresa = await prisma.empresa.findUnique({ where: { usuarioId: req.usuario.id } })
    if (!empresa) return res.status(404).json({ error: 'Perfil no encontrado' })

    const ofertas = await prisma.oferta.findMany({
      where: { empresaId: empresa.id },
      include: { _count: { select: { postulaciones: true } } },
      orderBy: { creadoEn: 'desc' },
    })

    res.json(ofertas)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al obtener ofertas' })
  }
})

// POST /api/ofertas — Empresa crea una nueva oferta
router.post('/', verificarToken, async (req, res) => {
  if (req.usuario.rol !== 'EMPRESA') {
    return res.status(403).json({ error: 'Solo las empresas pueden crear ofertas' })
  }

  const esquemaOferta = z.object({
    titulo: z.string().min(5, { message: 'El título debe tener al menos 5 caracteres' }),
    descripcion: z.string().min(10, { message: 'La descripción debe tener al menos 10 caracteres' }),
    especialidad: z.string().min(1, { message: 'La especialidad es requerida' }),
  })
  const validacion = esquemaOferta.safeParse(req.body)
  if (!validacion.success) {
    const primer = validacion.error.issues[0]
    return res.status(400).json({ error: primer.message })
  }

  const { titulo, descripcion, especialidad } = req.body

  try {
    const empresa = await prisma.empresa.findUnique({ where: { usuarioId: req.usuario.id } })
    if (!empresa) return res.status(404).json({ error: 'Perfil no encontrado' })

    const oferta = await prisma.oferta.create({
      data: {
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        especialidad: especialidad.trim(),
        empresaId: empresa.id,
      },
      include: { _count: { select: { postulaciones: true } } },
    })

    res.status(201).json(oferta)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al crear oferta' })
  }
})

// PATCH /api/ofertas/:id — Empresa edita o desactiva una oferta propia
router.patch('/:id', verificarToken, async (req, res) => {
  if (req.usuario.rol !== 'EMPRESA') {
    return res.status(403).json({ error: 'Solo las empresas pueden modificar ofertas' })
  }

  const id = parseInt(req.params.id)
  const { titulo, descripcion, especialidad, activa } = req.body

  try {
    const empresa = await prisma.empresa.findUnique({ where: { usuarioId: req.usuario.id } })
    if (!empresa) return res.status(404).json({ error: 'Perfil no encontrado' })

    const oferta = await prisma.oferta.findUnique({ where: { id } })
    if (!oferta) return res.status(404).json({ error: 'Oferta no encontrada' })
    if (oferta.empresaId !== empresa.id) {
      return res.status(403).json({ error: 'No tienes permiso para modificar esta oferta' })
    }

    const data = {}
    if (titulo?.trim()) data.titulo = titulo.trim()
    if (descripcion?.trim()) data.descripcion = descripcion.trim()
    if (especialidad?.trim()) data.especialidad = especialidad.trim()
    if (typeof activa === 'boolean') data.activa = activa

    const actualizada = await prisma.oferta.update({
      where: { id },
      data,
      include: { _count: { select: { postulaciones: true } } },
    })

    res.json(actualizada)
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Oferta no encontrada' })
    console.error(error)
    res.status(500).json({ error: 'Error al actualizar oferta' })
  }
})

module.exports = router
