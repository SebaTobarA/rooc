-- AlterTable
ALTER TABLE "CoreCharacterSheet" ADD COLUMN "staffNotes" TEXT NOT NULL DEFAULT '';

-- Lo escrito hasta ahora en "notes" se cargó cuando era de uso interno: pasa
-- a staffNotes y el campo para el jugador arranca vacío.
UPDATE "CoreCharacterSheet" SET "staffNotes" = "notes", "notes" = '' WHERE "notes" <> '';
