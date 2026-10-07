import express from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { clerkClient, clerkMiddleware, getAuth } from "@clerk/express";
import { db } from "./config/db.js";
import { favoritesTable } from "./db/schema.js";
import { and, count, desc, eq } from "drizzle-orm";

export const MAX_FAVORITES_PER_USER = 500;

const app = express();

// Render/Railway/Fly gibi bir reverse proxy arkasındayız: gerçek istemci IP'si (rate limit için) buradan gelir
app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(helmet());
app.use(express.json({ limit: "10kb" }));

// Sağlık kontrolü: kimlik doğrulamasız ve rate limit'siz (uptime/cron kontrolleri için)
app.get("/api/health", (req, res) => {
  res.status(200).json({ success: true });
});

// Minimal istek günlüğü (gövde/token/kullanıcı verisi LOGLANMAZ)
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    console.log(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
});

app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later." },
  }),
);

// Bundan sonraki her şey Clerk oturum token'ı ister
app.use(clerkMiddleware());

const requireUser = (req, res, next) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  // Kullanıcı kimliği SADECE doğrulanmış token'dan gelir; URL/body'deki hiçbir id'ye güvenilmez.
  req.userId = userId;
  next();
};

const isText = (value, max) => typeof value === "string" && value.length <= max;
const isOptionalText = (value, max) => value == null || isText(value, max);

app.post("/api/favorites", requireUser, async (req, res) => {
  try {
    const { recipeId, title, image, cookTime, servings } = req.body ?? {};

    const parsedRecipeId = Number.parseInt(recipeId, 10);
    if (Number.isNaN(parsedRecipeId)) {
      return res.status(400).json({ error: "Invalid recipeId" });
    }

    if (
      !isText(title, 300) ||
      !title.trim() ||
      !isOptionalText(image, 2000) ||
      !isOptionalText(cookTime, 50) ||
      !isOptionalText(servings, 50)
    ) {
      return res.status(400).json({ error: "Invalid fields" });
    }

    const [{ total }] = await db
      .select({ total: count() })
      .from(favoritesTable)
      .where(eq(favoritesTable.userId, req.userId));

    if (total >= MAX_FAVORITES_PER_USER) {
      return res.status(409).json({ error: "Favorite limit reached" });
    }

    const inserted = await db
      .insert(favoritesTable)
      .values({
        userId: req.userId,
        recipeId: parsedRecipeId,
        title: title.trim(),
        image,
        cookTime,
        servings,
      })
      .onConflictDoNothing()
      .returning();

    if (inserted.length > 0) {
      return res.status(201).json(inserted[0]);
    }

    // Zaten favoride: mevcut kaydı döndür
    const [existing] = await db
      .select()
      .from(favoritesTable)
      .where(
        and(
          eq(favoritesTable.userId, req.userId),
          eq(favoritesTable.recipeId, parsedRecipeId),
        ),
      )
      .limit(1);

    res.status(200).json(existing);
  } catch (error) {
    console.error("Error adding favorite", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.get("/api/favorites", requireUser, async (req, res) => {
  try {
    const userFavorites = await db
      .select()
      .from(favoritesTable)
      .where(eq(favoritesTable.userId, req.userId))
      .orderBy(desc(favoritesTable.createdAt));

    res.status(200).json(userFavorites);
  } catch (error) {
    console.error("Error fetching the favorites", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.delete("/api/favorites/:recipeId", requireUser, async (req, res) => {
  try {
    const parsedRecipeId = Number.parseInt(req.params.recipeId, 10);
    if (Number.isNaN(parsedRecipeId)) {
      return res.status(400).json({ error: "Invalid recipeId" });
    }

    await db
      .delete(favoritesTable)
      .where(
        and(
          eq(favoritesTable.userId, req.userId),
          eq(favoritesTable.recipeId, parsedRecipeId),
        ),
      );

    res.status(200).json({ message: "Favorite removed successfully" });
  } catch (error) {
    console.error("Error removing a favorite", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// Hesap silme (App Store / Play Store zorunluluğu): önce kullanıcının verisi, sonra Clerk hesabı.
// İşlem tekrar denenebilir (idempotent): Clerk silme başarısız olursa istemci yeniden çağırabilir.
app.delete("/api/account", requireUser, async (req, res) => {
  try {
    await db.delete(favoritesTable).where(eq(favoritesTable.userId, req.userId));
    await clerkClient.users.deleteUser(req.userId);
    res.status(200).json({ message: "Account deleted" });
  } catch (error) {
    console.error("Error deleting account", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Bozuk JSON vb. hatalar stack trace sızdırmadan JSON dönsün
app.use((err, req, res, next) => {
  if (err?.type === "entity.parse.failed" || err?.status === 400) {
    return res.status(400).json({ error: "Bad request" });
  }
  if (err?.type === "entity.too.large") {
    return res.status(413).json({ error: "Payload too large" });
  }
  console.error("Unhandled error", err);
  res.status(500).json({ error: "Something went wrong" });
});

export default app;
