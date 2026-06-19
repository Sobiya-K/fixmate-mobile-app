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

import {
  LanguageCode,
  useLanguage,
} from "@/contexts/LanguageContext";

import { supabase } from "@/lib/supabase";

type UserRole =
  | "customer"
  | "worker"
  | "admin";

type NotificationType =
  | "new_booking"
  | "booking_accepted"
  | "booking_rejected"
  | "booking_in_progress"
  | "booking_completed"
  | "booking_cancelled"
  | "new_review"
  | "verification_approved"
  | "verification_removed";

type NotificationData = Record<
  string,
  unknown
>;

type NotificationRecord = {
  id: string;
  user_id: string;
  booking_id: string | null;
  notification_type: NotificationType;
  data: NotificationData;
  is_read: boolean;
  created_at: string;
};

type LoadMode =
  | "initial"
  | "refresh"
  | "silent";

type ScreenText = {
  back: string;
  title: string;
  subtitle: string;
  loading: string;
  live: string;
  connecting: string;
  unread: string;
  allCaughtUp: string;
  markAllRead: string;
  markingAllRead: string;
  noNotifications: string;
  noNotificationsText: string;
  loadError: string;
  retry: string;
  markReadFailed: string;
  markAllFailed: string;
  justNow: string;
  minutesAgo: string;
  hoursAgo: string;
  daysAgo: string;
};

const translations: Record<
  LanguageCode,
  ScreenText
> = {
  en: {
    back: "Back",
    title: "Notifications",
    subtitle:
      "Receive booking, review and verification updates.",
    loading: "Loading notifications...",
    live: "Live",
    connecting: "Connecting",
    unread: "unread",
    allCaughtUp: "All caught up",
    markAllRead: "Mark All as Read",
    markingAllRead: "Updating...",
    noNotifications: "No notifications yet",
    noNotificationsText:
      "New booking and account updates will appear here.",
    loadError:
      "Your notifications could not be loaded.",
    retry: "Try Again",
    markReadFailed:
      "The notification could not be marked as read.",
    markAllFailed:
      "Notifications could not be updated.",
    justNow: "Just now",
    minutesAgo: "minutes ago",
    hoursAgo: "hours ago",
    daysAgo: "days ago",
  },

  ta: {
    back: "பின்செல்",
    title: "அறிவிப்புகள்",
    subtitle:
      "முன்பதிவு, மதிப்புரை மற்றும் சரிபார்ப்பு புதுப்பிப்புகளைப் பெறுங்கள்.",
    loading:
      "அறிவிப்புகள் ஏற்றப்படுகின்றன...",
    live: "நேரலை",
    connecting: "இணைக்கப்படுகிறது",
    unread: "படிக்காதவை",
    allCaughtUp:
      "அனைத்தும் படிக்கப்பட்டுள்ளன",
    markAllRead:
      "அனைத்தையும் படித்ததாகக் குறிக்கவும்",
    markingAllRead:
      "புதுப்பிக்கப்படுகிறது...",
    noNotifications:
      "இன்னும் அறிவிப்புகள் இல்லை",
    noNotificationsText:
      "புதிய முன்பதிவு மற்றும் கணக்கு புதுப்பிப்புகள் இங்கே காணப்படும்.",
    loadError:
      "அறிவிப்புகளை ஏற்ற முடியவில்லை.",
    retry: "மீண்டும் முயற்சிக்கவும்",
    markReadFailed:
      "அறிவிப்பைப் படித்ததாகக் குறிக்க முடியவில்லை.",
    markAllFailed:
      "அறிவிப்புகளைப் புதுப்பிக்க முடியவில்லை.",
    justNow: "இப்போது",
    minutesAgo: "நிமிடங்களுக்கு முன்",
    hoursAgo: "மணிநேரங்களுக்கு முன்",
    daysAgo: "நாட்களுக்கு முன்",
  },

  si: {
    back: "ආපසු",
    title: "දැනුම්දීම්",
    subtitle:
      "වෙන්කිරීම්, සමාලෝචන සහ තහවුරු කිරීම් පිළිබඳ යාවත්කාලීන ලබා ගන්න.",
    loading:
      "දැනුම්දීම් පූරණය වෙමින්...",
    live: "සජීවී",
    connecting: "සම්බන්ධ වෙමින්",
    unread: "නොකියවූ",
    allCaughtUp:
      "සියල්ල කියවා ඇත",
    markAllRead:
      "සියල්ල කියවූ ලෙස සලකුණු කරන්න",
    markingAllRead:
      "යාවත්කාලීන කරමින්...",
    noNotifications:
      "තවම දැනුම්දීම් නොමැත",
    noNotificationsText:
      "නව වෙන්කිරීම් සහ ගිණුම් යාවත්කාලීන මෙහි පෙන්වනු ඇත.",
    loadError:
      "දැනුම්දීම් පූරණය කළ නොහැක.",
    retry: "නැවත උත්සාහ කරන්න",
    markReadFailed:
      "දැනුම්දීම කියවූ ලෙස සලකුණු කළ නොහැක.",
    markAllFailed:
      "දැනුම්දීම් යාවත්කාලීන කළ නොහැක.",
    justNow: "දැන්",
    minutesAgo: "මිනිත්තු පෙර",
    hoursAgo: "පැය පෙර",
    daysAgo: "දින පෙර",
  },
};

