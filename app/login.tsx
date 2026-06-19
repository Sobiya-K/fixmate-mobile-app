import { router } from "expo-router";
import { useState } from "react";

import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import { supabase } from "@/lib/supabase";

type UserRole =
  | "customer"
  | "worker"
  | "admin";

export default function LoginScreen() {
  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(false);

  const handleLogin = async () => {
    const cleanedEmail =
      email.trim().toLowerCase();

    if (!cleanedEmail) {
      Alert.alert(
        "Email required",
        "Please enter your email address."
      );

      return;
    }

    if (!password) {
      Alert.alert(
        "Password required",
        "Please enter your password."
      );

      return;
    }

    setIsLoading(true);

    try {
      const {
        data: signInData,
        error: signInError,
      } = await supabase.auth
        .signInWithPassword({
          email: cleanedEmail,
          password,
        });

      if (
        signInError ||
        !signInData.user
      ) {
        Alert.alert(
          "Login failed",
          signInError?.message ??
            "The account could not be logged in."
        );

        return;
      }

      const {
        data: profileData,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("role")
        .eq(
          "id",
          signInData.user.id
        )
        .single();

      if (
        profileError ||
        !profileData
      ) {
        console.error(
          "Login profile error:",
          profileError
        );

        await supabase.auth.signOut();

        Alert.alert(
          "Profile unavailable",
          "The profile connected to this account could not be loaded."
        );

        return;
      }

      const role =
        profileData.role as UserRole;

      if (role === "customer") {
        router.replace(
          "/customer-dashboard"
        );

        return;
      }

      if (role === "worker") {
        router.replace(
          "/worker-dashboard"
        );

        return;
      }

      if (role === "admin") {
        router.replace(
          "/admin-dashboard"
        );

        return;
      }

      await supabase.auth.signOut();

      Alert.alert(
        "Unsupported account",
        "This account does not have a valid FixMate role."
      );
    } catch (error) {
      console.error(
        "Unexpected login error:",
        error
      );

      Alert.alert(
        "Unexpected error",
        "Something went wrong while logging in."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={styles.safeArea}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        <ScrollView
          contentContainerStyle={
            styles.content
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={
            false
          }
        >
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>
              🛠️
            </Text>
          </View>

          <Text style={styles.appName}>
            FixMate
          </Text>

          <Text style={styles.title}>
            Welcome Back
          </Text>

          <Text style={styles.subtitle}>
            Log in to continue managing your
            FixMate services.
          </Text>

          <View style={styles.formCard}>
            <Text style={styles.label}>
              Email address
            </Text>

            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />

            <Text style={styles.label}>
              Password
            </Text>

            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              autoCapitalize="none"
              editable={!isLoading}
              onSubmitEditing={
                handleLogin
              }
            />

            <Pressable
              style={({ pressed }) => [
                styles.loginButton,

                pressed &&
                  styles.pressedButton,

                isLoading &&
                  styles.disabledButton,
              ]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator
                  color="#FFFFFF"
                />
              ) : (
                <Text
                  style={
                    styles.loginButtonText
                  }
                >
                  Log In
                </Text>
              )}
            </Pressable>
          </View>

          <View
            style={styles.registerRow}
          >
            <Text
              style={
                styles.registerQuestion
              }
            >
              Don&apos;t have an account?
            </Text>

            <Pressable
              onPress={() =>
                router.push("/register")
              }
              disabled={isLoading}
            >
              <Text
                style={
                  styles.registerLink
                }
              >
                Create Account
              </Text>
            </Pressable>
          </View>

          <Pressable
            style={styles.homeLink}
            onPress={() =>
              router.replace("/")
            }
            disabled={isLoading}
          >
            <Text
              style={styles.homeLinkText}
            >
              ← Back to Home
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F7F4FF",
  },

  keyboardView: {
    flex: 1,
  },

  content: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },

  logoCircle: {
    width: 74,
    height: 74,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 37,
    backgroundColor: "#EDE9FE",
  },

  logoText: {
    fontSize: 38,
  },

  appName: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: "800",
    color: "#6D28D9",
  },

  title: {
    marginTop: 17,
    fontSize: 31,
    fontWeight: "800",
    textAlign: "center",
    color: "#1F2937",
  },

  subtitle: {
    maxWidth: 310,
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    color: "#6B7280",
  },

  formCard: {
    width: "100%",
    padding: 20,
    marginTop: 27,
    borderWidth: 1,
    borderColor: "#DDD6FE",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
  },

  label: {
    marginTop: 5,
    marginBottom: 7,
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
  },

  input: {
    width: "100%",
    minHeight: 53,
    paddingHorizontal: 15,
    marginBottom: 15,
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
    marginTop: 5,
    borderRadius: 11,
    backgroundColor: "#6D28D9",
  },

  loginButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  pressedButton: {
    opacity: 0.8,
  },

  disabledButton: {
    opacity: 0.55,
  },

  registerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 22,
  },

  registerQuestion: {
    marginRight: 6,
    fontSize: 14,
    color: "#6B7280",
  },

  registerLink: {
    fontSize: 14,
    fontWeight: "800",
    color: "#6D28D9",
  },

  homeLink: {
    padding: 15,
    marginTop: 5,
  },

  homeLinkText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6D28D9",
  },
});