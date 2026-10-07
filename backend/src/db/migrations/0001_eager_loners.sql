-- Unique index eklenmeden önce olası çift kayıtları temizle (en eski kayıt kalır)
DELETE FROM "favorites" a USING "favorites" b WHERE a."id" > b."id" AND a."user_id" = b."user_id" AND a."recipe_id" = b."recipe_id";
--> statement-breakpoint
CREATE UNIQUE INDEX "favorites_user_recipe_idx" ON "favorites" USING btree ("user_id","recipe_id");