const readString = (
  data: NotificationData,
  key: string,
  fallback: string
): string => {
  const value = data[key];

  return typeof value === "string" &&
    value.trim() !== ""
    ? value
    : fallback;
};

const readNumber = (
  data: NotificationData,
  key: string,
  fallback: number
): number => {
  const value = data[key];

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const convertedValue = Number(value);

    if (!Number.isNaN(convertedValue)) {
      return convertedValue;
    }
  }

  return fallback;
};

const getNotificationIcon = (
  type: NotificationType
): string => {
  switch (type) {
    case "new_booking":
      return "📅";

    case "booking_accepted":
      return "✅";

    case "booking_rejected":
      return "❌";

    case "booking_in_progress":
      return "🛠️";

    case "booking_completed":
      return "🎉";

    case "booking_cancelled":
      return "🚫";

    case "new_review":
      return "⭐";

    case "verification_approved":
      return "🛡️";

    case "verification_removed":
      return "⚠️";

    default:
      return "🔔";
  }
};

const getNotificationContent = (
  notification: NotificationRecord,
  language: LanguageCode
): {
  title: string;
  message: string;
} => {
  const customerName = readString(
    notification.data,
    "customer_name",
    language === "ta"
      ? "வாடிக்கையாளர்"
      : language === "si"
      ? "පාරිභෝගිකයා"
      : "Customer"
  );

  const workerName = readString(
    notification.data,
    "worker_name",
    language === "ta"
      ? "பணியாளர்"
      : language === "si"
      ? "සේවා සපයන්නා"
      : "Worker"
  );

  const serviceCategory = readString(
    notification.data,
    "service_category",
    language === "ta"
      ? "சேவை"
      : language === "si"
      ? "සේවාව"
      : "service"
  );

  const rating = readNumber(
    notification.data,
    "rating",
    0
  );

  if (language === "ta") {
    switch (notification.notification_type) {
      case "new_booking":
        return {
          title: "புதிய முன்பதிவு கோரிக்கை",
          message:
            customerName +
            " உங்கள் " +
            serviceCategory +
            " சேவையை முன்பதிவு செய்துள்ளார்.",
        };

      case "booking_accepted":
        return {
          title: "முன்பதிவு ஏற்றுக்கொள்ளப்பட்டது",
          message:
            workerName +
            " உங்கள் " +
            serviceCategory +
            " முன்பதிவை ஏற்றுக்கொண்டுள்ளார்.",
        };

      case "booking_rejected":
        return {
          title: "முன்பதிவு நிராகரிக்கப்பட்டது",
          message:
            workerName +
            " உங்கள் " +
            serviceCategory +
            " முன்பதிவை நிராகரித்துள்ளார்.",
        };

      case "booking_in_progress":
        return {
          title: "பணி ஆரம்பிக்கப்பட்டது",
          message:
            workerName +
            " உங்கள் " +
            serviceCategory +
            " பணியை ஆரம்பித்துள்ளார்.",
        };

      case "booking_completed":
        return {
          title: "பணி முடிக்கப்பட்டது",
          message:
            workerName +
            " உங்கள் " +
            serviceCategory +
            " பணியை முடித்துள்ளார்.",
        };

      case "booking_cancelled":
        return {
          title: "முன்பதிவு ரத்து செய்யப்பட்டது",
          message:
            customerName +
            " " +
            serviceCategory +
            " முன்பதிவை ரத்து செய்துள்ளார்.",
        };

      case "new_review":
        return {
          title: "புதிய வாடிக்கையாளர் மதிப்புரை",
          message:
            customerName +
            " உங்களுக்கு " +
            rating +
            " நட்சத்திர மதிப்பீட்டை வழங்கியுள்ளார்.",
        };

      case "verification_approved":
        return {
          title: "சுயவிவரம் சரிபார்க்கப்பட்டது",
          message:
            "உங்கள் FixMate பணியாளர் சுயவிவரம் சரிபார்க்கப்பட்டுள்ளது.",
        };

      case "verification_removed":
        return {
          title: "சரிபார்ப்பு நீக்கப்பட்டது",
          message:
            "உங்கள் பணியாளர் சுயவிவரத்தின் சரிபார்ப்பு நிலை நீக்கப்பட்டுள்ளது.",
        };

      default:
        return {
          title: "FixMate அறிவிப்பு",
          message:
            "உங்கள் கணக்கில் புதிய புதுப்பிப்பு உள்ளது.",
        };
    }
  }

  if (language === "si") {
    switch (notification.notification_type) {
      case "new_booking":
        return {
          title: "නව වෙන්කිරීමේ ඉල්ලීමක්",
          message:
            customerName +
            " විසින් ඔබගේ " +
            serviceCategory +
            " සේවාව වෙන්කර ඇත.",
        };

      case "booking_accepted":
        return {
          title: "වෙන්කිරීම පිළිගෙන ඇත",
          message:
            workerName +
            " විසින් ඔබගේ " +
            serviceCategory +
            " වෙන්කිරීම පිළිගෙන ඇත.",
        };

      case "booking_rejected":
        return {
          title: "වෙන්කිරීම ප්‍රතික්ෂේප කර ඇත",
          message:
            workerName +
            " විසින් ඔබගේ " +
            serviceCategory +
            " වෙන්කිරීම ප්‍රතික්ෂේප කර ඇත.",
        };

      case "booking_in_progress":
        return {
          title: "කාර්යය ආරම්භ කර ඇත",
          message:
            workerName +
            " විසින් ඔබගේ " +
            serviceCategory +
            " කාර්යය ආරම්භ කර ඇත.",
        };

      case "booking_completed":
        return {
          title: "කාර්යය සම්පූර්ණ කර ඇත",
          message:
            workerName +
            " විසින් ඔබගේ " +
            serviceCategory +
            " කාර්යය සම්පූර්ණ කර ඇත.",
        };

      case "booking_cancelled":
        return {
          title: "වෙන්කිරීම අවලංගු කර ඇත",
          message:
            customerName +
            " විසින් " +
            serviceCategory +
            " වෙන්කිරීම අවලංගු කර ඇත.",
        };

      case "new_review":
        return {
          title: "නව පාරිභෝගික සමාලෝචනයක්",
          message:
            customerName +
            " ඔබට තරු " +
            rating +
            "ක ඇගයීමක් ලබා දී ඇත.",
        };

      case "verification_approved":
        return {
          title: "පැතිකඩ තහවුරු කර ඇත",
          message:
            "ඔබගේ FixMate සේවා සපයන්නාගේ පැතිකඩ තහවුරු කර ඇත.",
        };

      case "verification_removed":
        return {
          title: "තහවුරු කිරීම ඉවත් කර ඇත",
          message:
            "ඔබගේ සේවා සපයන්නාගේ පැතිකඩ තහවුරු කිරීම ඉවත් කර ඇත.",
        };

      default:
        return {
          title: "FixMate දැනුම්දීම",
          message:
            "ඔබගේ ගිණුමේ නව යාවත්කාලීනයක් ඇත.",
        };
    }
  }

  switch (notification.notification_type) {
    case "new_booking":
      return {
        title: "New Booking Request",
        message:
          customerName +
          " requested your " +
          serviceCategory +
          " service.",
      };

    case "booking_accepted":
      return {
        title: "Booking Accepted",
        message:
          workerName +
          " accepted your " +
          serviceCategory +
          " booking.",
      };

    case "booking_rejected":
      return {
        title: "Booking Rejected",
        message:
          workerName +
          " rejected your " +
          serviceCategory +
          " booking.",
      };

    case "booking_in_progress":
      return {
        title: "Job Started",
        message:
          workerName +
          " started your " +
          serviceCategory +
          " job.",
      };

    case "booking_completed":
      return {
        title: "Job Completed",
        message:
          workerName +
          " completed your " +
          serviceCategory +
          " job.",
      };

    case "booking_cancelled":
      return {
        title: "Booking Cancelled",
        message:
          customerName +
          " cancelled the " +
          serviceCategory +
          " booking.",
      };

    case "new_review":
      return {
        title: "New Customer Review",
        message:
          customerName +
          " gave you a " +
          rating +
          "-star rating.",
      };

    case "verification_approved":
      return {
        title: "Profile Verified",
        message:
          "Your FixMate worker profile has been verified.",
      };

    case "verification_removed":
      return {
        title: "Verification Removed",
        message:
          "Verification has been removed from your worker profile.",
      };

    default:
      return {
        title: "FixMate Notification",
        message:
          "There is a new update on your account.",
      };
  }
};

