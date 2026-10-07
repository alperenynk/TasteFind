import React, { memo, useCallback } from "react";
import { View, Text, FlatList, Pressable } from "react-native";
import { Image } from "expo-image";

import { homeStyles } from "../assets/styles/home.styles";

// Her kategori butonu ayrı ve memo'lu: seçim değişince sadece durumu değişen
// iki buton yeniden çizilir, diğerlerinin görselleri hiç dokunulmadan kalır.
const CategoryItem = memo(({ name, image, isSelected, onSelect }) => {
  return (
    <Pressable
      onPress={() => onSelect(name)}
      accessibilityRole="button"
      accessibilityLabel={name}
      accessibilityHint={`Show ${name} recipes`}
      accessibilityState={{ selected: isSelected }}
      style={({ pressed }) => [
        homeStyles.categoryButton,
        isSelected && homeStyles.selectedCategory,
        pressed && {
          opacity: 0.75,
          transform: [{ scale: 0.97 }],
        },
      ]}
    >
      <Image
        source={{ uri: image }}
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
        {name}
      </Text>
    </Pressable>
  );
});

CategoryItem.displayName = "CategoryItem";

const CategoryFilter = ({ categories, selectedCategory, onSelectCategory }) => {
  const renderItem = useCallback(
    ({ item }) => (
      <CategoryItem
        name={item.name}
        image={item.image}
        isSelected={selectedCategory === item.name}
        onSelect={onSelectCategory}
      />
    ),
    [selectedCategory, onSelectCategory]
  );

  if (!categories?.length) return null;

  return (
    <View style={homeStyles.categoryFilterContainer}>
      <FlatList
        data={categories}
        extraData={selectedCategory}
        horizontal
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        showsHorizontalScrollIndicator={false}
        // ~14 öğe var; removeClippedSubviews iç içe listede görsellerin
        // kaybolmasına yol açtığı için kapalı.
        initialNumToRender={categories.length}
        keyboardShouldPersistTaps="handled"
        overScrollMode="never"
        bounces={false}
        contentContainerStyle={homeStyles.categoryFilterScrollContent}
      />
    </View>
  );
};

export default memo(CategoryFilter);
