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
  
  type UserRole =
    | "customer"
    | "worker"
    | "admin";
  
  type BookingStatus =
    | "pending"
    | "accepted"
    | "rejected"
    | "in_progress"
    | "completed"
    | "cancelled";
  
  type RawBooking = {
    id: string;
    customer_id: string;
    worker_id: string;
    service_category: string;
    service_description: string;
    service_address: string;
    preferred_date: string;
    estimated_price: number;
    status: BookingStatus;
    created_at: string;
  };
  
  type CustomerProfile = {
    id: string;
    full_name: string;
    phone: string | null;
    town: string | null;
  };
  
  type WorkerBooking = RawBooking & {
    customer_name: string;
    customer_phone: string;
    customer_town: string;
  };
  
  type StatusAction = {
    label: string;
    nextStatus: BookingStatus;
    type: "primary" | "danger" | "success";
  };
  
  const getStatusLabel = (
    status: BookingStatus
  ) => {
    switch (status) {
      case "pending":
        return "Pending";
  
      case "accepted":
        return "Accepted";
  
      case "rejected":
        return "Rejected";
  
      case "in_progress":
        return "In Progress";
  
      case "completed":
        return "Completed";
  
      case "cancelled":
        return "Cancelled";
  
      default:
        return status;
    }
  };
  
  const getStatusActions = (
    status: BookingStatus
  ): StatusAction[] => {
    switch (status) {
      case "pending":
        return [
          {
            label: "Accept Request",
            nextStatus: "accepted",
            type: "primary",
          },
          {
            label: "Reject",
            nextStatus: "rejected",
            type: "danger",
          },
        ];
  
      case "accepted":
        return [
          {
            label: "Start Job",
            nextStatus: "in_progress",
            type: "primary",
          },
        ];
  
      case "in_progress":
        return [
          {
            label: "Mark Completed",
            nextStatus: "completed",
            type: "success",
          },
        ];
  
      default:
        return [];
    }
  };
  
  const formatBookingDate = (
    dateValue: string
  ) => {
    const date = new Date(dateValue);
  
    if (Number.isNaN(date.getTime())) {
      return "Invalid date";
    }
  
    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  
  export default function WorkerDashboard() {
    const [fullName, setFullName] =
      useState("Worker");
  
    const [category, setCategory] =
      useState("Service Provider");
  
    const [bookings, setBookings] =
      useState<WorkerBooking[]>([]);
  
    const [isLoading, setIsLoading] =
      useState(true);
  
    const [isRefreshing, setIsRefreshing] =
      useState(false);
  
    const [updatingBookingId, setUpdatingBookingId] =
      useState<string | null>(null);
  
    const [errorMessage, setErrorMessage] =
      useState("");
  
    const routeUserByRole = useCallback(
      (role: UserRole) => {
        if (role === "customer") {
          router.replace(
            "/customer-dashboard"
          );
  
          return;
        }
  
        if (role === "admin") {
          router.replace(
            "/admin-dashboard"
          );
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
              "Worker account loading error:",
              profileError
            );
  
            setErrorMessage(
              "Your worker account could not be loaded."
            );
  
            return;
          }
  
          const role =
            profileData.role as UserRole;
  
          console.log(
            "Worker dashboard detected role:",
            role
          );
  
          if (role !== "worker") {
            routeUserByRole(role);
            return;
          }
  
          setFullName(
            profileData.full_name || "Worker"
          );
  
          const {
            data: workerProfileData,
            error: workerProfileError,
          } = await supabase
            .from("worker_profiles")
            .select("category")
            .eq("id", user.id)
            .single();
  
          if (
            workerProfileError ||
            !workerProfileData
          ) {
            console.error(
              "Worker service profile error:",
              workerProfileError
            );
  
            setErrorMessage(
              "Your worker service profile could not be loaded."
            );
  
            return;
          }
  
          setCategory(
            workerProfileData.category ||
              "Service Provider"
          );
  
          const {
            data: bookingData,
            error: bookingError,
          } = await supabase
            .from("bookings")
            .select(
              `
                id,
                customer_id,
                worker_id,
                service_category,
                service_description,
                service_address,
                preferred_date,
                estimated_price,
                status,
                created_at
              `
            )
            .eq("worker_id", user.id)
            .order("created_at", {
              ascending: false,
            });
  
          if (bookingError) {
            console.error(
              "Worker booking loading error:",
              bookingError
            );
  
            setErrorMessage(
              "Customer booking requests could not be loaded."
            );
  
            return;
          }
  
          const rawBookings =
            (bookingData ?? []) as RawBooking[];
  
          const customerIds = [
            ...new Set(
              rawBookings.map(
                (booking) =>
                  booking.customer_id
              )
            ),
          ];
  
          const customerMap = new Map<
            string,
            CustomerProfile
          >();
  
          if (customerIds.length > 0) {
            const {
              data: customerData,
              error: customerError,
            } = await supabase
              .from("profiles")
              .select(
                "id, full_name, phone, town"
              )
              .in("id", customerIds);
  
            if (customerError) {
              console.error(
                "Customer details loading error:",
                customerError
              );
            } else {
              (
                (customerData ?? []) as CustomerProfile[]
              ).forEach((customer) => {
                customerMap.set(
                  customer.id,
                  customer
                );
              });
            }
          }
  
          const preparedBookings =
            rawBookings.map((booking) => {
              const customer =
                customerMap.get(
                  booking.customer_id
                );
  
              return {
                ...booking,
  
                customer_name:
                  customer?.full_name ||
                  "FixMate Customer",
  
                customer_phone:
                  customer?.phone ||
                  "Not provided",
  
                customer_town:
                  customer?.town ||
                  "Not provided",
              };
            });
  
          setBookings(preparedBookings);
        } catch (error) {
          console.error(
            "Unexpected worker dashboard error:",
            error
          );
  
          setErrorMessage(
            "Something went wrong while loading the worker dashboard."
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
  
    const summary = useMemo(() => {
      const pending = bookings.filter(
        (booking) =>
          booking.status === "pending"
      ).length;
  
      const active = bookings.filter(
        (booking) =>
          booking.status === "accepted" ||
          booking.status === "in_progress"
      ).length;
  
      const completed = bookings.filter(
        (booking) =>
          booking.status === "completed"
      ).length;
  
      return {
        pending,
        active,
        completed,
      };
    }, [bookings]);
  
    const performStatusUpdate = async (
      booking: WorkerBooking,
      nextStatus: BookingStatus
    ) => {
      setUpdatingBookingId(booking.id);
  
      try {
        const { error } = await supabase.rpc(
          "change_booking_status",
          {
            p_booking_id: booking.id,
            p_new_status: nextStatus,
          }
        );
  
        if (error) {
          Alert.alert(
            "Status update failed",
            error.message
          );
  
          return;
        }
  
        setBookings((currentBookings) =>
          currentBookings.map(
            (currentBooking) =>
              currentBooking.id === booking.id
                ? {
                    ...currentBooking,
                    status: nextStatus,
                  }
                : currentBooking
          )
        );
  
        Alert.alert(
          "Booking updated",
          `The booking is now ${getStatusLabel(
            nextStatus
          ).toLowerCase()}.`
        );
      } catch (error) {
        console.error(
          "Unexpected status update error:",
          error
        );
  
        Alert.alert(
          "Unexpected error",
          "Something went wrong while updating the booking."
        );
      } finally {
        setUpdatingBookingId(null);
      }
    };
  
    const confirmStatusUpdate = (
      booking: WorkerBooking,
      action: StatusAction
    ) => {
      Alert.alert(
        action.label,
        `Change this booking from ${getStatusLabel(
          booking.status
        )} to ${getStatusLabel(
          action.nextStatus
        )}?`,
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Confirm",
            style:
              action.type === "danger"
                ? "destructive"
                : "default",
            onPress: () =>
              performStatusUpdate(
                booking,
                action.nextStatus
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
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centerContainer}>
            <ActivityIndicator
              size="large"
              color="#6D28D9"
            />
  
            <Text style={styles.loadingText}>
              Loading worker dashboard...
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
  
              <Text style={styles.workerName}>
                {fullName}
              </Text>
  
              <Text style={styles.workerCategory}>
                {category}
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
            <Text style={styles.heroIcon}>
              🧰
            </Text>
  
            <View style={styles.heroInformation}>
              <Text style={styles.heroTitle}>
                Manage Your Jobs
              </Text>
  
              <Text style={styles.heroText}>
                Review customer requests and update each
                job&apos;s progress.
              </Text>
            </View>
          </View>
  
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryNumber}>
                {summary.pending}
              </Text>
  
              <Text style={styles.summaryLabel}>
                Pending
              </Text>
            </View>
  
            <View style={styles.summaryCard}>
              <Text style={styles.summaryNumber}>
                {summary.active}
              </Text>
  
              <Text style={styles.summaryLabel}>
                Active
              </Text>
            </View>
  
            <View style={styles.summaryCard}>
              <Text style={styles.summaryNumber}>
                {summary.completed}
              </Text>
  
              <Text style={styles.summaryLabel}>
                Completed
              </Text>
            </View>
          </View>
  
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Customer Requests
            </Text>
  
            <Text style={styles.bookingCount}>
              {bookings.length} total
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
  
          {bookings.length === 0 &&
          errorMessage === "" ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>
                📭
              </Text>
  
              <Text style={styles.emptyTitle}>
                No booking requests yet
              </Text>
  
              <Text style={styles.emptyText}>
                New customer requests assigned to you will
                appear here.
              </Text>
            </View>
          ) : (
            bookings.map((booking) => {
              const actions =
                getStatusActions(
                  booking.status
                );
  
              const isUpdating =
                updatingBookingId === booking.id;
  
              return (
                <View
                  key={booking.id}
                  style={styles.bookingCard}
                >
                  <View style={styles.bookingTopRow}>
                    <View
                      style={
                        styles.customerInformation
                      }
                    >
                      <Text
                        style={styles.customerName}
                      >
                        {booking.customer_name}
                      </Text>
  
                      <Text
                        style={
                          styles.customerLocation
                        }
                      >
                        📍 {booking.customer_town}
                      </Text>
                    </View>
  
                    <View style={styles.statusBadge}>
                      <Text
                        style={
                          styles.statusBadgeText
                        }
                      >
                        {getStatusLabel(
                          booking.status
                        )}
                      </Text>
                    </View>
                  </View>
  
                  <View style={styles.divider} />
  
                  <Text style={styles.detailLabel}>
                    Service
                  </Text>
  
                  <Text style={styles.detailValue}>
                    {booking.service_category}
                  </Text>
  
                  <Text style={styles.detailLabel}>
                    Customer request
                  </Text>
  
                  <Text style={styles.description}>
                    {
                      booking.service_description
                    }
                  </Text>
  
                  <Text style={styles.detailLabel}>
                    Service address
                  </Text>
  
                  <Text style={styles.detailValue}>
                    {booking.service_address}
                  </Text>
  
                  <Text style={styles.detailLabel}>
                    Preferred date and time
                  </Text>
  
                  <Text style={styles.detailValue}>
                    {formatBookingDate(
                      booking.preferred_date
                    )}
                  </Text>
  
                  <View style={styles.contactCard}>
                    <Text style={styles.contactText}>
                      📞 {booking.customer_phone}
                    </Text>
                  </View>
  
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>
                      Estimated starting price
                    </Text>
  
                    <Text style={styles.priceValue}>
                      LKR{" "}
                      {Number(
                        booking.estimated_price
                      ).toLocaleString()}
                    </Text>
                  </View>
  
                  {actions.length > 0 && (
                    <View
                      style={
                        styles.actionContainer
                      }
                    >
                      {actions.map((action) => (
                        <Pressable
                          key={action.nextStatus}
                          style={[
                            styles.actionButton,
  
                            action.type ===
                              "primary" &&
                              styles.primaryAction,
  
                            action.type ===
                              "danger" &&
                              styles.dangerAction,
  
                            action.type ===
                              "success" &&
                              styles.successAction,
  
                            isUpdating &&
                              styles.disabledAction,
                          ]}
                          onPress={() =>
                            confirmStatusUpdate(
                              booking,
                              action
                            )
                          }
                          disabled={isUpdating}
                        >
                          {isUpdating ? (
                            <ActivityIndicator
                              size="small"
                              color="#FFFFFF"
                            />
                          ) : (
                            <Text
                              style={
                                styles.actionButtonText
                              }
                            >
                              {action.label}
                            </Text>
                          )}
                        </Pressable>
                      ))}
                    </View>
                  )}
  
                  {actions.length === 0 && (
                    <Text
                      style={
                        styles.finalStatusText
                      }
                    >
                      No further action is required for this
                      booking.
                    </Text>
                  )}
                </View>
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
  
    workerName: {
      marginTop: 2,
      fontSize: 24,
      fontWeight: "800",
      color: "#1F2937",
    },
  
    workerCategory: {
      marginTop: 3,
      fontSize: 14,
      fontWeight: "700",
      color: "#6D28D9",
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
      flexDirection: "row",
      alignItems: "center",
      padding: 20,
      marginTop: 23,
      borderRadius: 17,
      backgroundColor: "#6D28D9",
    },
  
    heroIcon: {
      marginRight: 14,
      fontSize: 40,
    },
  
    heroInformation: {
      flex: 1,
    },
  
    heroTitle: {
      fontSize: 21,
      fontWeight: "800",
      color: "#FFFFFF",
    },
  
    heroText: {
      marginTop: 5,
      fontSize: 13,
      lineHeight: 19,
      color: "#EDE9FE",
    },
  
    summaryRow: {
      flexDirection: "row",
      gap: 9,
      marginTop: 18,
    },
  
    summaryCard: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 16,
      borderWidth: 1,
      borderColor: "#DDD6FE",
      borderRadius: 13,
      backgroundColor: "#FFFFFF",
    },
  
    summaryNumber: {
      fontSize: 23,
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
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 25,
      marginBottom: 12,
    },
  
    sectionTitle: {
      fontSize: 19,
      fontWeight: "800",
      color: "#1F2937",
    },
  
    bookingCount: {
      fontSize: 13,
      color: "#6B7280",
    },
  
    bookingCard: {
      padding: 18,
      marginBottom: 15,
      borderWidth: 1,
      borderColor: "#E5E7EB",
      borderRadius: 16,
      backgroundColor: "#FFFFFF",
    },
  
    bookingTopRow: {
      flexDirection: "row",
      alignItems: "flex-start",
    },
  
    customerInformation: {
      flex: 1,
    },
  
    customerName: {
      fontSize: 17,
      fontWeight: "800",
      color: "#1F2937",
    },
  
    customerLocation: {
      marginTop: 4,
      fontSize: 12,
      color: "#6B7280",
    },
  
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 15,
      backgroundColor: "#EDE9FE",
    },
  
    statusBadgeText: {
      fontSize: 11,
      fontWeight: "800",
      color: "#6D28D9",
    },
  
    divider: {
      height: 1,
      marginVertical: 14,
      backgroundColor: "#E5E7EB",
    },
  
    detailLabel: {
      marginTop: 11,
      fontSize: 12,
      fontWeight: "700",
      color: "#6B7280",
    },
  
    detailValue: {
      marginTop: 4,
      fontSize: 14,
      lineHeight: 20,
      color: "#1F2937",
    },
  
    description: {
      marginTop: 4,
      fontSize: 14,
      lineHeight: 21,
      color: "#374151",
    },
  
    contactCard: {
      padding: 12,
      marginTop: 14,
      borderRadius: 10,
      backgroundColor: "#F3F4F6",
    },
  
    contactText: {
      fontSize: 13,
      fontWeight: "700",
      color: "#374151",
    },
  
    priceRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingTop: 15,
      marginTop: 15,
      borderTopWidth: 1,
      borderTopColor: "#E5E7EB",
    },
  
    priceLabel: {
      flex: 1,
      fontSize: 12,
      color: "#6B7280",
    },
  
    priceValue: {
      fontSize: 16,
      fontWeight: "800",
      color: "#047857",
    },
  
    actionContainer: {
      flexDirection: "row",
      gap: 9,
      marginTop: 17,
    },
  
    actionButton: {
      flex: 1,
      minHeight: 47,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 10,
      borderRadius: 10,
    },
  
    primaryAction: {
      backgroundColor: "#6D28D9",
    },
  
    dangerAction: {
      backgroundColor: "#DC2626",
    },
  
    successAction: {
      backgroundColor: "#059669",
    },
  
    disabledAction: {
      opacity: 0.55,
    },
  
    actionButtonText: {
      fontSize: 13,
      fontWeight: "800",
      textAlign: "center",
      color: "#FFFFFF",
    },
  
    finalStatusText: {
      marginTop: 16,
      fontSize: 12,
      fontStyle: "italic",
      textAlign: "center",
      color: "#6B7280",
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
      lineHeight: 20,
      textAlign: "center",
      color: "#6B7280",
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
  });