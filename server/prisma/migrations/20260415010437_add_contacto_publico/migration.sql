-- CreateEnum
CREATE TYPE "TipoDisponibilidad" AS ENUM ('PASANTIA', 'FREELANCE', 'AMBOS');

-- DropForeignKey
ALTER TABLE "Contacto" DROP CONSTRAINT "Contacto_empresaId_fkey";

-- AlterTable
ALTER TABLE "Contacto" ADD COLUMN     "emailRemitente" TEXT,
ADD COLUMN     "nombreRemitente" TEXT,
ALTER COLUMN "empresaId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Estudiante" ADD COLUMN     "tipoDisponibilidad" "TipoDisponibilidad" NOT NULL DEFAULT 'PASANTIA';

-- AddForeignKey
ALTER TABLE "Contacto" ADD CONSTRAINT "Contacto_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE SET NULL ON UPDATE CASCADE;
