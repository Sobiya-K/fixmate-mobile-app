import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
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

import { supabase } from "@/lib/supabase";

type BookingSummary = {
  id: string;
  customer_id: string;
  worker_id: string;
  service_category: string;
  status: string;
};

type WorkerSummary = {
  id: string;
  full_name: string;
  category: string;
  town: string;
};

export default function ReviewScreen() {
  const { bookingId } = useLocalSearchParams<{
    bookingId: string | string[];
  }>();

  const selectedBookingId = Array.isArray(bookingId)
    ? bookingId[0]
    : bookingId;

  const [booking, setBooking] =
    useState<BookingSummary | null>(null);

  const [worker, setWorker] =
    useState<WorkerSummary | null>(null);

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const [alreadyReviewed, setAlreadyReviewed] =
    useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    loadReviewPage();
  }, [selectedBookingId]);

  const loadReviewPage = async () => {
    if (!selectedBookingId) {
      setErrorMessage("Booking ID is missing.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

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
            status
          `
        )
        .eq("id", selectedBookingId)
        .eq("customer_id", user.id)
        .single();

      if (bookingError || !bookingData) {
        console.error(
          "Review booking error:",
          bookingError
        );

        setErrorMessage(
          "This booking could not be loaded."
        );

        return;
      }

      const loadedBooking =
        bookingData as BookingSummary;

      if (loadedBooking.status !== "completed") {
        setErrorMessage(
          "Only completed bookings can be reviewed."
        );

        return;
      }

      setBooking(loadedBooking);

      const {
        data: workerData,
        error: workerError,
      } = await supabase
        .from("worker_profiles")
        .select("id, full_name, category, town")
        .eq("id", loadedBooking.worker_id)
        .single();

      if (workerError || !workerData) {
        console.error(
          "Review worker error:",
          workerError
        );

        setErrorMessage(
          "The worker profile could not be loaded."
        );

        return;
      }

      setWorker(workerData as WorkerSummary);

      const {
        data: existingReview,
        error: existingReviewError,
      } = await supabase
        .from("reviews")
        .select("id")
        .eq("booking_id", loadedBooking.id)
        .maybeSingle();

      if (existingReviewError) {
        console.error(
          "Existing review check error:",
          existingReviewError
        );
      }

      setAlreadyReviewed(Boolean(existingReview));
    } catch (error) {
      console.error(
        "Unexpected review page error:",
        error
      );

      setErrorMessage(
        "Something went wrong while opening the review page."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!booking || !worker) {
      return;
    }

    if (rating < 1 || rating > 5) {
      Alert.alert(
        "Rating required",
        "Please select a rating from 1 to 5 stars."
      );

      return;
    }

    if (comment.trim().length < 3) {
      Alert.alert(
        "Comment required",
        "Please write a short comment about the service."
      );

      return;
    }

    setIsSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { error } = await supabase
        .from("reviews")
        .insert({
          booking_id: booking.id,
          customer_id: user.id,
          worker_id: worker.id,
          rating,
          comment: comment.trim(),
        });

      if (error) {
        console.error(
          "Review submission error:",
          error
        );

        if (
          error.code === "23505" ||
          error.message
            .toLowerCase()
            .includes("duplicate")
        ) {
          Alert.alert(
            "Review already submitted",
            "This booking already has a review."
          );

          setAlreadyReviewed(true);
          return;
        }

        Alert.alert(
          "Review submission failed",
          error.message
        );

        return;
      }

      Alert.alert(
        "Review submitted",
        `Thank you for reviewing ${worker.full_name}.`,
        [
          {
            text: "Return to My Bookings",
            onPress: () =>
              router.replace("/my-bookings"),
          },
        ]
      );
    } catch (error) {
      console.error(
        "Unexpected review submission error:",
        error
      );

      Alert.alert(
        "Unexpected error",
        "Something went wrong while submitting the review."
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
            Preparing your review...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (errorMessage !== "") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>

          <Text style={styles.errorTitle}>
            Review unavailable
          </Text>

          <Text style={styles.errorText}>
            {errorMessage}
          </Text>

          <Pressable
            style={styles.backLink}
            onPress={() =>
              router.replace("/my-bookings")
            }
          >
            <Text style={styles.backLinkText}>
              Return to My Bookings
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (alreadyReviewed) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <Text style={styles.successIcon}>✅</Text>

          <Text style={styles.errorTitle}>
            Review already submitted
          </Text>

          <Text style={styles.errorText}>
            Only one review is permitted for each
            completed booking.
          </Text>

          <Pressable
            style={styles.primaryButton}
            onPress={() =>
              router.replace("/my-bookings")
            }
          >
            <Text style={styles.primaryButtonText}>
              Return to My Bookings
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
          keyboardShouldPersistTaps="handled"
        >
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backText}>
              ← Back to My Bookings
            </Text>
          </Pressable>

          <Text style={styles.title}>
            Rate Your Service
          </Text>

          <Text style={styles.subtitle}>
            Your feedback helps customers choose trusted
            workers.
          </Text>

          <View style={styles.workerCard}>
            <View style={styles.workerIcon}>
              <Text style={styles.workerIconText}>🛠️</Text>
            </View>

            <View style={styles.workerInformation}>
              <Text style={styles.workerName}>
                {worker?.full_name}
              </Text>

              <Text style={styles.workerCategory}>
                {worker?.category}
              </Text>

              <Text style={styles.workerTown}>
                📍 {worker?.town}
              </Text>
            </View>
          </View>

          <Text style={styles.label}>
            Your rating *
          </Text>

          <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map((value) => (
              <Pressable
                key={value}
                onPress={() => setRating(value)}
                style={styles.starButton}
              >
                <Text style={styles.star}>
                  {value <= rating ? "★" : "☆"}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.ratingLabel}>
            {rating === 0
              ? "Select a rating"
              : `${rating} out of 5 stars`}
          </Text>

          <Text style={styles.label}>
            Review comment *
          </Text>

          <TextInput
            style={styles.textArea}
            value={comment}
            onChangeText={setComment}
            placeholder="Describe your experience with this worker"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            maxLength={500}
          />

          <Text style={styles.characterCount}>
            {comment.length}/500
          </Text>

          <View style={styles.informationCard}>
            <Text style={styles.informationText}>
              Your rating will update the worker’s public
              average rating.
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.pressedButton,
              isSubmitting &&
                styles.disabledButton,
            ]}
            onPress={handleSubmitReview}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>
                Submit Review
              </Text>
            )}
          </Pressable>
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
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 50,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
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
  title: {
    marginTop: 10,
    fontSize: 30,
    fontWeight: "800",
    color: "#1F2937",
  },
  subtitle: {
    marginTop: 7,
    marginBottom: 22,
    fontSize: 14,
    lineHeight: 21,
    color: "#6B7280",
  },
  workerCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 17,
    borderWidth: 1,
    borderColor: "#DDD6FE",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
  },
  workerIcon: {
    width: 58,
    height: 58,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 29,
    backgroundColor: "#EDE9FE",
  },
  workerIconText: {
    fontSize: 29,
  },
  workerInformation: {
    flex: 1,
    marginLeft: 14,
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
  label: {
    marginTop: 24,
    marginBottom: 9,
    fontSize: 15,
    fontWeight: "800",
    color: "#374151",
  },
  starRow: {
    flexDirection: "row",
    justifyContent: "center",
  },
  starButton: {
    paddingHorizontal: 4,
  },
  star: {
    fontSize: 43,
    color: "#F59E0B",
  },
  ratingLabel: {
    marginTop: 7,
    textAlign: "center",
    color: "#6B7280",
  },
  textArea: {
    minHeight: 135,
    padding: 15,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    fontSize: 15,
    color: "#111827",
  },
  characterCount: {
    marginTop: 5,
    textAlign: "right",
    fontSize: 11,
    color: "#9CA3AF",
  },
  informationCard: {
    padding: 14,
    marginTop: 18,
    borderRadius: 11,
    backgroundColor: "#EFF6FF",
  },
  informationText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#1E40AF",
  },
  primaryButton: {
    minHeight: 55,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
    marginTop: 20,
    borderRadius: 12,
    backgroundColor: "#6D28D9",
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  pressedButton: {
    opacity: 0.8,
  },
  disabledButton: {
    opacity: 0.55,
  },
  errorIcon: {
    fontSize: 44,
  },
  successIcon: {
    fontSize: 44,
  },
  errorTitle: {
    marginTop: 13,
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    color: "#1F2937",
  },
  errorText: {
    marginTop: 8,
    lineHeight: 21,
    textAlign: "center",
    color: "#6B7280",
  },
  backLink: {
    padding: 16,
    marginTop: 12,
  },
  backLinkText: {
    fontWeight: "800",
    color: "#6D28D9",
  },
});