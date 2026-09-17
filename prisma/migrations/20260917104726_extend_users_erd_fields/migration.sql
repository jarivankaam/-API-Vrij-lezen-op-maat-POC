/*
  Warnings:

  - Added the required column `passwordHash` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "accountRole" JSONB NOT NULL DEFAULT '{"permissions": [], "studentTypes": []}',
ADD COLUMN     "booksRead" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "passwordHash" TEXT NOT NULL,
ADD COLUMN     "preferences" JSONB NOT NULL DEFAULT '{"genres": [], "authors": [], "questions": []}',
ADD COLUMN     "readerProfile" JSONB NOT NULL DEFAULT '{}';
