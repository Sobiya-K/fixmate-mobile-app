import DateTimePicker, {
    DateTimePickerEvent,
  } from "@react-native-community/datetimepicker";
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
  
  type WorkerSummary = {
    id: string;
    full_name: string;
    category: string;
    town: string;
    base_price: number;
    is_available: boolean;
  };
  
  type PickerMode = "date" | "time";
  
  const createInitialBookingDate = () => {
    const date = new Date();
  
    date.setDate(date.getDate() + 1);
    date.setHours(10, 0, 0, 0);
  
    return date;
  };
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  
  export default function BookingScreen() {
    const { workerId } = useLocalSearchParams<{
      workerId: string | string[];
    }>();
  
    const selectedWorkerId = Array.isArray(workerId)
      ? workerId[0]
      : workerId;
  
    const [worker, setWorker] = useState<WorkerSummary | null>(
      null
    );
  
    const [serviceDescription, setServiceDescription] =
      useState("");
  
    const [serviceAddress, setServiceAddress] = useState("");
  
    const [preferredDate, setPreferredDate] = useState(
      createInitialBookingDate
    );
  
    const [pickerMode, setPickerMode] =
      useState<PickerMode>("date");
  
    const [showPicker, setShowPicker] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
  
    useEffect(() => {
      loadBookingPage();
    }, [selectedWorkerId]);
  
    const loadBookingPage = async () => {
      if (!selectedWorkerId) {
        setErrorMessage("The selected worker ID is missing.");
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
  
        const { data: profile, error: profileError } =
          await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();
  
        if (profileError || !profile) {
          console.error(
            "Customer profile loading error:",
            profileError
          );
  
          setErrorMessage(
            "Your customer profile could not be loaded."
          );
  
          return;
        }
  
        if (profile.role !== "customer") {
          Alert.alert(
            "Customer account required",
            "Only customer accounts can create booking requests.",
            [
              {
                text: "Return",
                onPress: () =>
                  router.replace("/worker-dashboard"),
              },
            ]
          );
  
          return;
        }
  
        const { data: workerData, error: workerError } =
          await supabase
            .from("worker_profiles")
            .select(
              `
                id,
                full_name,
                category,
                town,
                base_price,
                is_available
              `
            )
            .eq("id", selectedWorkerId)
            .single();
  
        if (workerError || !workerData) {
          console.error("Worker loading error:", workerError);
  
          setErrorMessage(
            workerError?.message ??
              "The selected worker could not be loaded."
          );
  
          return;
        }
  
        setWorker(workerData as WorkerSummary);
      } catch (error) {
        console.error("Booking page error:", error);
  
        setErrorMessage(
          "Something went wrong while opening the booking form."
        );
      } finally {
        setIsLoading(false);
      }
    };
  
    const openDatePicker = () => {
      setPickerMode("date");
      setShowPicker(true);
    };
  
    const openTimePicker = () => {
      setPickerMode("time");
      setShowPicker(true);
    };
  
    const handleDateTimeChange = (
      event: DateTimePickerEvent,
      selectedDate?: Date
    ) => {
      if (Platform.OS === "android") {
        setShowPicker(false);
      }
  
      if (event.type === "dismissed" || !selectedDate) {
        return;
      }
  
      const updatedDate = new Date(preferredDate);
  
      if (pickerMode === "date") {
        updatedDate.setFullYear(
          selectedDate.getFullYear(),
          selectedDate.getMonth(),
          selectedDate.getDate()
        );
      } else {
        updatedDate.setHours(
          selectedDate.getHours(),
          selectedDate.getMinutes(),
          0,
          0
        );
      }
  
      setPreferredDate(updatedDate);
    };
  
    const validateBooking = () => {
      if (!worker) {
        Alert.alert(
          "Worker unavailable",
          "The selected worker could not be loaded."
        );
  
        return false;
      }
  
      if (!worker.is_available) {
        Alert.alert(
          "Worker unavailable",
          "This worker is currently unavailable for bookings."
        );
  
        return false;
      }
  
      if (!serviceDescription.trim()) {
        Alert.alert(
          "Service description required",
          "Please explain the service or repair you need."
        );
  
        return false;
      }
  
      if (serviceDescription.trim().length < 10) {
        Alert.alert(
          "Add more details",
          "Please provide at least 10 characters describing the work."
        );
  
        return false;
      }
  
      if (!serviceAddress.trim()) {
        Alert.alert(
          "Address required",
          "Please enter the location where the service is needed."
        );
  
        return false;
      }
  
      if (preferredDate.getTime() <= Date.now()) {
        Alert.alert(
          "Invalid date",
          "Please select a future date and time."
        );
  
        return false;
      }
  
      return true;
    };
  
    const handleSubmitBooking = async () => {
      if (!validateBooking() || !worker) {
        return;
      }
  
      setIsSubmitting(true);
  
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
  
        if (!user) {
          Alert.alert(
            "Session expired",
            "Please log in again before creating a booking."
          );
  
          router.replace("/login");
          return;
        }
  
        const { error } = await supabase
          .from("bookings")
          .insert({
            customer_id: user.id,
            worker_id: worker.id,
            service_category: worker.category,
            service_description:
              serviceDescription.trim(),
            service_address: serviceAddress.trim(),
            preferred_date: preferredDate.toISOString(),
            estimated_price: Number(worker.base_price),
            status: "pending",
          });
  
        if (error) {
          console.error("Booking creation error:", error);
  
          Alert.alert(
            "Booking failed",
            error.message
          );
  
          return;
        }
  
        Alert.alert(
          "Booking request sent",
          `Your request has been sent to ${worker.full_name}. The current status is pending.`,
          [
            {
              text: "Back to Dashboard",
              onPress: () =>
                router.replace("/customer-dashboard"),
            },
          ]
        );
      } catch (error) {
        console.error("Unexpected booking error:", error);
  
        Alert.alert(
          "Unexpected error",
          "Something went wrong while creating the booking."
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
              Preparing your booking...
            </Text>
          </View>
        </SafeAreaView>
      );
    }
  
    if (errorMessage || !worker) {
      return (
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centerContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
  
            <Text style={styles.errorTitle}>
              Booking form unavailable
            </Text>
  
            <Text style={styles.errorText}>
              {errorMessage}
            </Text>
  
            <Pressable
              style={styles.retryButton}
              onPress={loadBookingPage}
            >
              <Text style={styles.retryButtonText}>
                Try Again
              </Text>
            </Pressable>
  
            <Pressable
              style={styles.backLink}
              onPress={() => router.back()}
            >
              <Text style={styles.backLinkText}>Go Back</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      );
    }
  
    const price = Number(worker.base_price);
  
    return (
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={
            Platform.OS === "ios" ? "padding" : undefined
          }
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Pressable
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Text style={styles.backText}>
                ← Back to worker
              </Text>
            </Pressable>
  
            <Text style={styles.title}>
              Request Service
            </Text>
  
            <Text style={styles.subtitle}>
              Provide the details needed by the worker.
            </Text>
  
            <View style={styles.workerCard}>
              <View style={styles.workerIconContainer}>
                <Text style={styles.workerIcon}>🛠️</Text>
              </View>
  
              <View style={styles.workerDetails}>
                <Text style={styles.workerName}>
                  {worker.full_name}
                </Text>
  
                <Text style={styles.workerCategory}>
                  {worker.category}
                </Text>
  
                <Text style={styles.workerTown}>
                  📍 {worker.town}
                </Text>
              </View>
            </View>
  
            {!worker.is_available && (
              <View style={styles.warningCard}>
                <Text style={styles.warningText}>
                  This worker is currently unavailable.
                </Text>
              </View>
            )}
  
            <Text style={styles.sectionTitle}>
              Service details
            </Text>
  
            <Text style={styles.label}>
              Describe the required service *
            </Text>
  
            <TextInput
              style={[styles.input, styles.textArea]}
              value={serviceDescription}
              onChangeText={setServiceDescription}
              placeholder="Example: The kitchen socket is not working and sometimes produces a burning smell."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              maxLength={500}
            />
  
            <Text style={styles.characterCount}>
              {serviceDescription.length}/500
            </Text>
  
            <Text style={styles.label}>
              Service address *
            </Text>
  
            <TextInput
              style={[styles.input, styles.addressInput]}
              value={serviceAddress}
              onChangeText={setServiceAddress}
              placeholder="Enter the town and service location"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              maxLength={250}
            />
  
            <Text style={styles.sectionTitle}>
              Preferred schedule
            </Text>
  
            <View style={styles.scheduleRow}>
              <Pressable
                style={styles.scheduleButton}
                onPress={openDatePicker}
              >
                <Text style={styles.scheduleLabel}>Date</Text>
  
                <Text style={styles.scheduleValue}>
                  📅 {formatDate(preferredDate)}
                </Text>
              </Pressable>
  
              <Pressable
                style={styles.scheduleButton}
                onPress={openTimePicker}
              >
                <Text style={styles.scheduleLabel}>Time</Text>
  
                <Text style={styles.scheduleValue}>
                  🕐 {formatTime(preferredDate)}
                </Text>
              </Pressable>
            </View>
  
            {showPicker && (
              <DateTimePicker
                value={preferredDate}
                mode={pickerMode}
                display="default"
                minimumDate={
                  pickerMode === "date"
                    ? new Date()
                    : undefined
                }
                onChange={handleDateTimeChange}
              />
            )}
  
            <View style={styles.priceCard}>
              <View>
                <Text style={styles.priceLabel}>
                  Estimated starting price
                </Text>
  
                <Text style={styles.priceValue}>
                  LKR {price.toLocaleString()}
                </Text>
              </View>
  
              <Text style={styles.priceNote}>
                The final price can change after the worker
                inspects the required work.
              </Text>
            </View>
  
            <View style={styles.statusCard}>
              <Text style={styles.statusIcon}>ℹ️</Text>
  
              <Text style={styles.statusText}>
                After submitting, the booking status will be
                pending until the worker accepts or rejects it.
              </Text>
            </View>
  
            <Pressable
              style={({ pressed }) => [
                styles.submitButton,
                pressed && styles.pressedButton,
                (isSubmitting || !worker.is_available) &&
                  styles.disabledButton,
              ]}
              onPress={handleSubmitBooking}
              disabled={
                isSubmitting || !worker.is_available
              }
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>
                  Send Booking Request
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
      paddingBottom: 45,
    },
    centerContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 30,
    },
    loadingText: {
      marginTop: 14,
      fontSize: 14,
      color: "#6B7280",
    },
    backButton: {
      alignSelf: "flex-start",
      paddingVertical: 10,
      marginBottom: 10,
    },
    backText: {
      fontSize: 15,
      fontWeight: "700",
      color: "#6D28D9",
    },
    title: {
      fontSize: 30,
      fontWeight: "800",
      color: "#1F2937",
    },
    subtitle: {
      marginTop: 7,
      marginBottom: 21,
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
      borderRadius: 15,
      backgroundColor: "#FFFFFF",
    },
    workerIconContainer: {
      width: 57,
      height: 57,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 29,
      backgroundColor: "#EDE9FE",
    },
    workerIcon: {
      fontSize: 28,
    },
    workerDetails: {
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
      fontSize: 14,
      fontWeight: "700",
      color: "#6D28D9",
    },
    workerTown: {
      marginTop: 4,
      fontSize: 13,
      color: "#6B7280",
    },
    warningCard: {
      padding: 14,
      marginTop: 13,
      borderWidth: 1,
      borderColor: "#FCA5A5",
      borderRadius: 11,
      backgroundColor: "#FEF2F2",
    },
    warningText: {
      fontSize: 13,
      fontWeight: "700",
      color: "#B91C1C",
    },
    sectionTitle: {
      marginTop: 26,
      marginBottom: 3,
      fontSize: 19,
      fontWeight: "800",
      color: "#6D28D9",
    },
    label: {
      marginTop: 14,
      marginBottom: 7,
      fontSize: 14,
      fontWeight: "700",
      color: "#374151",
    },
    input: {
      width: "100%",
      paddingHorizontal: 15,
      borderWidth: 1,
      borderColor: "#D1D5DB",
      borderRadius: 11,
      backgroundColor: "#FFFFFF",
      fontSize: 15,
      color: "#111827",
    },
    textArea: {
      minHeight: 125,
      paddingTop: 14,
    },
    addressInput: {
      minHeight: 90,
      paddingTop: 14,
    },
    characterCount: {
      marginTop: 5,
      fontSize: 11,
      textAlign: "right",
      color: "#9CA3AF",
    },
    scheduleRow: {
      flexDirection: "row",
      gap: 11,
      marginTop: 13,
    },
    scheduleButton: {
      flex: 1,
      padding: 15,
      borderWidth: 1,
      borderColor: "#C4B5FD",
      borderRadius: 12,
      backgroundColor: "#FFFFFF",
    },
    scheduleLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: "#6B7280",
    },
    scheduleValue: {
      marginTop: 7,
      fontSize: 14,
      fontWeight: "800",
      color: "#1F2937",
    },
    priceCard: {
      padding: 19,
      marginTop: 23,
      borderWidth: 1,
      borderColor: "#C4B5FD",
      borderRadius: 14,
      backgroundColor: "#EDE9FE",
    },
    priceLabel: {
      fontSize: 13,
      color: "#6B7280",
    },
    priceValue: {
      marginTop: 5,
      fontSize: 24,
      fontWeight: "800",
      color: "#6D28D9",
    },
    priceNote: {
      marginTop: 8,
      fontSize: 12,
      lineHeight: 18,
      color: "#6B7280",
    },
    statusCard: {
      flexDirection: "row",
      padding: 15,
      marginTop: 15,
      borderWidth: 1,
      borderColor: "#BFDBFE",
      borderRadius: 12,
      backgroundColor: "#EFF6FF",
    },
    statusIcon: {
      marginRight: 9,
      fontSize: 17,
    },
    statusText: {
      flex: 1,
      fontSize: 12,
      lineHeight: 18,
      color: "#1E40AF",
    },
    submitButton: {
      minHeight: 56,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 21,
      borderRadius: 13,
      backgroundColor: "#6D28D9",
    },
    submitButtonText: {
      fontSize: 17,
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
    errorTitle: {
      marginTop: 13,
      fontSize: 20,
      fontWeight: "800",
      textAlign: "center",
      color: "#1F2937",
    },
    errorText: {
      marginTop: 8,
      fontSize: 14,
      lineHeight: 21,
      textAlign: "center",
      color: "#6B7280",
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
    backLink: {
      padding: 15,
    },
    backLinkText: {
      fontWeight: "700",
      color: "#6D28D9",
    },
  });