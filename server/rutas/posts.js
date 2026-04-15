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
        _count: { select: { comentarios: true } },
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
      include: {
        administrador: incluirAdministrador,
        _count: { select: { comentarios: true } },
      },
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

// DELETE /api/posts/:id — Autor del post o admin puede eliminar
router.delete('/:id', verificarToken, async (req, res) => {
  const { rol, id: usuarioId } = req.usuario
  const postId = parseInt(req.params.id)
  if (isNaN(postId)) return res.status(400).json({ error: 'ID inválido' })

  try {
    const post = await prisma.post.findUnique({ where: { id: postId } })
    if (!post) return res.status(404).json({ error: 'Post no encontrado' })

    if (rol !== 'ADMINISTRADOR') {
      if (rol === 'ESTUDIANTE') {
        const estudiante = await prisma.estudiante.findUnique({ where: { usuarioId } })
        if (post.estudianteId !== estudiante?.id) {
          return res.status(403).json({ error: 'No autorizado' })
        }
      } else if (rol === 'EMPRESA') {
        const empresa = await prisma.empresa.findUnique({ where: { usuarioId } })
        if (post.empresaId !== empresa?.id) {
          return res.status(403).json({ error: 'No autorizado' })
        }
      } else {
        return res.status(403).json({ error: 'No autorizado' })
      }
    }

    await prisma.post.delete({ where: { id: postId } })
    res.json({ ok: true })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al eliminar post' })
  }
})

// GET /api/posts/:id/comentarios — Lista comentarios de un post (público)
router.get('/:id/comentarios', async (req, res) => {
  const postId = parseInt(req.params.id)
  if (isNaN(postId)) return res.status(400).json({ error: 'ID inválido' })

  try {
    const comentarios = await prisma.comentario.findMany({
      where: { postId },
      include: {
        estudiante: { select: { id: true, nombre: true, apellido: true, fotoUrl: true } },
        empresa: { select: { id: true, nombre: true, logoUrl: true } },
        administrador: {
          select: {
            id: true,
            nombre: true,
            colegio: { select: { nombre: true, logoUrl: true } },
          },
        },
      },
      orderBy: { creadoEn: 'asc' },
    })
    res.json(comentarios)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al obtener comentarios' })
  }
})

// POST /api/posts/:id/comentarios — Crea un comentario (JWT requerido)
router.post('/:id/comentarios', verificarToken, async (req, res) => {
  const { rol, id: usuarioId } = req.usuario
  const postId = parseInt(req.params.id)
  if (isNaN(postId)) return res.status(400).json({ error: 'ID inválido' })

  if (!['ESTUDIANTE', 'EMPRESA', 'ADMINISTRADOR'].includes(rol)) {
    return res.status(403).json({ error: 'Rol no autorizado para comentar' })
  }

  const { contenido } = req.body
  if (!contenido?.trim()) {
    return res.status(400).json({ error: 'contenido es requerido' })
  }

  try {
    const post = await prisma.post.findUnique({ where: { id: postId } })
    if (!post) return res.status(404).json({ error: 'Post no encontrado' })

    const datos = { contenido: contenido.trim(), postId, autorTipo: rol }

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

    const comentario = await prisma.comentario.create({
      data: datos,
      include: {
        estudiante: { select: { id: true, nombre: true, apellido: true, fotoUrl: true } },
        empresa: { select: { id: true, nombre: true, logoUrl: true } },
        administrador: {
          select: {
            id: true,
            nombre: true,
            colegio: { select: { nombre: true, logoUrl: true } },
          },
        },
      },
    })

    res.status(201).json(comentario)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al crear comentario' })
  }
})

// DELETE /api/posts/:id/comentarios/:comentarioId — Autor del comentario o admin puede eliminar
router.delete('/:id/comentarios/:comentarioId', verificarToken, async (req, res) => {
  const { rol, id: usuarioId } = req.usuario
  const comentarioId = parseInt(req.params.comentarioId)
  if (isNaN(comentarioId)) return res.status(400).json({ error: 'ID inválido' })

  try {
    const comentario = await prisma.comentario.findUnique({ where: { id: comentarioId } })
    if (!comentario) return res.status(404).json({ error: 'Comentario no encontrado' })

    if (rol !== 'ADMINISTRADOR') {
      if (rol === 'ESTUDIANTE') {
        const estudiante = await prisma.estudiante.findUnique({ where: { usuarioId } })
        if (comentario.estudianteId !== estudiante?.id) {
          return res.status(403).json({ error: 'No autorizado' })
        }
      } else if (rol === 'EMPRESA') {
        const empresa = await prisma.empresa.findUnique({ where: { usuarioId } })
        if (comentario.empresaId !== empresa?.id) {
          return res.status(403).json({ error: 'No autorizado' })
        }
      } else {
        return res.status(403).json({ error: 'No autorizado' })
      }
    }

    await prisma.comentario.delete({ where: { id: comentarioId } })
    res.json({ ok: true })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al eliminar comentario' })
  }
})

module.exports = router
