import { router, useFocusEffect } from "expo-router";
import {
    useCallback,
    useState,
} from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View,
} from "react-native";

import { supabase } from "@/lib/supabase";

type UserRole = "customer" | "worker" | "admin";

type ProfileRecord = {
  full_name: string;
  phone: string | null;
  town: string | null;
  role: UserRole;
};

type WorkerRecord = {
  description: string;
  experience_years: number;
  base_price: number;
  is_available: boolean;
  is_verified: boolean;
  average_rating: number;
};

export default function ProfileScreen() {
  const [role, setRole] =
    useState<UserRole>("customer");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [town, setTown] = useState("");

  const [description, setDescription] =
    useState("");

  const [experienceYears, setExperienceYears] =
    useState("");

  const [basePrice, setBasePrice] = useState("");

  const [isAvailable, setIsAvailable] =
    useState(true);

  const [isVerified, setIsVerified] =
    useState(false);

  const [averageRating, setAverageRating] =
    useState(0);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      const {
        data: profileData,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select(
          "full_name, phone, town, role"
        )
        .eq("id", user.id)
        .single();

      if (profileError || !profileData) {
        console.error(
          "Profile loading error:",
          profileError
        );

        setErrorMessage(
          "Your profile could not be loaded."
        );

        return;
      }

      const profile =
        profileData as ProfileRecord;

      setRole(profile.role);
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
      setTown(profile.town || "");

      if (profile.role === "worker") {
        const {
          data: workerData,
          error: workerError,
        } = await supabase
          .from("worker_profiles")
          .select(
            `
              description,
              experience_years,
              base_price,
              is_available,
              is_verified,
              average_rating
            `
          )
          .eq("id", user.id)
          .single();

        if (workerError || !workerData) {
          console.error(
            "Worker profile loading error:",
            workerError
          );

          setErrorMessage(
            "Your worker information could not be loaded."
          );

          return;
        }

        const worker =
          workerData as WorkerRecord;

        setDescription(
          worker.description || ""
        );

        setExperienceYears(
          String(worker.experience_years)
        );

        setBasePrice(
          String(worker.base_price)
        );

        setIsAvailable(
          worker.is_available
        );

        setIsVerified(
          worker.is_verified
        );

        setAverageRating(
          Number(worker.average_rating)
        );
      }
    } catch (error) {
      console.error(
        "Unexpected profile error:",
        error
      );

      setErrorMessage(
        "Something went wrong while loading your profile."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const validateProfile = () => {
    if (!fullName.trim()) {
      Alert.alert(
        "Full name required",
        "Please enter your full name."
      );

      return false;
    }

    if (!town.trim()) {
      Alert.alert(
        "Town required",
        "Please enter your town."
      );

      return false;
    }

    if (role === "worker") {
      const experience =
        Number(experienceYears);

      const price = Number(basePrice);

      if (!description.trim()) {
        Alert.alert(
          "Description required",
          "Please describe your skills and services."
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

  const handleSave = async () => {
    if (!validateProfile()) {
      return;
    }

    setIsSaving(true);

    try {
      const isWorker = role === "worker";

    const { data, error } = await supabase.rpc(
    "save_my_profile_v2",
    {
        p_full_name: fullName.trim(),
        p_phone: phone.trim(),
        p_town: town.trim(),

        p_description: isWorker
        ? description.trim()
        : null,

        p_experience_years: isWorker
        ? Number(experienceYears)
        : null,

        p_base_price: isWorker
        ? Number(basePrice)
        : null,

        p_is_available: isWorker
        ? isAvailable
        : null,
    }
    );

    console.log("Profile save response:", {
    data,
    error,
    });

    if (error) {
    console.error("Profile update error:", error);

    Alert.alert(
        "Profile update failed",
        `${error.message}${
        error.details ? `\n\n${error.details}` : ""
        }`
    );

    return;
    }

    if (!data?.success) {
    Alert.alert(
        "Profile update failed",
        "Supabase did not confirm the update."
    );

    return;
    }

    Alert.alert(
    "Profile updated",
    `Saved successfully.\nMain profile rows: ${
        data.profiles_updated
    }\nWorker profile rows: ${
        data.worker_profiles_updated
    }`
    );

await loadProfile();



      Alert.alert(
        "Profile updated",
        "Your FixMate profile was saved successfully."
      );

      await loadProfile();
    } catch (error) {
      console.error(
        "Unexpected profile update error:",
        error
      );

      Alert.alert(
        "Unexpected error",
        "Something went wrong while saving your profile."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const goBack = () => {
    router.back();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <ActivityIndicator
            size="large"
            color="#6D28D9"
          />

          <Text style={styles.loadingText}>
            Loading your profile...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (errorMessage !== "") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorIcon}>
            ⚠️
          </Text>

          <Text style={styles.errorTitle}>
            Profile unavailable
          </Text>

          <Text style={styles.errorText}>
            {errorMessage}
          </Text>

          <Pressable
            style={styles.retryButton}
            onPress={loadProfile}
          >
            <Text style={styles.retryButtonText}>
              Try Again
            </Text>
          </Pressable>

          <Pressable
            style={styles.backLink}
            onPress={goBack}
          >
            <Text style={styles.backLinkText}>
              Go Back
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

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
          <Pressable
            style={styles.backButton}
            onPress={goBack}
          >
            <Text style={styles.backText}>
              ← Back to Dashboard
            </Text>
          </Pressable>

          <Text style={styles.title}>
            My Profile
          </Text>

          <Text style={styles.subtitle}>
            Manage your FixMate account information.
          </Text>

          <View style={styles.roleCard}>
            <Text style={styles.roleIcon}>
              {role === "worker"
                ? "🛠️"
                : "👤"}
            </Text>

            <View style={styles.roleInformation}>
              <Text style={styles.roleLabel}>
                Account type
              </Text>

              <Text style={styles.roleValue}>
                {role === "worker"
                  ? "Skilled Worker"
                  : "Customer"}
              </Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>
            Personal Information
          </Text>

          <Text style={styles.label}>
            Full name *
          </Text>

          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Enter your full name"
            autoCapitalize="words"
          />

          <Text style={styles.label}>
            Phone number
          </Text>

          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="Enter your phone number"
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>
            Town *
          </Text>

          <TextInput
            style={styles.input}
            value={town}
            onChangeText={setTown}
            placeholder="Enter your town"
            autoCapitalize="words"
          />

          {role === "worker" && (
            <>
              <Text style={styles.sectionTitle}>
                Service Information
              </Text>

              <Text style={styles.label}>
                Service description *
              </Text>

              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                ]}
                value={description}
                onChangeText={setDescription}
                placeholder="Describe your skills and services"
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                maxLength={500}
              />

              <Text style={styles.characterCount}>
                {description.length}/500
              </Text>

              <Text style={styles.label}>
                Years of experience *
              </Text>

              <TextInput
                style={styles.input}
                value={experienceYears}
                onChangeText={setExperienceYears}
                placeholder="Example: 4"
                keyboardType="number-pad"
              />

              <Text style={styles.label}>
                Starting price (LKR) *
              </Text>

              <TextInput
                style={styles.input}
                value={basePrice}
                onChangeText={setBasePrice}
                placeholder="Example: 2500"
                keyboardType="decimal-pad"
              />

              <View style={styles.availabilityCard}>
                <View
                  style={
                    styles.availabilityInformation
                  }
                >
                  <Text
                    style={
                      styles.availabilityTitle
                    }
                  >
                    Available for bookings
                  </Text>

                  <Text
                    style={
                      styles.availabilityText
                    }
                  >
                    Turn this off when you are not
                    accepting new work.
                  </Text>
                </View>

                <Switch
                  value={isAvailable}
                  onValueChange={setIsAvailable}
                  trackColor={{
                    false: "#D1D5DB",
                    true: "#C4B5FD",
                  }}
                  thumbColor={
                    isAvailable
                      ? "#6D28D9"
                      : "#9CA3AF"
                  }
                />
              </View>

              <View style={styles.statusSummary}>
                <View style={styles.statusItem}>
                  <Text style={styles.statusLabel}>
                    Verification
                  </Text>

                  <Text
                    style={[
                      styles.statusValue,
                      isVerified
                        ? styles.verifiedValue
                        : styles.unverifiedValue,
                    ]}
                  >
                    {isVerified
                      ? "Verified"
                      : "Not Verified"}
                  </Text>
                </View>

                <View style={styles.statusItem}>
                  <Text style={styles.statusLabel}>
                    Rating
                  </Text>

                  <Text style={styles.ratingValue}>
                    {averageRating > 0
                      ? `⭐ ${averageRating.toFixed(
                          1
                        )}`
                      : "New"}
                  </Text>
                </View>
              </View>

              <Text style={styles.statusNote}>
                Verification and ratings cannot be edited
                by workers.
              </Text>
            </>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.saveButton,
              pressed &&
                styles.pressedButton,
              isSaving &&
                styles.disabledButton,
            ]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator
                color="#FFFFFF"
              />
            ) : (
              <Text
                style={styles.saveButtonText}
              >
                Save Profile
              </Text>
            )}
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
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 50,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 14,
    color: "#6B7280",
  },
  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 10,
  },
  backText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#6D28D9",
  },
  title: {
    marginTop: 10,
    fontSize: 31,
    fontWeight: "800",
    color: "#1F2937",
  },
  subtitle: {
    marginTop: 7,
    fontSize: 14,
    lineHeight: 21,
    color: "#6B7280",
  },
  roleCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 17,
    marginTop: 22,
    borderWidth: 1,
    borderColor: "#DDD6FE",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
  },
  roleIcon: {
    fontSize: 32,
  },
  roleInformation: {
    marginLeft: 13,
  },
  roleLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  roleValue: {
    marginTop: 3,
    fontSize: 16,
    fontWeight: "800",
    color: "#6D28D9",
  },
  sectionTitle: {
    marginTop: 27,
    marginBottom: 3,
    fontSize: 19,
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
    minHeight: 52,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    fontSize: 15,
    color: "#111827",
  },
  textArea: {
    minHeight: 125,
    paddingTop: 14,
  },
  characterCount: {
    marginTop: 5,
    fontSize: 11,
    textAlign: "right",
    color: "#9CA3AF",
  },
  availabilityCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 17,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#C4B5FD",
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
  },
  availabilityInformation: {
    flex: 1,
    paddingRight: 12,
  },
  availabilityTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1F2937",
  },
  availabilityText: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: "#6B7280",
  },
  statusSummary: {
    flexDirection: "row",
    gap: 10,
    marginTop: 15,
  },
  statusItem: {
    flex: 1,
    padding: 15,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },
  statusLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  statusValue: {
    marginTop: 5,
    fontSize: 14,
    fontWeight: "800",
  },
  verifiedValue: {
    color: "#047857",
  },
  unverifiedValue: {
    color: "#B45309",
  },
  ratingValue: {
    marginTop: 5,
    fontSize: 14,
    fontWeight: "800",
    color: "#1F2937",
  },
  statusNote: {
    marginTop: 9,
    fontSize: 11,
    fontStyle: "italic",
    color: "#6B7280",
  },
  saveButton: {
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 28,
    borderRadius: 13,
    backgroundColor: "#6D28D9",
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  pressedButton: {
    opacity: 0.8,
  },
  disabledButton: {
    opacity: 0.55,
  },
  errorIcon: {
    fontSize: 44,
  },
  errorTitle: {
    marginTop: 13,
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    color: "#1F2937",
  },
  errorText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    color: "#6B7280",
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 13,
    marginTop: 20,
    borderRadius: 10,
    backgroundColor: "#6D28D9",
  },
  retryButtonText: {
    fontWeight: "800",
    color: "#FFFFFF",
  },
  backLink: {
    padding: 15,
  },
  backLinkText: {
    fontWeight: "700",
    color: "#6D28D9",
  },
});