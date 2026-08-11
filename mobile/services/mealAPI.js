const BASE_URL = "https://www.themealdb.com/api/json/v1/1";

const isAbortError = (error) => error?.name === "AbortError";

const getRandomItem = (array) => {
  return array[Math.floor(Math.random() * array.length)];
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
    mealMeta[id] = {
      cookTime: getRandomItem(cookTimes),
      servings: getRandomItem(servings),
      description: getRandomItem(descriptions),
    };
  }

  return mealMeta[id];
};

export const MealAPI = {
  searchMealsByName: async (query, signal) => {
    try {
      const response = await fetch(
        `${BASE_URL}/search.php?s=${encodeURIComponent(query)}`,
        { signal }
      );
      const data = await response.json();
      return data.meals || [];
    } catch (error) {
      if (isAbortError(error)) throw error;
      console.error("Error searching meals by name:", error);
      return [];
    }
  },

  getMealById: async (id, signal) => {
    try {
      const response = await fetch(`${BASE_URL}/lookup.php?i=${id}`, { signal });
      const data = await response.json();
      return data.meals ? data.meals[0] : null;
    } catch (error) {
      if (isAbortError(error)) throw error;
      console.error("Error getting meal by id:", error);
      return null;
    }
  },

  getRandomMeal: async (signal) => {
    try {
      const response = await fetch(`${BASE_URL}/random.php`, { signal });
      const data = await response.json();
      return data.meals ? data.meals[0] : null;
    } catch (error) {
      if (isAbortError(error)) throw error;
      console.error("Error getting random meal:", error);
      return null;
    }
  },

  // get multiple random meals
  getRandomMeals: async (count = 6, signal) => {
    try {
      const promises = Array(count)
        .fill()
        .map(() => MealAPI.getRandomMeal(signal));
      const meals = await Promise.all(promises);
      return meals.filter((meal) => meal !== null);
    } catch (error) {
      if (isAbortError(error)) throw error;
      console.error("Error getting random meals:", error);
      return [];
    }
  },

  getCategories: async (signal) => {
    try {
      const response = await fetch(`${BASE_URL}/categories.php`, { signal });
      const data = await response.json();
      return data.categories || [];
    } catch (error) {
      if (isAbortError(error)) throw error;
      console.error("Error getting categories:", error);
      return [];
    }
  },

  filterByIngredient: async (ingredient, signal) => {
    try {
      const response = await fetch(
        `${BASE_URL}/filter.php?i=${encodeURIComponent(ingredient)}`,
        { signal }
      );
      const data = await response.json();
      return data.meals || [];
    } catch (error) {
      if (isAbortError(error)) throw error;
      console.error("Error filtering by ingredient:", error);
      return [];
    }
  },

  filterByCategory: async (category, signal) => {
    try {
      const response = await fetch(
        `${BASE_URL}/filter.php?c=${encodeURIComponent(category)}`,
        { signal }
      );
      const data = await response.json();
      return data.meals || [];
    } catch (error) {
      if (isAbortError(error)) throw error;
      console.error("Error filtering by category:", error);
      return [];
    }
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

    const instructions = meal.strInstructions
      ? meal.strInstructions.split(/\r?\n/).filter((step) => step.trim())
      : [];

    return {
      id: meal.idMeal,
      title: meal.strMeal,
      description: meta.description,
      image: meal.strMealThumb,
      cookTime: meta.cookTime,
      servings: meta.servings,
      category: meal.strCategory || "Main Course",
      area: meal.strArea?.trim() || "Unknown",
      ingredients,
      instructions,
      originalData: meal,
    };
  },
};
