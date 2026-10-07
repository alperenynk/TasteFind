import { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, Alert, RefreshControl } from "react-native";
import { useFocusEffect } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";

import { AccountAPI, FavoritesAPI } from "../../services/favoritesAPI";
import { COLORS } from "../../constants/colors";
import { favoritesStyles } from "../../assets/styles/favorites.styles";
import RecipeCard from "../../components/RecipeCard";
import NoFavoritesFound from "../../components/NoFavoritesFound";
import LoadingSpinner from "../../components/LoadingSpinner";
import { logger } from "../../utils/logger";

const FavoritesScreen = () => {
  const { isSignedIn, getToken, signOut } = useAuth();

  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchFavorites = useCallback(
    async (signal) => {
      const data = await FavoritesAPI.list(getToken, signal);

      // Backend satırlarını RecipeCard'ın beklediği şekle çevir
      return data.map((fav) => ({
        id: String(fav.recipeId),
        title: fav.title,
        image: fav.image,
        cookTime: fav.cookTime,
        servings: fav.servings,
      }));
    },
    [getToken]
  );

  // Sekmeye her dönüldüğünde listeyi tazele (tarif detayında favori eklenmiş olabilir)
  useFocusEffect(
    useCallback(() => {
      if (!isSignedIn) return;
      const controller = new AbortController();

      (async () => {
        try {
          setError(null);
          setFavorites(await fetchFavorites(controller.signal));
        } catch (err) {
          if (err?.name === "AbortError") return;
          logger.error("Error loading favorites:", err);
          setError("Favoriler yüklenemedi. Bağlantını kontrol edip tekrar dene.");
        } finally {
          if (!controller.signal.aborted) setLoading(false);
        }
      })();

      return () => controller.abort();
    }, [isSignedIn, fetchFavorites])
  );

  const reload = useCallback(
    async (asRefresh) => {
      if (asRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        setError(null);
        setFavorites(await fetchFavorites());
      } catch (err) {
        logger.error("Error loading favorites:", err);
        setError("Favoriler yüklenemedi. Bağlantını kontrol edip tekrar dene.");
      } finally {
        setRefreshing(false);
        setLoading(false);
      }
    },
    [fetchFavorites]
  );

  const handleSignOut = useCallback(() => {
    Alert.alert("Çıkış Yap", "Hesabından çıkmak istediğine emin misin?", [
      { text: "İptal", style: "cancel" },
      {
        text: "Çıkış Yap",
        style: "destructive",
        onPress: async () => {
          try {
            // Oturum kapanınca (tabs)/_layout.jsx otomatik olarak sign-in'e yönlendirir
            await signOut();
          } catch (err) {
            logger.error("Sign out error:", err);
            Alert.alert("Hata", "Çıkış yapılamadı. Lütfen tekrar dene.");
          }
        },
      },
    ]);
  }, [signOut]);

  const performAccountDeletion = useCallback(async () => {
    try {
      await AccountAPI.delete(getToken);
    } catch (err) {
      logger.error("Account deletion failed:", err);
      Alert.alert("Hata", "Hesap silinemedi. Lütfen tekrar dene.");
      return;
    }
    try {
      await signOut(); // oturum zaten geçersiz olabilir; hata önemsiz
    } catch {
      // yoksay
    }
  }, [getToken, signOut]);

  // Mağaza kuralı: hesap açabilen uygulamalar uygulama içinden hesap silmeyi de sunmalı
  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      "Hesabı Sil",
      "Hesabın ve tüm favorilerin kalıcı olarak silinecek. Bu işlem geri alınamaz.",
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Devam",
          style: "destructive",
          onPress: () =>
            Alert.alert("Emin misin?", "Hesabını silmek üzeresin.", [
              { text: "Vazgeç", style: "cancel" },
              { text: "Hesabı Sil", style: "destructive", onPress: performAccountDeletion },
            ]),
        },
      ]
    );
  }, [performAccountDeletion]);

  if (loading) return <LoadingSpinner message="Loading your favorites..." />;

  return (
    <View style={favoritesStyles.container}>
      <View style={favoritesStyles.header}>
        <Text style={favoritesStyles.title}>Favorites</Text>
        <Pressable
          style={({ pressed }) => [favoritesStyles.logoutButton, pressed && { opacity: 0.7 }]}
          onPress={handleSignOut}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Çıkış yap"
        >
          <Ionicons name="log-out-outline" size={22} color={COLORS.text} />
        </Pressable>
      </View>

      <FlatList
        data={error ? [] : favorites}
        renderItem={({ item }) => <RecipeCard recipe={item} />}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={[favoritesStyles.row, { paddingHorizontal: 16 }]}
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => reload(true)}
            tintColor={COLORS.primary}
          />
        }
        ListFooterComponent={
          <Pressable
            onPress={handleDeleteAccount}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Hesabı sil"
            style={{ alignSelf: "center", paddingVertical: 24 }}
          >
            <Text style={{ color: COLORS.textLight, fontSize: 13, textDecorationLine: "underline" }}>
              Hesabı sil
            </Text>
          </Pressable>
        }
        ListEmptyComponent={
          error ? (
            <View style={favoritesStyles.emptyState}>
              <View style={favoritesStyles.emptyIconContainer}>
                <Ionicons name="cloud-offline-outline" size={64} color={COLORS.textLight} />
              </View>
              <Text style={favoritesStyles.emptyTitle}>Bir şeyler ters gitti</Text>
              <Pressable
                onPress={() => reload(false)}
                style={({ pressed }) => [favoritesStyles.exploreButton, pressed && { opacity: 0.9 }]}
              >
                <Ionicons name="refresh" size={18} color={COLORS.white} />
                <Text style={favoritesStyles.exploreButtonText}>Tekrar dene</Text>
              </Pressable>
            </View>
          ) : (
            <NoFavoritesFound />
          )
        }
      />
    </View>
  );
};

export default FavoritesScreen;
