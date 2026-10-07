// TheMealDB "1" anahtarı sadece geliştirme/test içindir. Mağazada yayınlanan uygulama için
// TheMealDB destekçi (premium) anahtarı alıp EXPO_PUBLIC_MEALDB_KEY olarak ver.
const API_KEY = process.env.EXPO_PUBLIC_MEALDB_KEY || "1";
const BASE_URL = `https://www.themealdb.com/api/json/v1/${API_KEY}`;
const REQUEST_TIMEOUT_MS = 10000;

// Zaman aşımı + HTTP durum kontrolü. Hatalar artık yutulmuyor, çağıran ekran hata durumunu
// gösterebilsin ("sonuç yok" ile "bağlantı hatası" birbirine karışmasın).
// Çağıranın iptali AbortError, zaman aşımı ise normal Error olarak fırlatılır.
const fetchJson = async (path, signal) => {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  const onAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", onAbort);
  }

  try {
    const response = await fetch(`${BASE_URL}${path}`, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    if (timedOut) throw new Error("Request timed out");
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
};

// Aynı tarif her açılışta aynı süre/porsiyon/açıklamayı göstersin diye
// rastgele değil, tarif id'sinden türetilen sabit bir değer kullanıyoruz.
const hashString = (value) => {
  let hash = 0;
  for (const char of String(value)) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash;
};

const pickFor = (array, seed, salt) => array[(seed + salt * 7919) % array.length];

const getYoutubeId = (url) => {
  if (!url) return null;
  const match = url.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/);
  return match ? match[1] : null;
};

const cookTimes = [
  "15 min",
  "20 min",
  "25 min",
  "30 min",
  "35 min",
  "40 min",
  "45 min",
  "50 min",
  "60 min",
  "75 min",
];

const servings = [
  3, 3, 4, 4, 4, 5, 6,
];

const descriptions = [
  "A taste of traditional home cooking.",
  "A recipe rooted in local traditions.",
  "A familiar dish with a regional touch.",
  "Simple ingredients, traditional preparation.",
  "A recipe commonly found in local kitchens.",
  "A dish shaped by its culinary heritage.",
  "A home-style recipe worth discovering.",
  "A traditional recipe from its region.",
  "A dish with a distinct cultural character.",
  "A recipe made to be shared and enjoyed.",
];

const mealMeta = {};

const getMealMeta = (id) => {
  if (!mealMeta[id]) {
    const seed = hashString(id);
    mealMeta[id] = {
      cookTime: pickFor(cookTimes, seed, 1),
      servings: pickFor(servings, seed, 2),
      description: pickFor(descriptions, seed, 3),
    };
  }

  return mealMeta[id];
};

export const MealAPI = {
  searchMealsByName: async (query, signal) => {
    const data = await fetchJson(`/search.php?s=${encodeURIComponent(query)}`, signal);
    return data.meals || [];
  },

  getMealById: async (id, signal) => {
    const data = await fetchJson(`/lookup.php?i=${encodeURIComponent(id)}`, signal);
    return data.meals ? data.meals[0] : null;
  },

  getRandomMeal: async (signal) => {
    const data = await fetchJson("/random.php", signal);
    return data.meals ? data.meals[0] : null;
  },

  // Birden çok rastgele yemek. Kısmi başarısızlık tolere edilir; hepsi başarısızsa hata fırlatır.
  getRandomMeals: async (count = 6, signal) => {
    const results = await Promise.allSettled(
      Array.from({ length: count }, () => MealAPI.getRandomMeal(signal))
    );

    const meals = results
      .filter((r) => r.status === "fulfilled" && r.value)
      .map((r) => r.value);

    if (meals.length === 0) {
      const failure = results.find((r) => r.status === "rejected");
      if (failure) throw failure.reason;
    }

    // random.php aynı yemeği tekrar döndürebilir
    const seen = new Set();
    return meals.filter((m) => !seen.has(m.idMeal) && seen.add(m.idMeal));
  },

  getCategories: async (signal) => {
    const data = await fetchJson("/categories.php", signal);
    return data.categories || [];
  },

  filterByIngredient: async (ingredient, signal) => {
    const data = await fetchJson(`/filter.php?i=${encodeURIComponent(ingredient)}`, signal);
    return data.meals || [];
  },

  filterByCategory: async (category, signal) => {
    const data = await fetchJson(`/filter.php?c=${encodeURIComponent(category)}`, signal);
    return data.meals || [];
  },

  transformMealData: (meal) => {
    if (!meal) return null;

    const meta = getMealMeta(meal.idMeal);

    const ingredients = [];
    for (let i = 1; i <= 20; i++) {
      const ingredient = meal[`strIngredient${i}`];
      const measure = meal[`strMeasure${i}`];
      if (ingredient && ingredient.trim()) {
        const measureText =
          measure && measure.trim() ? `${measure.trim()} ` : "";
        ingredients.push(`${measureText}${ingredient.trim()}`);
      }
    }

    // "STEP 1", "2." gibi tek başına duran başlık satırlarını at
    const instructions = meal.strInstructions
      ? meal.strInstructions
          .split(/\r?\n/)
          .map((step) => step.trim())
          .filter((step) => step && !/^(step\s*)?\d+[.):]?$/i.test(step))
      : [];

    return {
      id: meal.idMeal,
      title: meal.strMeal,
      description: meta.description,
      image: meal.strMealThumb,
      cookTime: meta.cookTime,
      servings: meta.servings,
      category: meal.strCategory || "Main Course",
      // filter.php sonuçlarında area yoktu ve her karta "Unknown" yazılıyordu
      area: meal.strArea?.trim() || null,
      youtubeId: getYoutubeId(meal.strYoutube),
      ingredients,
      instructions,
      originalData: meal,
    };
  },
};
