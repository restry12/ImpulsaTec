require('dotenv').config()
const bcrypt = require('bcryptjs')
const prisma = require('./prismaClient')

async function main() {
  console.log('Creando empresas, ofertas y postulaciones...')

  const passwordHash = await bcrypt.hash('Empresa1234', 10)

  // ── EMPRESAS ──────────────────────────────────────────────────

  const empresasData = [
    {
      email: 'rrhh@techlab.cl',
      nombre: 'TechLab Chile',
      rubro: 'Tecnología',
      descripcion: 'Empresa de desarrollo de software y soluciones tecnológicas para la industria minera y energética. Trabajamos con equipos multidisciplinarios y apostamos por el talento joven.',
      logoUrl: null,
    },
    {
      email: 'pasantias@voltek.cl',
      nombre: 'Voltek Ingeniería',
      rubro: 'Ingeniería Eléctrica',
      descripcion: 'Consultora especializada en proyectos eléctricos de media y alta tensión. Desarrollamos infraestructura para el sector industrial y minero a lo largo de Chile.',
      logoUrl: null,
    },
    {
      email: 'talento@nexus.cl',
      nombre: 'Nexus Soluciones',
      rubro: 'Consultoría',
      descripcion: 'Empresa de consultoría en gestión empresarial y transformación digital. Ayudamos a pymes a modernizar sus procesos administrativos y contables.',
      logoUrl: null,
    },
  ]

  const empresasCreadas = []

  for (const datos of empresasData) {
    const { email, nombre, rubro, descripcion, logoUrl } = datos
    try {
      const usuario = await prisma.usuario.create({
        data: {
          email,
          password: passwordHash,
          rol: 'EMPRESA',
          empresa: {
            create: { nombre, rubro, descripcion, logoUrl },
          },
        },
        include: { empresa: true },
      })
      empresasCreadas.push(usuario.empresa)
      console.log(`✓ Empresa creada: ${nombre}`)
    } catch (err) {
      if (err.code === 'P2002') {
        const emp = await prisma.empresa.findFirst({ where: { nombre } })
        if (emp) {
          empresasCreadas.push(emp)
          console.log(`⚠ ${nombre} ya existe, usando la existente`)
        }
      } else {
        console.error(`✗ Error creando ${nombre}:`, err.message)
      }
    }
  }

  // ── OFERTAS ───────────────────────────────────────────────────

  const ofertasData = [
    {
      empresaIdx: 0, // TechLab
      titulo: 'Pasantía Desarrollador Frontend',
      descripcion: 'Buscamos estudiante de Programación para apoyar en el desarrollo de interfaces web con React y TypeScript. Trabajarás junto a nuestro equipo de producto en proyectos reales para clientes del sector minero.',
      especialidad: 'Programación',
    },
    {
      empresaIdx: 0, // TechLab
      titulo: 'Pasantía Soporte TI y Redes',
      descripcion: 'Apoyo en administración de redes internas, configuración de equipos y soporte técnico a usuarios. Ideal para estudiantes de Telecomunicaciones con conocimientos básicos de Linux y redes TCP/IP.',
      especialidad: 'Telecomunicaciones',
    },
    {
      empresaIdx: 1, // Voltek
      titulo: 'Pasantía Técnico Electricista',
      descripcion: 'Participación en proyectos de instalaciones eléctricas industriales bajo supervisión de ingenieros senior. Se requiere conocimiento de norma SEC y lectura de planos eléctricos.',
      especialidad: 'Electricidad',
    },
    {
      empresaIdx: 1, // Voltek
      titulo: 'Pasantía Electrónica Industrial',
      descripcion: 'Apoyo en montaje y diagnóstico de tableros de control y automatización. Trabajarás con PLCs Siemens y sistemas de supervisión SCADA en planta industrial.',
      especialidad: 'Electrónica',
    },
    {
      empresaIdx: 2, // Nexus
      titulo: 'Pasantía Asistente Contable',
      descripcion: 'Apoyo en procesos de contabilidad general, registro de facturas y conciliaciones bancarias. Ideal para estudiantes de Contabilidad con manejo de Excel y nociones del SII.',
      especialidad: 'Contabilidad',
    },
    {
      empresaIdx: 2, // Nexus
      titulo: 'Pasantía Administración y RRHH',
      descripcion: 'Soporte en gestión administrativa, atención a clientes y procesamiento de información. Buscamos estudiante proactivo con habilidades de comunicación y manejo de Office.',
      especialidad: 'Administración',
    },
  ]

  const ofertasCreadas = []

  for (const oferta of ofertasData) {
    if (!empresasCreadas[oferta.empresaIdx]) continue
    try {
      const nueva = await prisma.oferta.create({
        data: {
          titulo: oferta.titulo,
          descripcion: oferta.descripcion,
          especialidad: oferta.especialidad,
          empresaId: empresasCreadas[oferta.empresaIdx].id,
          activa: true,
        },
      })
      ofertasCreadas.push(nueva)
      console.log(`  ✓ Oferta: "${oferta.titulo}"`)
    } catch (err) {
      console.error(`  ✗ Error creando oferta:`, err.message)
    }
  }

  // ── POSTULACIONES ─────────────────────────────────────────────

  // Buscar estudiantes por especialidad para postulaciones realistas
  const buscarEstudiantes = async (especialidad, cantidad) => {
    return prisma.estudiante.findMany({
      where: { especialidad },
      take: cantidad,
      orderBy: { id: 'asc' },
    })
  }

  const postulacionesData = [
    // Pasantía Frontend → estudiantes de Programación
    { ofertaIdx: 0, especialidad: 'Programación', cantidad: 4 },
    // Pasantía Soporte TI → estudiantes de Telecomunicaciones
    { ofertaIdx: 1, especialidad: 'Telecomunicaciones', cantidad: 3 },
    // Pasantía Electricista → estudiantes de Electricidad
    { ofertaIdx: 2, especialidad: 'Electricidad', cantidad: 5 },
    // Pasantía Electrónica → estudiantes de Electrónica
    { ofertaIdx: 3, especialidad: 'Electrónica', cantidad: 4 },
    // Pasantía Contable → estudiantes de Contabilidad
    { ofertaIdx: 4, especialidad: 'Contabilidad', cantidad: 3 },
    // Pasantía Admin → estudiantes de Administración
    { ofertaIdx: 5, especialidad: 'Administración', cantidad: 3 },
  ]

  const estados = ['PENDIENTE', 'ACEPTADA', 'RECHAZADA', 'PENDIENTE', 'PENDIENTE']
  let totalPostulaciones = 0

  for (const config of postulacionesData) {
    const oferta = ofertasCreadas[config.ofertaIdx]
    if (!oferta) continue

    const estudiantes = await buscarEstudiantes(config.especialidad, config.cantidad)
    for (let i = 0; i < estudiantes.length; i++) {
      const est = estudiantes[i]
      const estado = estados[i % estados.length]
      try {
        await prisma.postulacion.create({
          data: {
            estudianteId: est.id,
            ofertaId: oferta.id,
            estado,
          },
        })
        totalPostulaciones++
        console.log(`  ✓ Postulación: ${est.nombre} → "${oferta.titulo}" [${estado}]`)
      } catch (err) {
        if (err.code === 'P2002') {
          console.log(`  ⚠ ${est.nombre} ya postuló a "${oferta.titulo}"`)
        } else {
          console.error(`  ✗ Error:`, err.message)
        }
      }
    }
  }

  console.log(`\n✅ Seed completado:`)
  console.log(`   ${empresasCreadas.length} empresas`)
  console.log(`   ${ofertasCreadas.length} ofertas`)
  console.log(`   ${totalPostulaciones} postulaciones`)
  console.log(`\nCredenciales empresa (todas): Empresa1234`)

  await prisma.$disconnect()
}

main().catch(async err => {
  console.error(err)
  await prisma.$disconnect()
  process.exit(1)
})
