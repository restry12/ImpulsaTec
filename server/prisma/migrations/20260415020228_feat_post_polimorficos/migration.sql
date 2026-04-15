-- CreateEnum
CREATE TYPE "TipoMedia" AS ENUM ('IMAGEN', 'VIDEO');

-- DropForeignKey
ALTER TABLE "Post" DROP CONSTRAINT "Post_estudianteId_fkey";

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "administradorId" INTEGER,
ADD COLUMN     "autorTipo" "Rol" NOT NULL DEFAULT 'ESTUDIANTE',
ADD COLUMN     "empresaId" INTEGER,
ADD COLUMN     "mediaType" "TipoMedia",
ADD COLUMN     "mediaUrl" TEXT,
ALTER COLUMN "estudianteId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "Estudiante"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_administradorId_fkey" FOREIGN KEY ("administradorId") REFERENCES "Administrador"("id") ON DELETE SET NULL ON UPDATE CASCADE;
