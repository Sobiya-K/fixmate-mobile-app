import { router } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import { supabase } from "@/lib/supabase";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(
        "Missing information",
        "Please enter your email and password."
      );

      return;
    }

    setIsLoading(true);

    try {
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

      if (authError) {
        Alert.alert("Login failed", authError.message);
        return;
      }

      if (!authData.user) {
        Alert.alert(
          "Login failed",
          "The account could not be loaded."
        );

        return;
      }

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("role")
          .eq("id", authData.user.id)
          .single();

      if (profileError || !profile) {
        console.error("Profile error:", profileError);

        await supabase.auth.signOut();

        Alert.alert(
          "Profile not found",
          "Your account exists, but the FixMate profile could not be loaded."
        );

        return;
      }

      if (profile.role === "worker") {
        router.replace("/worker-dashboard");
        return;
      }

      router.replace("/customer-dashboard");
    } catch (error) {
      console.error("Login error:", error);

      Alert.alert(
        "Unexpected error",
        "Something went wrong. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.container}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backText}>← Back</Text>
          </Pressable>

          <View style={styles.logoContainer}>
            <Text style={styles.logo}>🛠️</Text>
          </View>

          <Text style={styles.title}>Welcome Back</Text>

          <Text style={styles.subtitle}>
            Log in to continue using FixMate
          </Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            secureTextEntry
            autoCapitalize="none"
            onSubmitEditing={handleLogin}
          />

          <Pressable
            style={({ pressed }) => [
              styles.loginButton,
              pressed && styles.pressedButton,
              isLoading && styles.disabledButton,
            ]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.loginButtonText}>Log In</Text>
            )}
          </Pressable>

          <Pressable
            style={styles.registerLink}
            onPress={() => router.replace("/register")}
          >
            <Text style={styles.registerLinkText}>
              New to FixMate?{" "}
              <Text style={styles.registerLinkStrong}>
                Create an account
              </Text>
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F7F4FF",
  },
  screen: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 25,
  },
  backButton: {
    position: "absolute",
    top: 20,
    left: 25,
  },
  backText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6D28D9",
  },
  logoContainer: {
    width: 82,
    height: 82,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    borderRadius: 41,
    backgroundColor: "#EDE9FE",
  },
  logo: {
    fontSize: 39,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    textAlign: "center",
    color: "#1F2937",
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 28,
    fontSize: 15,
    textAlign: "center",
    color: "#6B7280",
  },
  label: {
    marginTop: 14,
    marginBottom: 7,
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
  },
  input: {
    minHeight: 52,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    fontSize: 15,
    color: "#111827",
  },
  loginButton: {
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 25,
    borderRadius: 12,
    backgroundColor: "#6D28D9",
  },
  loginButtonText: {
    fontSize: 17,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  pressedButton: {
    opacity: 0.75,
  },
  disabledButton: {
    opacity: 0.6,
  },
  registerLink: {
    alignItems: "center",
    paddingVertical: 22,
  },
  registerLinkText: {
    fontSize: 14,
    textAlign: "center",
    color: "#6B7280",
  },
  registerLinkStrong: {
    fontWeight: "800",
    color: "#6D28D9",
  },
});