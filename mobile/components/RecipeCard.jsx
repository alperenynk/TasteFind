import React, { memo } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";

import { COLORS } from "../constants/colors";
import { recipeCardStyles } from "../assets/styles/home.styles";

const RecipeCard = ({ recipe }) => {
  const router = useRouter();

  if (!recipe) return null;

  return (
    <Pressable
      style={({ pressed }) => [
        recipeCardStyles.container,
        pressed && {
          opacity: 0.85,
          transform: [{ scale: 0.98 }],
        },
      ]}
      onPress={() => router.push(`/recipe/${recipe.id}`)}
      accessibilityRole="button"
      accessibilityLabel={recipe.title}
      accessibilityHint="Opens recipe details"
    >
      <View style={recipeCardStyles.imageContainer}>
        <Image
          source={{ uri: recipe.image }}
          style={recipeCardStyles.image}
          contentFit="cover"
          transition={300}
          accessibilityElementsHidden
          importantForAccessibility="no"
          cachePolicy="memory-disk"
        />
      </View>

      <View style={recipeCardStyles.content}>
        <Text style={recipeCardStyles.title} numberOfLines={2}>
          {recipe.title}
        </Text>

        {recipe.description && (
          <Text style={recipeCardStyles.description} numberOfLines={2}>
            {recipe.description}
          </Text>
        )}

        <View style={recipeCardStyles.footer}>
          {recipe.cookTime && (
            <View style={recipeCardStyles.timeContainer}>
              <Ionicons
                name="time-outline"
                size={14}
                color={COLORS.textLight}
              />

              <Text style={recipeCardStyles.timeText}>{recipe.cookTime}</Text>
            </View>
          )}

          {recipe.area && (
            <View style={recipeCardStyles.servingsContainer}>
              <Ionicons
                name="location-outline"
                size={14}
                color={COLORS.textLight}
              />

              <Text style={recipeCardStyles.servingsText} numberOfLines={1}>
                {recipe.area}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
};

export default memo(RecipeCard);
