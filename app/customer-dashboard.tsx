import { router, useFocusEffect } from "expo-router";
import type { RealtimeChannel } from "@supabase/supabase-js";
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

import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/lib/supabase";

type UserRole = "customer" | "worker" | "admin";

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
  const { languageName, t } = useLanguage();

  const translate = useCallback(
    (key: string, fallback: string): string => {
      const value = t(key);

      return value === key ? fallback : value;
    },
    [t]
  );

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

  const [
    unreadNotificationCount,
    setUnreadNotificationCount,
  ] = useState(0);

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
            translate(
              "customer.accountLoadError",
              "Your account information could not be loaded."
            )
          );

          return;
        }

        const role = profileData.role as UserRole;

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
            translate(
              "customer.workerLoadError",
              "Available workers could not be loaded."
            )
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
          translate(
            "customer.unexpectedLoadError",
            "Something went wrong while loading the customer dashboard."
          )
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [routeUserByRole, translate]
  );

  const loadUnreadNotificationCount =
    useCallback(
      async (
        currentUserId?: string
      ): Promise<void> => {
        try {
          let resolvedUserId =
            currentUserId;

          if (!resolvedUserId) {
            const {
              data: { user },
              error: userError,
            } = await supabase.auth.getUser();

            if (userError || !user) {
              setUnreadNotificationCount(0);
              return;
            }

            resolvedUserId = user.id;
          }

          const {
            count,
            error: notificationError,
          } = await supabase
            .from("notifications")
            .select("id", {
              count: "exact",
              head: true,
            })
            .eq("user_id", resolvedUserId)
            .eq("is_read", false);

          if (notificationError) {
            console.error(
              "Unread notification count error:",
              notificationError
            );

            return;
          }

          setUnreadNotificationCount(
            count ?? 0
          );
        } catch (error) {
          console.error(
            "Unexpected unread notification error:",
            error
          );
        }
      },
      []
    );

  useFocusEffect(
    useCallback(() => {
      void loadDashboard();
    }, [loadDashboard])
  );

  useFocusEffect(
    useCallback(() => {
      let isScreenActive = true;

      let notificationChannel:
        RealtimeChannel | null = null;

      const startNotificationUpdates =
        async () => {
          const {
            data: { user },
            error: userError,
          } = await supabase.auth.getUser();

          if (
            userError ||
            !user ||
            !isScreenActive
          ) {
            return;
          }

          await loadUnreadNotificationCount(
            user.id
          );

          if (!isScreenActive) {
            return;
          }

          notificationChannel = supabase
            .channel(
              "customer-notification-count-" +
                user.id
            )
            .on(
              "postgres_changes",
              {
                event: "*",
                schema: "public",
                table: "notifications",
                filter:
                  "user_id=eq." + user.id,
              },
              async () => {
                if (isScreenActive) {
                  await loadUnreadNotificationCount(
                    user.id
                  );
                }
              }
            )
            .subscribe();
        };

      void startNotificationUpdates();

      return () => {
        isScreenActive = false;

        if (notificationChannel) {
          void supabase.removeChannel(
            notificationChannel
          );
        }
      };
    }, [loadUnreadNotificationCount])
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
        (worker.description || "")
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
        translate(
          "common.logoutFailed",
          "Logout failed"
        ),
        error.message
      );

      return;
    }

    setUnreadNotificationCount(0);

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

  const displayNotificationCount =
    unreadNotificationCount > 99
      ? "99+"
      : String(unreadNotificationCount);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <ActivityIndicator
            size="large"
            color="#6D28D9"
          />

          <Text style={styles.loadingText}>
            {translate(
              "common.loading",
              "Loading..."
            )}
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
            onRefresh={async () => {
              await Promise.all([
                loadDashboard(true),
                loadUnreadNotificationCount(),
              ]);
            }}
            colors={["#6D28D9"]}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerInformation}>
            <Text style={styles.greeting}>
              {translate(
                "customer.welcome",
                "Welcome,"
              )}
            </Text>

            <Text style={styles.customerName}>
              {customerName}
            </Text>
          </View>

          <Pressable
            style={styles.notificationIconButton}
            onPress={() =>
              router.push("/notifications")
            }
          >
            <Text style={styles.notificationIcon}>
              🔔
            </Text>

            {unreadNotificationCount > 0 && (
              <View
                style={
                  styles.notificationCountBadge
                }
              >
                <Text
                  style={
                    styles.notificationCountText
                  }
                >
                  {displayNotificationCount}
                </Text>
              </View>
            )}
          </Pressable>
        </View>

        <View style={styles.actionRow}>
          <Pressable
            style={styles.notificationButton}
            onPress={() =>
              router.push("/notifications")
            }
          >
            <Text
              style={
                styles.notificationButtonText
              }
            >
              🔔{" "}
              {translate(
                "notifications.title",
                "Notifications"
              )}
            </Text>

            {unreadNotificationCount > 0 && (
              <View
                style={
                  styles.inlineCountBadge
                }
              >
                <Text
                  style={
                    styles.inlineCountText
                  }
                >
                  {displayNotificationCount}
                </Text>
              </View>
            )}
          </Pressable>

          <Pressable
            style={styles.languageButton}
            onPress={() =>
              router.push("/language")
            }
          >
            <Text style={styles.languageButtonText}>
              🌐 {languageName}
            </Text>
          </Pressable>

          <Pressable
            style={styles.profileButton}
            onPress={() =>
              router.push("/profile")
            }
          >
            <Text style={styles.profileButtonText}>
              {translate(
                "common.profile",
                "Profile"
              )}
            </Text>
          </Pressable>

          <Pressable
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Text style={styles.logoutText}>
              {translate(
                "common.logout",
                "Logout"
              )}
            </Text>
          </Pressable>
        </View>

        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>
            {translate(
              "customer.heroTitle",
              "Find Trusted Skilled Workers"
            )}
          </Text>

          <Text style={styles.heroText}>
            {translate(
              "customer.heroText",
              "Search, compare and book local service providers."
            )}
          </Text>
        </View>

        <Pressable
          style={styles.myBookingsButton}
          onPress={() =>
            router.push("/my-bookings")
          }
        >
          <View style={styles.myBookingsInformation}>
            <Text style={styles.myBookingsTitle}>
              📋{" "}
              {translate(
                "customer.myBookings",
                "My Bookings"
              )}
            </Text>

            <Text style={styles.myBookingsText}>
              {translate(
                "customer.myBookingsText",
                "Track your booking requests and service progress."
              )}
            </Text>
          </View>

          <Text style={styles.myBookingsArrow}>
            ›
          </Text>
        </Pressable>

        <TextInput
          style={styles.searchInput}
          value={searchText}
          onChangeText={setSearchText}
          placeholder={translate(
            "customer.searchPlaceholder",
            "Search workers, services or towns"
          )}
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

            const displayedCategory =
              category === "All"
                ? translate(
                    "customer.all",
                    "All"
                  )
                : category;

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
                  {displayedCategory}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {translate(
              "customer.availableWorkers",
              "Available Workers"
            )}
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
                {translate(
                  "common.retry",
                  "Try again"
                )}
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
              {translate(
                "customer.noWorkers",
                "No workers found"
              )}
            </Text>

            <Text style={styles.emptyText}>
              {translate(
                "customer.noWorkersText",
                "Try another search or service category."
              )}
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
                  <View style={styles.workerAvatar}>
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
                      style={
                        styles.workerNameRow
                      }
                    >
                      <Text style={styles.workerName}>
                        {worker.full_name}
                      </Text>

                      {worker.is_verified && (
                        <View
                          style={
                            styles.verifiedBadge
                          }
                        >
                          <Text
                            style={
                              styles.verifiedBadgeText
                            }
                          >
                            ✓{" "}
                            {translate(
                              "common.verified",
                              "Verified"
                            )}
                          </Text>
                        </View>
                      )}
                    </View>

                    <Text
                      style={
                        styles.workerCategory
                      }
                    >
                      {worker.category}
                    </Text>

                    <Text style={styles.workerTown}>
                      📍 {worker.town}
                    </Text>
                  </View>
                </View>

                <Text
                  style={styles.description}
                  numberOfLines={2}
                >
                  {worker.description ||
                    translate(
                      "common.notProvided",
                      "Not provided"
                    )}
                </Text>

                <View
                  style={
                    styles.workerBottomRow
                  }
                >
                  <View
                    style={
                      styles.informationColumn
                    }
                  >
                    <Text
                      style={
                        styles.smallLabel
                      }
                    >
                      {translate(
                        "customer.experience",
                        "Experience"
                      )}
                    </Text>

                    <Text
                      style={
                        styles.smallValue
                      }
                    >
                      {worker.experience_years}{" "}
                      {translate(
                        "common.years",
                        "years"
                      )}
                    </Text>
                  </View>

                  <View
                    style={
                      styles.informationColumn
                    }
                  >
                    <Text
                      style={
                        styles.smallLabel
                      }
                    >
                      {translate(
                        "customer.rating",
                        "Rating"
                      )}
                    </Text>

                    <Text
                      style={
                        styles.smallValue
                      }
                    >
                      {rating > 0
                        ? "⭐ " +
                          rating.toFixed(1)
                        : translate(
                            "customer.newWorker",
                            "New worker"
                          )}
                    </Text>
                  </View>

                  <View
                    style={
                      styles.informationColumn
                    }
                  >
                    <Text
                      style={
                        styles.smallLabel
                      }
                    >
                      {translate(
                        "customer.from",
                        "From"
                      )}
                    </Text>

                    <Text
                      style={
                        styles.priceValue
                      }
                    >
                      LKR{" "}
                      {Number.isNaN(price)
                        ? "0"
                        : price.toLocaleString()}
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

  notificationIconButton: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#DDD6FE",
    borderRadius: 23,
    backgroundColor: "#FFFFFF",
  },

  notificationIcon: {
    fontSize: 21,
  },

  notificationCountBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: "#F7F4FF",
    borderRadius: 10,
    backgroundColor: "#DC2626",
  },

  notificationCountText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 15,
    marginHorizontal: -4,
  },

  notificationButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginHorizontal: 4,
    marginBottom: 8,
    borderRadius: 9,
    backgroundColor: "#6D28D9",
  },

  notificationButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  inlineCountBadge: {
    minWidth: 19,
    height: 19,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    marginLeft: 7,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
  },

  inlineCountText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#6D28D9",
  },

  languageButton: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginHorizontal: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#C4B5FD",
    borderRadius: 9,
    backgroundColor: "#FFFFFF",
  },

  languageButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6D28D9",
  },

  profileButton: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginHorizontal: 4,
    marginBottom: 8,
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
    marginHorizontal: 4,
    marginBottom: 8,
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
    marginTop: 15,
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
    flex: 1,
    fontSize: 19,
    fontWeight: "800",
    color: "#1F2937",
  },

  workerCount: {
    marginLeft: 10,
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
    marginTop: 3,
    borderRadius: 10,
    backgroundColor: "#D1FAE5",
  },

  verifiedBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#047857",
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

  informationColumn: {
    flex: 1,
    paddingRight: 5,
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
    textAlign: "center",
    color: "#1F2937",
  },

  emptyText: {
    marginTop: 7,
    fontSize: 13,
    textAlign: "center",
    color: "#6B7280",
  },
});