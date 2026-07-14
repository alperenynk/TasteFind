import { useSignUp } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useState, useCallback } from "react";
import {
  View,
  Text,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  Pressable,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";

import { authStyles } from "../../assets/styles/auth.styles";
import { COLORS } from "../../constants/colors";
import VerifyEmail from "./verify-email";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SignUpScreen = () => {
  const router = useRouter();

  const { signUp, isLoaded } = useSignUp();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [pendingVerification, setPendingVerification] = useState(false);

  const handleSignUp = useCallback(async () => {
    Keyboard.dismiss();

    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!emailRegex.test(normalizedEmail)) {
      Alert.alert("Error", "Please enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    if (!isLoaded) return;

    setLoading(true);

    try {
      await signUp.create({
        emailAddress: normalizedEmail,
        password,
      });

      await signUp.prepareEmailAddressVerification({
        strategy: "email_code",
      });

      setPendingVerification(true);
    } catch (err) {
      const message =
        typeof err === "object" &&
        err !== null &&
        "errors" in err &&
        Array.isArray(err.errors)
          ? err.errors[0]?.message
          : "Failed to create account";

      Alert.alert("Error", message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [email, password, isLoaded, signUp]);

  if (pendingVerification) {
    return (
      <VerifyEmail
        email={email.trim().toLowerCase()}
        onBack={() => setPendingVerification(false)}
      />
    );
  }

  return (
    <View style={authStyles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={authStyles.keyboardView}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <ScrollView
          contentContainerStyle={authStyles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={authStyles.imageContainer}>
            <Image
              source={require("../../assets/images/signup.png")}
              style={authStyles.image}
              contentFit="contain"
            />
          </View>

          <Text style={authStyles.title}>Create Account</Text>

          <View style={authStyles.formContainer}>
            {/* Email Input */}
            <View style={authStyles.inputContainer}>
              <TextInput
                style={authStyles.textInput}
                placeholder="Enter email"
                placeholderTextColor={COLORS.textLight}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                editable={!loading}
              />
            </View>

            {/* Password Input */}
            <View style={authStyles.inputContainer}>
              <TextInput
                style={authStyles.textInput}
                placeholder="Enter password"
                placeholderTextColor={COLORS.textLight}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="done"
                onSubmitEditing={handleSignUp}
                editable={!loading}
              />

              <Pressable
                style={({ pressed }) => [
                  authStyles.eyeButton,
                  pressed && !loading && { opacity: 0.8 },
                ]}
                onPress={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                <Ionicons
                  name={showPassword ? "eye-outline" : "eye-off-outline"}
                  size={20}
                  color={COLORS.textLight}
                />
              </Pressable>
            </View>

            <Pressable
              style={({ pressed }) => [
                authStyles.authButton,
                loading && authStyles.buttonDisabled,
                pressed && !loading && { opacity: 0.8 },
              ]}
              onPress={handleSignUp}
              disabled={loading}
            >
              <Text style={authStyles.buttonText}>
                {loading ? "Creating Account..." : "Sign Up"}
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                authStyles.linkContainer,
                pressed && !loading && { opacity: 0.8 },
              ]}
              onPress={() => router.back()}
              disabled={loading}
            >
              <Text style={authStyles.linkText}>
                Already have an account?{" "}
                <Text style={authStyles.link}>Sign In</Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default SignUpScreen;
