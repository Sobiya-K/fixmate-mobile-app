import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  LanguageCode,
  useLanguage,
} from "@/contexts/LanguageContext";

import { supabase } from "@/lib/supabase";

type BookingDetails = {
  id: string;
  customer_id: string;
  worker_id: string;
  service_category: string;
  status: string;
};

type WorkerDetails = {
  id: string;
  full_name: string | null;
  category: string | null;
  town: string | null;
};

type ScreenText = {
  back: string;
  title: string;
  subtitle: string;
  loading: string;
  loadFailed: string;
  tryAgain: string;
  worker: string;
  service: string;
  location: string;
  ratingTitle: string;
  ratingHelp: string;
  commentTitle: string;
  optional: string;
  commentPlaceholder: string;
  submit: string;
  submitting: string;
  ratingRequiredTitle: string;
  ratingRequiredMessage: string;
  completedOnlyTitle: string;
  completedOnlyMessage: string;
  alreadyReviewedTitle: string;
  alreadyReviewedMessage: string;
  loginRequired: string;
  customerOnly: string;
  reviewFailed: string;
  unexpectedError: string;
  successTitle: string;
  successMessage: string;
  backToBookings: string;
  poor: string;
  fair: string;
  good: string;
  veryGood: string;
  excellent: string;
};

const screenTranslations: Record<
  LanguageCode,
  ScreenText
