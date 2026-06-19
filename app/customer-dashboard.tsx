import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Pressable,
    RefreshControl,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
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

const categories = [
  "All",
  "Electrician",
  "Plumber",
  "Carpenter",
  "Cleaner",
  "Gardener",
  "Painter",
  "Mason",
  "Other",
];

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

export default function CustomerDashboard() {
  const [fullName, setFullName] = useState("Customer");
  const [workers, setWorkers] = useState<WorkerProfile[]>([]);
  const [selectedCategory, setSelectedCategory] =
    useState("All");
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setErrorMessage("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("full_name, role")
          .eq("id", user.id)
          .single();

      if (profileError || !profile) {
        console.error("Customer profile error:", profileError);

        setErrorMessage(
          "Your customer profile could not be loaded."
        );
        return;
      }

      if (profile.role !== "customer") {
        router.replace("/worker-dashboard");
        return;
      }

      setFullName(profile.full_name || "Customer");

      const { data: workerData, error: workerError } =
        await supabase
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
          .eq("is_available", true)
          .order("is_verified", { ascending: false })
          .order("average_rating", { ascending: false });

      if (workerError) {
        console.error("Worker loading error:", workerError);

        setErrorMessage(
          "Available workers could not be loaded."
        );
        return;
      }

      setWorkers((workerData ?? []) as WorkerProfile[]);
    } catch (error) {
      console.error("Dashboard error:", error);

      setErrorMessage(
        "Something went wrong while loading the dashboard."
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const filteredWorkers = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();

    return workers.filter((worker) => {
      const matchesCategory =
        selectedCategory === "All" ||
        worker.category === selectedCategory;

      const matchesSearch =
        normalizedSearch === "" ||
        worker.full_name
          .toLowerCase()
          .includes(normalizedSearch) ||
        worker.town.toLowerCase().includes(normalizedSearch) ||
        worker.category
          .toLowerCase()
          .includes(normalizedSearch);

      return matchesCategory && matchesSearch;
    });
  }, [workers, selectedCategory, searchText]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadDashboard();
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      Alert.alert("Logout failed", error.message);
      return;
    }

    router.replace("/login");
  };

  const openWorker = (workerId: string) => {
    router.push({
      pathname: "/worker/[id]",
      params: {
        id: workerId,
      },
    });
  };

  const renderWorker = ({
    item,
  }: {
    item: WorkerProfile;
  }) => {
    const price = Number(item.base_price);
    const rating = Number(item.average_rating);

    return (
      <Pressable
        style={({ pressed }) => [
          styles.workerCard,
          pressed && styles.pressedCard,
        ]}
        onPress={() => openWorker(item.id)}
      >
        <View style={styles.workerAvatar}>
          <Text style={styles.workerAvatarText}>
            {getCategoryIcon(item.category)}
          </Text>
        </View>

        <View style={styles.workerInformation}>
          <View style={styles.workerNameRow}>
            <Text style={styles.workerName} numberOfLines={1}>
              {item.full_name}
            </Text>

            {item.is_verified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>✓</Text>
              </View>
            )}
          </View>

          <Text style={styles.workerCategory}>
            {item.category}
          </Text>

          <Text style={styles.workerLocation}>
            📍 {item.town}
          </Text>

          <View style={styles.workerFooter}>
            <Text style={styles.workerExperience}>
              {item.experience_years} years experience
            </Text>

            <Text style={styles.workerRating}>
              {rating > 0 ? `⭐ ${rating.toFixed(1)}` : "New"}
            </Text>
          </View>

          <Text style={styles.workerPrice}>
            From LKR {price.toLocaleString()}
          </Text>
        </View>

        <Text style={styles.arrow}>›</Text>
      </Pressable>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6D28D9" />

          <Text style={styles.loadingText}>
            Finding available workers...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={filteredWorkers}
        keyExtractor={(item) => item.id}
        renderItem={renderWorker}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={["#6D28D9"]}
          />
        }
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <View style={styles.greetingContainer}>
                <Text style={styles.greeting}>Hello,</Text>

                <Text style={styles.customerName}>
                  {fullName}
                </Text>
              </View>

              <Pressable
                style={styles.logoutButton}
                onPress={handleLogout}
              >
                <Text style={styles.logoutText}>Logout</Text>
              </Pressable>
            </View>

            <View style={styles.heroCard}>
              <Text style={styles.heroTitle}>
                Find the right person for the job
              </Text>

              <Text style={styles.heroText}>
                Discover available skilled workers near you.
              </Text>
            </View>

            <Pressable
                style={({ pressed }) => [
                    styles.myBookingsButton,
                    pressed && styles.pressedCard,
                ]}
                onPress={() => router.push("/my-bookings")}
                >
                <View style={styles.myBookingsInformation}>
                    <Text style={styles.myBookingsTitle}>
                    📋 My Bookings
                    </Text>

                    <Text style={styles.myBookingsText}>
                    Track requests and service status updates
                    </Text>
                </View>

                <Text style={styles.myBookingsArrow}>›</Text>
             </Pressable>

            <TextInput
              style={styles.searchInput}
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Search by worker, service or town"
              placeholderTextColor="#9CA3AF"
              autoCorrect={false}
            />

            <Text style={styles.categoryHeading}>
              Service categories
            </Text>

            <FlatList
              data={categories}
              keyExtractor={(item) => item}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryList}
              renderItem={({ item }) => (
                <Pressable
                  style={[
                    styles.categoryChip,
                    selectedCategory === item &&
                      styles.selectedCategoryChip,
                  ]}
                  onPress={() => setSelectedCategory(item)}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      selectedCategory === item &&
                        styles.selectedCategoryText,
                    ]}
                  >
                    {item}
                  </Text>
                </Pressable>
              )}
            />

            <View style={styles.resultHeader}>
              <Text style={styles.resultTitle}>
                Available workers
              </Text>

              <Text style={styles.resultCount}>
                {filteredWorkers.length} found
              </Text>
            </View>

            {errorMessage !== "" && (
              <View style={styles.errorCard}>
                <Text style={styles.errorText}>
                  {errorMessage}
                </Text>

                <Pressable onPress={handleRefresh}>
                  <Text style={styles.retryText}>Try again</Text>
                </Pressable>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          errorMessage === "" ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🔎</Text>

              <Text style={styles.emptyTitle}>
                No workers found
              </Text>

              <Text style={styles.emptyText}>
                Try another category, name or town.
              </Text>

              <Pressable
                style={styles.clearButton}
                onPress={() => {
                  setSelectedCategory("All");
                  setSearchText("");
                }}
              >
                <Text style={styles.clearButtonText}>
                  Clear Filters
                </Text>
              </Pressable>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F7F4FF",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 45,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 13,
    fontSize: 14,
    color: "#6B7280",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  greetingContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: 14,
    color: "#6B7280",
  },
  customerName: {
    marginTop: 2,
    fontSize: 25,
    fontWeight: "800",
    color: "#1F2937",
  },
  logoutButton: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "#6D28D9",
    borderRadius: 9,
  },
  logoutText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6D28D9",
  },
  heroCard: {
    padding: 21,
    marginTop: 24,
    borderRadius: 17,
    backgroundColor: "#6D28D9",
  },
  heroTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  heroText: {
    marginTop: 7,
    fontSize: 14,
    lineHeight: 20,
    color: "#EDE9FE",
  },
  searchInput: {
    minHeight: 52,
    paddingHorizontal: 16,
    marginTop: 18,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    fontSize: 15,
    color: "#111827",
  },
  categoryHeading: {
    marginTop: 21,
    marginBottom: 11,
    fontSize: 16,
    fontWeight: "800",
    color: "#1F2937",
  },
  categoryList: {
    paddingRight: 10,
  },
  categoryChip: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#C4B5FD",
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
  },
  selectedCategoryChip: {
    borderColor: "#6D28D9",
    backgroundColor: "#6D28D9",
  },
  categoryText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6D28D9",
  },
  selectedCategoryText: {
    color: "#FFFFFF",
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 24,
    marginBottom: 12,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1F2937",
  },
  resultCount: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  workerCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
  },
  pressedCard: {
    opacity: 0.75,
  },
  workerAvatar: {
    width: 57,
    height: 57,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 29,
    backgroundColor: "#EDE9FE",
  },
  workerAvatarText: {
    fontSize: 28,
  },
  workerInformation: {
    flex: 1,
    marginLeft: 13,
  },
  workerNameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  workerName: {
    flexShrink: 1,
    fontSize: 16,
    fontWeight: "800",
    color: "#1F2937",
  },
  verifiedBadge: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
    borderRadius: 10,
    backgroundColor: "#2563EB",
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  workerCategory: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: "700",
    color: "#6D28D9",
  },
  workerLocation: {
    marginTop: 4,
    fontSize: 12,
    color: "#6B7280",
  },
  workerFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  workerExperience: {
    flex: 1,
    fontSize: 11,
    color: "#6B7280",
  },
  workerRating: {
    fontSize: 11,
    fontWeight: "700",
    color: "#374151",
  },
  workerPrice: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "800",
    color: "#047857",
  },
  arrow: {
    marginLeft: 7,
    fontSize: 30,
    color: "#9CA3AF",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 45,
  },
  emptyIcon: {
    fontSize: 42,
  },
  emptyTitle: {
    marginTop: 13,
    fontSize: 19,
    fontWeight: "800",
    color: "#1F2937",
  },
  emptyText: {
    marginTop: 6,
    fontSize: 14,
    color: "#6B7280",
  },
  clearButton: {
    paddingHorizontal: 21,
    paddingVertical: 11,
    marginTop: 17,
    borderRadius: 10,
    backgroundColor: "#6D28D9",
  },
  clearButtonText: {
    fontWeight: "800",
    color: "#FFFFFF",
  },
  errorCard: {
    padding: 15,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: 11,
    backgroundColor: "#FEF2F2",
  },
  errorText: {
    fontSize: 13,
    color: "#B91C1C",
  },
  retryText: {
    marginTop: 7,
    fontWeight: "800",
    color: "#6D28D9",
  },
  myBookingsButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginTop: 13,
    borderWidth: 1,
    borderColor: "#C4B5FD",
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
  },
  myBookingsInformation: {
    flex: 1,
  },
  myBookingsTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#6D28D9",
  },
  myBookingsText: {
    marginTop: 4,
    fontSize: 12,
    color: "#6B7280",
  },
  myBookingsArrow: {
    marginLeft: 10,
    fontSize: 29,
    color: "#6D28D9",
  },
});