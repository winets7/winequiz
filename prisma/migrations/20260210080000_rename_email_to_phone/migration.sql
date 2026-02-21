-- Переименовываем колонку email → phone
ALTER TABLE "users" RENAME COLUMN "email" TO "phone";

-- Переименовываем уникальный индекс
ALTER INDEX "users_email_key" RENAME TO "users_phone_key";
