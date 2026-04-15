const express = require('express')
const prisma = require('../prismaClient')
const verificarToken = require('../middleware/verificarToken')

const router = express.Router()

const incluirAutor = {
  estudiante: {
    select: { id: true, nombre: true, apellido: true, fotoUrl: true, especialidad: true },
  },
}

// GET /api/posts — Feed público, últimos 50 posts
router.get('/', async (req, res) => {
  try {
    const posts = await prisma.post.findMany({
      include: incluirAutor,
      orderBy: { creadoEn: 'desc' },
      take: 50,
    })
    res.json(posts)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al obtener posts' })
  }
})

// POST /api/posts — Estudiante crea un post
router.post('/', verificarToken, async (req, res) => {
  if (req.usuario.rol !== 'ESTUDIANTE') {
    return res.status(403).json({ error: 'Solo los estudiantes pueden publicar' })
  }

  const { contenido } = req.body
  if (!contenido?.trim()) {
    return res.status(400).json({ error: 'contenido es requerido' })
  }

  try {
    const estudiante = await prisma.estudiante.findUnique({ where: { usuarioId: req.usuario.id } })
    if (!estudiante) return res.status(404).json({ error: 'Perfil no encontrado' })

    const post = await prisma.post.create({
      data: { contenido: contenido.trim(), estudianteId: estudiante.id },
      include: incluirAutor,
    })

    res.status(201).json(post)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al crear post' })
  }
})

module.exports = router
