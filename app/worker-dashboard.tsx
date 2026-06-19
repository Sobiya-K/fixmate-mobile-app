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

import { useLanguage } from "@/contexts/LanguageContext";
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

const formatBookingDate = (
  dateValue: string,
  language: "en" | "ta" | "si"
): string => {
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
};

export default function WorkerDashboard() {
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

  const getStatusLabel = useCallback(
    (status: BookingStatus): string => {
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

  const getStatusActions = useCallback(
    (
      status: BookingStatus
    ): StatusAction[] => {
      switch (status) {
        case "pending":
          return [
            {
              label: translate(
                "worker.acceptRequest",
                "Accept Request"
              ),
              nextStatus: "accepted",
              type: "primary",
            },
            {
              label: translate(
                "worker.reject",
                "Reject"
              ),
              nextStatus: "rejected",
              type: "danger",
            },
          ];

        case "accepted":
          return [
            {
              label: translate(
                "worker.startJob",
                "Start Job"
              ),
              nextStatus: "in_progress",
              type: "primary",
            },
          ];

        case "in_progress":
          return [
            {
              label: translate(
                "worker.markCompleted",
                "Mark Completed"
              ),
              nextStatus: "completed",
              type: "success",
            },
          ];

        default:
          return [];
      }
    },
    [translate]
  );

  const [fullName, setFullName] =
    useState("Worker");

  const [category, setCategory] = useState(
    "Service Provider"
  );

  const [bookings, setBookings] = useState<
    WorkerBooking[]
  >([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [isLiveConnected, setIsLiveConnected] =
    useState(false);

  const [updatingBookingId, setUpdatingBookingId] =
    useState<string | null>(null);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [
    unreadNotificationCount,
    setUnreadNotificationCount,
  ] = useState(0);

  const loadDashboard = useCallback(
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
          .select("full_name, role")
          .eq("id", user.id)
          .single();

        if (profileError || !profileData) {
          console.error(
            "Worker account loading error:",
            profileError
          );

          setErrorMessage(
            translate(
              "worker.accountLoadError",
              "Your worker account could not be loaded."
            )
          );

          return null;
        }

        if (profileData.role !== "worker") {
          if (profileData.role === "customer") {
            router.replace(
              "/customer-dashboard"
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
            "Worker profile loading error:",
            workerProfileError
          );

          setErrorMessage(
            translate(
              "worker.profileLoadError",
              "Your worker service profile could not be loaded."
            )
          );

          return null;
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
            "id, customer_id, worker_id, service_category, service_description, service_address, preferred_date, estimated_price, status, created_at"
          )
          .eq("worker_id", user.id)
          .order("created_at", {
            ascending: false,
          });

        if (bookingError) {
          console.error(
            "Worker bookings loading error:",
            bookingError
          );

          setErrorMessage(
            translate(
              "worker.bookingsLoadError",
              "Customer booking requests could not be loaded."
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
              (customerData ??
                []) as CustomerProfile[]
            ).forEach((customer) => {
              customerMap.set(
                customer.id,
                customer
              );
            });
          }
        }

        const preparedBookings:
          WorkerBooking[] =
          rawBookings.map((booking) => {
            const customer =
              customerMap.get(
                booking.customer_id
              );

            return {
              ...booking,

              customer_name:
                customer?.full_name ||
                translate(
                  "worker.fixmateCustomer",
                  "FixMate Customer"
                ),

              customer_phone:
                customer?.phone ||
                translate(
                  "common.notProvided",
                  "Not provided"
                ),

              customer_town:
                customer?.town ||
                translate(
                  "common.notProvided",
                  "Not provided"
                ),
            };
          });

        setBookings(preparedBookings);

        return user.id;
      } catch (error) {
        console.error(
          "Unexpected worker dashboard error:",
          error
        );

        setErrorMessage(
          translate(
            "worker.unexpectedLoadError",
            "Something went wrong while loading the worker dashboard."
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
            } =
              await supabase.auth.getUser();

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
              "Worker unread notification error:",
              notificationError
            );

            return;
          }

          setUnreadNotificationCount(
            count ?? 0
          );
        } catch (error) {
          console.error(
            "Unexpected notification count error:",
            error
          );
        }
      },
      []
    );

  useFocusEffect(
    useCallback(() => {
      let isScreenActive = true;

      let bookingChannel:
        RealtimeChannel | null = null;

      const startBookingUpdates =
        async () => {
          const workerId =
            await loadDashboard("initial");

          if (
            !workerId ||
            !isScreenActive
          ) {
            return;
          }

          bookingChannel = supabase
            .channel(
              "worker-bookings-" +
                workerId
            )
            .on(
              "postgres_changes",
              {
                event: "*",
                schema: "public",
                table: "bookings",
                filter:
                  "worker_id=eq." +
                  workerId,
              },
              async (payload) => {
                console.log(
                  "Worker booking realtime event:",
                  payload
                );

                if (isScreenActive) {
                  await loadDashboard(
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
                "Worker booking realtime connection:",
                status
              );

              setIsLiveConnected(
                status === "SUBSCRIBED"
              );
            });
        };

      void startBookingUpdates();

      return () => {
        isScreenActive = false;

        setIsLiveConnected(false);

        if (bookingChannel) {
          void supabase.removeChannel(
            bookingChannel
          );
        }
      };
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
              "worker-notification-count-" +
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

  const updateBookingStatus = async (
    booking: WorkerBooking,
    newStatus: BookingStatus
  ) => {
    setUpdatingBookingId(booking.id);

    try {
      const { error } = await supabase.rpc(
        "change_booking_status",
        {
          p_booking_id: booking.id,
          p_new_status: newStatus,
        }
      );

      if (error) {
        Alert.alert(
          translate(
            "worker.statusUpdateFailed",
            "Status update failed"
          ),
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
                  status: newStatus,
                }
              : currentBooking
        )
      );

      Alert.alert(
        translate(
          "worker.bookingUpdated",
          "Booking updated"
        ),
        translate(
          "worker.bookingNow",
          "The booking is now"
        ) +
          " " +
          getStatusLabel(newStatus) +
          "."
      );
    } catch (error) {
      console.error(
        "Unexpected status update error:",
        error
      );

      Alert.alert(
        translate(
          "common.error",
          "Unexpected error"
        ),
        translate(
          "worker.statusUnexpectedError",
          "Something went wrong while updating the booking."
        )
      );
    } finally {
      setUpdatingBookingId(null);
    }
  };

  const confirmStatusUpdate = (
    booking: WorkerBooking,
    action: StatusAction
  ) => {
    const message =
      translate(
        "worker.changeBookingFrom",
        "Change this booking from"
      ) +
      " " +
      getStatusLabel(booking.status) +
      " " +
      translate("worker.to", "to") +
      " " +
      getStatusLabel(action.nextStatus) +
      "?";

    Alert.alert(action.label, message, [
      {
        text: translate(
          "common.cancel",
          "Cancel"
        ),
        style: "cancel",
      },
      {
        text: translate(
          "common.confirm",
          "Confirm"
        ),
        style:
          action.type === "danger"
            ? "destructive"
            : "default",

        onPress: () =>
          updateBookingStatus(
            booking,
            action.nextStatus
          ),
      },
    ]);
  };

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
              "worker.loading",
              "Loading worker dashboard..."
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
                loadDashboard("refresh"),
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
                "worker.welcome",
                "Welcome,"
              )}
            </Text>

            <Text style={styles.workerName}>
              {fullName}
            </Text>

            <Text style={styles.workerCategory}>
              {category}
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

        <View style={styles.headerActions}>
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
          <Text style={styles.heroIcon}>
            🧰
          </Text>

          <View style={styles.heroInformation}>
            <Text style={styles.heroTitle}>
              {translate(
                "worker.heroTitle",
                "Manage Your Jobs"
              )}
            </Text>

            <Text style={styles.heroText}>
              {translate(
                "worker.heroText",
                "New bookings and status changes appear automatically."
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
                    "worker.live",
                    "Live"
                  )
                : "○ " +
                  translate(
                    "worker.connecting",
                    "Connecting"
                  )}
            </Text>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>
              {summary.pending}
            </Text>

            <Text style={styles.summaryLabel}>
              {getStatusLabel("pending")}
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>
              {summary.active}
            </Text>

            <Text style={styles.summaryLabel}>
              {translate(
                "worker.active",
                "Active"
              )}
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>
              {summary.completed}
            </Text>

            <Text style={styles.summaryLabel}>
              {getStatusLabel("completed")}
            </Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {translate(
              "worker.customerRequests",
              "Customer Requests"
            )}
          </Text>

          <Text style={styles.bookingCount}>
            {bookings.length}{" "}
            {translate(
              "worker.total",
              "total"
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
                loadDashboard("refresh")
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

        {bookings.length === 0 &&
        errorMessage === "" ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>
              📭
            </Text>

            <Text style={styles.emptyTitle}>
              {translate(
                "worker.noBookings",
                "No booking requests yet"
              )}
            </Text>

            <Text style={styles.emptyText}>
              {translate(
                "worker.noBookingsText",
                "New customer bookings will appear here automatically."
              )}
            </Text>
          </View>
        ) : (
          bookings.map((booking) => {
            const actions =
              getStatusActions(booking.status);

            const statusTheme =
              getStatusTheme(booking.status);

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
                    <Text style={styles.customerName}>
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
                        styles.statusBadgeText,
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

                <View style={styles.divider} />

                <Text style={styles.detailLabel}>
                  {translate(
                    "worker.service",
                    "Service"
                  )}
                </Text>

                <Text style={styles.detailValue}>
                  {booking.service_category}
                </Text>

                <Text style={styles.detailLabel}>
                  {translate(
                    "worker.customerRequest",
                    "Customer request"
                  )}
                </Text>

                <Text style={styles.description}>
                  {booking.service_description}
                </Text>

                <Text style={styles.detailLabel}>
                  {translate(
                    "worker.serviceAddress",
                    "Service address"
                  )}
                </Text>

                <Text style={styles.detailValue}>
                  {booking.service_address}
                </Text>

                <Text style={styles.detailLabel}>
                  {translate(
                    "worker.preferredDate",
                    "Preferred date and time"
                  )}
                </Text>

                <Text style={styles.detailValue}>
                  {formatBookingDate(
                    booking.preferred_date,
                    language
                  )}
                </Text>

                <View style={styles.contactCard}>
                  <Text style={styles.contactText}>
                    📞 {booking.customer_phone}
                  </Text>
                </View>

                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>
                    {translate(
                      "worker.estimatedPrice",
                      "Estimated starting price"
                    )}
                  </Text>

                  <Text style={styles.priceValue}>
                    LKR{" "}
                    {Number(
                      booking.estimated_price
                    ).toLocaleString()}
                  </Text>
                </View>

                {actions.length > 0 && (
                  <View style={styles.actionContainer}>
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
                  <Text style={styles.finalStatusText}>
                    {translate(
                      "worker.noFurtherAction",
                      "No further action is required for this booking."
                    )}
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
    fontWeight: "700",
    color: "#6D28D9",
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

  headerActions: {
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
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    marginTop: 15,
    borderRadius: 17,
    backgroundColor: "#6D28D9",
  },

  heroIcon: {
    marginRight: 12,
    fontSize: 36,
  },

  heroInformation: {
    flex: 1,
  },

  heroTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  heroText: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: "#EDE9FE",
  },

  liveBadge: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 14,
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
    color: "#6B7280",
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 25,
    marginBottom: 12,
  },

  sectionTitle: {
    flex: 1,
    fontSize: 19,
    fontWeight: "800",
    color: "#1F2937",
  },

  bookingCount: {
    marginLeft: 10,
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
    paddingRight: 8,
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
  },

  statusBadgeText: {
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

  contactCard: {
    padding: 12,
    marginTop: 14,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
  },

  contactText: {
    fontWeight: "700",
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
    fontWeight: "800",
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