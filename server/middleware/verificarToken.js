const jwt = require('jsonwebtoken')

// Middleware que verifica el JWT en el header Authorization
function verificarToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1] // Bearer <token>

  if (!token) {
    return res.status(401).json({ error: 'Token requerido' })
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    req.usuario = payload
    next()
  } catch {
    return res.status(403).json({ error: 'Token inválido o expirado' })
  }
}

module.exports = verificarToken
