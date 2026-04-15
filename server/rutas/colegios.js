const express = require('express')
const prisma = require('../prismaClient')

const router = express.Router()

// GET /api/colegios — lista todos los colegios (para el formulario de registro)
router.get('/', async (req, res) => {
  try {
    const colegios = await prisma.colegio.findMany({
      select: { id: true, nombre: true, comuna: true, region: true },
      orderBy: { nombre: 'asc' },
    })
    res.json(colegios)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al obtener colegios' })
  }
})

// POST /api/colegios — crea un colegio
router.post('/', async (req, res) => {
  const { nombre, comuna, region } = req.body

  if (!nombre || !comuna || !region) {
    return res.status(400).json({ error: 'nombre, comuna y region son requeridos' })
  }

  try {
    const colegio = await prisma.colegio.create({
      data: { nombre, comuna, region },
    })
    res.status(201).json(colegio)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al crear colegio' })
  }
})

module.exports = router
