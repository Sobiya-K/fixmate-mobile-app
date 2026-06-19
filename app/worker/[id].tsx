import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";

import {
  ActivityIndicator,
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

type WorkerDetails = {
  id: string;
  full_name: string;
  town: string;
  category: string;
  description: string | null;
  experience_years: number;
  base_price: number | string;
  is_verified: boolean;
  is_available: boolean;
  average_rating: number | string;
};

type RawReview = {
  id: string;
  customer_id: string;
  rating: number | string;
  comment: string | null;
  created_at: string;
};

type CustomerProfile = {
  id: string;
  full_name: string | null;
};

type WorkerReview = RawReview & {
  customer_name: string;
};

type ScreenText = {
  back: string;
  title: string;
  loading: string;
  loadFailed: string;
  tryAgain: string;
  verified: string;
  notVerified: string;
  verificationTitle: string;
  verifiedExplanation: string;
  notVerifiedExplanation: string;
  available: string;
  unavailable: string;
  location: string;
  experience: string;
  years: string;
  rating: string;
  newWorker: string;
  startingPrice: string;
  about: string;
  noDescription: string;
  serviceInformation: string;
  category: string;
  availability: string;
  customerReviews: string;
  noReviews: string;
  noReviewsText: string;
  anonymousCustomer: string;
  bookService: string;
  unavailableButton: string;
};

const screenTranslations: Record<
  LanguageCode,
  ScreenText
> = {
  en: {
    back: "Back",
    title: "Worker Profile",
    loading: "Loading worker profile...",
    loadFailed: "Worker profile could not be loaded.",
    tryAgain: "Try Again",
    verified: "Verified Worker",
    notVerified: "Not Yet Verified",
    verificationTitle: "Worker Verification",
    verifiedExplanation:
      "FixMate has reviewed this worker’s profile information. Always discuss the job, price and safety requirements before the service begins.",
    notVerifiedExplanation:
      "FixMate has not completed verification for this worker yet. Review the worker’s ratings and discuss all job details carefully before booking.",
    available: "Available for bookings",
    unavailable: "Currently unavailable",
    location: "Location",
    experience: "Experience",
    years: "years",
    rating: "Rating",
    newWorker: "New worker",
    startingPrice: "Starting price",
    about: "About This Worker",
    noDescription:
      "This worker has not added a service description yet.",
    serviceInformation: "Service Information",
    category: "Service category",
    availability: "Availability",
    customerReviews: "Customer Reviews",
    noReviews: "No reviews yet",
    noReviewsText:
      "This worker has not received a customer review yet.",
    anonymousCustomer: "FixMate Customer",
    bookService: "Book This Worker",
    unavailableButton: "Worker Currently Unavailable",
  },

  ta: {
    back: "பின்செல்",
    title: "பணியாளர் சுயவிவரம்",
    loading:
      "பணியாளர் சுயவிவரம் ஏற்றப்படுகிறது...",
    loadFailed:
      "பணியாளர் சுயவிவரத்தை ஏற்ற முடியவில்லை.",
    tryAgain: "மீண்டும் முயற்சிக்கவும்",
    verified:
      "சரிபார்க்கப்பட்ட பணியாளர்",
    notVerified:
      "இன்னும் சரிபார்க்கப்படவில்லை",
    verificationTitle:
      "பணியாளர் சரிபார்ப்பு",
    verifiedExplanation:
      "இந்த பணியாளரின் சுயவிவரத் தகவலை FixMate மதிப்பாய்வு செய்துள்ளது. சேவை ஆரம்பிக்கும் முன் பணி, கட்டணம் மற்றும் பாதுகாப்புத் தேவைகளை தெளிவாகப் பேசுங்கள்.",
    notVerifiedExplanation:
      "இந்த பணியாளரின் சரிபார்ப்பை FixMate இன்னும் நிறைவு செய்யவில்லை. முன்பதிவு செய்வதற்கு முன் மதிப்பீடுகளைப் பார்த்து, அனைத்து பணி விவரங்களையும் கவனமாகப் பேசுங்கள்.",
    available:
      "முன்பதிவுகளுக்கு கிடைக்கிறார்",
    unavailable:
      "தற்போது சேவைக்கு கிடைக்கவில்லை",
    location: "இடம்",
    experience: "அனுபவம்",
    years: "ஆண்டுகள்",
    rating: "மதிப்பீடு",
    newWorker: "புதிய பணியாளர்",
    startingPrice: "தொடக்க கட்டணம்",
    about: "இந்த பணியாளர் பற்றி",
    noDescription:
      "இந்த பணியாளர் இன்னும் சேவை விவரத்தைச் சேர்க்கவில்லை.",
    serviceInformation: "சேவை தகவல்",
    category: "சேவை வகை",
    availability: "கிடைக்கும் நிலை",
    customerReviews:
      "வாடிக்கையாளர் மதிப்புரைகள்",
    noReviews:
      "இன்னும் மதிப்புரைகள் இல்லை",
    noReviewsText:
      "இந்த பணியாளருக்கு இன்னும் வாடிக்கையாளர் மதிப்புரை கிடைக்கவில்லை.",
    anonymousCustomer:
      "FixMate வாடிக்கையாளர்",
    bookService:
      "இந்த பணியாளரை முன்பதிவு செய்யுங்கள்",
    unavailableButton:
      "பணியாளர் தற்போது கிடைக்கவில்லை",
  },

  si: {
    back: "ආපසු",
    title: "සේවා සපයන්නාගේ පැතිකඩ",
    loading:
      "සේවා සපයන්නාගේ පැතිකඩ පූරණය වෙමින්...",
    loadFailed:
      "සේවා සපයන්නාගේ පැතිකඩ පූරණය කළ නොහැක.",
    tryAgain: "නැවත උත්සාහ කරන්න",
    verified:
      "තහවුරු කළ සේවා සපයන්නා",
    notVerified:
      "තවම තහවුරු කර නැත",
    verificationTitle:
      "සේවා සපයන්නා තහවුරු කිරීම",
    verifiedExplanation:
      "FixMate විසින් මෙම සේවා සපයන්නාගේ පැතිකඩ තොරතුරු සමාලෝචනය කර ඇත. සේවාව ආරම්භ කිරීමට පෙර කාර්යය, මිල සහ ආරක්ෂක අවශ්‍යතා සාකච්ඡා කරන්න.",
    notVerifiedExplanation:
      "FixMate විසින් මෙම සේවා සපයන්නාගේ තහවුරු කිරීම තවම අවසන් කර නැත. වෙන්කර ගැනීමට පෙර ඇගයීම් පරීක්ෂා කර සියලු කාර්ය විස්තර හොඳින් සාකච්ඡා කරන්න.",
    available:
      "වෙන්කිරීම් සඳහා ලබා ගත හැක",
    unavailable:
      "දැනට සේවාව සඳහා ලබා ගත නොහැක",
    location: "ස්ථානය",
    experience: "පළපුරුද්ද",
    years: "වසර",
    rating: "ඇගයීම",
    newWorker: "නව සේවා සපයන්නෙක්",
    startingPrice: "ආරම්භක මිල",
    about:
      "මෙම සේවා සපයන්නා ගැන",
    noDescription:
      "මෙම සේවා සපයන්නා තවම සේවා විස්තරයක් එකතු කර නැත.",
    serviceInformation: "සේවා තොරතුරු",
    category: "සේවා වර්ගය",
    availability: "ලබාගත හැකි තත්ත්වය",
    customerReviews:
      "පාරිභෝගික සමාලෝචන",
    noReviews:
      "තවම සමාලෝචන නොමැත",
    noReviewsText:
      "මෙම සේවා සපයන්නාට තවම පාරිභෝගික සමාලෝචනයක් ලැබී නැත.",
    anonymousCustomer:
      "FixMate පාරිභෝගිකයා",
    bookService:
      "මෙම සේවා සපයන්නා වෙන්කර ගන්න",
    unavailableButton:
      "සේවා සපයන්නා දැනට ලබා ගත නොහැක",
  },
};

const normalizeParameter = (
  value: string | string[] | undefined
): string => {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
};

export default function WorkerDetailsScreen() {
  const params = useLocalSearchParams<{
    id?: string | string[];
  }>();

  const workerId = normalizeParameter(params.id);

  const {
    language,
    languageName,
  } = useLanguage();

  const text = screenTranslations[language];

  const [worker, setWorker] =
    useState<WorkerDetails | null>(null);

  const [reviews, setReviews] = useState<
    WorkerReview[]
  >([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const loadWorker = async (
    refreshing = false
  ) => {
    if (!workerId) {
      setErrorMessage(text.loadFailed);
      setIsLoading(false);
      return;
    }

    if (refreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setErrorMessage("");

    try {
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
        .eq("id", workerId)
        .single();

      if (workerError || !workerData) {
        console.error(
          "Worker profile loading error:",
          workerError
        );

        setErrorMessage(text.loadFailed);
        return;
      }

      setWorker(workerData as WorkerDetails);

      const {
        data: reviewData,
        error: reviewError,
      } = await supabase
        .from("reviews")
        .select(
          "id, customer_id, rating, comment, created_at"
        )
        .eq("worker_id", workerId)
        .order("created_at", {
          ascending: false,
        })
        .limit(10);

      if (reviewError) {
        console.error(
          "Worker reviews loading error:",
          reviewError
        );

        setReviews([]);
        return;
      }

      const rawReviews =
        (reviewData ?? []) as RawReview[];

      const customerIds = [
        ...new Set(
          rawReviews.map(
            (review) => review.customer_id
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
          .select("id, full_name")
          .in("id", customerIds);

        if (customerError) {
          console.error(
            "Review customer loading error:",
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

      const preparedReviews: WorkerReview[] =
        rawReviews.map((review) => {
          const customer = customerMap.get(
            review.customer_id
          );

          return {
            ...review,
            customer_name:
              customer?.full_name ||
              text.anonymousCustomer,
          };
        });

      setReviews(preparedReviews);
    } catch (error) {
      console.error(
        "Unexpected worker details error:",
        error
      );

      setErrorMessage(text.loadFailed);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void loadWorker();
  }, [workerId, language]);

  const price = useMemo(() => {
    const value = Number(worker?.base_price ?? 0);

    return Number.isNaN(value) ? 0 : value;
  }, [worker]);

  const rating = useMemo(() => {
    const value = Number(
      worker?.average_rating ?? 0
    );

    return Number.isNaN(value) ? 0 : value;
  }, [worker]);

  const formatReviewDate = (
    dateValue: string
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

    return date.toLocaleDateString(locale, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const openBookingScreen = () => {
    if (!worker || !worker.is_available) {
      return;
    }

    router.push({
      pathname: "/book/[workerId]",
      params: {
        workerId: worker.id,
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
            {text.loading}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!worker || errorMessage !== "") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>
            ⚠️
          </Text>

          <Text style={styles.errorTitle}>
            {text.loadFailed}
          </Text>

          <Pressable
            style={styles.retryButton}
            onPress={() => loadWorker()}
          >
            <Text style={styles.retryButtonText}>
              {text.tryAgain}
            </Text>
          </Pressable>

          <Pressable
            style={styles.returnButton}
            onPress={() => router.back()}
          >
            <Text style={styles.returnButtonText}>
              ← {text.back}
            </Text>
          </Pressable>
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
            onRefresh={() => loadWorker(true)}
            colors={["#6D28D9"]}
          />
        }
      >
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
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

        <Text style={styles.screenTitle}>
          {text.title}
        </Text>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              🛠️
            </Text>
          </View>

          <Text style={styles.workerName}>
            {worker.full_name}
          </Text>

          <Text style={styles.workerCategory}>
            {worker.category}
          </Text>

          <Text style={styles.workerTown}>
            📍 {worker.town}
          </Text>

          <View style={styles.badgeRow}>
            <View
              style={[
                styles.badge,
                worker.is_verified
                  ? styles.verifiedBadge
                  : styles.unverifiedBadge,
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  worker.is_verified
                    ? styles.verifiedText
                    : styles.unverifiedText,
                ]}
              >
                {worker.is_verified
                  ? "✓ " + text.verified
                  : "○ " + text.notVerified}
              </Text>
            </View>

            <View
              style={[
                styles.badge,
                worker.is_available
                  ? styles.availableBadge
                  : styles.unavailableBadge,
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  worker.is_available
                    ? styles.availableText
                    : styles.unavailableText,
                ]}
              >
                {worker.is_available
                  ? "● " + text.available
                  : "○ " + text.unavailable}
              </Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>
                {text.experience}
              </Text>

              <Text style={styles.statValue}>
                {worker.experience_years}{" "}
                {text.years}
              </Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>
                {text.rating}
              </Text>

              <Text style={styles.statValue}>
                {rating > 0
                  ? "⭐ " + rating.toFixed(1)
                  : text.newWorker}
              </Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>
                {text.startingPrice}
              </Text>

              <Text style={styles.priceValue}>
                LKR {price.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        <View
          style={[
            styles.verificationCard,
            worker.is_verified
              ? styles.verifiedInformationCard
              : styles.unverifiedInformationCard,
          ]}
        >
          <Text style={styles.verificationIcon}>
            {worker.is_verified ? "🛡️" : "ℹ️"}
          </Text>

          <View style={styles.verificationInformation}>
            <Text style={styles.verificationTitle}>
              {text.verificationTitle}
            </Text>

            <Text style={styles.verificationText}>
              {worker.is_verified
                ? text.verifiedExplanation
                : text.notVerifiedExplanation}
            </Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>
            {text.about}
          </Text>

          <Text style={styles.description}>
            {worker.description ||
              text.noDescription}
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>
            {text.serviceInformation}
          </Text>

          <View style={styles.informationRow}>
            <Text style={styles.informationLabel}>
              {text.category}
            </Text>

            <Text style={styles.informationValue}>
              {worker.category}
            </Text>
          </View>

          <View style={styles.informationRow}>
            <Text style={styles.informationLabel}>
              {text.location}
            </Text>

            <Text style={styles.informationValue}>
              {worker.town}
            </Text>
          </View>

          <View style={styles.informationRow}>
            <Text style={styles.informationLabel}>
              {text.availability}
            </Text>

            <Text
              style={[
                styles.informationValue,
                worker.is_available
                  ? styles.availableValue
                  : styles.unavailableValue,
              ]}
            >
              {worker.is_available
                ? text.available
                : text.unavailable}
            </Text>
          </View>
        </View>

        <View style={styles.reviewsHeader}>
          <Text style={styles.reviewsTitle}>
            {text.customerReviews}
          </Text>

          <Text style={styles.reviewCount}>
            {reviews.length}
          </Text>
        </View>

        {reviews.length === 0 ? (
          <View style={styles.emptyReviewCard}>
            <Text style={styles.emptyReviewIcon}>
              ⭐
            </Text>

            <Text style={styles.emptyReviewTitle}>
              {text.noReviews}
            </Text>

            <Text style={styles.emptyReviewText}>
              {text.noReviewsText}
            </Text>
          </View>
        ) : (
          reviews.map((review) => {
            const reviewRating = Number(
              review.rating
            );

            return (
              <View
                key={review.id}
                style={styles.reviewCard}
              >
                <View style={styles.reviewTopRow}>
                  <View style={styles.reviewAvatar}>
                    <Text style={styles.reviewAvatarText}>
                      👤
                    </Text>
                  </View>

                  <View style={styles.reviewInformation}>
                    <Text style={styles.reviewerName}>
                      {review.customer_name}
                    </Text>

                    <Text style={styles.reviewDate}>
                      {formatReviewDate(
                        review.created_at
                      )}
                    </Text>
                  </View>

                  <Text style={styles.reviewRating}>
                    ⭐{" "}
                    {Number.isNaN(reviewRating)
                      ? "0"
                      : reviewRating.toFixed(1)}
                  </Text>
                </View>

                {review.comment &&
                  review.comment.trim() !== "" && (
                    <Text style={styles.reviewComment}>
                      {review.comment}
                    </Text>
                  )}
              </View>
            );
          })
        )}

        <Pressable
          style={({ pressed }) => [
            styles.bookingButton,
            pressed && styles.pressedButton,
            !worker.is_available &&
              styles.disabledButton,
          ]}
          onPress={openBookingScreen}
          disabled={!worker.is_available}
        >
          <Text style={styles.bookingButtonText}>
            {worker.is_available
              ? text.bookService
              : text.unavailableButton}
          </Text>
        </Pressable>
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

  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },

  errorIcon: {
    fontSize: 48,
  },

  errorTitle: {
    marginTop: 14,
    fontSize: 19,
    fontWeight: "800",
    textAlign: "center",
    color: "#1F2937",
  },

  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 13,
    marginTop: 20,
    borderRadius: 10,
    backgroundColor: "#6D28D9",
  },

  retryButtonText: {
    fontWeight: "800",
    color: "#FFFFFF",
  },

  returnButton: {
    paddingVertical: 14,
    marginTop: 5,
  },

  returnButtonText: {
    fontWeight: "700",
    color: "#6D28D9",
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

  screenTitle: {
    marginTop: 22,
    fontSize: 29,
    fontWeight: "800",
    color: "#1F2937",
  },

  profileCard: {
    alignItems: "center",
    padding: 21,
    marginTop: 18,
    borderWidth: 1,
    borderColor: "#DDD6FE",
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
  },

  avatar: {
    width: 84,
    height: 84,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 42,
    backgroundColor: "#EDE9FE",
  },

  avatarText: {
    fontSize: 42,
  },

  workerName: {
    marginTop: 14,
    fontSize: 23,
    fontWeight: "800",
    textAlign: "center",
    color: "#1F2937",
  },

  workerCategory: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: "700",
    color: "#6D28D9",
  },

  workerTown: {
    marginTop: 6,
    fontSize: 13,
    color: "#6B7280",
  },

  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 15,
    marginHorizontal: -4,
  },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginHorizontal: 4,
    marginBottom: 7,
    borderRadius: 15,
  },

  badgeText: {
    fontSize: 10,
    fontWeight: "800",
  },

  verifiedBadge: {
    backgroundColor: "#D1FAE5",
  },

  verifiedText: {
    color: "#047857",
  },

  unverifiedBadge: {
    backgroundColor: "#FEF3C7",
  },

  unverifiedText: {
    color: "#92400E",
  },

  availableBadge: {
    backgroundColor: "#DBEAFE",
  },

  availableText: {
    color: "#1D4ED8",
  },

  unavailableBadge: {
    backgroundColor: "#FEE2E2",
  },

  unavailableText: {
    color: "#B91C1C",
  },

  statsRow: {
    flexDirection: "row",
    width: "100%",
    paddingTop: 17,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },

  statCard: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 4,
  },

  statLabel: {
    fontSize: 10,
    textAlign: "center",
    color: "#9CA3AF",
  },

  statValue: {
    marginTop: 5,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    color: "#374151",
  },

  priceValue: {
    marginTop: 5,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
    color: "#047857",
  },

  verificationCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 13,
  },

  verifiedInformationCard: {
    borderColor: "#86EFAC",
    backgroundColor: "#F0FDF4",
  },

  unverifiedInformationCard: {
    borderColor: "#FCD34D",
    backgroundColor: "#FFFBEB",
  },

  verificationIcon: {
    marginRight: 11,
    fontSize: 23,
  },

  verificationInformation: {
    flex: 1,
  },

  verificationTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1F2937",
  },

  verificationText: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 19,
    color: "#4B5563",
  },

  sectionCard: {
    padding: 18,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1F2937",
  },

  description: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 22,
    color: "#4B5563",
  },

  informationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },

  informationLabel: {
    flex: 1,
    paddingRight: 10,
    fontSize: 13,
    color: "#6B7280",
  },

  informationValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "right",
    color: "#374151",
  },

  availableValue: {
    color: "#047857",
  },

  unavailableValue: {
    color: "#B91C1C",
  },

  reviewsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 25,
    marginBottom: 12,
  },

  reviewsTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#1F2937",
  },

  reviewCount: {
    color: "#6B7280",
  },

  emptyReviewCard: {
    alignItems: "center",
    padding: 30,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
  },

  emptyReviewIcon: {
    fontSize: 35,
  },

  emptyReviewTitle: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "800",
    color: "#1F2937",
  },

  emptyReviewText: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    color: "#6B7280",
  },

  reviewCard: {
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
  },

  reviewTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  reviewAvatar: {
    width: 39,
    height: 39,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: "#EDE9FE",
  },

  reviewAvatarText: {
    fontSize: 19,
  },

  reviewInformation: {
    flex: 1,
    marginLeft: 10,
  },

  reviewerName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1F2937",
  },

  reviewDate: {
    marginTop: 3,
    fontSize: 10,
    color: "#9CA3AF",
  },

  reviewRating: {
    fontSize: 13,
    fontWeight: "800",
    color: "#92400E",
  },

  reviewComment: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 20,
    color: "#4B5563",
  },

  bookingButton: {
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    borderRadius: 12,
    backgroundColor: "#6D28D9",
  },

  bookingButtonText: {
    paddingHorizontal: 12,
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
    color: "#FFFFFF",
  },

  pressedButton: {
    opacity: 0.82,
  },

  disabledButton: {
    backgroundColor: "#9CA3AF",
    opacity: 0.65,
  },
});