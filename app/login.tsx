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

import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/lib/supabase";

type UserRole = "customer" | "worker" | "admin";

export default function LoginScreen() {
  const { languageName, t } = useLanguage();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    const cleanedEmail = email.trim().toLowerCase();

    if (!cleanedEmail) {
      Alert.alert(
        t("login.email"),
        t("login.emailPlaceholder")
      );

      return;
    }

    if (!password) {
      Alert.alert(
        t("login.password"),
        t("login.passwordPlaceholder")
      );

      return;
    }

    setIsLoading(true);

    try {
      const {
        data: signInData,
        error: signInError,
      } = await supabase.auth.signInWithPassword({
        email: cleanedEmail,
        password,
      });

      if (signInError || !signInData.user) {
        Alert.alert(
          t("login.failed"),
          signInError?.message ||
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
        .eq("id", signInData.user.id)
        .single();

      if (profileError || !profileData) {
        console.error(
          "Login profile loading error:",
          profileError
        );

        await supabase.auth.signOut();

        Alert.alert(
          t("login.failed"),
          "The profile connected to this account could not be loaded."
        );

        return;
      }

      const role = profileData.role as UserRole;

      if (role === "customer") {
        router.replace("/customer-dashboard");
        return;
      }

      if (role === "worker") {
        router.replace("/worker-dashboard");
        return;
      }

      if (role === "admin") {
        router.replace("/admin-dashboard");
        return;
      }

      await supabase.auth.signOut();

      Alert.alert(
        t("login.failed"),
        "This account does not have a valid FixMate role."
      );
    } catch (error) {
      console.error(
        "Unexpected login error:",
        error
      );

      Alert.alert(
        t("login.failed"),
        "Something went wrong while logging in."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topRow}>
            <Pressable
              style={styles.backButton}
              onPress={() => router.replace("/")}
              disabled={isLoading}
            >
              <Text style={styles.backText}>
                ← {t("common.back")}
              </Text>
            </Pressable>

            <Pressable
              style={styles.languageButton}
              onPress={() =>
                router.push("/language")
              }
              disabled={isLoading}
            >
              <Text style={styles.languageText}>
                🌐 {languageName}
              </Text>
            </Pressable>
          </View>

          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>
              🛠️
            </Text>
          </View>

          <Text style={styles.appName}>
            {t("common.appName")}
          </Text>

          <Text style={styles.title}>
            {t("login.title")}
          </Text>

          <Text style={styles.subtitle}>
            {t("login.subtitle")}
          </Text>

          <View style={styles.formCard}>
            <Text style={styles.label}>
              {t("login.email")}
            </Text>

            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder={t(
                "login.emailPlaceholder"
              )}
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />

            <Text style={styles.label}>
              {t("login.password")}
            </Text>

            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder={t(
                "login.passwordPlaceholder"
              )}
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              autoCapitalize="none"
              editable={!isLoading}
              onSubmitEditing={handleLogin}
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
                  {t("login.button")}
                </Text>
              )}
            </Pressable>
          </View>

          <View style={styles.registerRow}>
            <Text
              style={styles.registerQuestion}
            >
              {t("login.noAccount")}
            </Text>

            <Pressable
              onPress={() =>
                router.push("/register")
              }
              disabled={isLoading}
            >
              <Text style={styles.registerLink}>
                {t("login.createAccount")}
              </Text>
            </Pressable>
          </View>
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
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 40,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  backButton: {
    paddingVertical: 10,
  },

  backText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6D28D9",
  },

  languageButton: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "#C4B5FD",
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
  },

  languageText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#6D28D9",
  },

  logoCircle: {
    width: 76,
    height: 76,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginTop: 42,
    borderRadius: 38,
    backgroundColor: "#EDE9FE",
  },

  logoText: {
    fontSize: 38,
  },

  appName: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    color: "#6D28D9",
  },

  title: {
    marginTop: 18,
    fontSize: 31,
    fontWeight: "800",
    textAlign: "center",
    color: "#1F2937",
  },

  subtitle: {
    maxWidth: 320,
    alignSelf: "center",
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
    justifyContent: "center",
    flexWrap: "wrap",
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
});