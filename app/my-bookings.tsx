import { router, useFocusEffect } from "expo-router";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useCallback, useMemo, useState } from "react";

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

type LoadMode = "initial" | "refresh" | "silent";

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
};

type ReviewReference = {
  booking_id: string;
};

type CustomerBooking = RawBooking & {
  worker_name: string;
  worker_town: string;
  has_review: boolean;
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

const getStatusTheme = (status: BookingStatus) => {
  switch (status) {
    case "pending":
      return {
        backgroundColor: "#FEF3C7",
        textColor: "#92400E",
      };

    case "accepted":
      return {
        backgroundColor: "#DBEAFE",
        textColor: "#1D4ED8",
      };

    case "in_progress":
      return {
        backgroundColor: "#EDE9FE",
        textColor: "#6D28D9",
      };

    case "completed":
      return {
        backgroundColor: "#D1FAE5",
        textColor: "#047857",
      };

    case "rejected":
      return {
        backgroundColor: "#FEE2E2",
        textColor: "#B91C1C",
      };

    case "cancelled":
      return {
        backgroundColor: "#E5E7EB",
        textColor: "#4B5563",
      };

    default:
      return {
        backgroundColor: "#E5E7EB",
        textColor: "#4B5563",
      };
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
  const [bookings, setBookings] = useState<CustomerBooking[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLiveConnected, setIsLiveConnected] = useState(false);

  const [cancellingBookingId, setCancellingBookingId] =
    useState<string | null>(null);

  const [errorMessage, setErrorMessage] = useState("");

  const loadBookings = useCallback(
    async (mode: LoadMode = "initial"): Promise<string | null> => {
      if (mode === "initial") {
        setIsLoading(true);
      }

      if (mode === "refresh") {
        setIsRefreshing(true);
      }

      setErrorMessage("");

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          router.replace("/login");
          return null;
        }

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (profileError || !profileData) {
          console.error("Customer profile error:", profileError);

          setErrorMessage(
            "Your customer profile could not be loaded."
          );

          return null;
        }

        if (profileData.role !== "customer") {
          if (profileData.role === "worker") {
            router.replace("/worker-dashboard");
          } else if (profileData.role === "admin") {
            router.replace("/admin-dashboard");
          }

          return null;
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
            "Customer booking loading error:",
            bookingError
          );

          setErrorMessage(
            "Your bookings could not be loaded."
          );

          return null;
        }

        const rawBookings = (bookingData ?? []).map((booking) => ({
          ...booking,
          status: String(booking.status)
            .trim()
            .toLowerCase() as BookingStatus,
        })) as RawBooking[];

        const bookingIds = rawBookings.map(
          (booking) => booking.id
        );

        const workerIds = [
          ...new Set(
            rawBookings.map((booking) => booking.worker_id)
          ),
        ];

        const reviewedBookingIds = new Set<string>();

        if (bookingIds.length > 0) {
          const { data: reviewData, error: reviewError } =
            await supabase
              .from("reviews")
              .select("booking_id")
              .in("booking_id", bookingIds);

          if (reviewError) {
            console.error(
              "Review reference loading error:",
              reviewError
            );
          } else {
            ((reviewData ?? []) as ReviewReference[]).forEach(
              (review) => {
                reviewedBookingIds.add(review.booking_id);
              }
            );
          }
        }

        const workerMap = new Map<string, WorkerSummary>();

        if (workerIds.length > 0) {
          const { data: workerData, error: workerError } =
            await supabase
              .from("worker_profiles")
              .select("id, full_name, town")
              .in("id", workerIds);

          if (workerError) {
            console.error(
              "Worker information loading error:",
              workerError
            );
          } else {
            ((workerData ?? []) as WorkerSummary[]).forEach(
              (worker) => {
                workerMap.set(worker.id, worker);
              }
            );
          }
        }

        const preparedBookings: CustomerBooking[] =
          rawBookings.map((booking) => {
            const worker = workerMap.get(booking.worker_id);

            return {
              ...booking,

              worker_name:
                worker?.full_name || "FixMate Worker",

              worker_town:
                worker?.town || "Not provided",

              has_review: reviewedBookingIds.has(booking.id),
            };
          });

        setBookings(preparedBookings);

        return user.id;
      } catch (error) {
        console.error(
          "Unexpected booking loading error:",
          error
        );

        setErrorMessage(
          "Something went wrong while loading your bookings."
        );

        return null;
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      let isScreenActive = true;
      let realtimeChannel: RealtimeChannel | null = null;

      const startScreen = async () => {
        const customerId = await loadBookings("initial");

        if (!customerId || !isScreenActive) {
          return;
        }

        realtimeChannel = supabase
          .channel(`customer-bookings-${customerId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "bookings",
              filter: `customer_id=eq.${customerId}`,
            },
            async (payload) => {
              console.log(
                "Customer booking realtime event:",
                payload
              );

              if (isScreenActive) {
                await loadBookings("silent");
              }
            }
          )
          .subscribe((status) => {
            if (!isScreenActive) {
              return;
            }

            console.log(
              "Customer realtime connection:",
              status
            );

            setIsLiveConnected(status === "SUBSCRIBED");
          });
      };

      void startScreen();

      return () => {
        isScreenActive = false;
        setIsLiveConnected(false);

        if (realtimeChannel) {
          void supabase.removeChannel(realtimeChannel);
        }
      };
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
        "Your booking request was cancelled."
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

  const openReview = (booking: CustomerBooking) => {
    router.push({
      pathname: "/review/[bookingId]",
      params: {
        bookingId: booking.id,
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
            onRefresh={() => loadBookings("refresh")}
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

        <View style={styles.titleRow}>
          <View style={styles.titleInformation}>
            <Text style={styles.title}>My Bookings</Text>

            <Text style={styles.subtitle}>
              Track your service requests and their progress.
            </Text>
          </View>

          <View
            style={[
              styles.liveBadge,
              isLiveConnected
                ? styles.liveConnected
                : styles.liveConnecting,
            ]}
          >
            <Text
              style={[
                styles.liveText,
                isLiveConnected
                  ? styles.liveConnectedText
                  : styles.liveConnectingText,
              ]}
            >
              {isLiveConnected ? "● Live" : "○ Connecting"}
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

            <Pressable
              onPress={() => loadBookings("refresh")}
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
            <Text style={styles.emptyIcon}>📋</Text>

            <Text style={styles.emptyTitle}>
              No bookings yet
            </Text>

            <Text style={styles.emptyText}>
              Select an available worker and send your first
              service request.
            </Text>
          </View>
        ) : (
          bookings.map((booking) => {
            const statusTheme = getStatusTheme(
              booking.status
            );

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
                      {
                        backgroundColor:
                          statusTheme.backgroundColor,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color: statusTheme.textColor,
                        },
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
                  {formatBookingDate(booking.preferred_date)}
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
                      <Text style={styles.cancelButtonText}>
                        Cancel Booking
                      </Text>
                    )}
                  </Pressable>
                )}

                {booking.status === "accepted" && (
                  <View style={styles.informationCard}>
                    <Text style={styles.informationText}>
                      The worker accepted your booking request.
                    </Text>
                  </View>
                )}

                {booking.status === "in_progress" && (
                  <View style={styles.informationCard}>
                    <Text style={styles.informationText}>
                      The worker has started this job.
                    </Text>
                  </View>
                )}

                {booking.status === "completed" && (
                  <>
                    <View style={styles.successCard}>
                      <Text style={styles.successText}>
                        This service has been completed.
                      </Text>
                    </View>

                    {booking.has_review ? (
                      <View style={styles.reviewedCard}>
                        <Text style={styles.reviewedText}>
                          ✓ Review submitted
                        </Text>
                      </View>
                    ) : (
                      <Pressable
                        style={styles.reviewButton}
                        onPress={() => openReview(booking)}
                      >
                        <Text style={styles.reviewButtonText}>
                          ⭐ Leave a Review
                        </Text>
                      </Pressable>
                    )}
                  </>
                )}

                {booking.status === "rejected" && (
                  <View style={styles.rejectedCard}>
                    <Text style={styles.rejectedCardText}>
                      The worker could not accept this booking.
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
    color: "#6B7280",
  },

  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 10,
  },

  backText: {
    fontWeight: "700",
    color: "#6D28D9",
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 10,
  },

  titleInformation: {
    flex: 1,
    paddingRight: 10,
  },

  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#1F2937",
  },

  subtitle: {
    marginTop: 7,
    fontSize: 14,
    lineHeight: 21,
    color: "#6B7280",
  },

  liveBadge: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 15,
  },

  liveConnected: {
    backgroundColor: "#D1FAE5",
  },

  liveConnecting: {
    backgroundColor: "#FEF3C7",
  },

  liveText: {
    fontSize: 11,
    fontWeight: "800",
  },

  liveConnectedText: {
    color: "#047857",
  },

  liveConnectingText: {
    color: "#92400E",
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
    color: "#6B7280",
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
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

  priceRow: {
    flexDirection: "row",
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
  },

  cancelButtonText: {
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

  reviewButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    borderRadius: 10,
    backgroundColor: "#6D28D9",
  },

  reviewButtonText: {
    fontWeight: "800",
    color: "#FFFFFF",
  },

  reviewedCard: {
    alignItems: "center",
    padding: 13,
    marginTop: 12,
    borderRadius: 10,
    backgroundColor: "#EDE9FE",
  },

  reviewedText: {
    fontWeight: "800",
    color: "#6D28D9",
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
    padding: 40,
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
    color: "#B91C1C",
  },

  retryText: {
    marginTop: 7,
    fontWeight: "800",
    color: "#6D28D9",
  },
});