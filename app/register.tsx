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

type UserRole = "customer" | "worker";

const workerCategories = [
  "Electrician",
  "Plumber",
  "Carpenter",
  "Cleaner",
  "Gardener",
  "Painter",
  "Mason",
  "Other",
];

export default function RegisterScreen() {
  const { languageName, t } = useLanguage();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [town, setTown] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [role, setRole] =
    useState<UserRole>("customer");

  const [category, setCategory] =
    useState("Electrician");

  const [isLoading, setIsLoading] =
    useState(false);

  const validateForm = () => {
    if (fullName.trim().length < 2) {
      Alert.alert(
        t("register.fullName"),
        "Please enter your full name."
      );

      return false;
    }

    if (phone.trim().length < 9) {
      Alert.alert(
        t("register.phone"),
        "Please enter a valid phone number."
      );

      return false;
    }

    if (town.trim().length < 2) {
      Alert.alert(
        t("register.town"),
        "Please enter your town."
      );

      return false;
    }

    if (!email.trim().includes("@")) {
      Alert.alert(
        t("register.email"),
        "Please enter a valid email address."
      );

      return false;
    }

    if (password.length < 6) {
      Alert.alert(
        t("register.password"),
        "Password must contain at least 6 characters."
      );

      return false;
    }

    if (role === "worker" && !category) {
      Alert.alert(
        t("register.category"),
        "Please select your service category."
      );

      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const cleanedEmail =
        email.trim().toLowerCase();

      const {
        data: signUpData,
        error: signUpError,
      } = await supabase.auth.signUp({
        email: cleanedEmail,
        password,

        options: {
          data: {
            full_name: fullName.trim(),
            phone: phone.trim(),
            town: town.trim(),
            role,
            category:
              role === "worker"
                ? category
                : null,
          },
        },
      });

      if (signUpError) {
        Alert.alert(
          "Registration failed",
          signUpError.message
        );

        return;
      }

      if (!signUpData.user) {
        Alert.alert(
          "Registration failed",
          "The account could not be created."
        );

        return;
      }

      if (signUpData.session) {
        await supabase.auth.signOut();
      }

      Alert.alert(
        "Account created",
        "Your FixMate account was created successfully.",
        [
          {
            text: t("login.button"),

            onPress: () =>
              router.replace("/login"),
          },
        ]
      );
    } catch (error) {
      console.error(
        "Unexpected registration error:",
        error
      );

      Alert.alert(
        "Registration failed",
        "Something went wrong while creating the account."
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
              onPress={() => router.back()}
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
              👤
            </Text>
          </View>

          <Text style={styles.appName}>
            {t("common.appName")}
          </Text>

          <Text style={styles.title}>
            {t("register.title")}
          </Text>

          <Text style={styles.subtitle}>
            {t("register.subtitle")}
          </Text>

          <View style={styles.formCard}>
            <Text style={styles.label}>
              {t("register.role")}
            </Text>

            <View style={styles.roleRow}>
              <Pressable
                style={[
                  styles.roleButton,

                  role === "customer" &&
                    styles.selectedRoleButton,
                ]}
                onPress={() =>
                  setRole("customer")
                }
                disabled={isLoading}
              >
                <Text style={styles.roleIcon}>
                  👤
                </Text>

                <Text
                  style={[
                    styles.roleButtonText,

                    role === "customer" &&
                      styles.selectedRoleButtonText,
                  ]}
                >
                  {t("register.customer")}
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.roleButton,

                  role === "worker" &&
                    styles.selectedRoleButton,
                ]}
                onPress={() =>
                  setRole("worker")
                }
                disabled={isLoading}
              >
                <Text style={styles.roleIcon}>
                  🛠️
                </Text>

                <Text
                  style={[
                    styles.roleButtonText,

                    role === "worker" &&
                      styles.selectedRoleButtonText,
                  ]}
                >
                  {t("register.worker")}
                </Text>
              </Pressable>
            </View>

            <Text style={styles.label}>
              {t("register.fullName")}
            </Text>

            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder={t(
                "register.fullName"
              )}
              placeholderTextColor="#9CA3AF"
              autoCapitalize="words"
              editable={!isLoading}
            />

            <Text style={styles.label}>
              {t("register.phone")}
            </Text>

            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder={t("register.phone")}
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              editable={!isLoading}
            />

            <Text style={styles.label}>
              {t("register.town")}
            </Text>

            <TextInput
              style={styles.input}
              value={town}
              onChangeText={setTown}
              placeholder={t("register.town")}
              placeholderTextColor="#9CA3AF"
              autoCapitalize="words"
              editable={!isLoading}
            />

            <Text style={styles.label}>
              {t("register.email")}
            </Text>

            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder={t("register.email")}
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />

            <Text style={styles.label}>
              {t("register.password")}
            </Text>

            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder={t(
                "register.password"
              )}
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              autoCapitalize="none"
              editable={!isLoading}
            />

            {role === "worker" && (
              <>
                <Text style={styles.label}>
                  {t("register.category")}
                </Text>

                <View
                  style={styles.categoryContainer}
                >
                  {workerCategories.map(
                    (workerCategory) => {
                      const isSelected =
                        category ===
                        workerCategory;

                      return (
                        <Pressable
                          key={workerCategory}
                          style={[
                            styles.categoryButton,

                            isSelected &&
                              styles.selectedCategoryButton,
                          ]}
                          onPress={() =>
                            setCategory(
                              workerCategory
                            )
                          }
                          disabled={isLoading}
                        >
                          <Text
                            style={[
                              styles.categoryText,

                              isSelected &&
                                styles.selectedCategoryText,
                            ]}
                          >
                            {workerCategory}
                          </Text>
                        </Pressable>
                      );
                    }
                  )}
                </View>
              </>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.registerButton,

                pressed &&
                  styles.pressedButton,

                isLoading &&
                  styles.disabledButton,
              ]}
              onPress={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator
                  color="#FFFFFF"
                />
              ) : (
                <Text
                  style={
                    styles.registerButtonText
                  }
                >
                  {t("register.button")}
                </Text>
              )}
            </Pressable>
          </View>

          <View style={styles.loginRow}>
            <Text style={styles.loginQuestion}>
              {t("register.haveAccount")}
            </Text>

            <Pressable
              onPress={() =>
                router.replace("/login")
              }
              disabled={isLoading}
            >
              <Text style={styles.loginLink}>
                {t("register.login")}
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
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 45,
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
    width: 74,
    height: 74,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginTop: 25,
    borderRadius: 37,
    backgroundColor: "#EDE9FE",
  },

  logoText: {
    fontSize: 37,
  },

  appName: {
    marginTop: 11,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    color: "#6D28D9",
  },

  title: {
    marginTop: 17,
    fontSize: 29,
    fontWeight: "800",
    textAlign: "center",
    color: "#1F2937",
  },

  subtitle: {
    maxWidth: 330,
    alignSelf: "center",
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    color: "#6B7280",
  },

  formCard: {
    padding: 20,
    marginTop: 25,
    borderWidth: 1,
    borderColor: "#DDD6FE",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
  },

  label: {
    marginTop: 8,
    marginBottom: 7,
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
  },

  roleRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 9,
  },

  roleButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 85,
    padding: 12,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },

  selectedRoleButton: {
    borderWidth: 2,
    borderColor: "#6D28D9",
    backgroundColor: "#F5F3FF",
  },

  roleIcon: {
    fontSize: 25,
  },

  roleButtonText: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
  },

  selectedRoleButtonText: {
    color: "#6D28D9",
  },

  input: {
    minHeight: 52,
    paddingHorizontal: 15,
    marginBottom: 11,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    fontSize: 15,
    color: "#111827",
  },

  categoryContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 2,
    marginBottom: 7,
  },

  categoryButton: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    marginRight: 7,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
  },

  selectedCategoryButton: {
    borderColor: "#6D28D9",
    backgroundColor: "#6D28D9",
  },

  categoryText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
  },

  selectedCategoryText: {
    color: "#FFFFFF",
  },

  registerButton: {
    minHeight: 55,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    borderRadius: 11,
    backgroundColor: "#6D28D9",
  },

  registerButtonText: {
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

  loginRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    marginTop: 22,
  },

  loginQuestion: {
    marginRight: 6,
    fontSize: 14,
    color: "#6B7280",
  },

  loginLink: {
    fontSize: 14,
    fontWeight: "800",
    color: "#6D28D9",
  },
});