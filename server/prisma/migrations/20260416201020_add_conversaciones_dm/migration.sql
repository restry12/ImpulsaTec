-- CreateEnum
CREATE TYPE "TipoConversacion" AS ENUM ('EMPRESA_ESTUDIANTE', 'ESTUDIANTE_ESTUDIANTE');

-- CreateTable
CREATE TABLE "Conversacion" (
    "id" SERIAL NOT NULL,
    "tipo" "TipoConversacion" NOT NULL,
    "empresaId" INTEGER,
    "estudiante1Id" INTEGER NOT NULL,
    "estudiante2Id" INTEGER,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MensajeDirecto" (
    "id" SERIAL NOT NULL,
    "conversacionId" INTEGER NOT NULL,
    "contenido" TEXT NOT NULL,
    "autorTipo" "Rol" NOT NULL,
    "emisorEmpresaId" INTEGER,
    "emisorEstudianteId" INTEGER,
    "leido" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MensajeDirecto_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Conversacion" ADD CONSTRAINT "Conversacion_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversacion" ADD CONSTRAINT "Conversacion_estudiante1Id_fkey" FOREIGN KEY ("estudiante1Id") REFERENCES "Estudiante"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversacion" ADD CONSTRAINT "Conversacion_estudiante2Id_fkey" FOREIGN KEY ("estudiante2Id") REFERENCES "Estudiante"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MensajeDirecto" ADD CONSTRAINT "MensajeDirecto_conversacionId_fkey" FOREIGN KEY ("conversacionId") REFERENCES "Conversacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MensajeDirecto" ADD CONSTRAINT "MensajeDirecto_emisorEmpresaId_fkey" FOREIGN KEY ("emisorEmpresaId") REFERENCES "Empresa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MensajeDirecto" ADD CONSTRAINT "MensajeDirecto_emisorEstudianteId_fkey" FOREIGN KEY ("emisorEstudianteId") REFERENCES "Estudiante"("id") ON DELETE SET NULL ON UPDATE CASCADE;
