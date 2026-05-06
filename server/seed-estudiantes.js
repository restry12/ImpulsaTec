require('dotenv').config()
const bcrypt = require('bcryptjs')
const prisma = require('./prismaClient')

const COLEGIO_ID = 1

const nombres = [
  ['Sofía', 'Martínez'], ['Matías', 'González'], ['Valentina', 'López'],
  ['Sebastián', 'Pérez'], ['Camila', 'Rojas'], ['Diego', 'Fuentes'],
  ['Isidora', 'Castro'], ['Nicolás', 'Vargas'], ['Javiera', 'Morales'],
  ['Tomás', 'Jiménez'], ['Fernanda', 'Ortiz'], ['Ignacio', 'Silva'],
  ['Constanza', 'Torres'], ['Cristóbal', 'Ramírez'], ['Daniela', 'Flores'],
  ['Felipe', 'Herrera'], ['Antonia', 'Díaz'], ['Rodrigo', 'Muñoz'],
  ['Catalina', 'Reyes'], ['Andrés', 'Contreras'], ['Florencia', 'Vega'],
  ['Francisco', 'Salinas'], ['Gabriela', 'Espinoza'], ['Pablo', 'Carrasco'],
  ['Renata', 'Gutiérrez'], ['Bastián', 'Medina'], ['Trinidad', 'Soto'],
  ['Maximiliano', 'Bravo'], ['Ámbar', 'Navarrete'], ['Vicente', 'Araya'],
  ['Valeria', 'Cárdenas'], ['Agustín', 'Mena'], ['Paola', 'Leiva'],
  ['Emilio', 'Poblete'], ['Rocío', 'Acosta'], ['Álvaro', 'Sepúlveda'],
  ['Pilar', 'Pizarro'], ['Benjamín', 'Núñez'], ['Amanda', 'Tapia'],
  ['Mateo', 'Ibáñez'], ['Elena', 'Villalobos'], ['Joaquín', 'Montoya'],
  ['Macarena', 'Cortés'], ['Esteban', 'Sandoval'], ['Luna', 'Romero'],
  ['Héctor', 'Barrera'], ['Natalia', 'Cuevas'], ['Marco', 'Esquivel'],
  ['Martina', 'Alarcón'], ['Iván', 'Bustamante'],
]

const especialidades = [
  'Electrónica', 'Programación', 'Administración', 'Contabilidad',
  'Mecánica', 'Electricidad', 'Telecomunicaciones',
]

const tiposDisponibilidad = ['PASANTIA', 'FREELANCE', 'AMBOS']

// Habilidades por especialidad
const habilidadesPorEsp = {
  Electrónica: [
    'Circuitos analógicos', 'Soldadura SMD', 'Arduino', 'Raspberry Pi',
    'Diseño PCB', 'Multímetro y osciloscopio', 'PLC Siemens', 'Automatización',
    'Sensores industriales', 'Electrónica de potencia',
  ],
  Programación: [
    'JavaScript', 'Python', 'React', 'Node.js', 'SQL', 'Git', 'TypeScript',
    'Docker', 'APIs REST', 'Bases de datos NoSQL', 'Java', 'C++',
  ],
  Administración: [
    'Excel avanzado', 'Gestión de proyectos', 'SAP', 'Atención al cliente',
    'Redacción de informes', 'Análisis de datos', 'Marketing digital',
    'Recursos humanos', 'Logística', 'Negociación',
  ],
  Contabilidad: [
    'Contabilidad general', 'SII Chile', 'Software Contable', 'Tributación',
    'Análisis financiero', 'Planillas remuneraciones', 'IFRS', 'Auditoría',
    'Facturación electrónica', 'Control de gestión',
  ],
  Mecánica: [
    'Torno CNC', 'Fresadora', 'Lectura de planos', 'Soldadura MIG/TIG',
    'Mantenimiento preventivo', 'Hidráulica', 'Neumática', 'CAD',
    'Diagnóstico de fallas', 'Motores de combustión',
  ],
  Electricidad: [
    'Instalaciones eléctricas', 'Tableros eléctricos', 'Norma SEC',
    'Redes BT/MT', 'Luminotecnia', 'Domótica', 'Energías renovables',
    'Variadores de frecuencia', 'Termografía', 'Protecciones eléctricas',
  ],
  Telecomunicaciones: [
    'Redes TCP/IP', 'Fibra óptica', 'Configuración de routers', 'VoIP',
    'Ciberseguridad básica', 'Wireshark', 'Linux server', 'Redes inalámbricas',
    'CCNA', 'Monitoreo de redes',
  ],
}

