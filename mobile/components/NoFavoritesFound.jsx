import React, { memo, useCallback } from "react";
import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { COLORS } from "@/constants/colors";
import { favoritesStyles } from "@/assets/styles/favorites.styles";

const NoFavoritesFound = () => {
  const router = useRouter();

  const handleExplore = useCallback(() => {
    router.push("/");
  }, [router]);

  return (
    <View style={favoritesStyles.emptyState}>
      <View style={favoritesStyles.emptyIconContainer}>
        <Ionicons
          name="heart-outline"
          size={80}
          color={COLORS.textLight}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      </View>

      <Text style={favoritesStyles.emptyTitle}>No favorites yet</Text>

      <Pressable
        onPress={handleExplore}
        accessibilityRole="button"
        accessibilityLabel="Explore recipes"
        accessibilityHint="Navigates to the home screen"
        style={({ pressed }) => [
          favoritesStyles.exploreButton,
          pressed && {
            opacity: 0.9,
            transform: [{ scale: 0.98 }],
          },
        ]}
      >
        <Ionicons
          name="search"
          size={18}
          color={COLORS.white}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />

        <Text style={favoritesStyles.exploreButtonText}>Explore Recipes</Text>
      </Pressable>
    </View>
  );
};

export default memo(NoFavoritesFound);
