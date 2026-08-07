import { useSignIn } from "@clerk/clerk-expo";
import { useLocalSearchParams, useRouter } from "expo-router";
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
import { Image } from "expo-image";

import { authStyles } from "../../assets/styles/auth.styles";
import { COLORS } from "../../constants/colors";

const VerifySecondFactor = () => {
    const router = useRouter();
    const { email } = useLocalSearchParams();

    const { signIn, setActive, isLoaded } = useSignIn();

    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);

    const handleVerification = useCallback(async () => {
        Keyboard.dismiss();

        if (!code.trim()) {
            Alert.alert("Error", "Please enter the verification code.");
            return;
        }

        if (!isLoaded) return;

        setLoading(true);

        try {
            const result = await signIn.attemptSecondFactor({
                strategy: "email_code",
                code: code.trim(),
            });

            if (result.status === "complete") {
                await setActive({
                    session: result.createdSessionId,
                });
            } else {
                Alert.alert(
                    "Error",
                    "Verification failed. Please try again."
                );

                console.log(result);
            }
        } catch (err) {
            Alert.alert(
                "Error",
                err.errors?.[0]?.message || "Verification failed."
            );

            console.log(err);
        } finally {
            setLoading(false);
        }
    }, [code, isLoaded, signIn, setActive]);

    const handleResendCode = useCallback(async () => {
        if (!isLoaded) return;

        setResending(true);

        try {
            await signIn.prepareSecondFactor({
                strategy: "email_code",
            });

            Alert.alert("Success", "A new verification code has been sent.");
        } catch (err) {
            Alert.alert(
                "Error",
                err.errors?.[0]?.message || "Failed to resend verification code."
            );

            console.log(err);
        } finally {
            setResending(false);
        }
    }, [isLoaded, signIn]);

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
                            source={require("../../assets/images/signin.png")}
                            style={authStyles.image}
                            contentFit="contain"
                        />
                    </View>

                    <Text style={authStyles.title}>Verify Identity</Text>

                    <Text style={authStyles.subtitle}>
                        We&apos;ve sent a verification code to {"\n"}{email}
                    </Text>

                    <View style={authStyles.formContainer}>
                        <View style={authStyles.inputContainer}>
                            <TextInput
                                style={authStyles.textInput}
                                placeholder="Enter verification code"
                                placeholderTextColor={COLORS.textLight}
                                value={code}
                                onChangeText={setCode}
                                keyboardType="number-pad"
                                autoCapitalize="none"
                                autoCorrect={false}
                                autoComplete="one-time-code"
                                textContentType="oneTimeCode"
                                returnKeyType="done"
                                onSubmitEditing={handleVerification}
                                editable={!loading}
                            />
                        </View>

                        <Pressable
                            style={({ pressed }) => [
                                authStyles.authButton,
                                loading && authStyles.buttonDisabled,
                                pressed && !loading && { opacity: 0.8 },
                            ]}
                            onPress={handleVerification}
                            disabled={loading}
                        >
                            <Text style={authStyles.buttonText}>
                                {loading ? "Verifying..." : "Verify Email"}
                            </Text>
                        </Pressable>

                        <Pressable
                            style={({ pressed }) => [
                                authStyles.linkContainer,
                                pressed && !resending && { opacity: 0.8 },
                            ]}
                            onPress={handleResendCode}
                            disabled={resending}
                        >
                            <Text style={authStyles.linkText}>
                                Didn't receive the code?{" "}
                                <Text style={authStyles.link}>
                                    {resending ? "Sending..." : "Resend Code"}
                                </Text>
                            </Text>
                        </Pressable>

                        <Pressable
                            style={({ pressed }) => [
                                authStyles.linkContainer,
                                pressed && !loading && { opacity: 0.8 },
                            ]}
                            onPress={() => router.replace("/(auth)/sign-in")}
                            disabled={loading}
                        >
                            <Text style={authStyles.linkText}>
                                <Text style={authStyles.link}>Back to Sign In</Text>
                            </Text>
                        </Pressable>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
};

export default VerifySecondFactor;
