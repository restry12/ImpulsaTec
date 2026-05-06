const express = require('express')
const prisma = require('../prismaClient')
const verificarToken = require('../middleware/verificarToken')

const router = express.Router()

// GET /api/empresas
// Devuelve todas las empresas con sus ofertas activas
router.get('/', async (req, res) => {
  const { rubro } = req.query

  const filtros = {}
  if (rubro) {
    filtros.rubro = { contains: rubro, mode: 'insensitive' }
  }

  try {
    const empresas = await prisma.empresa.findMany({
      where: filtros,
      select: {
        id: true,
        nombre: true,
        rubro: true,
        descripcion: true,
        logoUrl: true,
        creadoEn: true,
        _count: { select: { ofertas: { where: { activa: true } } } },
      },
      orderBy: { creadoEn: 'desc' },
    })

    res.json(empresas)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al obtener empresas' })
  }
})

// GET /api/empresas/me — Devuelve el perfil de la empresa autenticada
router.get('/me', verificarToken, async (req, res) => {
  if (req.usuario.rol !== 'EMPRESA') {
    return res.status(403).json({ error: 'Solo las empresas pueden acceder a este endpoint' })
  }

  try {
    const empresa = await prisma.empresa.findUnique({
      where: { usuarioId: req.usuario.id },
      include: {
        ofertas: {
          where: { activa: true },
          select: { id: true, titulo: true, especialidad: true },
        },
      },
    })

    if (!empresa) {
      return res.status(404).json({ error: 'Perfil de empresa no encontrado' })
    }

    res.json(empresa)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al obtener perfil' })
  }
})

// PATCH /api/empresas/me — Empresa actualiza su propio perfil
router.patch('/me', verificarToken, async (req, res) => {
  if (req.usuario.rol !== 'EMPRESA') {
    return res.status(403).json({ error: 'Solo las empresas pueden editar su perfil' })
  }

  const { descripcion, logoUrl, rubro } = req.body
  const data = {}
  if (descripcion !== undefined) data.descripcion = descripcion?.trim() || null
  if (logoUrl !== undefined) data.logoUrl = logoUrl?.trim() || null
  if (rubro?.trim()) data.rubro = rubro.trim()

  if (Object.keys(data).length === 0) {
    return res.status(400).json({ error: 'No hay campos para actualizar' })
  }

  try {
    const empresa = await prisma.empresa.update({
      where: { usuarioId: req.usuario.id },
      data,
      include: { ofertas: { where: { activa: true }, select: { id: true, titulo: true, especialidad: true } } },
    })
    res.json(empresa)
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Perfil no encontrado' })
    console.error(error)
    res.status(500).json({ error: 'Error al actualizar perfil' })
  }
})

// GET /api/empresas/:id
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id)

  try {
    const empresa = await prisma.empresa.findUnique({
      where: { id },
      include: {
        ofertas: {
          where: { activa: true },
          include: {
            postulaciones: { select: { id: true, estado: true } },
          },
        },
      },
    })

    if (!empresa) {
      return res.status(404).json({ error: 'Empresa no encontrada' })
    }

    res.json(empresa)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al obtener empresa' })
  }
})

module.exports = router