> = {
  en: {
    back: "Back",
    title: "Rate Your Experience",
    subtitle:
      "Your review helps other customers choose reliable skilled workers.",
    loading: "Loading review information...",
    loadFailed:
      "The booking information could not be loaded.",
    tryAgain: "Try Again",
    worker: "Worker",
    service: "Service",
    location: "Location",
    ratingTitle: "Your rating",
    ratingHelp:
      "Tap a star to select your rating.",
    commentTitle: "Your review",
    optional: "Optional",
    commentPlaceholder:
      "Share your experience with this worker",
    submit: "Submit Review",
    submitting: "Submitting review...",
    ratingRequiredTitle: "Select a rating",
    ratingRequiredMessage:
      "Please select between 1 and 5 stars.",
    completedOnlyTitle:
      "Review unavailable",
    completedOnlyMessage:
      "A review can only be submitted after the booking has been completed.",
    alreadyReviewedTitle:
      "Review already submitted",
    alreadyReviewedMessage:
      "You have already reviewed this booking.",
    loginRequired:
      "Please log in before submitting a review.",
    customerOnly:
      "Only customer accounts can submit reviews.",
    reviewFailed: "Review failed",
    unexpectedError:
      "Something went wrong while submitting the review.",
    successTitle: "Review submitted",
    successMessage:
      "Thank you. Your review was submitted successfully.",
    backToBookings: "Back to My Bookings",
    poor: "Poor",
    fair: "Fair",
    good: "Good",
    veryGood: "Very Good",
    excellent: "Excellent",
  },

  ta: {
    back: "பின்செல்",
    title: "உங்கள் அனுபவத்தை மதிப்பிடுங்கள்",
    subtitle:
      "உங்கள் மதிப்புரை மற்ற வாடிக்கையாளர்கள் நம்பகமான பணியாளர்களைத் தேர்ந்தெடுக்க உதவும்.",
    loading:
      "மதிப்புரை தகவல் ஏற்றப்படுகிறது...",
    loadFailed:
      "முன்பதிவு தகவலை ஏற்ற முடியவில்லை.",
    tryAgain: "மீண்டும் முயற்சிக்கவும்",
    worker: "பணியாளர்",
    service: "சேவை",
    location: "இடம்",
    ratingTitle: "உங்கள் மதிப்பீடு",
    ratingHelp:
      "உங்கள் மதிப்பீட்டைத் தேர்ந்தெடுக்க நட்சத்திரத்தைத் தொடவும்.",
    commentTitle: "உங்கள் மதிப்புரை",
    optional: "விருப்பத்திற்குரியது",
    commentPlaceholder:
      "இந்த பணியாளருடன் ஏற்பட்ட அனுபவத்தைப் பகிரவும்",
    submit: "மதிப்புரையை அனுப்புங்கள்",
    submitting:
      "மதிப்புரை அனுப்பப்படுகிறது...",
    ratingRequiredTitle:
      "மதிப்பீட்டைத் தேர்ந்தெடுக்கவும்",
    ratingRequiredMessage:
      "1 முதல் 5 நட்சத்திரங்களுக்குள் தேர்ந்தெடுக்கவும்.",
    completedOnlyTitle:
      "மதிப்புரை வழங்க முடியாது",
    completedOnlyMessage:
      "முன்பதிவு முடிக்கப்பட்ட பின்னரே மதிப்புரையை அனுப்ப முடியும்.",
    alreadyReviewedTitle:
      "மதிப்புரை ஏற்கனவே அனுப்பப்பட்டது",
    alreadyReviewedMessage:
      "இந்த முன்பதிவுக்கு நீங்கள் ஏற்கனவே மதிப்புரை வழங்கியுள்ளீர்கள்.",
    loginRequired:
      "மதிப்புரையை அனுப்புவதற்கு முன் உள்நுழையவும்.",
    customerOnly:
      "வாடிக்கையாளர் கணக்குகள் மட்டுமே மதிப்புரைகளை அனுப்ப முடியும்.",
    reviewFailed:
      "மதிப்புரையை அனுப்ப முடியவில்லை",
    unexpectedError:
      "மதிப்புரையை அனுப்பும்போது ஏதோ தவறு ஏற்பட்டது.",
    successTitle:
      "மதிப்புரை அனுப்பப்பட்டது",
    successMessage:
      "நன்றி. உங்கள் மதிப்புரை வெற்றிகரமாக அனுப்பப்பட்டது.",
    backToBookings:
      "எனது முன்பதிவுகளுக்குத் திரும்பவும்",
    poor: "மோசம்",
    fair: "சுமார்",
    good: "நன்று",
    veryGood: "மிகவும் நன்று",
    excellent: "சிறப்பு",
  },

  si: {
    back: "ආපසු",
    title: "ඔබගේ අත්දැකීම ඇගයීමට ලක් කරන්න",
    subtitle:
      "ඔබගේ සමාලෝචනය වෙනත් පාරිභෝගිකයින්ට විශ්වාසදායක සේවා සපයන්නන් තෝරාගැනීමට උපකාරී වේ.",
    loading:
      "සමාලෝචන තොරතුරු පූරණය වෙමින්...",
    loadFailed:
      "වෙන්කිරීමේ තොරතුරු පූරණය කළ නොහැක.",
    tryAgain: "නැවත උත්සාහ කරන්න",
    worker: "සේවා සපයන්නා",
    service: "සේවාව",
    location: "ස්ථානය",
    ratingTitle: "ඔබගේ ඇගයීම",
    ratingHelp:
      "ඇගයීම තේරීමට තරුවක් ඔබන්න.",
    commentTitle: "ඔබගේ සමාලෝචනය",
    optional: "අත්‍යවශ්‍ය නොවේ",
    commentPlaceholder:
      "මෙම සේවා සපයන්නා සමඟ ඔබගේ අත්දැකීම බෙදාගන්න",
    submit: "සමාලෝචනය යවන්න",
    submitting:
      "සමාලෝචනය යවමින්...",
    ratingRequiredTitle:
      "ඇගයීමක් තෝරන්න",
    ratingRequiredMessage:
      "තරු 1 සිට 5 දක්වා ඇගයීමක් තෝරන්න.",
    completedOnlyTitle:
      "සමාලෝචනය ලබා දිය නොහැක",
    completedOnlyMessage:
      "සමාලෝචනයක් ලබා දිය හැක්කේ වෙන්කිරීම සම්පූර්ණ වූ පසුව පමණි.",
    alreadyReviewedTitle:
      "සමාලෝචනය දැනටමත් යවා ඇත",
    alreadyReviewedMessage:
      "ඔබ මෙම වෙන්කිරීම සඳහා දැනටමත් සමාලෝචනයක් ලබා දී ඇත.",
    loginRequired:
      "සමාලෝචනයක් යැවීමට පෙර පිවිසෙන්න.",
    customerOnly:
      "සමාලෝචන යැවිය හැක්කේ පාරිභෝගික ගිණුම්වලට පමණි.",
    reviewFailed:
      "සමාලෝචනය අසාර්ථකයි",
    unexpectedError:
      "සමාලෝචනය යැවීමේදී දෝෂයක් ඇති විය.",
    successTitle:
      "සමාලෝචනය යවන ලදී",
    successMessage:
      "ස්තූතියි. ඔබගේ සමාලෝචනය සාර්ථකව යවන ලදී.",
    backToBookings:
      "මගේ වෙන්කිරීම් වෙත ආපසු",
    poor: "දුර්වලයි",
    fair: "සාමාන්‍යයි",
    good: "හොඳයි",
    veryGood: "ඉතා හොඳයි",
    excellent: "විශිෂ්ටයි",
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

export default function ReviewScreen() {
  const params = useLocalSearchParams<{
    bookingId?: string | string[];
  }>();

  const bookingId = normalizeParameter(
    params.bookingId
  );

  const {
    language,
    languageName,
  } = useLanguage();

  const text = screenTranslations[language];

  const [booking, setBooking] =
    useState<BookingDetails | null>(null);

  const [worker, setWorker] =
    useState<WorkerDetails | null>(null);

  const [rating, setRating] =
    useState(0);

  const [comment, setComment] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [alreadyReviewed, setAlreadyReviewed] =
    useState(false);

  const loadReviewInformation = async () => {
    if (!bookingId) {
      setErrorMessage(text.loadFailed);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    setAlreadyReviewed(false);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        Alert.alert(
          text.reviewFailed,
          text.loginRequired
        );

        router.replace("/login");
        return;
      }

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
        setErrorMessage(text.loadFailed);
        return;
      }

      if (profileData.role !== "customer") {
        Alert.alert(
          text.reviewFailed,
          text.customerOnly
        );

        router.replace("/");
        return;
      }

      const {
        data: bookingData,
        error: bookingError,
      } = await supabase
        .from("bookings")
        .select(
          "id, customer_id, worker_id, service_category, status"
        )
        .eq("id", bookingId)
        .eq("customer_id", user.id)
        .single();

      if (
        bookingError ||
        !bookingData
      ) {
        console.error(
          "Review booking loading error:",
          bookingError
        );

        setErrorMessage(text.loadFailed);
        return;
      }

      const preparedBooking =
        bookingData as BookingDetails;

      if (
        String(preparedBooking.status)
          .trim()
          .toLowerCase() !== "completed"
      ) {
        Alert.alert(
          text.completedOnlyTitle,
          text.completedOnlyMessage,
          [
            {
              text: text.backToBookings,
              onPress: () =>
                router.replace(
                  "/my-bookings"
                ),
            },
          ]
        );

        return;
      }

      setBooking(preparedBooking);

      const {
        data: existingReview,
        error: existingReviewError,
      } = await supabase
        .from("reviews")
        .select("id")
        .eq("booking_id", bookingId)
        .eq("customer_id", user.id)
        .maybeSingle();

      if (existingReviewError) {
        console.error(
          "Existing review check error:",
          existingReviewError
        );
      }

      if (existingReview) {
        setAlreadyReviewed(true);
      }

      const {
        data: workerData,
        error: workerError,
      } = await supabase
        .from("worker_profiles")
        .select(
          "id, full_name, category, town"
        )
        .eq("id", preparedBooking.worker_id)
        .single();

      if (
        workerError ||
        !workerData
      ) {
        console.error(
          "Review worker loading error:",
          workerError
        );

        setErrorMessage(text.loadFailed);
        return;
      }

      setWorker(workerData as WorkerDetails);
    } catch (error) {
      console.error(
        "Unexpected review loading error:",
        error
      );

      setErrorMessage(text.loadFailed);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadReviewInformation();
  }, [bookingId, language]);

  const ratingLabel = useMemo(() => {
    switch (rating) {
      case 1:
        return text.poor;

      case 2:
        return text.fair;

      case 3:
        return text.good;

      case 4:
        return text.veryGood;

      case 5:
        return text.excellent;

      default:
        return "";
    }
  }, [rating, text]);

  const submitReview = async () => {
    if (!booking || !worker) {
      return;
    }

    if (alreadyReviewed) {
      Alert.alert(
        text.alreadyReviewedTitle,
        text.alreadyReviewedMessage
      );

      return;
    }

    if (rating < 1 || rating > 5) {
      Alert.alert(
        text.ratingRequiredTitle,
        text.ratingRequiredMessage
      );

      return;
    }

    setIsSubmitting(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        Alert.alert(
          text.reviewFailed,
          text.loginRequired
        );

        router.replace("/login");
        return;
      }

      const {
        error: reviewError,
      } = await supabase
        .from("reviews")
        .insert({
          booking_id: booking.id,
          customer_id: user.id,
          worker_id: booking.worker_id,
          rating,
          comment:
            comment.trim() === ""
              ? null
              : comment.trim(),
        });

      if (reviewError) {
        const errorText =
          reviewError.message.toLowerCase();

        if (
          errorText.includes("duplicate") ||
          errorText.includes("unique")
        ) {
          setAlreadyReviewed(true);

          Alert.alert(
            text.alreadyReviewedTitle,
            text.alreadyReviewedMessage
          );

          return;
        }

        Alert.alert(
          text.reviewFailed,
          reviewError.message
        );

        return;
      }

      Alert.alert(
        text.successTitle,
        text.successMessage,
        [
          {
            text: text.backToBookings,
            onPress: () =>
              router.replace(
                "/my-bookings"
              ),
          },
        ]
      );
    } catch (error) {
      console.error(
        "Unexpected review submission error:",
        error
      );

      Alert.alert(
        text.reviewFailed,
        text.unexpectedError
      );
    } finally {
      setIsSubmitting(false);
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

  if (
    errorMessage !== "" ||
    !booking ||
    !worker
  ) {
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
            onPress={loadReviewInformation}
          >
            <Text style={styles.retryButtonText}>
              {text.tryAgain}
            </Text>
          </Pressable>

          <Pressable
            style={styles.backToBookingsButton}
            onPress={() =>
              router.replace("/my-bookings")
            }
          >
            <Text
              style={
                styles.backToBookingsText
              }
            >
              {text.backToBookings}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Pressable
              style={styles.backButton}
              onPress={() => router.back()}
              disabled={isSubmitting}
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
              disabled={isSubmitting}
            >
              <Text style={styles.languageText}>
                🌐 {languageName}
              </Text>
            </Pressable>
          </View>

          <View style={styles.titleSection}>
            <View style={styles.titleIcon}>
              <Text style={styles.titleIconText}>
                ⭐
              </Text>
            </View>

            <Text style={styles.title}>
              {text.title}
            </Text>

            <Text style={styles.subtitle}>
              {text.subtitle}
            </Text>
          </View>

          <View style={styles.workerCard}>
            <View style={styles.workerAvatar}>
              <Text style={styles.workerAvatarText}>
                🛠️
              </Text>
            </View>

            <View style={styles.workerInformation}>
              <Text style={styles.workerName}>
                {worker.full_name ||
                  "FixMate Worker"}
              </Text>

              <Text style={styles.workerCategory}>
                {worker.category ||
                  booking.service_category}
              </Text>

              <Text style={styles.workerTown}>
                📍 {worker.town || "-"}
              </Text>
            </View>
          </View>

          <View style={styles.bookingCard}>
            <View style={styles.informationRow}>
              <Text style={styles.informationLabel}>
                {text.worker}
              </Text>

              <Text style={styles.informationValue}>
                {worker.full_name}
              </Text>
            </View>

            <View style={styles.informationRow}>
              <Text style={styles.informationLabel}>
                {text.service}
              </Text>

              <Text style={styles.informationValue}>
                {booking.service_category}
              </Text>
            </View>

            <View style={styles.informationRow}>
              <Text style={styles.informationLabel}>
                {text.location}
              </Text>

              <Text style={styles.informationValue}>
                {worker.town || "-"}
              </Text>
            </View>
          </View>

          {alreadyReviewed ? (
            <View style={styles.reviewedCard}>
              <Text style={styles.reviewedIcon}>
                ✓
              </Text>

              <Text style={styles.reviewedTitle}>
                {text.alreadyReviewedTitle}
              </Text>

              <Text style={styles.reviewedText}>
                {text.alreadyReviewedMessage}
              </Text>

              <Pressable
                style={styles.returnButton}
                onPress={() =>
                  router.replace(
                    "/my-bookings"
                  )
                }
              >
                <Text
                  style={
                    styles.returnButtonText
                  }
                >
                  {text.backToBookings}
                </Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.ratingCard}>
                <Text style={styles.sectionTitle}>
                  {text.ratingTitle}
                </Text>

                <Text style={styles.ratingHelp}>
                  {text.ratingHelp}
                </Text>

                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map(
                    (starValue) => {
                      const isSelected =
                        starValue <= rating;

                      return (
                        <Pressable
                          key={starValue}
                          style={styles.starButton}
                          onPress={() =>
                            setRating(starValue)
                          }
                          disabled={isSubmitting}
                        >
                          <Text
                            style={[
                              styles.starText,
                              isSelected &&
                                styles.selectedStarText,
                            ]}
                          >
                            {isSelected
                              ? "★"
                              : "☆"}
                          </Text>
                        </Pressable>
                      );
                    }
                  )}
                </View>

                {ratingLabel !== "" && (
                  <View
                    style={
                      styles.ratingLabelBadge
                    }
                  >
                    <Text
                      style={
                        styles.ratingLabelText
                      }
                    >
                      {rating}/5 — {ratingLabel}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.commentCard}>
                <View style={styles.commentTitleRow}>
                  <Text style={styles.sectionTitle}>
                    {text.commentTitle}
                  </Text>

                  <Text style={styles.optionalText}>
                    {text.optional}
                  </Text>
                </View>

                <TextInput
                  style={styles.commentInput}
                  value={comment}
                  onChangeText={setComment}
                  placeholder={
                    text.commentPlaceholder
                  }
                  placeholderTextColor="#9CA3AF"
                  multiline
                  textAlignVertical="top"
                  editable={!isSubmitting}
                  maxLength={500}
                />

                <Text style={styles.characterCount}>
                  {comment.length}/500
                </Text>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.submitButton,
                  pressed &&
                    styles.pressedButton,
                  isSubmitting &&
                    styles.disabledButton,
                ]}
                onPress={submitReview}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <View
                    style={
                      styles.submittingRow
                    }
                  >
                    <ActivityIndicator
                      size="small"
                      color="#FFFFFF"
                    />

                    <Text
                      style={
                        styles.submitButtonText
                      }
                    >
                      {text.submitting}
                    </Text>
                  </View>
                ) : (
                  <Text
                    style={
                      styles.submitButtonText
                    }
                  >
                    {text.submit}
                  </Text>
                )}
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F7F4FF",
  },

  keyboardView: {
    flex: 1,
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
    paddingHorizontal: 23,
    paddingVertical: 13,
    marginTop: 20,
    borderRadius: 10,
    backgroundColor: "#6D28D9",
  },

  retryButtonText: {
    fontWeight: "800",
    color: "#FFFFFF",
  },

  backToBookingsButton: {
    paddingVertical: 14,
  },

  backToBookingsText: {
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

  titleSection: {
    alignItems: "center",
    marginTop: 25,
  },

  titleIcon: {
    width: 72,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 36,
    backgroundColor: "#FEF3C7",
  },

  titleIconText: {
    fontSize: 35,
  },

  title: {
    marginTop: 18,
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    color: "#1F2937",
  },

  subtitle: {
    maxWidth: 330,
    marginTop: 8,
    fontSize: 13,
    lineHeight: 21,
    textAlign: "center",
    color: "#6B7280",
  },

  workerCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 17,
    marginTop: 24,
    borderWidth: 1,
    borderColor: "#DDD6FE",
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
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

  workerName: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1F2937",
  },

  workerCategory: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: "700",
    color: "#6D28D9",
  },

  workerTown: {
    marginTop: 4,
    fontSize: 11,
    color: "#6B7280",
  },

  bookingCard: {
    padding: 17,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
  },

  informationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 9,
  },

  informationLabel: {
    flex: 1,
    paddingRight: 10,
    fontSize: 12,
    color: "#6B7280",
  },

  informationValue: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "right",
    color: "#374151",
  },

  ratingCard: {
    alignItems: "center",
    padding: 20,
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

  ratingHelp: {
    marginTop: 6,
    fontSize: 12,
    textAlign: "center",
    color: "#6B7280",
  },

  starsRow: {
    flexDirection: "row",
    marginTop: 17,
  },

  starButton: {
    paddingHorizontal: 5,
    paddingVertical: 4,
  },

  starText: {
    fontSize: 43,
    color: "#D1D5DB",
  },

  selectedStarText: {
    color: "#F59E0B",
  },

  ratingLabelBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 13,
    borderRadius: 15,
    backgroundColor: "#FEF3C7",
  },

  ratingLabelText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#92400E",
  },

  commentCard: {
    padding: 18,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
  },

  commentTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  optionalText: {
    fontSize: 11,
    color: "#9CA3AF",
  },

  commentInput: {
    minHeight: 130,
    padding: 14,
    marginTop: 13,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 11,
    fontSize: 14,
    lineHeight: 21,
    color: "#111827",
  },

  characterCount: {
    marginTop: 7,
    fontSize: 10,
    textAlign: "right",
    color: "#9CA3AF",
  },

  submitButton: {
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 19,
    borderRadius: 12,
    backgroundColor: "#6D28D9",
  },

  submitButtonText: {
    marginLeft: 7,
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  submittingRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  reviewedCard: {
    alignItems: "center",
    padding: 30,
    marginTop: 15,
    borderWidth: 1,
    borderColor: "#86EFAC",
    borderRadius: 15,
    backgroundColor: "#F0FDF4",
  },

  reviewedIcon: {
    fontSize: 38,
    fontWeight: "800",
    color: "#047857",
  },

  reviewedTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    color: "#047857",
  },

  reviewedText: {
    marginTop: 7,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    color: "#4B5563",
  },

  returnButton: {
    paddingHorizontal: 20,
    paddingVertical: 13,
    marginTop: 18,
    borderRadius: 10,
    backgroundColor: "#6D28D9",
  },

  returnButtonText: {
    fontWeight: "800",
    color: "#FFFFFF",
  },

  pressedButton: {
    opacity: 0.82,
  },

  disabledButton: {
    opacity: 0.55,
  },
});