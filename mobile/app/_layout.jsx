import { View, Text, Pressable } from "react-native";
import { Stack } from "expo-router";
import { ClerkProvider } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import SafeScreen from "@/components/SafeScreen";
import { COLORS } from "@/constants/colors";
import { logger } from "@/utils/logger";

// Beklenmeyen render hatalarında beyaz ekran yerine kurtarma ekranı gösterir (expo-router bunu otomatik kullanır)
export function ErrorBoundary({ error, retry }) {
  logger.error("Unhandled UI error:", error);
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
        backgroundColor: COLORS.background,
      }}
    >
      <Text style={{ fontSize: 22, fontWeight: "700", color: COLORS.text, marginBottom: 8 }}>
        Bir şeyler ters gitti
      </Text>
      <Text style={{ fontSize: 15, color: COLORS.textLight, textAlign: "center", marginBottom: 24 }}>
        Beklenmeyen bir hata oluştu. Lütfen tekrar dene.
      </Text>
      <Pressable
        onPress={retry}
        accessibilityRole="button"
        style={{
          backgroundColor: COLORS.primary,
          paddingHorizontal: 24,
          paddingVertical: 12,
          borderRadius: 12,
        }}
      >
        <Text style={{ color: COLORS.white, fontWeight: "600", fontSize: 16 }}>Tekrar dene</Text>
      </Pressable>
    </View>
  );
}

export default function RootLayout() {
  return (
    <ClerkProvider tokenCache={tokenCache}>
      <SafeScreen>
        {/* Slot yerine Stack: tarif detayına gidince sekmeler bellekte kalır, geri dönünce
            ana sayfanın kaydırma konumu ve seçili kategori kaybolmaz. */}
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: COLORS.background },
          }}
        />
      </SafeScreen>
    </ClerkProvider>
  );
}
