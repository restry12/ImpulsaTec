const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const rateLimit = require('express-rate-limit')
const prisma = require('../prismaClient')

const router = express.Router()

// Máximo 10 intentos de login por IP cada 15 minutos
const limitadorLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiados intentos. Espera 15 minutos antes de intentar nuevamente.' },
  standardHeaders: true,
  legacyHeaders: false,
})

// Genera un JWT firmado con el id, email y rol del usuario
function generarToken(usuario) {
  return jwt.sign(
    { id: usuario.id, email: usuario.email, rol: usuario.rol },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )
}

// POST /api/auth/registro
// Crea un Usuario base + el perfil según su rol (ESTUDIANTE, EMPRESA, ADMINISTRADOR)
router.post('/registro', async (req, res) => {
  const { email, password, rol, nombre, apellido, especialidad, rubro, colegioId } = req.body

  if (!email || !password || !rol || !nombre) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' })
  }

  if ((rol === 'ESTUDIANTE' || rol === 'ADMINISTRADOR') && !colegioId) {
    return res.status(400).json({ error: 'colegioId es requerido para ESTUDIANTE y ADMINISTRADOR' })
  }

  const rolesValidos = ['ESTUDIANTE', 'EMPRESA', 'ADMINISTRADOR']
  if (!rolesValidos.includes(rol)) {
    return res.status(400).json({ error: 'Rol inválido' })
  }

  const passwordHash = await bcrypt.hash(password, 10)

  try {
    // Creamos el usuario base y el perfil en una sola transacción
    const usuario = await prisma.usuario.create({
      data: {
        email,
        password: passwordHash,
        rol,
        ...(rol === 'ESTUDIANTE' && {
          estudiante: {
            create: {
              nombre,
              apellido: apellido || '',
              especialidad: especialidad || '',
              colegioId: parseInt(colegioId),
            },
          },
        }),
        ...(rol === 'EMPRESA' && {
          empresa: {
            create: {
              nombre,
              rubro: rubro || '',
            },
          },
        }),
        ...(rol === 'ADMINISTRADOR' && {
          administrador: {
            create: {
              nombre,
              colegioId: parseInt(colegioId),
            },
          },
        }),
      },
    })

    const token = generarToken(usuario)
    res.status(201).json({ token, rol: usuario.rol, id: usuario.id })
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'El email ya está registrado' })
    }
    console.error(error)
    res.status(500).json({ error: 'Error al registrar usuario' })
  }
})

// POST /api/auth/login
router.post('/login', limitadorLogin, async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y password son requeridos' })
  }

  const usuario = await prisma.usuario.findUnique({ where: { email } })

  if (!usuario) {
    return res.status(401).json({ error: 'Credenciales incorrectas' })
  }

  const passwordValida = await bcrypt.compare(password, usuario.password)
  if (!passwordValida) {
    return res.status(401).json({ error: 'Credenciales incorrectas' })
  }

  const token = generarToken(usuario)
  res.json({ token, rol: usuario.rol, id: usuario.id })
})

module.exports = router
