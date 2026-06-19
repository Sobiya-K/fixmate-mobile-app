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
  View,
} from "react-native";

import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/lib/supabase";

type BookingStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "in_progress"
  | "completed"
  | "cancelled";

type BookingFilter =
  | "all"
  | BookingStatus;

type LoadMode =
  | "initial"
  | "refresh"
  | "silent";

type RawBooking = {
  id: string;
  customer_id: string;
  worker_id: string;
  service_category: string;
  service_description: string;
  service_address: string;
  preferred_date: string;
  estimated_price: number | string;
  status: BookingStatus;
  created_at: string;
};

type WorkerSummary = {
  id: string;
  full_name: string | null;
  town: string | null;
  category: string | null;
};

type ReviewSummary = {
  booking_id: string;
};

type CustomerBooking = RawBooking & {
  worker_name: string;
  worker_town: string;
  worker_category: string;
  has_review: boolean;
};

const getStatusTheme = (
  status: BookingStatus
) => {
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

export default function MyBookingsScreen() {
  const {
    language,
    languageName,
    t,
  } = useLanguage();

  const translate = useCallback(
    (
      key: string,
      fallback: string
    ): string => {
      const translatedValue = t(key);

      return translatedValue === key
        ? fallback
        : translatedValue;
    },
    [t]
  );

  const [bookings, setBookings] = useState<
    CustomerBooking[]
  >([]);

  const [selectedFilter, setSelectedFilter] =
    useState<BookingFilter>("all");

  const [isLoading, setIsLoading] =
    useState(true);

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [isLiveConnected, setIsLiveConnected] =
    useState(false);

  const [cancellingBookingId, setCancellingBookingId] =
    useState<string | null>(null);

  const [errorMessage, setErrorMessage] =
    useState("");

  const getStatusLabel = useCallback(
    (
      status: BookingStatus
    ): string => {
      switch (status) {
        case "pending":
          return translate(
            "bookings.pending",
            "Pending"
          );

        case "accepted":
          return translate(
            "bookings.accepted",
            "Accepted"
          );

        case "rejected":
          return translate(
            "bookings.rejected",
            "Rejected"
          );

        case "in_progress":
          return translate(
            "bookings.inProgress",
            "In Progress"
          );

        case "completed":
          return translate(
            "bookings.completed",
            "Completed"
          );

        case "cancelled":
          return translate(
            "bookings.cancelled",
            "Cancelled"
          );

        default:
          return status;
      }
    },
    [translate]
  );

  const formatBookingDate = useCallback(
    (dateValue: string): string => {
      const date = new Date(dateValue);

      if (Number.isNaN(date.getTime())) {
        return dateValue;
      }

      let locale = "en-LK";

      if (language === "ta") {
        locale = "ta-LK";
      }

      if (language === "si") {
        locale = "si-LK";
      }

      return date.toLocaleString(locale, {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    },
    [language]
  );

  const loadBookings = useCallback(
    async (
      mode: LoadMode = "initial"
    ): Promise<string | null> => {
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

        const {
          data: profileData,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (profileError || !profileData) {
          console.error(
            "Customer profile loading error:",
            profileError
          );

          setErrorMessage(
            translate(
              "bookings.accountLoadError",
              "Your customer account could not be loaded."
            )
          );

          return null;
        }

        if (profileData.role !== "customer") {
          if (profileData.role === "worker") {
            router.replace(
              "/worker-dashboard"
            );
          } else if (
            profileData.role === "admin"
          ) {
            router.replace(
              "/admin-dashboard"
            );
          }

          return null;
        }

        const {
          data: bookingData,
          error: bookingError,
        } = await supabase
          .from("bookings")
          .select(
            "id, customer_id, worker_id, service_category, service_description, service_address, preferred_date, estimated_price, status, created_at"
          )
          .eq("customer_id", user.id)
          .order("created_at", {
            ascending: false,
          });

        if (bookingError) {
          console.error(
            "Customer bookings loading error:",
            bookingError
          );

          setErrorMessage(
            translate(
              "bookings.loadError",
              "Your bookings could not be loaded."
            )
          );

          return null;
        }

        const rawBookings = (
          bookingData ?? []
        ).map((booking) => ({
          ...booking,

          status: String(booking.status)
            .trim()
            .toLowerCase()
            .replace(
              " ",
              "_"
            ) as BookingStatus,
        })) as RawBooking[];

        const workerIds = [
          ...new Set(
            rawBookings.map(
              (booking) =>
                booking.worker_id
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
              "Booking worker loading error:",
              workerError
            );
          } else {
            (
              (workerData ??
                []) as WorkerSummary[]
            ).forEach((worker) => {
              workerMap.set(
                worker.id,
                worker
              );
            });
          }
        }

        const reviewedBookingIds =
          new Set<string>();

        const bookingIds = rawBookings.map(
          (booking) => booking.id
        );

        if (bookingIds.length > 0) {
          const {
            data: reviewData,
            error: reviewError,
          } = await supabase
            .from("reviews")
            .select("booking_id")
            .eq("customer_id", user.id)
            .in("booking_id", bookingIds);

          if (reviewError) {
            console.error(
              "Booking reviews loading error:",
              reviewError
            );
          } else {
            (
              (reviewData ??
                []) as ReviewSummary[]
            ).forEach((review) => {
              reviewedBookingIds.add(
                review.booking_id
              );
            });
          }
        }

        const preparedBookings:
          CustomerBooking[] =
          rawBookings.map((booking) => {
            const worker = workerMap.get(
              booking.worker_id
            );

            return {
              ...booking,

              worker_name:
                worker?.full_name ||
                translate(
                  "bookings.worker",
                  "FixMate Worker"
                ),

              worker_town:
                worker?.town ||
                translate(
                  "common.notProvided",
                  "Not provided"
                ),

              worker_category:
                worker?.category ||
                booking.service_category,

              has_review:
                reviewedBookingIds.has(
                  booking.id
                ),
            };
          });

        setBookings(preparedBookings);

        return user.id;
      } catch (error) {
        console.error(
          "Unexpected bookings loading error:",
          error
        );

        setErrorMessage(
          translate(
            "bookings.unexpectedLoadError",
            "Something went wrong while loading your bookings."
          )
        );

        return null;
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [translate]
  );

  useFocusEffect(
    useCallback(() => {
      let isScreenActive = true;

      let realtimeChannel:
        RealtimeChannel | null = null;

      const startScreen = async () => {
        const customerId =
          await loadBookings("initial");

        if (
          !customerId ||
          !isScreenActive
        ) {
          return;
        }

        realtimeChannel = supabase
          .channel(
            "customer-bookings-" +
              customerId
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "bookings",
              filter:
                "customer_id=eq." +
                customerId,
            },
            async (payload) => {
              console.log(
                "Customer booking realtime event:",
                payload
              );

              if (isScreenActive) {
                await loadBookings(
                  "silent"
                );
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

            setIsLiveConnected(
              status === "SUBSCRIBED"
            );
          });
      };

      void startScreen();

      return () => {
        isScreenActive = false;

        setIsLiveConnected(false);

        if (realtimeChannel) {
          void supabase.removeChannel(
            realtimeChannel
          );
        }
      };
    }, [loadBookings])
  );

  const filterOptions = useMemo(
    () => [
      {
        value: "all" as BookingFilter,
        label: translate(
          "bookings.all",
          "All"
        ),
      },
      {
        value: "pending" as BookingFilter,
        label: getStatusLabel("pending"),
      },
      {
        value: "accepted" as BookingFilter,
        label: getStatusLabel("accepted"),
      },
      {
        value:
          "in_progress" as BookingFilter,
        label: getStatusLabel(
          "in_progress"
        ),
      },
      {
        value:
          "completed" as BookingFilter,
        label: getStatusLabel(
          "completed"
        ),
      },
      {
        value:
          "cancelled" as BookingFilter,
        label: getStatusLabel(
          "cancelled"
        ),
      },
      {
        value:
          "rejected" as BookingFilter,
        label: getStatusLabel(
          "rejected"
        ),
      },
    ],
    [
      getStatusLabel,
      translate,
    ]
  );

  const filteredBookings = useMemo(() => {
    if (selectedFilter === "all") {
      return bookings;
    }

    return bookings.filter(
      (booking) =>
        booking.status ===
        selectedFilter
    );
  }, [
    bookings,
    selectedFilter,
  ]);

  const cancelBooking = async (
    booking: CustomerBooking
  ) => {
    setCancellingBookingId(
      booking.id
    );

    try {
      const { error } = await supabase
        .from("bookings")
        .update({
          status: "cancelled",
        })
        .eq("id", booking.id)
        .eq(
          "customer_id",
          booking.customer_id
        )
        .eq("status", "pending");

      if (error) {
        Alert.alert(
          translate(
            "bookings.cancelFailed",
            "Cancellation failed"
          ),
          error.message
        );

        return;
      }

      setBookings(
        (currentBookings) =>
          currentBookings.map(
            (currentBooking) =>
              currentBooking.id ===
              booking.id
                ? {
                    ...currentBooking,
                    status:
                      "cancelled",
                  }
                : currentBooking
          )
      );

      Alert.alert(
        translate(
          "bookings.cancelledTitle",
          "Booking cancelled"
        ),
        translate(
          "bookings.cancelledMessage",
          "Your booking was cancelled successfully."
        )
      );
    } catch (error) {
      console.error(
        "Unexpected booking cancellation error:",
        error
      );

      Alert.alert(
        translate(
          "common.error",
          "Unexpected error"
        ),
        translate(
          "bookings.cancelUnexpectedError",
          "Something went wrong while cancelling the booking."
        )
      );
    } finally {
      setCancellingBookingId(
        null
      );
    }
  };

  const confirmCancellation = (
    booking: CustomerBooking
  ) => {
    Alert.alert(
      translate(
        "bookings.cancelBooking",
        "Cancel Booking"
      ),
      translate(
        "bookings.cancelConfirmation",
        "Are you sure you want to cancel this booking?"
      ),
      [
        {
          text: translate(
            "common.no",
            "No"
          ),
          style: "cancel",
        },
        {
          text: translate(
            "common.yesCancel",
            "Yes, Cancel"
          ),
          style: "destructive",

          onPress: () =>
            cancelBooking(booking),
        },
      ]
    );
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

  const openReview = (
    bookingId: string
  ) => {
    router.push({
      pathname:
        "/review/[bookingId]",
      params: {
        bookingId,
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
            {translate(
              "bookings.loading",
              "Loading your bookings..."
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
            onRefresh={() =>
              loadBookings("refresh")
            }
            colors={["#6D28D9"]}
          />
        }
      >
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() =>
              router.replace(
                "/customer-dashboard"
              )
            }
          >
            <Text style={styles.backText}>
              ←{" "}
              {translate(
                "common.back",
                "Back"
              )}
            </Text>
          </Pressable>

          <Pressable
            style={styles.languageButton}
            onPress={() =>
              router.push("/language")
            }
          >
            <Text style={styles.languageText}>
              🌐 {languageName}
            </Text>
          </Pressable>
        </View>

        <View style={styles.titleRow}>
          <View style={styles.titleInformation}>
            <Text style={styles.title}>
              {translate(
                "bookings.title",
                "My Bookings"
              )}
            </Text>

            <Text style={styles.subtitle}>
              {translate(
                "bookings.subtitle",
                "Track and manage your service bookings."
              )}
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
              {isLiveConnected
                ? "● " +
                  translate(
                    "bookings.live",
                    "Live"
                  )
                : "○ " +
                  translate(
                    "bookings.connecting",
                    "Connecting"
                  )}
            </Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.filterContainer
          }
        >
          {filterOptions.map(
            (option) => {
              const isSelected =
                selectedFilter ===
                option.value;

              return (
                <Pressable
                  key={option.value}
                  style={[
                    styles.filterButton,

                    isSelected &&
                      styles.selectedFilterButton,
                  ]}
                  onPress={() =>
                    setSelectedFilter(
                      option.value
                    )
                  }
                >
                  <Text
                    style={[
                      styles.filterText,

                      isSelected &&
                        styles.selectedFilterText,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            }
          )}
        </ScrollView>

        <View style={styles.countRow}>
          <Text style={styles.countText}>
            {filteredBookings.length}{" "}
            {translate(
              "bookings.results",
              "booking(s)"
            )}
          </Text>
        </View>

        {errorMessage !== "" && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>
              {errorMessage}
            </Text>

            <Pressable
              onPress={() =>
                loadBookings("refresh")
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

        {filteredBookings.length === 0 &&
        errorMessage === "" ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>
              📭
            </Text>

            <Text style={styles.emptyTitle}>
              {translate(
                "bookings.noBookings",
                "No bookings found"
              )}
            </Text>

            <Text style={styles.emptyText}>
              {selectedFilter === "all"
                ? translate(
                    "bookings.noBookingsText",
                    "Book a skilled worker and your booking will appear here."
                  )
                : translate(
                    "bookings.noFilteredBookings",
                    "There are no bookings with this status."
                  )}
            </Text>

            {selectedFilter ===
              "all" && (
              <Pressable
                style={styles.findWorkerButton}
                onPress={() =>
                  router.replace(
                    "/customer-dashboard"
                  )
                }
              >
                <Text
                  style={
                    styles.findWorkerButtonText
                  }
                >
                  {translate(
                    "bookings.findWorker",
                    "Find a Worker"
                  )}
                </Text>
              </Pressable>
            )}
          </View>
        ) : (
          filteredBookings.map(
            (booking) => {
              const statusTheme =
                getStatusTheme(
                  booking.status
                );

              const isCancelling =
                cancellingBookingId ===
                booking.id;

              const price = Number(
                booking.estimated_price
              );

              return (
                <View
                  key={booking.id}
                  style={styles.bookingCard}
                >
                  <View
                    style={
                      styles.bookingTopRow
                    }
                  >
                    <Pressable
                      style={
                        styles.workerInformation
                      }
                      onPress={() =>
                        openWorker(
                          booking.worker_id
                        )
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
                          styles.workerTextContainer
                        }
                      >
                        <Text
                          style={
                            styles.workerName
                          }
                        >
                          {booking.worker_name}
                        </Text>

                        <Text
                          style={
                            styles.workerCategory
                          }
                        >
                          {
                            booking.worker_category
                          }
                        </Text>

                        <Text
                          style={
                            styles.workerTown
                          }
                        >
                          📍{" "}
                          {booking.worker_town}
                        </Text>
                      </View>
                    </Pressable>

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
                            color:
                              statusTheme.textColor,
                          },
                        ]}
                      >
                        {getStatusLabel(
                          booking.status
                        )}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={styles.divider}
                  />

                  <Text
                    style={styles.detailLabel}
                  >
                    {translate(
                      "bookings.service",
                      "Service"
                    )}
                  </Text>

                  <Text
                    style={styles.detailValue}
                  >
                    {
                      booking.service_category
                    }
                  </Text>

                  <Text
                    style={styles.detailLabel}
                  >
                    {translate(
                      "bookings.description",
                      "Description"
                    )}
                  </Text>

                  <Text
                    style={
                      styles.description
                    }
                  >
                    {
                      booking.service_description
                    }
                  </Text>

                  <Text
                    style={styles.detailLabel}
                  >
                    {translate(
                      "bookings.address",
                      "Service address"
                    )}
                  </Text>

                  <Text
                    style={styles.detailValue}
                  >
                    {
                      booking.service_address
                    }
                  </Text>

                  <Text
                    style={styles.detailLabel}
                  >
                    {translate(
                      "bookings.preferredDate",
                      "Preferred date and time"
                    )}
                  </Text>

                  <Text
                    style={styles.detailValue}
                  >
                    {formatBookingDate(
                      booking.preferred_date
                    )}
                  </Text>

                  <View
                    style={styles.priceRow}
                  >
                    <Text
                      style={styles.priceLabel}
                    >
                      {translate(
                        "bookings.estimatedPrice",
                        "Estimated starting price"
                      )}
                    </Text>

                    <Text
                      style={styles.priceValue}
                    >
                      LKR{" "}
                      {Number.isNaN(price)
                        ? "0"
                        : price.toLocaleString()}
                    </Text>
                  </View>

                  {booking.status ===
                    "pending" && (
                    <Pressable
                      style={[
                        styles.cancelButton,

                        isCancelling &&
                          styles.disabledButton,
                      ]}
                      onPress={() =>
                        confirmCancellation(
                          booking
                        )
                      }
                      disabled={
                        isCancelling
                      }
                    >
                      {isCancelling ? (
                        <ActivityIndicator
                          size="small"
                          color="#DC2626"
                        />
                      ) : (
                        <Text
                          style={
                            styles.cancelButtonText
                          }
                        >
                          {translate(
                            "bookings.cancelBooking",
                            "Cancel Booking"
                          )}
                        </Text>
                      )}
                    </Pressable>
                  )}

                  {booking.status ===
                    "completed" &&
                    !booking.has_review && (
                      <Pressable
                        style={
                          styles.reviewButton
                        }
                        onPress={() =>
                          openReview(
                            booking.id
                          )
                        }
                      >
                        <Text
                          style={
                            styles.reviewButtonText
                          }
                        >
                          ⭐{" "}
                          {translate(
                            "bookings.leaveReview",
                            "Leave a Review"
                          )}
                        </Text>
                      </Pressable>
                    )}

                  {booking.status ===
                    "completed" &&
                    booking.has_review && (
                      <View
                        style={
                          styles.reviewedBadge
                        }
                      >
                        <Text
                          style={
                            styles.reviewedText
                          }
                        >
                          ✓{" "}
                          {translate(
                            "bookings.reviewSubmitted",
                            "Review submitted"
                          )}
                        </Text>
                      </View>
                    )}

                  <Pressable
                    style={
                      styles.viewWorkerButton
                    }
                    onPress={() =>
                      openWorker(
                        booking.worker_id
                      )
                    }
                  >
                    <Text
                      style={
                        styles.viewWorkerText
                      }
                    >
                      {translate(
                        "bookings.viewWorker",
                        "View Worker Profile"
                      )}{" "}
                      ›
                    </Text>
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
    paddingTop: 18,
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

  backButton: {
    paddingVertical: 10,
  },

  backText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6D28D9",
  },

  languageButton: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "#C4B5FD",
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
  },

  languageText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#6D28D9",
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 25,
  },

  titleInformation: {
    flex: 1,
    paddingRight: 12,
  },

  title: {
    fontSize: 29,
    fontWeight: "800",
    color: "#1F2937",
  },

  subtitle: {
    marginTop: 7,
    fontSize: 13,
    lineHeight: 20,
    color: "#6B7280",
  },

  liveBadge: {
    paddingHorizontal: 9,
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
    fontSize: 10,
    fontWeight: "800",
  },

  liveConnectedText: {
    color: "#047857",
  },

  liveConnectingText: {
    color: "#92400E",
  },

  filterContainer: {
    paddingVertical: 20,
  },

  filterButton: {
    paddingHorizontal: 15,
    paddingVertical: 9,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#DDD6FE",
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
  },

  selectedFilterButton: {
    borderColor: "#6D28D9",
    backgroundColor: "#6D28D9",
  },

  filterText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
  },

  selectedFilterText: {
    color: "#FFFFFF",
  },

  countRow: {
    marginBottom: 12,
  },

  countText: {
    fontSize: 12,
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
    flexDirection: "row",
    paddingRight: 8,
  },

  workerAvatar: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
    backgroundColor: "#EDE9FE",
  },

  workerAvatarText: {
    fontSize: 23,
  },

  workerTextContainer: {
    flex: 1,
    marginLeft: 11,
  },

  workerName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1F2937",
  },

  workerCategory: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: "700",
    color: "#6D28D9",
  },

  workerTown: {
    marginTop: 4,
    fontSize: 11,
    color: "#6B7280",
  },

  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 14,
  },

  statusText: {
    fontSize: 10,
    fontWeight: "800",
  },

  divider: {
    height: 1,
    marginVertical: 14,
    backgroundColor: "#E5E7EB",
  },

  detailLabel: {
    marginTop: 10,
    fontSize: 11,
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
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 14,
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },

  priceLabel: {
    flex: 1,
    paddingRight: 10,
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
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#DC2626",
    borderRadius: 10,
    backgroundColor: "#FEF2F2",
  },

  cancelButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#DC2626",
  },

  reviewButton: {
    minHeight: 49,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    borderRadius: 10,
    backgroundColor: "#6D28D9",
  },

  reviewButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  reviewedBadge: {
    alignItems: "center",
    padding: 13,
    marginTop: 16,
    borderRadius: 10,
    backgroundColor: "#D1FAE5",
  },

  reviewedText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#047857",
  },

  viewWorkerButton: {
    alignItems: "center",
    paddingVertical: 13,
    marginTop: 5,
  },

  viewWorkerText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#6D28D9",
  },

  disabledButton: {
    opacity: 0.55,
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
    marginTop: 8,
    fontWeight: "800",
    color: "#6D28D9",
  },

  emptyCard: {
    alignItems: "center",
    paddingVertical: 42,
    paddingHorizontal: 22,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
  },

  emptyIcon: {
    fontSize: 43,
  },

  emptyTitle: {
    marginTop: 13,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    color: "#1F2937",
  },

  emptyText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    color: "#6B7280",
  },

  findWorkerButton: {
    paddingHorizontal: 22,
    paddingVertical: 13,
    marginTop: 19,
    borderRadius: 10,
    backgroundColor: "#6D28D9",
  },

  findWorkerButtonText: {
    fontWeight: "800",
    color: "#FFFFFF",
  },
});