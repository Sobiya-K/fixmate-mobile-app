import {
    router,
    useFocusEffect,
} from "expo-router";
  
  import {
    useCallback,
    useMemo,
    useState,
} from "react";
  
  import {
    ActivityIndicator,
    Alert,
    Pressable,
    RefreshControl,
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
  
  type WorkerProfile = {
    id: string;
    full_name: string;
    town: string;
    category: string;
    description: string;
    experience_years: number;
    base_price: number | string;
    is_verified: boolean;
    is_available: boolean;
    average_rating: number | string;
  };
  
  export default function CustomerDashboard() {
    const [customerName, setCustomerName] =
      useState("Customer");
  
    const [workers, setWorkers] = useState<
      WorkerProfile[]
    >([]);
  
    const [searchText, setSearchText] =
      useState("");
  
    const [selectedCategory, setSelectedCategory] =
      useState("All");
  
    const [isLoading, setIsLoading] =
      useState(true);
  
    const [isRefreshing, setIsRefreshing] =
      useState(false);
  
    const [errorMessage, setErrorMessage] =
      useState("");
  
    const routeUserByRole = useCallback(
      (role: UserRole) => {
        if (role === "worker") {
          router.replace("/worker-dashboard");
          return;
        }
  
        if (role === "admin") {
          router.replace("/admin-dashboard");
        }
      },
      []
    );
  
    const loadDashboard = useCallback(
      async (refreshing = false) => {
        if (refreshing) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }
  
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
            .select("full_name, role")
            .eq("id", user.id)
            .single();
  
          if (profileError || !profileData) {
            console.error(
              "Customer profile loading error:",
              profileError
            );
  
            setErrorMessage(
              "Your account information could not be loaded."
            );
  
            return;
          }
  
          const role =
            profileData.role as UserRole;
  
          console.log(
            "Customer dashboard detected role:",
            role
          );
  
          if (role !== "customer") {
            routeUserByRole(role);
            return;
          }
  
          setCustomerName(
            profileData.full_name || "Customer"
          );
  
          const {
            data: workerData,
            error: workerError,
          } = await supabase
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
            .order("is_verified", {
              ascending: false,
            })
            .order("average_rating", {
              ascending: false,
            });
  
          if (workerError) {
            console.error(
              "Available worker loading error:",
              workerError
            );
  
            setErrorMessage(
              "Available workers could not be loaded."
            );
  
            return;
          }
  
          setWorkers(
            (workerData ?? []) as WorkerProfile[]
          );
        } catch (error) {
          console.error(
            "Unexpected customer dashboard error:",
            error
          );
  
          setErrorMessage(
            "Something went wrong while loading the customer dashboard."
          );
        } finally {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      },
      [routeUserByRole]
    );
  
    useFocusEffect(
      useCallback(() => {
        loadDashboard();
      }, [loadDashboard])
    );
  
    const categories = useMemo(() => {
      const categoryValues = workers
        .map((worker) => worker.category)
        .filter(
          (category, index, list) =>
            list.indexOf(category) === index
        );
  
      return ["All", ...categoryValues];
    }, [workers]);
  
    const filteredWorkers = useMemo(() => {
      const cleanedSearch =
        searchText.trim().toLowerCase();
  
      return workers.filter((worker) => {
        const matchesCategory =
          selectedCategory === "All" ||
          worker.category === selectedCategory;
  
        const matchesSearch =
          cleanedSearch === "" ||
          worker.full_name
            .toLowerCase()
            .includes(cleanedSearch) ||
          worker.town
            .toLowerCase()
            .includes(cleanedSearch) ||
          worker.category
            .toLowerCase()
            .includes(cleanedSearch) ||
          worker.description
            .toLowerCase()
            .includes(cleanedSearch);
  
        return matchesCategory && matchesSearch;
      });
    }, [
      workers,
      searchText,
      selectedCategory,
    ]);
  
    const handleLogout = async () => {
      const { error } =
        await supabase.auth.signOut();
  
      if (error) {
        Alert.alert(
          "Logout failed",
          error.message
        );
  
        return;
      }
  
      router.replace("/login");
    };
  
    const openWorker = (
      workerId: string
    ) => {
      router.push({
        pathname: "/worker/[id]",
        params: {
          id: workerId,
        },
      });
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
              Finding available workers...
            </Text>
          </View>
        </SafeAreaView>
      );
    }
  
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() =>
                loadDashboard(true)
              }
              colors={["#6D28D9"]}
            />
          }
        >
          <View style={styles.header}>
            <View style={styles.headerInformation}>
              <Text style={styles.greeting}>
                Welcome,
              </Text>
  
              <Text style={styles.customerName}>
                {customerName}
              </Text>
            </View>
  
            <View style={styles.headerActions}>
              <Pressable
                style={styles.profileButton}
                onPress={() =>
                  router.push("/profile")
                }
              >
                <Text
                  style={
                    styles.profileButtonText
                  }
                >
                  Profile
                </Text>
              </Pressable>
  
              <Pressable
                style={styles.logoutButton}
                onPress={handleLogout}
              >
                <Text style={styles.logoutText}>
                  Logout
                </Text>
              </Pressable>
            </View>
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
            style={styles.myBookingsButton}
            onPress={() =>
              router.push("/my-bookings")
            }
          >
            <View
              style={
                styles.myBookingsInformation
              }
            >
              <Text
                style={styles.myBookingsTitle}
              >
                📋 My Bookings
              </Text>
  
              <Text
                style={styles.myBookingsText}
              >
                Track requests and service status updates
              </Text>
            </View>
  
            <Text
              style={styles.myBookingsArrow}
            >
              ›
            </Text>
          </Pressable>
  
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search by worker, category or town"
            placeholderTextColor="#9CA3AF"
          />
  
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={
              styles.categoryContainer
            }
          >
            {categories.map((category) => {
              const isSelected =
                selectedCategory === category;
  
              return (
                <Pressable
                  key={category}
                  style={[
                    styles.categoryButton,
                    isSelected &&
                      styles.selectedCategoryButton,
                  ]}
                  onPress={() =>
                    setSelectedCategory(category)
                  }
                >
                  <Text
                    style={[
                      styles.categoryText,
                      isSelected &&
                        styles.selectedCategoryText,
                    ]}
                  >
                    {category}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
  
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Available Workers
            </Text>
  
            <Text style={styles.workerCount}>
              {filteredWorkers.length}
            </Text>
          </View>
  
          {errorMessage !== "" && (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>
                {errorMessage}
              </Text>
  
              <Pressable
                onPress={() =>
                  loadDashboard(true)
                }
              >
                <Text style={styles.retryText}>
                  Try again
                </Text>
              </Pressable>
            </View>
          )}
  
          {filteredWorkers.length === 0 &&
          errorMessage === "" ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>
                🔍
              </Text>
  
              <Text style={styles.emptyTitle}>
                No workers found
              </Text>
  
              <Text style={styles.emptyText}>
                Try another search or category.
              </Text>
            </View>
          ) : (
            filteredWorkers.map((worker) => {
              const price = Number(
                worker.base_price
              );
  
              const rating = Number(
                worker.average_rating
              );
  
              return (
                <Pressable
                  key={worker.id}
                  style={styles.workerCard}
                  onPress={() =>
                    openWorker(worker.id)
                  }
                >
                  <View style={styles.workerTopRow}>
                    <View
                      style={styles.workerAvatar}
                    >
                      <Text
                        style={
                          styles.workerAvatarText
                        }
                      >
                        🛠️
                      </Text>
                    </View>
  
                    <View
                      style={
                        styles.workerInformation
                      }
                    >
                      <View
                        style={styles.workerNameRow}
                      >
                        <Text
                          style={styles.workerName}
                        >
                          {worker.full_name}
                        </Text>
  
                        {worker.is_verified && (
                          <Text
                            style={
                              styles.verifiedBadge
                            }
                          >
                            ✓ Verified
                          </Text>
                        )}
                      </View>
  
                      <Text
                        style={
                          styles.workerCategory
                        }
                      >
                        {worker.category}
                      </Text>
  
                      <Text
                        style={styles.workerTown}
                      >
                        📍 {worker.town}
                      </Text>
                    </View>
                  </View>
  
                  <Text
                    style={styles.description}
                    numberOfLines={2}
                  >
                    {worker.description ||
                      "No service description provided."}
                  </Text>
  
                  <View style={styles.workerBottomRow}>
                    <View>
                      <Text style={styles.smallLabel}>
                        Experience
                      </Text>
  
                      <Text
                        style={styles.smallValue}
                      >
                        {worker.experience_years} years
                      </Text>
                    </View>
  
                    <View>
                      <Text style={styles.smallLabel}>
                        Rating
                      </Text>
  
                      <Text
                        style={styles.smallValue}
                      >
                        {rating > 0
                          ? `⭐ ${rating.toFixed(1)}`
                          : "New"}
                      </Text>
                    </View>
  
                    <View>
                      <Text style={styles.smallLabel}>
                        From
                      </Text>
  
                      <Text style={styles.priceValue}>
                        LKR {price.toLocaleString()}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            })
          )}
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
      paddingHorizontal: 20,
      paddingTop: 22,
      paddingBottom: 50,
    },
  
    centerContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
  
    loadingText: {
      marginTop: 14,
      color: "#6B7280",
    },
  
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
  
    headerInformation: {
      flex: 1,
    },
  
    greeting: {
      fontSize: 14,
      color: "#6B7280",
    },
  
    customerName: {
      marginTop: 2,
      fontSize: 24,
      fontWeight: "800",
      color: "#1F2937",
    },
  
    headerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
  
    profileButton: {
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 9,
      backgroundColor: "#EDE9FE",
    },
  
    profileButtonText: {
      fontSize: 12,
      fontWeight: "700",
      color: "#6D28D9",
    },
  
    logoutButton: {
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderWidth: 1,
      borderColor: "#6D28D9",
      borderRadius: 9,
    },
  
    logoutText: {
      fontSize: 12,
      fontWeight: "700",
      color: "#6D28D9",
    },
  
    heroCard: {
      padding: 21,
      marginTop: 23,
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
      fontSize: 13,
      lineHeight: 19,
      color: "#EDE9FE",
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
  
    searchInput: {
      minHeight: 52,
      paddingHorizontal: 15,
      marginTop: 19,
      borderWidth: 1,
      borderColor: "#D1D5DB",
      borderRadius: 12,
      backgroundColor: "#FFFFFF",
      fontSize: 14,
      color: "#111827",
    },
  
    categoryContainer: {
      paddingVertical: 15,
    },
  
    categoryButton: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      marginRight: 8,
      borderWidth: 1,
      borderColor: "#DDD6FE",
      borderRadius: 20,
      backgroundColor: "#FFFFFF",
    },
  
    selectedCategoryButton: {
      borderColor: "#6D28D9",
      backgroundColor: "#6D28D9",
    },
  
    categoryText: {
      fontSize: 13,
      fontWeight: "700",
      color: "#6B7280",
    },
  
    selectedCategoryText: {
      color: "#FFFFFF",
    },
  
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
    },
  
    sectionTitle: {
      fontSize: 19,
      fontWeight: "800",
      color: "#1F2937",
    },
  
    workerCount: {
      fontSize: 13,
      color: "#6B7280",
    },
  
    workerCard: {
      padding: 17,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: "#E5E7EB",
      borderRadius: 15,
      backgroundColor: "#FFFFFF",
    },
  
    workerTopRow: {
      flexDirection: "row",
      alignItems: "center",
    },
  
    workerAvatar: {
      width: 55,
      height: 55,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 28,
      backgroundColor: "#EDE9FE",
    },
  
    workerAvatarText: {
      fontSize: 27,
    },
  
    workerInformation: {
      flex: 1,
      marginLeft: 13,
    },
  
    workerNameRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
    },
  
    workerName: {
      marginRight: 8,
      fontSize: 17,
      fontWeight: "800",
      color: "#1F2937",
    },
  
    verifiedBadge: {
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 10,
      overflow: "hidden",
      fontSize: 10,
      fontWeight: "800",
      color: "#047857",
      backgroundColor: "#D1FAE5",
    },
  
    workerCategory: {
      marginTop: 3,
      fontSize: 14,
      fontWeight: "700",
      color: "#6D28D9",
    },
  
    workerTown: {
      marginTop: 4,
      fontSize: 12,
      color: "#6B7280",
    },
  
    description: {
      marginTop: 14,
      fontSize: 13,
      lineHeight: 20,
      color: "#4B5563",
    },
  
    workerBottomRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingTop: 14,
      marginTop: 14,
      borderTopWidth: 1,
      borderTopColor: "#E5E7EB",
    },
  
    smallLabel: {
      fontSize: 10,
      color: "#9CA3AF",
    },
  
    smallValue: {
      marginTop: 4,
      fontSize: 12,
      fontWeight: "700",
      color: "#374151",
    },
  
    priceValue: {
      marginTop: 4,
      fontSize: 13,
      fontWeight: "800",
      color: "#047857",
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
  
    emptyCard: {
      alignItems: "center",
      paddingVertical: 42,
      paddingHorizontal: 20,
      borderWidth: 1,
      borderColor: "#E5E7EB",
      borderRadius: 15,
      backgroundColor: "#FFFFFF",
    },
  
    emptyIcon: {
      fontSize: 42,
    },
  
    emptyTitle: {
      marginTop: 13,
      fontSize: 18,
      fontWeight: "800",
      color: "#1F2937",
    },
  
    emptyText: {
      marginTop: 7,
      fontSize: 13,
      color: "#6B7280",
    },
  });