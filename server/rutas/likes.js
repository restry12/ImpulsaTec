const express = require('express')
const prisma = require('../prismaClient')
const verificarToken = require('../middleware/verificarToken')

const router = express.Router()

// POST /api/posts/:id/like — Toggle like en un post (JWT ESTUDIANTE | EMPRESA)
router.post('/:id/like', verificarToken, async (req, res) => {
  const { rol, id: usuarioId } = req.usuario
  if (!['ESTUDIANTE', 'EMPRESA'].includes(rol)) {
    return res.status(403).json({ error: 'Solo estudiantes y empresas pueden dar like' })
  }

  const postId = parseInt(req.params.id)
  if (isNaN(postId)) return res.status(400).json({ error: 'ID inválido' })

  try {
    const post = await prisma.post.findUnique({ where: { id: postId } })
    if (!post) return res.status(404).json({ error: 'Post no encontrado' })

    let likeExistente = null
    let autorIdEstudiante = null
    let autorIdEmpresa = null

    if (rol === 'ESTUDIANTE') {
      const estudiante = await prisma.estudiante.findUnique({ where: { usuarioId } })
      if (!estudiante) return res.status(404).json({ error: 'Perfil no encontrado' })
      autorIdEstudiante = estudiante.id
      likeExistente = await prisma.like.findFirst({ where: { postId, estudianteId: estudiante.id } })
    } else {
      const empresa = await prisma.empresa.findUnique({ where: { usuarioId } })
      if (!empresa) return res.status(404).json({ error: 'Perfil no encontrado' })
      autorIdEmpresa = empresa.id
      likeExistente = await prisma.like.findFirst({ where: { postId, empresaId: empresa.id } })
    }

    if (likeExistente) {
      // Quitar like
      await prisma.like.delete({ where: { id: likeExistente.id } })
    } else {
      // Dar like
      await prisma.like.create({
        data: {
          postId,
          ...(autorIdEstudiante ? { estudianteId: autorIdEstudiante } : { empresaId: autorIdEmpresa }),
        },
      })
    }

    const count = await prisma.like.count({ where: { postId } })
    res.json({ liked: !likeExistente, count })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al procesar like' })
  }
})

module.exports = router
