import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, TextInput, Pressable, FlatList } from "react-native";
import { MealAPI } from "../../services/mealAPI";
import { useDebounce } from "../../hooks/useDebounce";
import { searchStyles } from "../../assets/styles/search.styles";
import { COLORS } from "../../constants/colors";
import { Ionicons } from "@expo/vector-icons";
import RecipeCard from "../../components/RecipeCard";
import LoadingSpinner from "../../components/LoadingSpinner";

const SearchScreen = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [recipes, setRecipes] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const isMounted = useRef(true);
  const requestIdRef = useRef(0);
  const abortRef = useRef(null);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const performSearch = useCallback(async (query, signal) => {
    // sorgu boşsa popüler/rastgele tarifleri göster
    if (!query.trim()) {
      const randomMeals = await MealAPI.getRandomMeals(12, signal);
      return randomMeals
        .map((meal) => MealAPI.transformMealData(meal))
        .filter((meal) => meal !== null);
    }

    // önce isme göre ara, sonuç yoksa malzemeye göre dene
    const nameResults = await MealAPI.searchMealsByName(query, signal);
    let results = nameResults;

    if (results.length === 0) {
      const ingredientResults = await MealAPI.filterByIngredient(query, signal);
      results = ingredientResults;
    }

    return results
      .slice(0, 12)
      .map((meal) => MealAPI.transformMealData(meal))
      .filter((meal) => meal !== null);
  }, []);

  // Tek effect: mount'ta, arama sorgusu değiştiğinde ve retry tetiklendiğinde çalışır
  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const currentRequestId = ++requestIdRef.current;

    const runSearch = async () => {
      setError(null);

      try {
        const results = await performSearch(debouncedSearchQuery, controller.signal);
        if (!isMounted.current || currentRequestId !== requestIdRef.current) return;
        setRecipes(results);
      } catch (err) {
        if (err?.name === "AbortError") return;
        console.error("Error searching:", err);
        if (isMounted.current && currentRequestId === requestIdRef.current) {
          setError("Arama sırasında bir sorun oluştu.");
        }
      } finally {
        if (isMounted.current && currentRequestId === requestIdRef.current) {
          setInitialLoading(false);
        }
      }
    };

    runSearch();

    return () => controller.abort();
  }, [debouncedSearchQuery, retryCount, performSearch]);

  const handleRetry = useCallback(() => {
    setRetryCount((prev) => prev + 1);
  }, []);

  if (initialLoading) return <LoadingSpinner message="Loading recipes..." />;

  return (
    <View style={searchStyles.container}>
      <View style={searchStyles.searchSection}>
        <View style={searchStyles.searchContainer}>
          <Ionicons
            name="search"
            size={20}
            color={COLORS.textLight}
            style={searchStyles.searchIcon}
          />
          <TextInput
            style={searchStyles.searchInput}
            placeholder="Search recipes, ingredients..."
            placeholderTextColor={COLORS.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <Pressable
              onPress={() => setSearchQuery("")}
              style={searchStyles.clearButton}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Aramayı temizle"
            >
              <Ionicons name="close-circle" size={20} color={COLORS.textLight} />
            </Pressable>
          )}
        </View>
      </View>

      <View style={searchStyles.resultsSection}>
        <View style={searchStyles.resultsHeader}>
          <Text style={searchStyles.resultsTitle}>
            {searchQuery ? `Results for "${searchQuery}"` : "Popular Recipes"}
          </Text>
          {!error && <Text style={searchStyles.resultsCount}>{recipes.length} found</Text>}
        </View>

        <FlatList
          data={error ? [] : recipes}
          renderItem={({ item }) => <RecipeCard recipe={item} />}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          columnWrapperStyle={searchStyles.row}
          contentContainerStyle={searchStyles.recipesGrid}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={5}
          removeClippedSubviews
          ListEmptyComponent={
            error ? (
              <ErrorState message={error} onRetry={handleRetry} />
            ) : (
              <NoResultsFound />
            )
          }
        />
      </View>
    </View>
  );
};
export default SearchScreen;

function NoResultsFound() {
  return (
    <View style={searchStyles.emptyState}>
      <Ionicons name="search-outline" size={64} color={COLORS.textLight} />
      <Text style={searchStyles.emptyTitle}>No recipes found</Text>
      <Text style={searchStyles.emptyDescription}>
        Try adjusting your search or try different keywords
      </Text>
    </View>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <View style={searchStyles.emptyState}>
      <Ionicons name="cloud-offline-outline" size={64} color={COLORS.textLight} />
      <Text style={searchStyles.emptyTitle}>Bir şeyler ters gitti</Text>
      <Text style={searchStyles.emptyDescription}>{message}</Text>
      <Pressable onPress={onRetry} hitSlop={8}>
        <Text style={[searchStyles.emptyDescription, { color: COLORS.primary, marginTop: 8 }]}>
          Tekrar dene
        </Text>
      </Pressable>
    </View>
  );
}
