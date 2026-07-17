import React, { memo } from "react";
import { View, ActivityIndicator, Text, StyleSheet } from "react-native";

import { COLORS } from "../constants/colors";

const LoadingSpinner = ({ message = "Loading...", size = "large" }) => {
  return (
    <View
      style={styles.container}
      accessible
      testID="loading-spinner"
      accessibilityRole="progressbar"
      accessibilityLabel={`${message}`}
      accessibilityHint="Please wait while the content is loading."
    >
      <View style={styles.content}>
        <ActivityIndicator
          size={size}
          color={COLORS.primary}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />

        <Text style={styles.message} allowFontScaling>
          {message}
        </Text>
      </View>
    </View>
  );
};

export default memo(LoadingSpinner);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    backgroundColor: COLORS.background,
  },

  content: {
    alignItems: "center",
    gap: 16,
  },

  message: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: "center",
  },
});
