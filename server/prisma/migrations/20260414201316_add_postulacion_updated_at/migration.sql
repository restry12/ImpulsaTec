/*
  Warnings:

  - Added the required column `actualizadoEn` to the `Postulacion` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Postulacion" ADD COLUMN     "actualizadoEn" TIMESTAMP(3) NOT NULL;
