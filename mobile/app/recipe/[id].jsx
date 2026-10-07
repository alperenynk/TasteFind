import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { WebView } from "react-native-webview";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MealAPI } from "../../services/mealAPI";
import { FavoritesAPI } from "../../services/favoritesAPI";
import { COLORS } from "../../constants/colors";
import { recipeDetailStyles as styles } from "../../assets/styles/recipe-detail.styles";
import LoadingSpinner from "../../components/LoadingSpinner";
import { logger } from "../../utils/logger";

const DONE_COLOR = "#43A047";

const RecipeDetailScreen = () => {
  const { id } = useLocalSearchParams();
  const recipeId = Array.isArray(id) ? id[0] : id;

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isSignedIn, getToken } = useAuth();

  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const [completedSteps, setCompletedSteps] = useState([]);

  // Tarifi yükle
  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const meal = await MealAPI.getMealById(recipeId, controller.signal);
        if (controller.signal.aborted) return;

        const transformed = MealAPI.transformMealData(meal);
        if (!transformed) {
          setError("Bu tarif bulunamadı veya yüklenemedi.");
          return;
        }
        setRecipe(transformed);
      } catch (err) {
        if (err?.name === "AbortError") return;
        logger.error("Error loading recipe:", err);
        setError("Tarif yüklenirken bir sorun oluştu.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [recipeId, retryCount]);

  // Bu tarif favorilerde mi?
  useEffect(() => {
    if (!isSignedIn) return;
    const controller = new AbortController();

    (async () => {
      try {
        const favorites = await FavoritesAPI.list(getToken, controller.signal);
        setIsFavorite(favorites.some((fav) => String(fav.recipeId) === String(recipeId)));
      } catch (err) {
        if (err?.name !== "AbortError") logger.error("Error checking favorite:", err);
      }
    })();

    return () => controller.abort();
  }, [isSignedIn, getToken, recipeId]);

  const toggleFavorite = useCallback(async () => {
    if (!isSignedIn || !recipe || favoriteBusy) return;

    const next = !isFavorite;
    setFavoriteBusy(true);
    setIsFavorite(next); // iyimser güncelleme, hata olursa geri alınır

    try {
      if (next) await FavoritesAPI.add(getToken, recipe);
      else await FavoritesAPI.remove(getToken, recipe.id);
    } catch (err) {
      logger.error("Error toggling favorite:", err);
      setIsFavorite(!next);
      Alert.alert("Hata", "Favori güncellenemedi. Lütfen tekrar dene.");
    } finally {
      setFavoriteBusy(false);
    }
  }, [isSignedIn, getToken, recipe, isFavorite, favoriteBusy]);

  const toggleStep = useCallback((index) => {
    setCompletedSteps((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  }, []);

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }, [router]);

  if (loading) return <LoadingSpinner message="Loading recipe..." />;

  if (error || !recipe) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: COLORS.primary }]}>
        <View style={styles.errorContent}>
          <Ionicons name="cloud-offline-outline" size={64} color={COLORS.white} />
          <Text style={styles.errorTitle}>Bir şeyler ters gitti</Text>
          <Text style={styles.errorDescription}>{error || "Tarif yüklenemedi."}</Text>
          <Pressable style={styles.errorButton} onPress={() => setRetryCount((c) => c + 1)}>
            <Text style={styles.errorButtonText}>Tekrar dene</Text>
          </Pressable>
          <Pressable onPress={goBack} style={{ marginTop: 16 }}>
            <Text style={[styles.errorDescription, { marginBottom: 0 }]}>Geri dön</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    // Kök layout'taki SafeScreen üst boşluk bırakıyor; görsel ekranın tepesine kadar
    // uzansın diye o boşluğu geri alıyoruz.
    <View style={[styles.container, { marginTop: -insets.top }]}>
      <StatusBar style="light" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Başlık görseli */}
        <View style={styles.headerContainer}>
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: recipe.image }}
              style={styles.headerImage}
              contentFit="cover"
              transition={300}
              cachePolicy="memory-disk"
            />
          </View>

          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.5)", "rgba(0,0,0,0.9)"]}
            style={styles.gradientOverlay}
          />

          <View style={[styles.floatingButtons, { top: insets.top + 8 }]}>
            <Pressable
              style={styles.floatingButton}
              onPress={goBack}
              accessibilityRole="button"
              accessibilityLabel="Geri dön"
            >
              <Ionicons name="arrow-back" size={24} color={COLORS.white} />
            </Pressable>

            <Pressable
              style={styles.floatingButton}
              onPress={toggleFavorite}
              disabled={favoriteBusy}
              accessibilityRole="button"
              accessibilityLabel={isFavorite ? "Favorilerden çıkar" : "Favorilere ekle"}
              accessibilityState={{ selected: isFavorite }}
            >
              {favoriteBusy ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Ionicons
                  name={isFavorite ? "heart" : "heart-outline"}
                  size={24}
                  color={isFavorite ? "#FF5A6E" : COLORS.white}
                />
              )}
            </Pressable>
          </View>

          <View style={styles.titleSection}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{recipe.category}</Text>
            </View>
            <Text style={styles.recipeTitle}>{recipe.title}</Text>
            {recipe.area && (
              <View style={styles.locationRow}>
                <Ionicons name="location" size={16} color={COLORS.white} />
                <Text style={styles.locationText}>{recipe.area} Cuisine</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.contentSection}>
          {/* İstatistikler */}
          <View style={styles.statsContainer}>
            <StatCard icon="time" label="Prep Time" value={recipe.cookTime} color="#FF9800" />
            <StatCard icon="people" label="Servings" value={String(recipe.servings)} color="#2196F3" />
            <StatCard
              icon="list"
              label="Ingredients"
              value={String(recipe.ingredients.length)}
              color="#43A047"
            />
          </View>

          {/* Video */}
          {recipe.youtubeId && (
            <View style={styles.sectionContainer}>
              <SectionTitle icon="play" color="#FF0000" title="Video Tutorial" />
              <View style={styles.videoCard}>
                <WebView
                  style={styles.webview}
                  source={{ uri: `https://www.youtube.com/embed/${recipe.youtubeId}` }}
                  allowsFullscreenVideo
                  javaScriptEnabled
                  mediaPlaybackRequiresUserAction
                />
              </View>
            </View>
          )}

          {/* Malzemeler */}
          <View style={styles.sectionContainer}>
            <SectionTitle
              icon="restaurant"
              color={COLORS.primary}
              title="Ingredients"
              count={recipe.ingredients.length}
            />
            <View style={styles.ingredientsGrid}>
              {recipe.ingredients.map((ingredient, index) => (
                <View key={`${ingredient}-${index}`} style={styles.ingredientCard}>
                  <View style={styles.ingredientNumber}>
                    <Text style={styles.ingredientNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.ingredientText}>{ingredient}</Text>
                  <View style={styles.ingredientCheck}>
                    <Ionicons name="checkmark-circle-outline" size={22} color={COLORS.textLight} />
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Yapılış */}
          <View style={styles.sectionContainer}>
            <SectionTitle
              icon="book"
              color="#9C27B0"
              title="Instructions"
              count={recipe.instructions.length}
            />
            <View style={styles.instructionsContainer}>
              {recipe.instructions.map((instruction, index) => {
                const done = completedSteps.includes(index);
                return (
                  <View key={index} style={styles.instructionCard}>
                    <View
                      style={[
                        styles.stepIndicator,
                        { backgroundColor: done ? DONE_COLOR : COLORS.primary },
                      ]}
                    >
                      <Text style={styles.stepNumber}>{index + 1}</Text>
                    </View>
                    <View style={styles.instructionContent}>
                      <Text style={styles.instructionText}>{instruction}</Text>
                      <View style={styles.instructionFooter}>
                        <Text style={styles.stepLabel}>Step {index + 1}</Text>
                        <Pressable
                          style={[
                            styles.completeButton,
                            done && { backgroundColor: DONE_COLOR },
                          ]}
                          onPress={() => toggleStep(index)}
                          hitSlop={8}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: done }}
                          accessibilityLabel={`Adım ${index + 1} tamamlandı`}
                        >
                          <Ionicons
                            name="checkmark"
                            size={16}
                            color={done ? COLORS.white : COLORS.primary}
                          />
                        </Pressable>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Alt aksiyon */}
          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && { opacity: 0.9 }]}
            onPress={toggleFavorite}
            disabled={favoriteBusy}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.primary + "CC"]}
              style={styles.buttonGradient}
            >
              <Ionicons
                name={isFavorite ? "heart" : "heart-outline"}
                size={20}
                color={COLORS.white}
              />
              <Text style={styles.buttonText}>
                {isFavorite ? "Remove from Favorites" : "Add to Favorites"}
              </Text>
            </LinearGradient>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
};

const StatCard = ({ icon, label, value, color }) => (
  <View style={styles.statCard}>
    <View style={[styles.statIconContainer, { backgroundColor: color }]}>
      <Ionicons name={icon} size={20} color={COLORS.white} />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const SectionTitle = ({ icon, color, title, count }) => (
  <View style={styles.sectionTitleRow}>
    <View style={[styles.sectionIcon, { backgroundColor: color }]}>
      <Ionicons name={icon} size={16} color={COLORS.white} />
    </View>
    <Text style={styles.sectionTitle}>{title}</Text>
    {count != null && (
      <View style={styles.countBadge}>
        <Text style={styles.countText}>{count}</Text>
      </View>
    )}
  </View>
);

export default RecipeDetailScreen;