export default function NotificationsScreen() {
  const {
    language,
    languageName,
  } = useLanguage();

  const text = translations[language];

  const [
    notifications,
    setNotifications,
  ] = useState<NotificationRecord[]>([]);

  const [userId, setUserId] =
    useState<string | null>(null);

  const [userRole, setUserRole] =
    useState<UserRole | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [isLiveConnected, setIsLiveConnected] =
    useState(false);

  const [
    isMarkingAllRead,
    setIsMarkingAllRead,
  ] = useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const unreadCount = useMemo(() => {
    return notifications.filter(
      (notification) =>
        !notification.is_read
    ).length;
  }, [notifications]);

  const getLocale = useCallback(() => {
    if (language === "ta") {
      return "ta-LK";
    }

    if (language === "si") {
      return "si-LK";
    }

    return "en-LK";
  }, [language]);

  const formatNotificationTime = useCallback(
    (dateValue: string): string => {
      const date = new Date(dateValue);

      if (Number.isNaN(date.getTime())) {
        return dateValue;
      }

      const difference =
        Date.now() - date.getTime();

      const minute =
        60 * 1000;

      const hour =
        60 * minute;

      const day =
        24 * hour;

      if (difference < minute) {
        return text.justNow;
      }

      if (difference < hour) {
        const minutes = Math.floor(
          difference / minute
        );

        return (
          minutes +
          " " +
          text.minutesAgo
        );
      }

      if (difference < day) {
        const hours = Math.floor(
          difference / hour
        );

        return (
          hours +
          " " +
          text.hoursAgo
        );
      }

      if (difference < 7 * day) {
        const days = Math.floor(
          difference / day
        );

        return (
          days +
          " " +
          text.daysAgo
        );
      }

      return date.toLocaleString(
        getLocale(),
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      );
    },
    [
      getLocale,
      text.daysAgo,
      text.hoursAgo,
      text.justNow,
      text.minutesAgo,
    ]
  );

  const loadNotifications = useCallback(
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

        setUserId(user.id);

        const {
          data: profileData,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (
          profileError ||
          !profileData
        ) {
          console.error(
            "Notification profile error:",
            profileError
          );

          setErrorMessage(
            text.loadError
          );

          return null;
        }

        setUserRole(
          profileData.role as UserRole
        );

        const {
          data: notificationData,
          error: notificationError,
        } = await supabase
          .from("notifications")
          .select(
            "id, user_id, booking_id, notification_type, data, is_read, created_at"
          )
          .eq("user_id", user.id)
          .order("created_at", {
            ascending: false,
          })
          .limit(100);

        if (notificationError) {
          console.error(
            "Notification loading error:",
            notificationError
          );

          setErrorMessage(
            text.loadError
          );

          return null;
        }

        setNotifications(
          (notificationData ??
            []) as NotificationRecord[]
        );

        return user.id;
      } catch (error) {
        console.error(
          "Unexpected notification error:",
          error
        );

        setErrorMessage(
          text.loadError
        );

        return null;
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [text.loadError]
  );

  useFocusEffect(
    useCallback(() => {
      let isScreenActive = true;

      let realtimeChannel:
        RealtimeChannel | null = null;

      const startScreen = async () => {
        const currentUserId =
          await loadNotifications(
            "initial"
          );

        if (
          !currentUserId ||
          !isScreenActive
        ) {
          return;
        }

        realtimeChannel = supabase
          .channel(
            "notifications-" +
              currentUserId
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "notifications",
              filter:
                "user_id=eq." +
                currentUserId,
            },
            async () => {
              if (isScreenActive) {
                await loadNotifications(
                  "silent"
                );
              }
            }
          )
          .subscribe((status) => {
            if (!isScreenActive) {
              return;
            }

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
    }, [loadNotifications])
  );

  const markNotificationAsRead = async (
    notificationId: string
  ): Promise<boolean> => {
    if (!userId) {
      return false;
    }

    const { error } = await supabase
      .from("notifications")
      .update({
        is_read: true,
      })
      .eq("id", notificationId)
      .eq("user_id", userId);

    if (error) {
      console.error(
        "Mark notification read error:",
        error
      );

      Alert.alert(
        text.title,
        text.markReadFailed
      );

      return false;
    }

    setNotifications(
      (currentNotifications) =>
        currentNotifications.map(
          (notification) =>
            notification.id ===
            notificationId
              ? {
                  ...notification,
                  is_read: true,
                }
              : notification
        )
    );

    return true;
  };

  const markAllNotificationsAsRead =
    async () => {
      if (
        !userId ||
        unreadCount === 0
      ) {
        return;
      }

      setIsMarkingAllRead(true);

      try {
        const { error } = await supabase
          .from("notifications")
          .update({
            is_read: true,
          })
          .eq("user_id", userId)
          .eq("is_read", false);

        if (error) {
          console.error(
            "Mark all notifications error:",
            error
          );

          Alert.alert(
            text.title,
            text.markAllFailed
          );

          return;
        }

        setNotifications(
          (currentNotifications) =>
            currentNotifications.map(
              (notification) => ({
                ...notification,
                is_read: true,
              })
            )
        );
      } catch (error) {
        console.error(
          "Unexpected mark all error:",
          error
        );

        Alert.alert(
          text.title,
          text.markAllFailed
        );
      } finally {
        setIsMarkingAllRead(false);
      }
    };

  const navigateFromNotification = (
    notification: NotificationRecord
  ) => {
    if (
      notification.notification_type ===
        "verification_approved" ||
      notification.notification_type ===
        "verification_removed"
    ) {
      router.replace(
        "/worker-dashboard"
      );

      return;
    }

    if (userRole === "customer") {
      router.push("/my-bookings");
      return;
    }

    if (userRole === "worker") {
      router.replace(
        "/worker-dashboard"
      );

      return;
    }

    if (userRole === "admin") {
      router.replace(
        "/admin-dashboard"
      );

      return;
    }

    router.replace("/");
  };

  const openNotification = async (
    notification: NotificationRecord
  ) => {
    if (!notification.is_read) {
      await markNotificationAsRead(
        notification.id
      );
    }

    navigateFromNotification(
      notification
    );
  };

  const goBackToDashboard = () => {
    if (userRole === "customer") {
      router.replace(
        "/customer-dashboard"
      );

      return;
    }

    if (userRole === "worker") {
      router.replace(
        "/worker-dashboard"
      );

      return;
    }

    if (userRole === "admin") {
      router.replace(
        "/admin-dashboard"
      );

      return;
    }

    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
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
            {text.loading}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={
          false
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() =>
              loadNotifications(
                "refresh"
              )
            }
            colors={["#6D28D9"]}
          />
        }
      >
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={goBackToDashboard}
          >
            <Text style={styles.backText}>
              ← {text.back}
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
              {text.title}
            </Text>

            <Text style={styles.subtitle}>
              {text.subtitle}
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
                ? "● " + text.live
                : "○ " +
                  text.connecting}
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryInformation}>
            <Text style={styles.summaryNumber}>
              {unreadCount}
            </Text>

            <Text style={styles.summaryLabel}>
              {unreadCount === 0
                ? text.allCaughtUp
                : text.unread}
            </Text>
          </View>

          {unreadCount > 0 && (
            <Pressable
              style={[
                styles.markAllButton,
                isMarkingAllRead &&
                  styles.disabledButton,
              ]}
              onPress={
                markAllNotificationsAsRead
              }
              disabled={isMarkingAllRead}
            >
              {isMarkingAllRead ? (
                <ActivityIndicator
                  size="small"
                  color="#6D28D9"
                />
              ) : (
                <Text
                  style={
                    styles.markAllButtonText
                  }
                >
                  {text.markAllRead}
                </Text>
              )}
            </Pressable>
          )}
        </View>

        {errorMessage !== "" && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>
              {errorMessage}
            </Text>

            <Pressable
              onPress={() =>
                loadNotifications(
                  "refresh"
                )
              }
            >
              <Text style={styles.retryText}>
                {text.retry}
              </Text>
            </Pressable>
          </View>
        )}

        {notifications.length === 0 &&
        errorMessage === "" ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>
              🔔
            </Text>

            <Text style={styles.emptyTitle}>
              {text.noNotifications}
            </Text>

            <Text style={styles.emptyText}>
              {text.noNotificationsText}
            </Text>
          </View>
        ) : (
          <View style={styles.notificationList}>
            {notifications.map(
              (notification) => {
                const content =
                  getNotificationContent(
                    notification,
                    language
                  );

                return (
                  <Pressable
                    key={notification.id}
                    style={({ pressed }) => [
                      styles.notificationCard,
                      !notification.is_read &&
                        styles.unreadCard,
                      pressed &&
                        styles.pressedCard,
                    ]}
                    onPress={() =>
                      openNotification(
                        notification
                      )
                    }
                  >
                    <View
                      style={
                        styles.notificationIcon
                      }
                    >
                      <Text
                        style={
                          styles.notificationIconText
                        }
                      >
                        {getNotificationIcon(
                          notification.notification_type
                        )}
                      </Text>
                    </View>

                    <View
                      style={
                        styles.notificationInformation
                      }
                    >
                      <View
                        style={
                          styles.notificationTitleRow
                        }
                      >
                        <Text
                          style={[
                            styles.notificationTitle,
                            !notification.is_read &&
                              styles.unreadTitle,
                          ]}
                        >
                          {content.title}
                        </Text>

                        {!notification.is_read && (
                          <View
                            style={
                              styles.unreadDot
                            }
                          />
                        )}
                      </View>

                      <Text
                        style={
                          styles.notificationMessage
                        }
                      >
                        {content.message}
                      </Text>

                      <Text
                        style={
                          styles.notificationTime
                        }
                      >
                        {formatNotificationTime(
                          notification.created_at
                        )}
                      </Text>
                    </View>

                    <Text style={styles.arrow}>
                      ›
                    </Text>
                  </Pressable>
                );
              }
            )}
          </View>
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
    paddingHorizontal: 25,
  },

  loadingText: {
    marginTop: 14,
    textAlign: "center",
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

  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 17,
    marginTop: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#DDD6FE",
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
  },

  summaryInformation: {
    flex: 1,
  },

  summaryNumber: {
    fontSize: 25,
    fontWeight: "800",
    color: "#6D28D9",
  },

  summaryLabel: {
    marginTop: 2,
    fontSize: 12,
    color: "#6B7280",
  },

  markAllButton: {
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 9,
    backgroundColor: "#EDE9FE",
  },

  markAllButtonText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#6D28D9",
  },

  disabledButton: {
    opacity: 0.55,
  },

  notificationList: {
    marginTop: 2,
  },

  notificationCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginBottom: 11,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
  },

  unreadCard: {
    borderColor: "#C4B5FD",
    backgroundColor: "#F5F3FF",
  },

  pressedCard: {
    opacity: 0.75,
  },

  notificationIcon: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
    backgroundColor: "#EDE9FE",
  },

  notificationIconText: {
    fontSize: 23,
  },

  notificationInformation: {
    flex: 1,
    marginLeft: 12,
  },

  notificationTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  notificationTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
  },

  unreadTitle: {
    fontWeight: "800",
    color: "#1F2937",
  },

  unreadDot: {
    width: 8,
    height: 8,
    marginLeft: 7,
    borderRadius: 4,
    backgroundColor: "#6D28D9",
  },

  notificationMessage: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 18,
    color: "#6B7280",
  },

  notificationTime: {
    marginTop: 7,
    fontSize: 10,
    color: "#9CA3AF",
  },

  arrow: {
    marginLeft: 8,
    fontSize: 27,
    color: "#6D28D9",
  },

  emptyCard: {
    alignItems: "center",
    paddingVertical: 44,
    paddingHorizontal: 25,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
  },

  emptyIcon: {
    fontSize: 45,
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
    marginTop: 8,
    fontWeight: "800",
    color: "#6D28D9",
  },
});