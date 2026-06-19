import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { supabase } from "@/lib/supabase";

type WorkerProfile = {
  id: string;
  full_name: string;
  town: string;
  category: string;
  description: string;
  experience_years: number;
  base_price: number;
  is_verified: boolean;
  is_available: boolean;
  average_rating: number;
};

const getCategoryIcon = (category: string) => {
  switch (category) {
    case "Electrician":
      return "⚡";
    case "Plumber":
      return "🔧";
    case "Carpenter":
      return "🪚";
    case "Cleaner":
      return "🧹";
    case "Gardener":
      return "🌿";
    case "Painter":
      return "🎨";
    case "Mason":
      return "🧱";
    default:
      return "🛠️";
  }
};

export default function WorkerDetailsScreen() {
  const { id } = useLocalSearchParams<{
    id: string | string[];
  }>();

  const workerId = Array.isArray(id) ? id[0] : id;

  const [worker, setWorker] = useState<WorkerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadWorker();
  }, [workerId]);

  const loadWorker = async () => {
    if (!workerId) {
      setErrorMessage("Worker ID is missing.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("worker_profiles")
      .select(
        `
          id,
          full_name,
          town,
          category,
          description,
          experience_years,
          base_price,
          is_verified,
          is_available,
          average_rating
        `
      )
      .eq("id", workerId)
      .single();

    if (error || !data) {
      console.error("Worker details error:", error);

      setErrorMessage(
        error?.message ?? "The worker profile could not be loaded."
      );
      setWorker(null);
      setIsLoading(false);
      return;
    }

    setWorker(data as WorkerProfile);
    setIsLoading(false);
  };

  const handleRequestService = () => {
    if (!worker) {
      return;
    }

    Alert.alert(
      "Worker selected",
      `${worker.full_name} has been selected. The booking form will be added in the next stage.`
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#6D28D9" />
          <Text style={styles.loadingText}>
            Loading worker profile...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (errorMessage || !worker) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>

          <Text style={styles.errorTitle}>
            Worker profile unavailable
          </Text>

          <Text style={styles.errorText}>{errorMessage}</Text>

          <Pressable style={styles.retryButton} onPress={loadWorker}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </Pressable>

          <Pressable
            style={styles.backLink}
            onPress={() => router.back()}
          >
            <Text style={styles.backLinkText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const rating = Number(worker.average_rating);
  const price = Number(worker.base_price);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          style={styles.topBackButton}
          onPress={() => router.back()}
        >
          <Text style={styles.topBackText}>← Back to workers</Text>
        </Pressable>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarIcon}>
              {getCategoryIcon(worker.category)}
            </Text>
          </View>

          <View style={styles.nameRow}>
            <Text style={styles.name}>{worker.full_name}</Text>

            {worker.is_verified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>✓ Verified</Text>
              </View>
            )}
          </View>

          <Text style={styles.category}>{worker.category}</Text>

          <Text style={styles.location}>📍 {worker.town}</Text>

          <View
            style={[
              styles.availabilityBadge,
              !worker.is_available &&
                styles.unavailableBadge,
            ]}
          >
            <Text
              style={[
                styles.availabilityText,
                !worker.is_available &&
                  styles.unavailableText,
              ]}
            >
              {worker.is_available
                ? "Available for work"
                : "Currently unavailable"}
            </Text>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>
              {worker.experience_years}
            </Text>
            <Text style={styles.summaryLabel}>
              Years Experience
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>
              {rating > 0 ? rating.toFixed(1) : "New"}
            </Text>
            <Text style={styles.summaryLabel}>Rating</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>About this worker</Text>

          <Text style={styles.description}>
            {worker.description ||
              "No service description has been provided."}
          </Text>
        </View>

        <View style={styles.priceCard}>
          <View>
            <Text style={styles.priceLabel}>
              Starting service price
            </Text>

            <Text style={styles.price}>
              LKR {price.toLocaleString()}
            </Text>
          </View>

          <Text style={styles.priceNote}>
            Final price may depend on the work required.
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.bookingButton,
            pressed && styles.pressedButton,
            !worker.is_available &&
              styles.disabledButton,
          ]}
          onPress={handleRequestService}
          disabled={!worker.is_available}
        >
          <Text style={styles.bookingButtonText}>
            {worker.is_available
              ? "Request This Worker"
              : "Worker Unavailable"}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F7F4FF",
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 45,
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
  topBackButton: {
    alignSelf: "flex-start",
    paddingVertical: 10,
    marginBottom: 15,
  },
  topBackText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#6D28D9",
  },
  profileCard: {
    alignItems: "center",
    padding: 25,
    borderWidth: 1,
    borderColor: "#DDD6FE",
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
  },
  avatar: {
    width: 92,
    height: 92,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
    borderRadius: 46,
    backgroundColor: "#EDE9FE",
  },
  avatarIcon: {
    fontSize: 44,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  name: {
    fontSize: 25,
    fontWeight: "800",
    textAlign: "center",
    color: "#1F2937",
  },
  verifiedBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: "#DBEAFE",
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#1D4ED8",
  },
  category: {
    marginTop: 7,
    fontSize: 16,
    fontWeight: "700",
    color: "#6D28D9",
  },
  location: {
    marginTop: 7,
    fontSize: 14,
    color: "#6B7280",
  },
  availabilityBadge: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    marginTop: 14,
    borderRadius: 20,
    backgroundColor: "#D1FAE5",
  },
  availabilityText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#047857",
  },
  unavailableBadge: {
    backgroundColor: "#FEE2E2",
  },
  unavailableText: {
    color: "#B91C1C",
  },
  summaryRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 17,
  },
  summaryCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 19,
    borderWidth: 1,
    borderColor: "#DDD6FE",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#6D28D9",
  },
  summaryLabel: {
    marginTop: 5,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    color: "#6B7280",
  },
  infoCard: {
    padding: 20,
    marginTop: 17,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
  },
  sectionTitle: {
    marginBottom: 10,
    fontSize: 18,
    fontWeight: "800",
    color: "#1F2937",
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    color: "#4B5563",
  },
  priceCard: {
    padding: 20,
    marginTop: 17,
    borderWidth: 1,
    borderColor: "#C4B5FD",
    borderRadius: 15,
    backgroundColor: "#EDE9FE",
  },
  priceLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  price: {
    marginTop: 5,
    fontSize: 25,
    fontWeight: "800",
    color: "#6D28D9",
  },
  priceNote: {
    marginTop: 8,
    fontSize: 12,
    color: "#6B7280",
  },
  bookingButton: {
    minHeight: 55,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    borderRadius: 13,
    backgroundColor: "#6D28D9",
  },
  bookingButtonText: {
    fontSize: 17,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  pressedButton: {
    opacity: 0.8,
  },
  disabledButton: {
    backgroundColor: "#9CA3AF",
  },
  errorIcon: {
    fontSize: 45,
  },
  errorTitle: {
    marginTop: 14,
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
    paddingHorizontal: 25,
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