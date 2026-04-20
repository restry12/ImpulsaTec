-- AlterEnum
ALTER TYPE "TipoConversacion" ADD VALUE 'ADMINISTRADOR_ESTUDIANTE';

-- AlterTable
ALTER TABLE "Conversacion" ADD COLUMN     "administradorId" INTEGER;

-- AlterTable
ALTER TABLE "MensajeDirecto" ADD COLUMN     "emisorAdministradorId" INTEGER;

-- AddForeignKey
ALTER TABLE "Conversacion" ADD CONSTRAINT "Conversacion_administradorId_fkey" FOREIGN KEY ("administradorId") REFERENCES "Administrador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MensajeDirecto" ADD CONSTRAINT "MensajeDirecto_emisorAdministradorId_fkey" FOREIGN KEY ("emisorAdministradorId") REFERENCES "Administrador"("id") ON DELETE SET NULL ON UPDATE CASCADE;
