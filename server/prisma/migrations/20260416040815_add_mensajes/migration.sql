-- CreateTable
CREATE TABLE "Mensaje" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "contenido" TEXT NOT NULL,
    "autorTipo" "Rol" NOT NULL,
    "leido" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Mensaje_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Mensaje" ADD CONSTRAINT "Mensaje_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
