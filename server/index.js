require('dotenv').config()

const express = require('express')
const cors = require('cors')

const rutasAuth = require('./rutas/auth')
const rutasEstudiantes = require('./rutas/estudiantes')
const rutasEmpresas = require('./rutas/empresas')
const rutasColegios = require('./rutas/colegios')
const rutasPostulaciones = require('./rutas/postulaciones')
const rutasOfertas = require('./rutas/ofertas')
const rutasContactos = require('./rutas/contactos')
const rutasPosts = require('./rutas/posts')
const rutasLikes = require('./rutas/likes')
const rutasMensajes = require('./rutas/mensajes')
const rutasConversaciones = require('./rutas/conversaciones')

const app = express()

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
  res.json({ message: 'ImpulsaTec API corriendo ✅' })
})

app.use('/api/auth', rutasAuth)
app.use('/api/colegios', rutasColegios)
app.use('/api/estudiantes', rutasEstudiantes)
app.use('/api/empresas', rutasEmpresas)
app.use('/api/postulaciones', rutasPostulaciones)
app.use('/api/ofertas', rutasOfertas)
app.use('/api/contactos', rutasContactos)
app.use('/api/posts', rutasPosts)
app.use('/api/posts', rutasLikes)
app.use('/api/mensajes', rutasMensajes)
app.use('/api/conversaciones', rutasConversaciones)

app.listen(3000, () => {
  console.log('Servidor en puerto 3000')
})
