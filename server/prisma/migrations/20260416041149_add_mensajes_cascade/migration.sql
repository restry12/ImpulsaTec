-- DropForeignKey
ALTER TABLE "Mensaje" DROP CONSTRAINT "Mensaje_empresaId_fkey";

-- AddForeignKey
ALTER TABLE "Mensaje" ADD CONSTRAINT "Mensaje_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
