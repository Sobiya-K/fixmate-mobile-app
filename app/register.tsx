import { router } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

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
  const [role, setRole] = useState<UserRole>("customer");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [town, setTown] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [category, setCategory] = useState("Electrician");
  const [description, setDescription] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [basePrice, setBasePrice] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    if (
      !fullName.trim() ||
      !phone.trim() ||
      !town.trim() ||
      !email.trim() ||
      !password.trim() ||
      !confirmPassword.trim()
    ) {
      Alert.alert(
        "Missing information",
        "Please complete all required fields."
      );

      return false;
    }

    if (!email.includes("@")) {
      Alert.alert(
        "Invalid email",
        "Please enter a valid email address."
      );

      return false;
    }

    if (password.length < 6) {
      Alert.alert(
        "Weak password",
        "Password must contain at least 6 characters."
      );

      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert(
        "Passwords do not match",
        "Please enter the same password twice."
      );

      return false;
    }

    if (role === "worker") {
      const experience = Number(experienceYears);
      const price = Number(basePrice);

      if (!description.trim()) {
        Alert.alert(
          "Missing description",
          "Please provide a short description of your services."
        );

        return false;
      }

      if (
        experienceYears.trim() === "" ||
        Number.isNaN(experience) ||
        experience < 0
      ) {
        Alert.alert(
          "Invalid experience",
          "Enter valid years of experience."
        );

        return false;
      }

      if (
        basePrice.trim() === "" ||
        Number.isNaN(price) ||
        price < 0
      ) {
        Alert.alert(
          "Invalid price",
          "Enter a valid starting price."
        );

        return false;
      }
    }

    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const metadata =
        role === "worker"
          ? {
              full_name: fullName.trim(),
              phone: phone.trim(),
              town: town.trim(),
              role,
              category,
              description: description.trim(),
              experience_years: experienceYears.trim(),
              base_price: basePrice.trim(),
            }
          : {
              full_name: fullName.trim(),
              phone: phone.trim(),
              town: town.trim(),
              role,
            };

      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: metadata,
        },
      });

      if (error) {
        Alert.alert("Registration failed", error.message);
        return;
      }

      if (!data.session) {
        Alert.alert(
          "Check your email",
          "Your account was created. Confirm your email and then log in.",
          [
            {
              text: "Go to Login",
              onPress: () => router.replace("/login"),
            },
          ]
        );

        return;
      }

      Alert.alert(
        "Account created",
        role === "customer"
          ? "Your customer account was created successfully."
          : "Your worker account was created successfully.",
        [
          {
            text: "Continue",
            onPress: () =>
              router.replace(
                role === "customer"
                  ? "/customer-dashboard"
                  : "/worker-dashboard"
              ),
          },
        ]
      );
    } catch (error) {
      console.error("Registration error:", error);

      Alert.alert(
        "Unexpected error",
        "Something went wrong. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>

        <Text style={styles.title}>Create Account</Text>

        <Text style={styles.subtitle}>
          Join FixMate as a customer or skilled worker
        </Text>

        <Text style={styles.label}>Select account type</Text>

        <View style={styles.roleRow}>
          <Pressable
            style={[
              styles.roleButton,
              role === "customer" && styles.selectedRoleButton,
            ]}
            onPress={() => setRole("customer")}
          >
            <Text
              style={[
                styles.roleButtonText,
                role === "customer" &&
                  styles.selectedRoleButtonText,
              ]}
            >
              👤 Customer
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.roleButton,
              role === "worker" && styles.selectedRoleButton,
            ]}
            onPress={() => setRole("worker")}
          >
            <Text
              style={[
                styles.roleButtonText,
                role === "worker" &&
                  styles.selectedRoleButtonText,
              ]}
            >
              🛠️ Worker
            </Text>
          </Pressable>
        </View>

        <Text style={styles.label}>Full name *</Text>
        <TextInput
          style={styles.input}
          value={fullName}
          onChangeText={setFullName}
          placeholder="Enter your full name"
          autoCapitalize="words"
        />

        <Text style={styles.label}>Phone number *</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="Enter your phone number"
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>Town *</Text>
        <TextInput
          style={styles.input}
          value={town}
          onChangeText={setTown}
          placeholder="Example: Kelaniya"
          autoCapitalize="words"
        />

        {role === "worker" && (
          <>
            <Text style={styles.sectionTitle}>
              Worker Information
            </Text>

            <Text style={styles.label}>Service category *</Text>

            <View style={styles.categoryContainer}>
              {workerCategories.map((item) => (
                <Pressable
                  key={item}
                  style={[
                    styles.categoryButton,
                    category === item &&
                      styles.selectedCategoryButton,
                  ]}
                  onPress={() => setCategory(item)}
                >
                  <Text
                    style={[
                      styles.categoryButtonText,
                      category === item &&
                        styles.selectedCategoryText,
                    ]}
                  >
                    {item}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>
              Service description *
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe your skills and services"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <Text style={styles.label}>
              Years of experience *
            </Text>
            <TextInput
              style={styles.input}
              value={experienceYears}
              onChangeText={setExperienceYears}
              placeholder="Example: 3"
              keyboardType="number-pad"
            />

            <Text style={styles.label}>
              Starting service price (LKR) *
            </Text>
            <TextInput
              style={styles.input}
              value={basePrice}
              onChangeText={setBasePrice}
              placeholder="Example: 2500"
              keyboardType="decimal-pad"
            />
          </>
        )}

        <Text style={styles.sectionTitle}>Login Information</Text>

        <Text style={styles.label}>Email *</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="Enter your email"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.label}>Password *</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Minimum 6 characters"
          secureTextEntry
          autoCapitalize="none"
        />

        <Text style={styles.label}>Confirm password *</Text>
        <TextInput
          style={styles.input}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Enter your password again"
          secureTextEntry
          autoCapitalize="none"
        />

        <Pressable
          style={({ pressed }) => [
            styles.registerButton,
            pressed && styles.pressedButton,
            isLoading && styles.disabledButton,
          ]}
          onPress={handleRegister}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.registerButtonText}>
              Create {role === "customer" ? "Customer" : "Worker"}{" "}
              Account
            </Text>
          )}
        </Pressable>

        <Pressable
          style={styles.loginLink}
          onPress={() => router.replace("/login")}
        >
          <Text style={styles.loginLinkText}>
            Already registered?{" "}
            <Text style={styles.loginLinkStrong}>Log in</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F7F4FF",
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 55,
    paddingBottom: 50,
  },
  backText: {
    marginBottom: 22,
    fontSize: 16,
    fontWeight: "600",
    color: "#6D28D9",
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#1F2937",
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 26,
    fontSize: 15,
    lineHeight: 22,
    color: "#6B7280",
  },
  sectionTitle: {
    marginTop: 25,
    marginBottom: 6,
    fontSize: 20,
    fontWeight: "800",
    color: "#6D28D9",
  },
  label: {
    marginTop: 15,
    marginBottom: 7,
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
  },
  input: {
    width: "100%",
    minHeight: 51,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    fontSize: 15,
    color: "#111827",
  },
  textArea: {
    minHeight: 105,
    paddingTop: 14,
  },
  roleRow: {
    flexDirection: "row",
    gap: 10,
  },
  roleButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#C4B5FD",
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
  },
  selectedRoleButton: {
    borderColor: "#6D28D9",
    backgroundColor: "#6D28D9",
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6D28D9",
  },
  selectedRoleButtonText: {
    color: "#FFFFFF",
  },
  categoryContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "#C4B5FD",
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
  },
  selectedCategoryButton: {
    borderColor: "#6D28D9",
    backgroundColor: "#EDE9FE",
  },
  categoryButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  selectedCategoryText: {
    color: "#6D28D9",
  },
  registerButton: {
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 30,
    borderRadius: 12,
    backgroundColor: "#6D28D9",
  },
  registerButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  pressedButton: {
    opacity: 0.75,
  },
  disabledButton: {
    opacity: 0.6,
  },
  loginLink: {
    alignItems: "center",
    paddingVertical: 20,
  },
  loginLinkText: {
    fontSize: 14,
    color: "#6B7280",
  },
  loginLinkStrong: {
    fontWeight: "800",
    color: "#6D28D9",
  },
});