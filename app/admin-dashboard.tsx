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
    View,
} from "react-native";
  
  import { supabase } from "@/lib/supabase";
  
  type AdminSummary = {
    admin_name: string;
    customers: number;
    workers: number;
    verified_workers: number;
    pending_workers: number;
    total_bookings: number;
    completed_bookings: number;
    reviews: number;
  };
  
  type AdminWorker = {
    id: string;
    full_name: string;
    phone: string | null;
    town: string;
    category: string;
    description: string;
    experience_years: number;
    base_price: number | string;
    is_verified: boolean;
    is_available: boolean;
    average_rating: number | string;
    created_at: string;
  };
  
  type WorkerFilter =
    | "pending"
    | "verified"
    | "all";
  
  const formatJoinedDate = (
    dateValue: string
  ) => {
    const date = new Date(dateValue);
  
    if (Number.isNaN(date.getTime())) {
      return "Unknown";
    }
  
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };
  
  export default function AdminDashboard() {
    const [summary, setSummary] =
      useState<AdminSummary | null>(null);
  
    const [workers, setWorkers] =
      useState<AdminWorker[]>([]);
  
    const [selectedFilter, setSelectedFilter] =
      useState<WorkerFilter>("pending");
  
    const [isLoading, setIsLoading] =
      useState(true);
  
    const [isRefreshing, setIsRefreshing] =
      useState(false);
  
    const [updatingWorkerId, setUpdatingWorkerId] =
      useState<string | null>(null);
  
    const [errorMessage, setErrorMessage] =
      useState("");
  
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
            data: summaryData,
            error: summaryError,
          } = await supabase.rpc(
            "get_admin_dashboard"
          );
  
          console.log(
            "Admin summary response:",
            {
              data: summaryData,
              error: summaryError,
            }
          );
  
          if (summaryError) {
            console.error(
              "Admin summary loading error:",
              summaryError
            );
  
            setErrorMessage(
              summaryError.message
            );
  
            return;
          }
  
          const {
            data: workerData,
            error: workerError,
          } = await supabase.rpc(
            "get_admin_workers"
          );
  
          console.log(
            "Admin workers response:",
            {
              data: workerData,
              error: workerError,
            }
          );
  
          if (workerError) {
            console.error(
              "Admin workers loading error:",
              workerError
            );
  
            setErrorMessage(
              workerError.message
            );
  
            return;
          }
  
          setSummary(
            summaryData as AdminSummary
          );
  
          setWorkers(
            (workerData ?? []) as AdminWorker[]
          );
        } catch (error) {
          console.error(
            "Unexpected admin dashboard error:",
            error
          );
  
          setErrorMessage(
            "Something went wrong while loading the administrator dashboard."
          );
        } finally {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      },
      []
    );
  
    useFocusEffect(
      useCallback(() => {
        loadDashboard();
      }, [loadDashboard])
    );
  
    const filteredWorkers = useMemo(() => {
      switch (selectedFilter) {
        case "pending":
          return workers.filter(
            (worker) =>
              !worker.is_verified
          );
  
        case "verified":
          return workers.filter(
            (worker) =>
              worker.is_verified
          );
  
        default:
          return workers;
      }
    }, [workers, selectedFilter]);
  
    const performVerification = async (
      worker: AdminWorker,
      newVerificationValue: boolean
    ) => {
      setUpdatingWorkerId(worker.id);
  
      try {
        const {
          data,
          error,
        } = await supabase.rpc(
          "set_worker_verification",
          {
            p_worker_id: worker.id,
            p_is_verified:
              newVerificationValue,
          }
        );
  
        console.log(
          "Worker verification response:",
          {
            data,
            error,
          }
        );
  
        if (error) {
          Alert.alert(
            "Verification failed",
            error.message
          );
  
          return;
        }
  
        Alert.alert(
          newVerificationValue
            ? "Worker verified"
            : "Verification removed",
          newVerificationValue
            ? `${worker.full_name} is now a verified FixMate worker.`
            : `${worker.full_name} is no longer marked as verified.`
        );
  
        await loadDashboard(true);
      } catch (error) {
        console.error(
          "Unexpected verification error:",
          error
        );
  
        Alert.alert(
          "Unexpected error",
          "Something went wrong while updating the worker."
        );
      } finally {
        setUpdatingWorkerId(null);
      }
    };
  
    const confirmVerification = (
      worker: AdminWorker
    ) => {
      const newVerificationValue =
        !worker.is_verified;
  
      Alert.alert(
        newVerificationValue
          ? "Verify this worker?"
          : "Remove verification?",
        newVerificationValue
          ? `Confirm that ${worker.full_name}'s worker profile has been reviewed.`
          : `Remove the verified status from ${worker.full_name}?`,
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: newVerificationValue
              ? "Verify Worker"
              : "Remove Verification",
  
            style: newVerificationValue
              ? "default"
              : "destructive",
  
            onPress: () =>
              performVerification(
                worker,
                newVerificationValue
              ),
          },
        ]
      );
    };
  
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
  
    if (isLoading) {
      return (
        <SafeAreaView
          style={styles.safeArea}
        >
          <View
            style={styles.centerContainer}
          >
            <ActivityIndicator
              size="large"
              color="#6D28D9"
            />
  
            <Text style={styles.loadingText}>
              Loading administrator dashboard...
            </Text>
          </View>
        </SafeAreaView>
      );
    }
  
    return (
      <SafeAreaView
        style={styles.safeArea}
      >
        <ScrollView
          contentContainerStyle={
            styles.content
          }
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
            <View
              style={
                styles.headerInformation
              }
            >
              <Text style={styles.roleLabel}>
                FixMate Administrator
              </Text>
  
              <Text style={styles.adminName}>
                {summary?.admin_name ??
                  "Administrator"}
              </Text>
            </View>
  
            <Pressable
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <Text style={styles.logoutText}>
                Logout
              </Text>
            </Pressable>
          </View>
  
          <View style={styles.heroCard}>
            <Text style={styles.heroIcon}>
              🛡️
            </Text>
  
            <View
              style={
                styles.heroInformation
              }
            >
              <Text style={styles.heroTitle}>
                Platform Control Centre
              </Text>
  
              <Text style={styles.heroText}>
                Review worker accounts and monitor
                FixMate activity.
              </Text>
            </View>
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
  
          <Text style={styles.sectionTitle}>
            Platform Overview
          </Text>
  
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Text
                style={
                  styles.summaryNumber
                }
              >
                {summary?.customers ?? 0}
              </Text>
  
              <Text
                style={
                  styles.summaryLabel
                }
              >
                Customers
              </Text>
            </View>
  
            <View style={styles.summaryCard}>
              <Text
                style={
                  styles.summaryNumber
                }
              >
                {summary?.workers ?? 0}
              </Text>
  
              <Text
                style={
                  styles.summaryLabel
                }
              >
                Workers
              </Text>
            </View>
  
            <View style={styles.summaryCard}>
              <Text
                style={
                  styles.summaryNumber
                }
              >
                {summary?.verified_workers ??
                  0}
              </Text>
  
              <Text
                style={
                  styles.summaryLabel
                }
              >
                Verified
              </Text>
            </View>
  
            <View style={styles.summaryCard}>
              <Text
                style={
                  styles.summaryNumber
                }
              >
                {summary?.pending_workers ??
                  0}
              </Text>
  
              <Text
                style={
                  styles.summaryLabel
                }
              >
                Awaiting Review
              </Text>
            </View>
  
            <View style={styles.summaryCard}>
              <Text
                style={
                  styles.summaryNumber
                }
              >
                {summary?.total_bookings ??
                  0}
              </Text>
  
              <Text
                style={
                  styles.summaryLabel
                }
              >
                Bookings
              </Text>
            </View>
  
            <View style={styles.summaryCard}>
              <Text
                style={
                  styles.summaryNumber
                }
              >
                {summary?.reviews ?? 0}
              </Text>
  
              <Text
                style={
                  styles.summaryLabel
                }
              >
                Reviews
              </Text>
            </View>
          </View>
  
          <View
            style={styles.sectionHeader}
          >
            <View>
              <Text style={styles.sectionTitle}>
                Worker Verification
              </Text>
  
              <Text style={styles.sectionText}>
                Check profiles before granting
                verified status.
              </Text>
            </View>
  
            <Text style={styles.workerCount}>
              {filteredWorkers.length}
            </Text>
          </View>
  
          <View style={styles.filterRow}>
            <Pressable
              style={[
                styles.filterButton,
  
                selectedFilter ===
                  "pending" &&
                  styles.activeFilterButton,
              ]}
              onPress={() =>
                setSelectedFilter("pending")
              }
            >
              <Text
                style={[
                  styles.filterText,
  
                  selectedFilter ===
                    "pending" &&
                    styles.activeFilterText,
                ]}
              >
                Pending
              </Text>
            </Pressable>
  
            <Pressable
              style={[
                styles.filterButton,
  
                selectedFilter ===
                  "verified" &&
                  styles.activeFilterButton,
              ]}
              onPress={() =>
                setSelectedFilter("verified")
              }
            >
              <Text
                style={[
                  styles.filterText,
  
                  selectedFilter ===
                    "verified" &&
                    styles.activeFilterText,
                ]}
              >
                Verified
              </Text>
            </Pressable>
  
            <Pressable
              style={[
                styles.filterButton,
  
                selectedFilter === "all" &&
                  styles.activeFilterButton,
              ]}
              onPress={() =>
                setSelectedFilter("all")
              }
            >
              <Text
                style={[
                  styles.filterText,
  
                  selectedFilter ===
                    "all" &&
                    styles.activeFilterText,
                ]}
              >
                All
              </Text>
            </Pressable>
          </View>
  
          {filteredWorkers.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>
                ✅
              </Text>
  
              <Text style={styles.emptyTitle}>
                No workers in this section
              </Text>
  
              <Text style={styles.emptyText}>
                Select another filter to view
                registered workers.
              </Text>
            </View>
          ) : (
            filteredWorkers.map(
              (worker) => {
                const isUpdating =
                  updatingWorkerId ===
                  worker.id;
  
                const rating = Number(
                  worker.average_rating
                );
  
                const price = Number(
                  worker.base_price
                );
  
                return (
                  <View
                    key={worker.id}
                    style={styles.workerCard}
                  >
                    <View
                      style={
                        styles.workerTopRow
                      }
                    >
                      <View
                        style={
                          styles.workerAvatar
                        }
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
                          styles.workerMainInformation
                        }
                      >
                        <Text
                          style={
                            styles.workerName
                          }
                        >
                          {worker.full_name}
                        </Text>
  
                        <Text
                          style={
                            styles.workerCategory
                          }
                        >
                          {worker.category}
                        </Text>
  
                        <Text
                          style={
                            styles.workerTown
                          }
                        >
                          📍 {worker.town}
                        </Text>
                      </View>
  
                      <View
                        style={[
                          styles.verificationBadge,
  
                          worker.is_verified
                            ? styles.verifiedBadge
                            : styles.pendingBadge,
                        ]}
                      >
                        <Text
                          style={[
                            styles.verificationText,
  
                            worker.is_verified
                              ? styles.verifiedText
                              : styles.pendingText,
                          ]}
                        >
                          {worker.is_verified
                            ? "Verified"
                            : "Pending"}
                        </Text>
                      </View>
                    </View>
  
                    <View
                      style={styles.divider}
                    />
  
                    <Text
                      style={styles.detailLabel}
                    >
                      Description
                    </Text>
  
                    <Text
                      style={
                        styles.description
                      }
                    >
                      {worker.description ||
                        "No description provided."}
                    </Text>
  
                    <View
                      style={
                        styles.detailsGrid
                      }
                    >
                      <View
                        style={
                          styles.detailItem
                        }
                      >
                        <Text
                          style={
                            styles.detailLabel
                          }
                        >
                          Experience
                        </Text>
  
                        <Text
                          style={
                            styles.detailValue
                          }
                        >
                          {
                            worker.experience_years
                          }{" "}
                          years
                        </Text>
                      </View>
  
                      <View
                        style={
                          styles.detailItem
                        }
                      >
                        <Text
                          style={
                            styles.detailLabel
                          }
                        >
                          Starting price
                        </Text>
  
                        <Text
                          style={
                            styles.detailValue
                          }
                        >
                          LKR{" "}
                          {price.toLocaleString()}
                        </Text>
                      </View>
  
                      <View
                        style={
                          styles.detailItem
                        }
                      >
                        <Text
                          style={
                            styles.detailLabel
                          }
                        >
                          Rating
                        </Text>
  
                        <Text
                          style={
                            styles.detailValue
                          }
                        >
                          {rating > 0
                            ? `⭐ ${rating.toFixed(
                                1
                              )}`
                            : "New"}
                        </Text>
                      </View>
  
                      <View
                        style={
                          styles.detailItem
                        }
                      >
                        <Text
                          style={
                            styles.detailLabel
                          }
                        >
                          Availability
                        </Text>
  
                        <Text
                          style={[
                            styles.detailValue,
  
                            worker.is_available
                              ? styles.availableText
                              : styles.unavailableText,
                          ]}
                        >
                          {worker.is_available
                            ? "Available"
                            : "Unavailable"}
                        </Text>
                      </View>
                    </View>
  
                    <View
                      style={
                        styles.contactCard
                      }
                    >
                      <Text
                        style={
                          styles.contactText
                        }
                      >
                        📞{" "}
                        {worker.phone ||
                          "Phone not provided"}
                      </Text>
  
                      <Text
                        style={
                          styles.joinedText
                        }
                      >
                        Joined{" "}
                        {formatJoinedDate(
                          worker.created_at
                        )}
                      </Text>
                    </View>
  
                    <Pressable
                      style={[
                        styles.verificationButton,
  
                        worker.is_verified
                          ? styles.removeButton
                          : styles.verifyButton,
  
                        isUpdating &&
                          styles.disabledButton,
                      ]}
                      onPress={() =>
                        confirmVerification(
                          worker
                        )
                      }
                      disabled={isUpdating}
                    >
                      {isUpdating ? (
                        <ActivityIndicator
                          color="#FFFFFF"
                        />
                      ) : (
                        <Text
                          style={
                            styles.verificationButtonText
                          }
                        >
                          {worker.is_verified
                            ? "Remove Verification"
                            : "Verify Worker"}
                        </Text>
                      )}
                    </Pressable>
                  </View>
                );
              }
            )
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
      fontSize: 14,
      color: "#6B7280",
    },
  
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
  
    headerInformation: {
      flex: 1,
      paddingRight: 12,
    },
  
    roleLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: "#6D28D9",
    },
  
    adminName: {
      marginTop: 3,
      fontSize: 24,
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
      flexDirection: "row",
      alignItems: "center",
      padding: 20,
      marginTop: 23,
      borderRadius: 17,
      backgroundColor: "#4C1D95",
    },
  
    heroIcon: {
      marginRight: 14,
      fontSize: 40,
    },
  
    heroInformation: {
      flex: 1,
    },
  
    heroTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: "#FFFFFF",
    },
  
    heroText: {
      marginTop: 5,
      fontSize: 13,
      lineHeight: 19,
      color: "#EDE9FE",
    },
  
    errorCard: {
      padding: 15,
      marginTop: 17,
      borderWidth: 1,
      borderColor: "#FCA5A5",
      borderRadius: 11,
      backgroundColor: "#FEF2F2",
    },
  
    errorText: {
      fontSize: 13,
      lineHeight: 19,
      color: "#B91C1C",
    },
  
    retryText: {
      marginTop: 7,
      fontWeight: "800",
      color: "#6D28D9",
    },
  
    sectionTitle: {
      marginTop: 25,
      fontSize: 19,
      fontWeight: "800",
      color: "#1F2937",
    },
  
    sectionText: {
      marginTop: 4,
      fontSize: 12,
      color: "#6B7280",
    },
  
    summaryGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      marginTop: 13,
    },
  
    summaryCard: {
      width: "48.5%",
      alignItems: "center",
      paddingVertical: 17,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: "#DDD6FE",
      borderRadius: 13,
      backgroundColor: "#FFFFFF",
    },
  
    summaryNumber: {
      fontSize: 24,
      fontWeight: "800",
      color: "#6D28D9",
    },
  
    summaryLabel: {
      marginTop: 4,
      fontSize: 12,
      fontWeight: "600",
      color: "#6B7280",
    },
  
    sectionHeader: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
    },
  
    workerCount: {
      minWidth: 34,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 15,
      overflow: "hidden",
      textAlign: "center",
      fontWeight: "800",
      color: "#6D28D9",
      backgroundColor: "#EDE9FE",
    },
  
    filterRow: {
      flexDirection: "row",
      marginTop: 15,
      marginBottom: 15,
    },
  
    filterButton: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 11,
      marginHorizontal: 3,
      borderWidth: 1,
      borderColor: "#DDD6FE",
      borderRadius: 10,
      backgroundColor: "#FFFFFF",
    },
  
    activeFilterButton: {
      borderColor: "#6D28D9",
      backgroundColor: "#6D28D9",
    },
  
    filterText: {
      fontSize: 13,
      fontWeight: "700",
      color: "#6B7280",
    },
  
    activeFilterText: {
      color: "#FFFFFF",
    },
  
    workerCard: {
      padding: 18,
      marginBottom: 15,
      borderWidth: 1,
      borderColor: "#E5E7EB",
      borderRadius: 16,
      backgroundColor: "#FFFFFF",
    },
  
    workerTopRow: {
      flexDirection: "row",
      alignItems: "flex-start",
    },
  
    workerAvatar: {
      width: 52,
      height: 52,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 26,
      backgroundColor: "#EDE9FE",
    },
  
    workerAvatarText: {
      fontSize: 25,
    },
  
    workerMainInformation: {
      flex: 1,
      marginLeft: 12,
      paddingRight: 7,
    },
  
    workerName: {
      fontSize: 17,
      fontWeight: "800",
      color: "#1F2937",
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
  
    verificationBadge: {
      paddingHorizontal: 9,
      paddingVertical: 6,
      borderRadius: 15,
    },
  
    verifiedBadge: {
      backgroundColor: "#D1FAE5",
    },
  
    pendingBadge: {
      backgroundColor: "#FEF3C7",
    },
  
    verificationText: {
      fontSize: 10,
      fontWeight: "800",
    },
  
    verifiedText: {
      color: "#047857",
    },
  
    pendingText: {
      color: "#92400E",
    },
  
    divider: {
      height: 1,
      marginVertical: 14,
      backgroundColor: "#E5E7EB",
    },
  
    description: {
      marginTop: 5,
      fontSize: 13,
      lineHeight: 20,
      color: "#374151",
    },
  
    detailsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      marginTop: 10,
    },
  
    detailItem: {
      width: "48%",
      padding: 12,
      marginTop: 9,
      borderRadius: 10,
      backgroundColor: "#F9FAFB",
    },
  
    detailLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: "#6B7280",
    },
  
    detailValue: {
      marginTop: 5,
      fontSize: 13,
      fontWeight: "800",
      color: "#1F2937",
    },
  
    availableText: {
      color: "#047857",
    },
  
    unavailableText: {
      color: "#B91C1C",
    },
  
    contactCard: {
      padding: 13,
      marginTop: 14,
      borderRadius: 10,
      backgroundColor: "#F3F4F6",
    },
  
    contactText: {
      fontSize: 13,
      fontWeight: "700",
      color: "#374151",
    },
  
    joinedText: {
      marginTop: 5,
      fontSize: 11,
      color: "#6B7280",
    },
  
    verificationButton: {
      minHeight: 49,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 15,
      borderRadius: 10,
    },
  
    verifyButton: {
      backgroundColor: "#059669",
    },
  
    removeButton: {
      backgroundColor: "#DC2626",
    },
  
    disabledButton: {
      opacity: 0.55,
    },
  
    verificationButtonText: {
      fontSize: 14,
      fontWeight: "800",
      color: "#FFFFFF",
    },
  
    emptyCard: {
      alignItems: "center",
      paddingVertical: 40,
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
      marginTop: 12,
      fontSize: 18,
      fontWeight: "800",
      color: "#1F2937",
    },
  
    emptyText: {
      marginTop: 7,
      fontSize: 13,
      lineHeight: 20,
      textAlign: "center",
      color: "#6B7280",
    },
  });