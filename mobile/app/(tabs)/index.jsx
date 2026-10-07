import { View, Text, Pressable, FlatList, RefreshControl, ActivityIndicator } from "react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { MealAPI } from "../../services/mealAPI";
import { homeStyles } from "../../assets/styles/home.styles";
import { Image } from "expo-image";
import { COLORS } from "../../constants/colors";
import { Ionicons } from "@expo/vector-icons";
import CategoryFilter from "../../components/CategoryFilter";
import RecipeCard from "../../components/RecipeCard";
import LoadingSpinner from "../../components/LoadingSpinner";
import { logger } from "../../utils/logger";

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
  // Seçili kategoriyi ref'te de tutuyoruz: handleCategorySelect referansı sabit kalsın,
  // böylece kategori değişiminde header/CategoryFilter yeniden oluşmasın.
  const selectedCategoryRef = useRef(null);
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
        let fullMeal = null;
        try {
          fullMeal = await MealAPI.getMealById(randomMeal.idMeal, controller.signal);
        } catch (featuredErr) {
          // Öne çıkan tarif alınamadıysa liste yine de gösterilsin
          if (featuredErr?.name === "AbortError") throw featuredErr;
          logger.error("Error loading featured recipe:", featuredErr);
        }

        if (!isMounted.current || currentRequestId !== requestIdRef.current) return;

        if (fullMeal) {
          setFeaturedRecipe(MealAPI.transformMealData(fullMeal));
        }
      }
    } catch (err) {
      if (err?.name === "AbortError") return; // iptal edildi, sessizce çık
      logger.error("Error loading category data:", err);
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

      const apiCategories = await MealAPI.getCategories(controller.signal);

      if (!isMounted.current) return;

      const transformedCategories = (apiCategories || []).map((cat, index) => ({
        id: index + 1,
        name: cat.strCategory,
        image: cat.strCategoryThumb,
        description: cat.strCategoryDescription,
      }));

      setCategories(transformedCategories);

      // Yenilemede kullanıcının seçtiği kategori korunur; ilk açılışta ilk kategori seçilir
      const activeCategory =
        selectedCategoryRef.current ?? transformedCategories[0]?.name ?? null;

      if (!activeCategory) {
        setRecipes([]);
        setError("Veriler yüklenemedi. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.");
        return;
      }

      selectedCategoryRef.current = activeCategory;
      setSelectedCategory(activeCategory);

      // Seçili kategorinin yemekleri + o kategoriden bir "featured" tarif
      await loadCategoryData(activeCategory);
    } catch (err) {
      if (err?.name === "AbortError") return;
      logger.log("Error loading the data", err);
      if (isMounted.current) {
        setError("Veriler yüklenemedi. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.");
      }
    } finally {
      // Başka bir loadData başlamışsa (ör. dev'de çift effect) onun spinner'ını kapatma
      if (isMounted.current && loadDataAbortRef.current === controller) setLoading(false);
    }
  }, [loadCategoryData]);

  const handleCategorySelect = useCallback(
    (category) => {
      if (category === selectedCategoryRef.current) return;
      selectedCategoryRef.current = category;
      setSelectedCategory(category);
      loadCategoryData(category);
    },
    [loadCategoryData]
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

  // ÖNEMLİ: ListHeaderComponent'e fonksiyon değil ELEMENT veriyoruz. Fonksiyon verilirse
  // referansı her değiştiğinde React header'ı baştan mount eder; bu da kategori listesinin
  // kaydırma konumunu ve görsellerini sıfırlıyordu.
  const header = useMemo(
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

        <View
          style={[
            homeStyles.recipesSection,
            homeStyles.sectionHeader,
            { flexDirection: "row", alignItems: "center", gap: 10 },
          ]}
        >
          <Text style={homeStyles.sectionTitle}>{selectedCategory}</Text>
          {categoryLoading && <ActivityIndicator size="small" color={COLORS.primary} />}
        </View>
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
        // Yükleme sırasında listeyi boşaltmıyoruz; eski kartlar soluk kalır, sayfa yüksekliği
        // ve kaydırma konumu değişmez.
        data={error ? [] : recipes}
        extraData={categoryLoading}
        renderItem={({ item }) => (
          <View
            style={categoryLoading ? { opacity: 0.4 } : null}
            pointerEvents={categoryLoading ? "none" : "auto"}
          >
            <RecipeCard recipe={item} />
          </View>
        )}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        columnWrapperStyle={[homeStyles.row, { paddingHorizontal: 20 }]}
        contentContainerStyle={homeStyles.scrollContent}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={header}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={5}
      />
    </View>
  );
};

export default HomeScreen;
