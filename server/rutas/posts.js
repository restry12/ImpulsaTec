const express = require('express')
const prisma = require('../prismaClient')
const verificarToken = require('../middleware/verificarToken')

const router = express.Router()

// ─── Helpers de include por tipo de autor ─────────────────────────────────

const incluirEstudiante = {
  select: { id: true, nombre: true, apellido: true, fotoUrl: true, especialidad: true },
}
const incluirEmpresa = {
  select: { id: true, nombre: true, rubro: true, logoUrl: true },
}
const incluirAdministrador = {
  select: {
    id: true,
    nombre: true,
    colegio: { select: { nombre: true, logoUrl: true } },
  },
}

// GET /api/posts — Feed normal (ESTUDIANTE + EMPRESA), últimos 50
router.get('/', async (req, res) => {
  try {
    const posts = await prisma.post.findMany({
      where: { autorTipo: { in: ['ESTUDIANTE', 'EMPRESA'] } },
      include: {
        estudiante: incluirEstudiante,
        empresa: incluirEmpresa,
      },
      orderBy: { creadoEn: 'desc' },
      take: 50,
    })
    res.json(posts)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al obtener posts' })
  }
})

// GET /api/posts/colegio — Feed del colegio (solo ADMINISTRADOR)
// IMPORTANTE: va antes de /:id para que Express no interprete "colegio" como un ID
router.get('/colegio', async (req, res) => {
  try {
    const posts = await prisma.post.findMany({
      where: { autorTipo: 'ADMINISTRADOR' },
      include: { administrador: incluirAdministrador },
      orderBy: { creadoEn: 'desc' },
      take: 20,
    })
    res.json(posts)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al obtener novedades del colegio' })
  }
})

// POST /api/posts — Estudiante, empresa o admin crea un post
router.post('/', verificarToken, async (req, res) => {
  const { rol, id: usuarioId } = req.usuario
  if (!['ESTUDIANTE', 'EMPRESA', 'ADMINISTRADOR'].includes(rol)) {
    return res.status(403).json({ error: 'Rol no autorizado para publicar' })
  }

  const { contenido, mediaUrl, mediaType } = req.body
  if (!contenido?.trim()) {
    return res.status(400).json({ error: 'contenido es requerido' })
  }
  if (mediaUrl && !['IMAGEN', 'VIDEO'].includes(mediaType)) {
    return res.status(400).json({ error: 'mediaType debe ser IMAGEN o VIDEO cuando se provee mediaUrl' })
  }

  try {
    const datos = { contenido: contenido.trim(), autorTipo: rol }
    if (mediaUrl) {
      datos.mediaUrl = mediaUrl
      datos.mediaType = mediaType
    }

    if (rol === 'ESTUDIANTE') {
      const estudiante = await prisma.estudiante.findUnique({ where: { usuarioId } })
      if (!estudiante) return res.status(404).json({ error: 'Perfil no encontrado' })
      datos.estudianteId = estudiante.id
    } else if (rol === 'EMPRESA') {
      const empresa = await prisma.empresa.findUnique({ where: { usuarioId } })
      if (!empresa) return res.status(404).json({ error: 'Perfil no encontrado' })
      datos.empresaId = empresa.id
    } else {
      const admin = await prisma.administrador.findUnique({ where: { usuarioId } })
      if (!admin) return res.status(404).json({ error: 'Perfil no encontrado' })
      datos.administradorId = admin.id
    }

    const post = await prisma.post.create({
      data: datos,
      include: {
        estudiante: incluirEstudiante,
        empresa: incluirEmpresa,
        administrador: incluirAdministrador,
      },
    })

    res.status(201).json(post)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al crear post' })
  }
})

module.exports = router