// Certificaciones disponibles
const certificacionesPorEsp = {
  Electrónica: [
    { nombre: 'Certificación Arduino Foundations', institucion: 'Arduino Foundation' },
    { nombre: 'Curso PLC Siemens S7', institucion: 'Siemens' },
    { nombre: 'Electrónica Digital — Udemy', institucion: 'Udemy' },
  ],
  Programación: [
    { nombre: 'Python for Everybody', institucion: 'Coursera / University of Michigan' },
    { nombre: 'The Web Developer Bootcamp', institucion: 'Udemy' },
    { nombre: 'Fundamentos de React', institucion: 'Meta / Coursera' },
    { nombre: 'AWS Cloud Practitioner', institucion: 'Amazon Web Services' },
    { nombre: 'Git & GitHub — Platzi', institucion: 'Platzi' },
  ],
  Administración: [
    { nombre: 'Project Management Essentials', institucion: 'PMI' },
    { nombre: 'Marketing Digital — Google', institucion: 'Google Actívate' },
    { nombre: 'Excel Avanzado', institucion: 'Microsoft' },
  ],
  Contabilidad: [
    { nombre: 'Diplomado en Tributación', institucion: 'UDP' },
    { nombre: 'IFRS para Pymes', institucion: 'IFAC' },
    { nombre: 'Facturación Electrónica SII', institucion: 'SII Chile' },
  ],
  Mecánica: [
    { nombre: 'AutoCAD 2D/3D', institucion: 'Autodesk' },
    { nombre: 'Soldadura MIG — Nivel 1', institucion: 'SENCE' },
    { nombre: 'Mantenimiento Industrial', institucion: 'INACAP' },
  ],
  Electricidad: [
    { nombre: 'Instalador Eléctrico SEC', institucion: 'SEC Chile' },
    { nombre: 'Energías Renovables — CORFO', institucion: 'CORFO' },
    { nombre: 'Norma IEC 60364', institucion: 'IEC' },
  ],
  Telecomunicaciones: [
    { nombre: 'Cisco CCNA 200-301', institucion: 'Cisco' },
    { nombre: 'CompTIA Network+', institucion: 'CompTIA' },
    { nombre: 'Linux Essentials — LPI', institucion: 'Linux Professional Institute' },
  ],
}

function mezclar(arr) {
  return [...arr].sort(() => Math.random() - 0.5)
}

function elegirAleatoriamente(arr, n) {
  return mezclar(arr).slice(0, n)
}

async function main() {
  console.log('Iniciando seed de 50 estudiantes...')

  const passwordHash = await bcrypt.hash('Estudiante1234', 10)

  for (let i = 0; i < nombres.length; i++) {
    const [nombre, apellido] = nombres[i]
    const especialidad = especialidades[i % especialidades.length]
    const estaVerificado = i < 25  // primeros 25 verificados, resto no
    const disponible = Math.random() > 0.2
    const tipoDisp = tiposDisponibilidad[i % tiposDisponibilidad.length]
    const email = `${nombre.toLowerCase().replace(/[áéíóúü ]/g, c => ({á:'a',é:'e',í:'i',ó:'o',ú:'u',ü:'u',' ':'.'} [c] ?? c))}.${apellido.toLowerCase().replace(/[áéíóúüñ]/g, c => ({á:'a',é:'e',í:'i',ó:'o',ú:'u',ü:'u',ñ:'n'}[c] ?? c))}${i}@alumno.impulsa.cl`

    // Habilidades: 3-5 habilidades de su especialidad
    const habilidadesEsp = habilidadesPorEsp[especialidad]
    const cantHabilidades = 3 + (i % 3)
    const habilidadesElegidas = elegirAleatoriamente(habilidadesEsp, cantHabilidades)

    // Certificaciones: 0-2 certificaciones
    const certsEsp = certificacionesPorEsp[especialidad]
    const cantCerts = i % 3  // 0, 1 o 2 certificaciones rotando
    const certsElegidas = elegirAleatoriamente(certsEsp, cantCerts)

    try {
      const usuario = await prisma.usuario.create({
        data: {
          email,
          password: passwordHash,
          rol: 'ESTUDIANTE',
          estudiante: {
            create: {
              nombre,
              apellido,
              especialidad,
              disponible,
              tipoDisponibilidad: tipoDisp,
              colegioId: COLEGIO_ID,
              descripcion: `Estudiante de ${especialidad} del Centro Educacional Cardenal José María Caro. Apasionado por aprender y contribuir en proyectos reales.`,
              habilidades: {
                create: habilidadesElegidas.map(nombre => ({
                  nombre,
                  validada: estaVerificado,
                })),
              },
              certificaciones: {
                create: certsElegidas.map(cert => ({
                  nombre: cert.nombre,
                  institucion: cert.institucion,
                  validada: estaVerificado,
                })),
              },
            },
          },
        },
      })
      console.log(`✓ [${i + 1}/50] ${nombre} ${apellido} — ${especialidad} — ${estaVerificado ? 'verificado' : 'pendiente'}`)
    } catch (err) {
      if (err.code === 'P2002') {
        console.log(`⚠ [${i + 1}/50] ${nombre} ${apellido} — email duplicado, omitiendo`)
      } else {
        console.error(`✗ [${i + 1}/50] ${nombre} ${apellido}:`, err.message)
      }
    }
  }

  console.log('\n✅ Seed completado.')
  await prisma.$disconnect()
}

main().catch(async err => {
  console.error(err)
  await prisma.$disconnect()
  process.exit(1)
})
