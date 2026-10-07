import { pgTable, serial, text, timestamp, integer, uniqueIndex } from "drizzle-orm/pg-core";

export const favoritesTable = pgTable(
  "favorites",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    recipeId: integer("recipe_id").notNull(),
    title: text("title").notNull(),
    image: text("image"),
    cookTime: text("cook_time"),
    servings: text("servings"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  // Aynı kullanıcı aynı tarifi iki kez ekleyemesin (yarış durumlarına karşı DB seviyesinde garanti)
  (table) => [uniqueIndex("favorites_user_recipe_idx").on(table.userId, table.recipeId)],
);
