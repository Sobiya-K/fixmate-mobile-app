import { router, useFocusEffect } from "expo-router";
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

type WorkerSummary = {
  id: string;
  full_name: string;
  town: string;
  category: string;
};

type CustomerBooking = RawBooking & {
  worker_name: string;
  worker_town: string;
};

const getStatusLabel = (status: BookingStatus) => {
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

const formatBookingDate = (dateValue: string) => {
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

export default function MyBookingsScreen() {
  const [bookings, setBookings] = useState<
    CustomerBooking[]
  >([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [cancellingBookingId, setCancellingBookingId] =
    useState<string | null>(null);

  const [errorMessage, setErrorMessage] = useState("");

  const loadBookings = useCallback(
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
        } = await supabase.auth.getUser();

        if (!user) {
          router.replace("/login");
          return;
        }

        const { data: profile, error: profileError } =
          await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        if (profileError || !profile) {
          console.error(
            "Customer profile error:",
            profileError
          );

          setErrorMessage(
            "Your customer profile could not be loaded."
          );

          return;
        }

        if (profile.role !== "customer") {
          router.replace("/worker-dashboard");
          return;
        }

        const { data: bookingData, error: bookingError } =
          await supabase
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
            .eq("customer_id", user.id)
            .order("created_at", {
              ascending: false,
            });

        if (bookingError) {
          console.error(
            "Customer bookings error:",
            bookingError
          );

          setErrorMessage(
            "Your bookings could not be loaded."
          );

          return;
        }

        const rawBookings =
          (bookingData ?? []) as RawBooking[];

        const workerIds = [
          ...new Set(
            rawBookings.map(
              (booking) => booking.worker_id
            )
          ),
        ];

        const workerMap = new Map<
          string,
          WorkerSummary
        >();

        if (workerIds.length > 0) {
          const {
            data: workerData,
            error: workerError,
          } = await supabase
            .from("worker_profiles")
            .select(
              "id, full_name, town, category"
            )
            .in("id", workerIds);

          if (workerError) {
            console.error(
              "Booking worker details error:",
              workerError
            );
          } else {
            (
              (workerData ?? []) as WorkerSummary[]
            ).forEach((worker) => {
              workerMap.set(worker.id, worker);
            });
          }
        }

        const preparedBookings: CustomerBooking[] =
          rawBookings.map((booking) => {
            const worker = workerMap.get(
              booking.worker_id
            );

            return {
              ...booking,
              worker_name:
                worker?.full_name || "FixMate Worker",
              worker_town:
                worker?.town || "Not provided",
            };
          });

        setBookings(preparedBookings);
      } catch (error) {
        console.error(
          "Unexpected customer booking error:",
          error
        );

        setErrorMessage(
          "Something went wrong while loading your bookings."
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
      loadBookings();
    }, [loadBookings])
  );

  const summary = useMemo(() => {
    const pending = bookings.filter(
      (booking) => booking.status === "pending"
    ).length;

    const active = bookings.filter(
      (booking) =>
        booking.status === "accepted" ||
        booking.status === "in_progress"
    ).length;

    const completed = bookings.filter(
      (booking) => booking.status === "completed"
    ).length;

    return {
      pending,
      active,
      completed,
    };
  }, [bookings]);

  const handleRefresh = () => {
    loadBookings(true);
  };

  const cancelBooking = async (
    booking: CustomerBooking
  ) => {
    setCancellingBookingId(booking.id);

    try {
      const { error } = await supabase.rpc(
        "change_booking_status",
        {
          p_booking_id: booking.id,
          p_new_status: "cancelled",
        }
      );

      if (error) {
        console.error(
          "Booking cancellation error:",
          error
        );

        Alert.alert(
          "Cancellation failed",
          error.message
        );

        return;
      }

      setBookings((currentBookings) =>
        currentBookings.map((currentBooking) =>
          currentBooking.id === booking.id
            ? {
                ...currentBooking,
                status: "cancelled",
              }
            : currentBooking
        )
      );

      Alert.alert(
        "Booking cancelled",
        "Your pending booking request was cancelled."
      );
    } catch (error) {
      console.error(
        "Unexpected cancellation error:",
        error
      );

      Alert.alert(
        "Unexpected error",
        "Something went wrong while cancelling the booking."
      );
    } finally {
      setCancellingBookingId(null);
    }
  };

  const confirmCancellation = (
    booking: CustomerBooking
  ) => {
    Alert.alert(
      "Cancel booking?",
      `Cancel your request to ${booking.worker_name}?`,
      [
        {
          text: "Keep Booking",
          style: "cancel",
        },
        {
          text: "Cancel Booking",
          style: "destructive",
          onPress: () => cancelBooking(booking),
        },
      ]
    );
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
            Loading your bookings...
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
            onRefresh={handleRefresh}
            colors={["#6D28D9"]}
          />
        }
      >
        <Pressable
          style={styles.backButton}
          onPress={() =>
            router.replace("/customer-dashboard")
          }
        >
          <Text style={styles.backText}>
            ← Back to Dashboard
          </Text>
        </Pressable>

        <Text style={styles.title}>My Bookings</Text>

        <Text style={styles.subtitle}>
          Track your service requests and their current
          progress.
        </Text>

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
            Booking History
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

            <Pressable onPress={handleRefresh}>
              <Text style={styles.retryText}>
                Try again
              </Text>
            </Pressable>
          </View>
        )}

        {bookings.length === 0 &&
        errorMessage === "" ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📋</Text>

            <Text style={styles.emptyTitle}>
              No bookings yet
            </Text>

            <Text style={styles.emptyText}>
              Select an available skilled worker and send
              your first service request.
            </Text>

            <Pressable
              style={styles.findWorkerButton}
              onPress={() =>
                router.replace(
                  "/customer-dashboard"
                )
              }
            >
              <Text style={styles.findWorkerButtonText}>
                Find a Worker
              </Text>
            </Pressable>
          </View>
        ) : (
          bookings.map((booking) => {
            const isCancelling =
              cancellingBookingId === booking.id;

            return (
              <View
                key={booking.id}
                style={styles.bookingCard}
              >
                <View style={styles.bookingTopRow}>
                  <View style={styles.workerInformation}>
                    <Text style={styles.workerName}>
                      {booking.worker_name}
                    </Text>

                    <Text style={styles.workerCategory}>
                      {booking.service_category}
                    </Text>

                    <Text style={styles.workerTown}>
                      📍 {booking.worker_town}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      booking.status === "pending" &&
                        styles.pendingBadge,
                      booking.status === "accepted" &&
                        styles.acceptedBadge,
                      booking.status ===
                        "in_progress" &&
                        styles.progressBadge,
                      booking.status === "completed" &&
                        styles.completedBadge,
                      booking.status === "rejected" &&
                        styles.rejectedBadge,
                      booking.status === "cancelled" &&
                        styles.cancelledBadge,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        booking.status === "pending" &&
                          styles.pendingText,
                        booking.status === "accepted" &&
                          styles.acceptedText,
                        booking.status ===
                          "in_progress" &&
                          styles.progressText,
                        booking.status === "completed" &&
                          styles.completedText,
                        booking.status === "rejected" &&
                          styles.rejectedText,
                        booking.status === "cancelled" &&
                          styles.cancelledText,
                      ]}
                    >
                      {getStatusLabel(booking.status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <Text style={styles.detailLabel}>
                  Requested service
                </Text>

                <Text style={styles.description}>
                  {booking.service_description}
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

                {booking.status === "pending" && (
                  <Pressable
                    style={[
                      styles.cancelButton,
                      isCancelling &&
                        styles.disabledButton,
                    ]}
                    onPress={() =>
                      confirmCancellation(booking)
                    }
                    disabled={isCancelling}
                  >
                    {isCancelling ? (
                      <ActivityIndicator
                        size="small"
                        color="#DC2626"
                      />
                    ) : (
                      <Text
                        style={styles.cancelButtonText}
                      >
                        Cancel Booking
                      </Text>
                    )}
                  </Pressable>
                )}

                {booking.status === "accepted" && (
                  <View style={styles.informationCard}>
                    <Text
                      style={styles.informationText}
                    >
                      The worker accepted your request and
                      will attend at the scheduled time.
                    </Text>
                  </View>
                )}

                {booking.status === "in_progress" && (
                  <View style={styles.informationCard}>
                    <Text
                      style={styles.informationText}
                    >
                      The worker has started this job.
                    </Text>
                  </View>
                )}

                {booking.status === "completed" && (
                  <View style={styles.successCard}>
                    <Text style={styles.successText}>
                      This service has been completed.
                    </Text>
                  </View>
                )}

                {booking.status === "rejected" && (
                  <View style={styles.rejectedCard}>
                    <Text style={styles.rejectedCardText}>
                      The worker could not accept this
                      request.
                    </Text>
                  </View>
                )}

                {booking.status === "cancelled" && (
                  <View style={styles.cancelledCard}>
                    <Text style={styles.cancelledCardText}>
                      You cancelled this booking request.
                    </Text>
                  </View>
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
  summaryRow: {
    flexDirection: "row",
    gap: 9,
    marginTop: 22,
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
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 27,
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
  workerInformation: {
    flex: 1,
    paddingRight: 8,
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
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "800",
  },
  pendingBadge: {
    backgroundColor: "#FEF3C7",
  },
  pendingText: {
    color: "#92400E",
  },
  acceptedBadge: {
    backgroundColor: "#DBEAFE",
  },
  acceptedText: {
    color: "#1D4ED8",
  },
  progressBadge: {
    backgroundColor: "#EDE9FE",
  },
  progressText: {
    color: "#6D28D9",
  },
  completedBadge: {
    backgroundColor: "#D1FAE5",
  },
  completedText: {
    color: "#047857",
  },
  rejectedBadge: {
    backgroundColor: "#FEE2E2",
  },
  rejectedText: {
    color: "#B91C1C",
  },
  cancelledBadge: {
    backgroundColor: "#E5E7EB",
  },
  cancelledText: {
    color: "#4B5563",
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
  description: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 21,
    color: "#374151",
  },
  detailValue: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    color: "#1F2937",
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
  cancelButton: {
    minHeight: 47,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 17,
    borderWidth: 1,
    borderColor: "#DC2626",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#DC2626",
  },
  disabledButton: {
    opacity: 0.55,
  },
  informationCard: {
    padding: 13,
    marginTop: 15,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
  },
  informationText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#1E40AF",
  },
  successCard: {
    padding: 13,
    marginTop: 15,
    borderRadius: 10,
    backgroundColor: "#ECFDF5",
  },
  successText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#047857",
  },
  rejectedCard: {
    padding: 13,
    marginTop: 15,
    borderRadius: 10,
    backgroundColor: "#FEF2F2",
  },
  rejectedCardText: {
    fontSize: 12,
    color: "#B91C1C",
  },
  cancelledCard: {
    padding: 13,
    marginTop: 15,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
  },
  cancelledCardText: {
    fontSize: 12,
    color: "#4B5563",
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
  findWorkerButton: {
    paddingHorizontal: 21,
    paddingVertical: 12,
    marginTop: 18,
    borderRadius: 10,
    backgroundColor: "#6D28D9",
  },
  findWorkerButtonText: {
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
});