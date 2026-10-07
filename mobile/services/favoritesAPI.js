import { API_URL } from "../constants/api";

// Kullanıcı kimliği istemciden gönderilmez; backend Clerk oturum token'ından çıkarır.
// getToken: Clerk'in useAuth() hook'undan gelen fonksiyon.
const request = async (getToken, path, { signal, method = "GET", body } = {}) => {
  const token = await getToken();
  if (!token) throw new Error("Not authenticated");

  const response = await fetch(`${API_URL}${path}`, {
    method,
    signal,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : null),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
};

export const AccountAPI = {
  // Kullanıcının verisini ve Clerk hesabını backend üzerinden siler
  delete: (getToken) => request(getToken, "/account", { method: "DELETE" }),
};

export const FavoritesAPI = {
  list: (getToken, signal) => request(getToken, "/favorites", { signal }),

  add: (getToken, recipe) =>
    request(getToken, "/favorites", {
      method: "POST",
      body: {
        recipeId: parseInt(recipe.id, 10),
        title: recipe.title,
        image: recipe.image,
        cookTime: recipe.cookTime,
        servings: String(recipe.servings),
      },
    }),

  remove: (getToken, recipeId) =>
    request(getToken, `/favorites/${recipeId}`, { method: "DELETE" }),
};
