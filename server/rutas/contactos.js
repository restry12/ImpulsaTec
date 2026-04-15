const express = require('express')
const prisma = require('../prismaClient')
const verificarToken = require('../middleware/verificarToken')

const router = express.Router()

// GET /api/contactos/me — Estudiante ve los contactos que ha recibido
router.get('/me', verificarToken, async (req, res) => {
  if (req.usuario.rol !== 'ESTUDIANTE') {
    return res.status(403).json({ error: 'Solo los estudiantes pueden ver sus contactos' })
  }

  try {
    const estudiante = await prisma.estudiante.findUnique({ where: { usuarioId: req.usuario.id } })
    if (!estudiante) return res.status(404).json({ error: 'Perfil no encontrado' })

    const contactos = await prisma.contacto.findMany({
      where: { estudianteId: estudiante.id },
      include: {
        empresa: { select: { nombre: true, logoUrl: true } },
      },
      orderBy: { creadoEn: 'desc' },
    })

    res.json(contactos)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al obtener contactos' })
  }
})

// POST /api/contactos — Empresa contacta directamente a un estudiante (requiere JWT EMPRESA)
router.post('/', verificarToken, async (req, res) => {
  if (req.usuario.rol !== 'EMPRESA') {
    return res.status(403).json({ error: 'Solo las empresas pueden enviar contactos' })
  }

  const { estudianteId, mensaje } = req.body
  if (!estudianteId) {
    return res.status(400).json({ error: 'estudianteId es requerido' })
  }

  try {
    const empresa = await prisma.empresa.findUnique({ where: { usuarioId: req.usuario.id } })
    if (!empresa) return res.status(404).json({ error: 'Perfil no encontrado' })

    const contacto = await prisma.contacto.create({
      data: {
        empresaId: empresa.id,
        estudianteId: parseInt(estudianteId),
        mensaje: mensaje?.trim() || null,
      },
    })

    res.status(201).json(contacto)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al registrar contacto' })
  }
})

// POST /api/contactos/publico — Visitante sin cuenta contacta a un estudiante
router.post('/publico', async (req, res) => {
  const { estudianteId, nombreRemitente, emailRemitente, mensaje } = req.body

  if (!estudianteId || !nombreRemitente || !emailRemitente || !mensaje) {
    return res.status(400).json({ error: 'estudianteId, nombreRemitente, emailRemitente y mensaje son requeridos' })
  }

  try {
    const contacto = await prisma.contacto.create({
      data: {
        estudianteId: parseInt(estudianteId),
        nombreRemitente: nombreRemitente.trim(),
        emailRemitente: emailRemitente.trim().toLowerCase(),
        mensaje: mensaje.trim(),
      },
    })

    res.status(201).json(contacto)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al enviar contacto' })
  }
})

module.exports = router
