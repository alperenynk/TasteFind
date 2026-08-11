import { View, Text, Pressable, FlatList, RefreshControl } from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { MealAPI } from "../../services/mealAPI";
import { homeStyles } from "../../assets/styles/home.styles";
import { Image } from "expo-image";
import { COLORS } from "../../constants/colors";
import { Ionicons } from "@expo/vector-icons";
import CategoryFilter from "../../components/CategoryFilter";
import RecipeCard from "../../components/RecipeCard";
import LoadingSpinner from "../../components/LoadingSpinner";

const HomeScreen = () => {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [recipes, setRecipes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [featuredRecipe, setFeaturedRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [error, setError] = useState(null);

  const isMounted = useRef(true);
  const requestIdRef = useRef(0);
  const loadDataAbortRef = useRef(null);
  const categoryAbortRef = useRef(null);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      loadDataAbortRef.current?.abort();
      categoryAbortRef.current?.abort();
    };
  }, []);

  const loadCategoryData = useCallback(async (category) => {
    // Önceki kategori isteği hâlâ sürüyorsa iptal et
    categoryAbortRef.current?.abort();
    const controller = new AbortController();
    categoryAbortRef.current = controller;
    const currentRequestId = ++requestIdRef.current;

    try {
      setCategoryLoading(true);
      setError(null);

      const meals = await MealAPI.filterByCategory(category, controller.signal);

      if (!isMounted.current || currentRequestId !== requestIdRef.current) return;

      const transformedMeals = (meals || [])
        .map((meal) => MealAPI.transformMealData(meal))
        .filter((meal) => meal !== null);
      setRecipes(transformedMeals);

      // Featured recipe'yi bu kategoriden rastgele seçilen yemeğin
      // tam detayıyla güncelle (filter.php sadece id/isim/thumbnail döndürüyor)
      if (meals && meals.length > 0) {
        const randomMeal = meals[Math.floor(Math.random() * meals.length)];
        const fullMeal = await MealAPI.getMealById(randomMeal.idMeal, controller.signal);

        if (!isMounted.current || currentRequestId !== requestIdRef.current) return;

        if (fullMeal) {
          setFeaturedRecipe(MealAPI.transformMealData(fullMeal));
        }
      }
    } catch (err) {
      if (err?.name === "AbortError") return; // iptal edildi, sessizce çık
      console.error("Error loading category data:", err);
      if (isMounted.current && currentRequestId === requestIdRef.current) {
        setRecipes([]);
        setError("Bu kategori yüklenirken bir sorun oluştu.");
      }
    } finally {
      if (isMounted.current && currentRequestId === requestIdRef.current) {
        setCategoryLoading(false);
      }
    }
  }, []);

  const loadData = useCallback(async () => {
    loadDataAbortRef.current?.abort();
    const controller = new AbortController();
    loadDataAbortRef.current = controller;

    try {
      setError(null);
      setLoading(true);

      const [apiCategories, randomMeals, featuredMeal] = await Promise.all([
        MealAPI.getCategories(controller.signal),
        MealAPI.getRandomMeals(12, controller.signal),
        MealAPI.getRandomMeal(controller.signal),
      ]);

      if (!isMounted.current) return;

      const transformedCategories = (apiCategories || []).map((cat, index) => ({
        id: index + 1,
        name: cat.strCategory,
        image: cat.strCategoryThumb,
        description: cat.strCategoryDescription,
      }));

      setCategories(transformedCategories);

      const initialCategory = transformedCategories[0]?.name ?? null;
      if (!selectedCategory) setSelectedCategory(initialCategory);

      const transformedMeals = (randomMeals || [])
        .map((meal) => MealAPI.transformMealData(meal))
        .filter((meal) => meal !== null);

      setRecipes(transformedMeals);

      const transformedFeatured = featuredMeal ? MealAPI.transformMealData(featuredMeal) : null;
      setFeaturedRecipe(transformedFeatured);
    } catch (err) {
      if (err?.name === "AbortError") return;
      console.log("Error loading the data", err);
      if (isMounted.current) {
        setError("Veriler yüklenemedi. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.");
      }
    } finally {
      if (isMounted.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCategorySelect = useCallback(
    async (category) => {
      if (category === selectedCategory) return;
      setSelectedCategory(category);
      await loadCategoryData(category);
    },
    [loadCategoryData, selectedCategory]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRetry = useCallback(() => {
    if (selectedCategory) {
      loadCategoryData(selectedCategory);
    } else {
      loadData();
    }
  }, [selectedCategory, loadCategoryData, loadData]);

  const renderHeader = useCallback(
    () => (
      <>
        {featuredRecipe && (
          <View style={homeStyles.featuredSection}>
            <Pressable
              style={({ pressed }) => [
                homeStyles.featuredCard,
                pressed && { opacity: 0.9 },
              ]}
              onPress={() => router.push(`/recipe/${featuredRecipe.id}`)}
            >
              <View style={homeStyles.featuredImageContainer}>
                <Image
                  source={{ uri: featuredRecipe.image }}
                  style={homeStyles.featuredImage}
                  contentFit="cover"
                  transition={500}
                />
                <View style={homeStyles.featuredOverlay}>
                  <View style={homeStyles.featuredBadge}>
                    <Text style={homeStyles.featuredBadgeText}>Featured</Text>
                  </View>

                  <View style={homeStyles.featuredContent}>
                    <Text style={homeStyles.featuredTitle} numberOfLines={2}>
                      {featuredRecipe.title}
                    </Text>

                    <View style={homeStyles.featuredMeta}>
                      <View style={homeStyles.metaItem}>
                        <Ionicons name="time-outline" size={16} color={COLORS.white} />
                        <Text style={homeStyles.metaText}>{featuredRecipe.cookTime}</Text>
                      </View>
                      <View style={homeStyles.metaItem}>
                        <Ionicons name="people-outline" size={16} color={COLORS.white} />
                        <Text style={homeStyles.metaText}>{featuredRecipe.servings}</Text>
                      </View>
                      {featuredRecipe.area && (
                        <View style={homeStyles.metaItem}>
                          <Ionicons name="location-outline" size={16} color={COLORS.white} />
                          <Text style={homeStyles.metaText}>{featuredRecipe.area}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </View>
            </Pressable>
          </View>
        )}

        {categories.length > 0 && (
          <CategoryFilter
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={handleCategorySelect}
          />
        )}

        <View style={[homeStyles.recipesSection, homeStyles.sectionHeader]}>
          <Text style={homeStyles.sectionTitle}>{selectedCategory}</Text>
        </View>

        {categoryLoading && (
          <View style={{ paddingVertical: 20 }}>
            <LoadingSpinner message="Loading recipes..." />
          </View>
        )}
      </>
    ),
    [featuredRecipe, categories, selectedCategory, categoryLoading, handleCategorySelect, router]
  );

  const renderEmpty = useCallback(() => {
    if (categoryLoading) return null;

    if (error) {
      return (
        <View style={homeStyles.emptyState}>
          <Ionicons name="cloud-offline-outline" size={64} color={COLORS.textLight} />
          <Text style={homeStyles.emptyTitle}>Bir şeyler ters gitti</Text>
          <Text style={homeStyles.emptyDescription}>{error}</Text>
          <Pressable onPress={handleRetry} hitSlop={8}>
            <Text style={[homeStyles.emptyDescription, { color: COLORS.primary, marginTop: 8 }]}>
              Tekrar dene
            </Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View style={homeStyles.emptyState}>
        <Ionicons name="restaurant-outline" size={64} color={COLORS.textLight} />
        <Text style={homeStyles.emptyTitle}>No recipes found</Text>
        <Text style={homeStyles.emptyDescription}>Try a different category</Text>
      </View>
    );
  }, [categoryLoading, error, handleRetry]);

  if (loading && !refreshing) return <LoadingSpinner message="Loading delicious recipes..." />;

  return (
    <View style={homeStyles.container}>
      <FlatList
        data={categoryLoading || error ? [] : recipes}
        renderItem={({ item }) => <RecipeCard recipe={item} />}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        columnWrapperStyle={[homeStyles.row, { paddingHorizontal: 20 }]}
        contentContainerStyle={homeStyles.scrollContent}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={5}
        removeClippedSubviews
      />
    </View>
  );
};

export default HomeScreen;
