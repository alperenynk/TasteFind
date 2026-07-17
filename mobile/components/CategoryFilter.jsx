import React, { memo } from "react";
import { View, Text, FlatList, Pressable } from "react-native";
import { Image } from "expo-image";

import { homeStyles } from "../assets/styles/home.styles";

const CategoryFilter = ({ categories, selectedCategory, onSelectCategory }) => {
  if (!categories?.length) return null;

  const renderItem = ({ item }) => {
    const isSelected = selectedCategory === item.name;

    return (
      <Pressable
        onPress={() => onSelectCategory(item.name)}
        accessibilityRole="button"
        accessibilityLabel={item.name}
        accessibilityHint={`Show ${item.name} recipes`}
        accessibilityState={{ selected: isSelected }}
        style={({ pressed }) => [
          homeStyles.categoryButton,
          isSelected && homeStyles.selectedCategory,
          pressed && {
            opacity: 0.75,
            transform: [
              {
                scale: 0.97,
              },
            ],
          },
        ]}
      >
        <Image
          source={{ uri: item.image }}
          style={[
            homeStyles.categoryImage,
            isSelected && homeStyles.selectedCategoryImage,
          ]}
          contentFit="cover"
          transition={300}
          accessibilityElementsHidden
          importantForAccessibility="no"
          cachePolicy="memory-disk"
        />

        <Text
          style={[
            homeStyles.categoryText,
            isSelected && homeStyles.selectedCategoryText,
          ]}
        >
          {item.name}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={homeStyles.categoryFilterContainer}>
      <FlatList
        data={categories}
        horizontal
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        showsHorizontalScrollIndicator={false}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={5}
        removeClippedSubviews
        keyboardShouldPersistTaps="handled"
        overScrollMode="never"
        bounces={false}
        contentContainerStyle={homeStyles.categoryFilterScrollContent}
      />
    </View>
  );
};

export default memo(CategoryFilter);
