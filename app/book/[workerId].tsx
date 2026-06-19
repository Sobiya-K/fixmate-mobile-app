import DateTimePicker, {
    DateTimePickerAndroid,
    DateTimePickerEvent,
  } from "@react-native-community/datetimepicker";
  
  import {
    router,
    useLocalSearchParams,
  } from "expo-router";
  
  import {
    useEffect,
    useMemo,
    useState,
  } from "react";
  
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
  
  type ScreenText = {
    back: string;
    title: string;
    subtitle: string;
    loadingWorker: string;
    loadFailed: string;
    selectedWorker: string;
    verified: string;
    notVerified: string;
    available: string;
    unavailable: string;
    experience: string;
    years: string;
    rating: string;
    newWorker: string;
    startingPrice: string;
    serviceDescription: string;
    descriptionPlaceholder: string;
    serviceAddress: string;
    addressPlaceholder: string;
    preferredDate: string;
    preferredTime: string;
    selectDate: string;
    selectTime: string;
    changeDate: string;
    changeTime: string;
    done: string;
    bookingSummary: string;
    worker: string;
    service: string;
    selectedDateTime: string;
    estimatedPrice: string;
    bookingStatus: string;
    pending: string;
    submitBooking: string;
    submitting: string;
    validationTitle: string;
    descriptionError: string;
    addressError: string;
    dateRequired: string;
    timeRequired: string;
    futureDateError: string;
    loginRequiredTitle: string;
    loginRequiredMessage: string;
    customerOnlyTitle: string;
    customerOnlyMessage: string;
    unavailableTitle: string;
    unavailableMessage: string;
    bookingFailed: string;
    unexpectedError: string;
    successTitle: string;
    successMessage: string;
    viewBookings: string;
  };
  
  const translations: Record<
    LanguageCode,
    ScreenText
  > = {
    en: {
      back: "Back",
      title: "Book a Service",
      subtitle:
        "Describe the job and select your preferred date and time.",
      loadingWorker:
        "Loading worker information...",
      loadFailed:
        "The selected worker could not be loaded.",
      selectedWorker: "Selected Worker",
      verified: "Verified",
      notVerified: "Not Verified",
      available: "Available",
      unavailable: "Currently unavailable",
      experience: "Experience",
      years: "years",
      rating: "Rating",
      newWorker: "New worker",
      startingPrice: "Starting price",
      serviceDescription: "Service description",
      descriptionPlaceholder:
        "Describe the work you need the worker to complete",
      serviceAddress: "Service address",
      addressPlaceholder:
        "Enter the complete address where the service is required",
      preferredDate: "Preferred date",
      preferredTime: "Preferred time",
      selectDate: "Select Date",
      selectTime: "Select Time",
      changeDate: "Change Date",
      changeTime: "Change Time",
      done: "Done",
      bookingSummary: "Booking Summary",
      worker: "Worker",
      service: "Service",
      selectedDateTime: "Preferred date and time",
      estimatedPrice:
        "Estimated starting price",
      bookingStatus: "Initial booking status",
      pending: "Pending",
      submitBooking: "Submit Booking",
      submitting: "Submitting booking...",
      validationTitle:
        "Check your information",
      descriptionError:
        "Please provide a clear service description of at least 10 characters.",
      addressError:
        "Please provide the complete service address.",
      dateRequired:
        "Please select your preferred date.",
      timeRequired:
        "Please select your preferred time.",
      futureDateError:
        "The preferred date and time must be in the future.",
      loginRequiredTitle: "Login required",
      loginRequiredMessage:
        "Please log in before creating a booking.",
      customerOnlyTitle:
        "Customer account required",
      customerOnlyMessage:
        "Only customer accounts can create bookings.",
      unavailableTitle: "Worker unavailable",
      unavailableMessage:
        "This worker is not currently accepting new bookings.",
      bookingFailed: "Booking failed",
      unexpectedError:
        "Something went wrong while creating the booking.",
      successTitle: "Booking submitted",
      successMessage:
        "Your booking request was sent to the worker successfully.",
      viewBookings: "View My Bookings",
    },
  
    ta: {
      back: "பின்செல்",
      title: "சேவையை முன்பதிவு செய்யுங்கள்",
      subtitle:
        "தேவையான பணியை விவரித்து, விருப்பமான தேதி மற்றும் நேரத்தைத் தேர்ந்தெடுக்கவும்.",
      loadingWorker:
        "பணியாளர் தகவல் ஏற்றப்படுகிறது...",
      loadFailed:
        "தேர்ந்தெடுக்கப்பட்ட பணியாளரை ஏற்ற முடியவில்லை.",
      selectedWorker:
        "தேர்ந்தெடுக்கப்பட்ட பணியாளர்",
      verified: "சரிபார்க்கப்பட்டவர்",
      notVerified:
        "சரிபார்க்கப்படாதவர்",
      available: "கிடைக்கிறார்",
      unavailable:
        "தற்போது கிடைக்கவில்லை",
      experience: "அனுபவம்",
      years: "ஆண்டுகள்",
      rating: "மதிப்பீடு",
      newWorker: "புதிய பணியாளர்",
      startingPrice: "தொடக்க கட்டணம்",
      serviceDescription: "சேவை விவரம்",
      descriptionPlaceholder:
        "பணியாளர் செய்ய வேண்டிய பணியை தெளிவாக விவரிக்கவும்",
      serviceAddress: "சேவை முகவரி",
      addressPlaceholder:
        "சேவை தேவைப்படும் முழுமையான முகவரியை உள்ளிடவும்",
      preferredDate: "விருப்பமான தேதி",
      preferredTime: "விருப்பமான நேரம்",
      selectDate:
        "தேதியைத் தேர்ந்தெடுக்கவும்",
      selectTime:
        "நேரத்தைத் தேர்ந்தெடுக்கவும்",
      changeDate: "தேதியை மாற்றவும்",
      changeTime: "நேரத்தை மாற்றவும்",
      done: "முடிந்தது",
      bookingSummary: "முன்பதிவு சுருக்கம்",
      worker: "பணியாளர்",
      service: "சேவை",
      selectedDateTime:
        "விருப்பமான தேதி மற்றும் நேரம்",
      estimatedPrice:
        "மதிப்பிடப்பட்ட தொடக்க கட்டணம்",
      bookingStatus:
        "ஆரம்ப முன்பதிவு நிலை",
      pending: "நிலுவையில்",
      submitBooking:
        "முன்பதிவை அனுப்புங்கள்",
      submitting:
        "முன்பதிவு அனுப்பப்படுகிறது...",
      validationTitle:
        "தகவல்களை சரிபார்க்கவும்",
      descriptionError:
        "குறைந்தது 10 எழுத்துகளுடன் தெளிவான சேவை விவரத்தை வழங்கவும்.",
      addressError:
        "முழுமையான சேவை முகவரியை வழங்கவும்.",
      dateRequired:
        "விருப்பமான தேதியைத் தேர்ந்தெடுக்கவும்.",
      timeRequired:
        "விருப்பமான நேரத்தைத் தேர்ந்தெடுக்கவும்.",
      futureDateError:
        "விருப்பமான தேதி மற்றும் நேரம் எதிர்காலத்தில் இருக்க வேண்டும்.",
      loginRequiredTitle:
        "உள்நுழைவு தேவை",
      loginRequiredMessage:
        "முன்பதிவு செய்வதற்கு முன் உள்நுழையவும்.",
      customerOnlyTitle:
        "வாடிக்கையாளர் கணக்கு தேவை",
      customerOnlyMessage:
        "வாடிக்கையாளர் கணக்குகள் மட்டுமே முன்பதிவுகளை உருவாக்க முடியும்.",
      unavailableTitle:
        "பணியாளர் கிடைக்கவில்லை",
      unavailableMessage:
        "இந்த பணியாளர் தற்போது புதிய முன்பதிவுகளை ஏற்கவில்லை.",
      bookingFailed:
        "முன்பதிவு தோல்வியடைந்தது",
      unexpectedError:
        "முன்பதிவை உருவாக்கும்போது ஏதோ தவறு ஏற்பட்டது.",
      successTitle:
        "முன்பதிவு அனுப்பப்பட்டது",
      successMessage:
        "உங்கள் முன்பதிவு கோரிக்கை பணியாளருக்கு வெற்றிகரமாக அனுப்பப்பட்டது.",
      viewBookings:
        "எனது முன்பதிவுகளைப் பார்க்கவும்",
    },
  
    si: {
      back: "ආපසු",
      title: "සේවාවක් වෙන්කර ගන්න",
      subtitle:
        "අවශ්‍ය කාර්යය විස්තර කර කැමති දිනය සහ වේලාව තෝරන්න.",
      loadingWorker:
        "සේවා සපයන්නාගේ තොරතුරු පූරණය වෙමින්...",
      loadFailed:
        "තෝරාගත් සේවා සපයන්නා පූරණය කළ නොහැක.",
      selectedWorker:
        "තෝරාගත් සේවා සපයන්නා",
      verified: "තහවුරු කළ",
      notVerified: "තහවුරු කර නැත",
      available: "ලබා ගත හැක",
      unavailable:
        "දැනට ලබා ගත නොහැක",
      experience: "පළපුරුද්ද",
      years: "වසර",
      rating: "ඇගයීම",
      newWorker: "නව සේවා සපයන්නෙක්",
      startingPrice: "ආරම්භක මිල",
      serviceDescription: "සේවා විස්තරය",
      descriptionPlaceholder:
        "සේවා සපයන්නා කළ යුතු කාර්යය පැහැදිලිව විස්තර කරන්න",
      serviceAddress: "සේවා ලිපිනය",
      addressPlaceholder:
        "සේවාව අවශ්‍ය සම්පූර්ණ ලිපිනය ඇතුළත් කරන්න",
      preferredDate: "කැමති දිනය",
      preferredTime: "කැමති වේලාව",
      selectDate: "දිනය තෝරන්න",
      selectTime: "වේලාව තෝරන්න",
      changeDate: "දිනය වෙනස් කරන්න",
      changeTime: "වේලාව වෙනස් කරන්න",
      done: "අවසන්",
      bookingSummary:
        "වෙන්කිරීමේ සාරාංශය",
      worker: "සේවා සපයන්නා",
      service: "සේවාව",
      selectedDateTime:
        "කැමති දිනය සහ වේලාව",
      estimatedPrice:
        "ඇස්තමේන්තුගත ආරම්භක මිල",
      bookingStatus:
        "ආරම්භක වෙන්කිරීමේ තත්ත්වය",
      pending: "පොරොත්තුවෙන්",
      submitBooking: "වෙන්කිරීම යවන්න",
      submitting: "වෙන්කිරීම යවමින්...",
      validationTitle:
        "තොරතුරු පරීක්ෂා කරන්න",
      descriptionError:
        "අවම වශයෙන් අක්ෂර 10ක් සහිත පැහැදිලි සේවා විස්තරයක් ලබා දෙන්න.",
      addressError:
        "සම්පූර්ණ සේවා ලිපිනය ලබා දෙන්න.",
      dateRequired:
        "කැමති දිනය තෝරන්න.",
      timeRequired:
        "කැමති වේලාව තෝරන්න.",
      futureDateError:
        "කැමති දිනය සහ වේලාව අනාගතයේ විය යුතුය.",
      loginRequiredTitle:
        "පිවිසීම අවශ්‍යයි",
      loginRequiredMessage:
        "වෙන්කිරීමක් සෑදීමට පෙර පිවිසෙන්න.",
      customerOnlyTitle:
        "පාරිභෝගික ගිණුමක් අවශ්‍යයි",
      customerOnlyMessage:
        "වෙන්කිරීම් සෑදිය හැක්කේ පාරිභෝගික ගිණුම්වලට පමණි.",
      unavailableTitle:
        "සේවා සපයන්නා ලබා ගත නොහැක",
      unavailableMessage:
        "මෙම සේවා සපයන්නා දැනට නව වෙන්කිරීම් භාර නොගනී.",
      bookingFailed:
        "වෙන්කිරීම අසාර්ථකයි",
      unexpectedError:
        "වෙන්කිරීම සෑදීමේදී දෝෂයක් ඇති විය.",
      successTitle:
        "වෙන්කිරීම යවන ලදී",
      successMessage:
        "ඔබගේ වෙන්කිරීමේ ඉල්ලීම සේවා සපයන්නා වෙත සාර්ථකව යවන ලදී.",
      viewBookings:
        "මගේ වෙන්කිරීම් බලන්න",
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
  
  const createInitialDateTime = (): Date => {
    const value = new Date();
  
    value.setDate(value.getDate() + 1);
    value.setHours(9, 0, 0, 0);
  
    return value;
  };
  
  export default function BookingScreen() {
    const params = useLocalSearchParams<{
      workerId?: string | string[];
    }>();
  
    const workerId = normalizeParameter(
      params.workerId
    );
  
    const {
      language,
      languageName,
    } = useLanguage();
  
    const text = translations[language];
  
    const [worker, setWorker] =
      useState<WorkerDetails | null>(null);
  
    const [
      serviceDescription,
      setServiceDescription,
    ] = useState("");
  
    const [
      serviceAddress,
      setServiceAddress,
    ] = useState("");
  
    const [
      preferredDateTime,
      setPreferredDateTime,
    ] = useState<Date>(
      createInitialDateTime()
    );
  
    const [
      hasSelectedDate,
      setHasSelectedDate,
    ] = useState(false);
  
    const [
      hasSelectedTime,
      setHasSelectedTime,
    ] = useState(false);
  
    const [
      showIosDatePicker,
      setShowIosDatePicker,
    ] = useState(false);
  
    const [
      showIosTimePicker,
      setShowIosTimePicker,
    ] = useState(false);
  
    const [isLoading, setIsLoading] =
      useState(true);
  
    const [isSubmitting, setIsSubmitting] =
      useState(false);
  
    const [loadError, setLoadError] =
      useState("");
  
    useEffect(() => {
      const loadWorker = async () => {
        if (!workerId) {
          setLoadError(text.loadFailed);
          setIsLoading(false);
          return;
        }
  
        setIsLoading(true);
        setLoadError("");
  
        try {
          const {
            data,
            error,
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
  
          if (error || !data) {
            console.error(
              "Booking worker loading error:",
              error
            );
  
            setLoadError(text.loadFailed);
            return;
          }
  
          setWorker(data as WorkerDetails);
        } catch (error) {
          console.error(
            "Unexpected worker loading error:",
            error
          );
  
          setLoadError(text.loadFailed);
        } finally {
          setIsLoading(false);
        }
      };
  
      void loadWorker();
    }, [
      workerId,
      text.loadFailed,
    ]);
  
    const estimatedPrice = useMemo(() => {
      const value = Number(
        worker?.base_price ?? 0
      );
  
      return Number.isNaN(value)
        ? 0
        : value;
    }, [worker]);
  
    const workerRating = useMemo(() => {
      const value = Number(
        worker?.average_rating ?? 0
      );
  
      return Number.isNaN(value)
        ? 0
        : value;
    }, [worker]);
  
    const locale = useMemo(() => {
      if (language === "ta") {
        return "ta-LK";
      }
  
      if (language === "si") {
        return "si-LK";
      }
  
      return "en-LK";
    }, [language]);
  
    const formattedDate = useMemo(() => {
      if (!hasSelectedDate) {
        return text.selectDate;
      }
  
      return preferredDateTime.toLocaleDateString(
        locale,
        {
          weekday: "short",
          day: "2-digit",
          month: "long",
          year: "numeric",
        }
      );
    }, [
      preferredDateTime,
      hasSelectedDate,
      locale,
      text.selectDate,
    ]);
  
    const formattedTime = useMemo(() => {
      if (!hasSelectedTime) {
        return text.selectTime;
      }
  
      return preferredDateTime.toLocaleTimeString(
        locale,
        {
          hour: "2-digit",
          minute: "2-digit",
        }
      );
    }, [
      preferredDateTime,
      hasSelectedTime,
      locale,
      text.selectTime,
    ]);
  
    const completeDateTime = useMemo(() => {
      if (
        !hasSelectedDate ||
        !hasSelectedTime
      ) {
        return "-";
      }
  
      return preferredDateTime.toLocaleString(
        locale,
        {
          weekday: "short",
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      );
    }, [
      preferredDateTime,
      hasSelectedDate,
      hasSelectedTime,
      locale,
    ]);
  
    const applySelectedDate = (
      selectedDate: Date
    ) => {
      setPreferredDateTime(
        (currentDateTime) => {
          const updatedDateTime =
            new Date(currentDateTime);
  
          updatedDateTime.setFullYear(
            selectedDate.getFullYear(),
            selectedDate.getMonth(),
            selectedDate.getDate()
          );
  
          return updatedDateTime;
        }
      );
  
      setHasSelectedDate(true);
    };
  
    const applySelectedTime = (
      selectedTime: Date
    ) => {
      setPreferredDateTime(
        (currentDateTime) => {
          const updatedDateTime =
            new Date(currentDateTime);
  
          updatedDateTime.setHours(
            selectedTime.getHours(),
            selectedTime.getMinutes(),
            0,
            0
          );
  
          return updatedDateTime;
        }
      );
  
      setHasSelectedTime(true);
    };
  
    const handleAndroidDateChange = (
      event: DateTimePickerEvent,
      selectedDate?: Date
    ) => {
      if (
        event.type !== "set" ||
        !selectedDate
      ) {
        return;
      }
  
      applySelectedDate(selectedDate);
    };
  
    const handleAndroidTimeChange = (
      event: DateTimePickerEvent,
      selectedTime?: Date
    ) => {
      if (
        event.type !== "set" ||
        !selectedTime
      ) {
        return;
      }
  
      applySelectedTime(selectedTime);
    };
  
    const openDatePicker = () => {
      if (
        isSubmitting ||
        !worker?.is_available
      ) {
        return;
      }
  
      if (Platform.OS === "android") {
        DateTimePickerAndroid.open({
          value: preferredDateTime,
          mode: "date",
          display: "default",
          minimumDate: new Date(),
          onChange:
            handleAndroidDateChange,
        });
  
        return;
      }
  
      setShowIosTimePicker(false);
      setShowIosDatePicker(true);
    };
  
    const openTimePicker = () => {
      if (
        isSubmitting ||
        !worker?.is_available
      ) {
        return;
      }
  
      if (Platform.OS === "android") {
        DateTimePickerAndroid.open({
          value: preferredDateTime,
          mode: "time",
          display: "default",
          is24Hour: false,
          onChange:
            handleAndroidTimeChange,
        });
  
        return;
      }
  
      setShowIosDatePicker(false);
      setShowIosTimePicker(true);
    };
  
    const handleIosDateChange = (
      event: DateTimePickerEvent,
      selectedDate?: Date
    ) => {
      if (
        event.type === "set" &&
        selectedDate
      ) {
        applySelectedDate(selectedDate);
      }
    };
  
    const handleIosTimeChange = (
      event: DateTimePickerEvent,
      selectedTime?: Date
    ) => {
      if (
        event.type === "set" &&
        selectedTime
      ) {
        applySelectedTime(selectedTime);
      }
    };
  
    const validateForm = (): boolean => {
      if (
        serviceDescription.trim().length < 10
      ) {
        Alert.alert(
          text.validationTitle,
          text.descriptionError
        );
  
        return false;
      }
  
      if (
        serviceAddress.trim().length < 5
      ) {
        Alert.alert(
          text.validationTitle,
          text.addressError
        );
  
        return false;
      }
  
      if (!hasSelectedDate) {
        Alert.alert(
          text.validationTitle,
          text.dateRequired
        );
  
        return false;
      }
  
      if (!hasSelectedTime) {
        Alert.alert(
          text.validationTitle,
          text.timeRequired
        );
  
        return false;
      }
  
      if (
        preferredDateTime.getTime() <=
        Date.now()
      ) {
        Alert.alert(
          text.validationTitle,
          text.futureDateError
        );
  
        return false;
      }
  
      return true;
    };
  
    const submitBooking = async () => {
      if (!worker) {
        return;
      }
  
      if (!worker.is_available) {
        Alert.alert(
          text.unavailableTitle,
          text.unavailableMessage
        );
  
        return;
      }
  
      if (!validateForm()) {
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
            text.loginRequiredTitle,
            text.loginRequiredMessage
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
          Alert.alert(
            text.bookingFailed,
            text.unexpectedError
          );
  
          return;
        }
  
        if (
          profileData.role !== "customer"
        ) {
          Alert.alert(
            text.customerOnlyTitle,
            text.customerOnlyMessage
          );
  
          return;
        }
  
        const {
          error: bookingError,
        } = await supabase
          .from("bookings")
          .insert({
            customer_id: user.id,
            worker_id: worker.id,
            service_category:
              worker.category,
            service_description:
              serviceDescription.trim(),
            service_address:
              serviceAddress.trim(),
            preferred_date:
              preferredDateTime.toISOString(),
            estimated_price:
              estimatedPrice,
            status: "pending",
          });
  
        if (bookingError) {
          Alert.alert(
            text.bookingFailed,
            bookingError.message
          );
  
          return;
        }
  
        Alert.alert(
          text.successTitle,
          text.successMessage,
          [
            {
              text: text.viewBookings,
              onPress: () =>
                router.replace(
                  "/my-bookings"
                ),
            },
          ]
        );
      } catch (error) {
        console.error(
          "Unexpected booking creation error:",
          error
        );
  
        Alert.alert(
          text.bookingFailed,
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
              {text.loadingWorker}
            </Text>
          </View>
        </SafeAreaView>
      );
    }
  
    if (
      !worker ||
      loadError !== ""
    ) {
      return (
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>
              ⚠️
            </Text>
  
            <Text style={styles.errorTitle}>
              {text.bookingFailed}
            </Text>
  
            <Text style={styles.errorText}>
              {loadError ||
                text.unexpectedError}
            </Text>
  
            <Pressable
              style={styles.returnButton}
              onPress={() => router.back()}
            >
              <Text
                style={
                  styles.returnButtonText
                }
              >
                {text.back}
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
            showsVerticalScrollIndicator={false}
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
                <Text
                  style={
                    styles.languageButtonText
                  }
                >
                  🌐 {languageName}
                </Text>
              </Pressable>
            </View>
  
            <Text style={styles.title}>
              {text.title}
            </Text>
  
            <Text style={styles.subtitle}>
              {text.subtitle}
            </Text>
  
            <View style={styles.workerCard}>
              <Text style={styles.sectionLabel}>
                {text.selectedWorker}
              </Text>
  
              <View style={styles.workerTopRow}>
                <View style={styles.workerAvatar}>
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
                    styles.workerInformation
                  }
                >
                  <Text style={styles.workerName}>
                    {worker.full_name}
                  </Text>
  
                  <Text
                    style={
                      styles.workerCategory
                    }
                  >
                    {worker.category}
                  </Text>
  
                  <Text style={styles.workerTown}>
                    📍 {worker.town}
                  </Text>
                </View>
              </View>
  
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
                      : "○ " +
                        text.notVerified}
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
                      : "○ " +
                        text.unavailable}
                  </Text>
                </View>
              </View>
  
              <View style={styles.workerStats}>
                <View style={styles.statColumn}>
                  <Text style={styles.statLabel}>
                    {text.experience}
                  </Text>
  
                  <Text style={styles.statValue}>
                    {worker.experience_years}{" "}
                    {text.years}
                  </Text>
                </View>
  
                <View style={styles.statColumn}>
                  <Text style={styles.statLabel}>
                    {text.rating}
                  </Text>
  
                  <Text style={styles.statValue}>
                    {workerRating > 0
                      ? "⭐ " +
                        workerRating.toFixed(1)
                      : text.newWorker}
                  </Text>
                </View>
  
                <View style={styles.statColumn}>
                  <Text style={styles.statLabel}>
                    {text.startingPrice}
                  </Text>
  
                  <Text style={styles.priceText}>
                    LKR{" "}
                    {estimatedPrice.toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>
  
            {!worker.is_available && (
              <View style={styles.warningCard}>
                <Text style={styles.warningIcon}>
                  ⚠️
                </Text>
  
                <Text style={styles.warningText}>
                  {text.unavailableMessage}
                </Text>
              </View>
            )}
  
            <View style={styles.formCard}>
              <Text style={styles.label}>
                {text.serviceDescription}
              </Text>
  
              <TextInput
                style={[
                  styles.input,
                  styles.descriptionInput,
                ]}
                value={serviceDescription}
                onChangeText={
                  setServiceDescription
                }
                placeholder={
                  text.descriptionPlaceholder
                }
                placeholderTextColor="#9CA3AF"
                multiline
                textAlignVertical="top"
                editable={
                  !isSubmitting &&
                  worker.is_available
                }
              />
  
              <Text style={styles.label}>
                {text.serviceAddress}
              </Text>
  
              <TextInput
                style={[
                  styles.input,
                  styles.addressInput,
                ]}
                value={serviceAddress}
                onChangeText={setServiceAddress}
                placeholder={
                  text.addressPlaceholder
                }
                placeholderTextColor="#9CA3AF"
                multiline
                textAlignVertical="top"
                editable={
                  !isSubmitting &&
                  worker.is_available
                }
              />
  
              <Text style={styles.label}>
                {text.preferredDate}
              </Text>
  
              <Pressable
                style={[
                  styles.pickerButton,
                  hasSelectedDate &&
                    styles.selectedPickerButton,
                ]}
                onPress={openDatePicker}
                disabled={
                  isSubmitting ||
                  !worker.is_available
                }
              >
                <Text style={styles.pickerIcon}>
                  📅
                </Text>
  
                <Text
                  style={[
                    styles.pickerButtonText,
                    !hasSelectedDate &&
                      styles.placeholderText,
                  ]}
                >
                  {formattedDate}
                </Text>
  
                <Text style={styles.pickerArrow}>
                  ›
                </Text>
              </Pressable>
  
              {Platform.OS === "ios" &&
                showIosDatePicker && (
                  <View style={styles.iosPickerCard}>
                    <DateTimePicker
                      value={preferredDateTime}
                      mode="date"
                      display="spinner"
                      minimumDate={new Date()}
                      onChange={
                        handleIosDateChange
                      }
                    />
  
                    <Pressable
                      style={styles.doneButton}
                      onPress={() =>
                        setShowIosDatePicker(
                          false
                        )
                      }
                    >
                      <Text
                        style={
                          styles.doneButtonText
                        }
                      >
                        {text.done}
                      </Text>
                    </Pressable>
                  </View>
                )}
  
              <Text style={styles.label}>
                {text.preferredTime}
              </Text>
  
              <Pressable
                style={[
                  styles.pickerButton,
                  hasSelectedTime &&
                    styles.selectedPickerButton,
                ]}
                onPress={openTimePicker}
                disabled={
                  isSubmitting ||
                  !worker.is_available
                }
              >
                <Text style={styles.pickerIcon}>
                  🕒
                </Text>
  
                <Text
                  style={[
                    styles.pickerButtonText,
                    !hasSelectedTime &&
                      styles.placeholderText,
                  ]}
                >
                  {formattedTime}
                </Text>
  
                <Text style={styles.pickerArrow}>
                  ›
                </Text>
              </Pressable>
  
              {Platform.OS === "ios" &&
                showIosTimePicker && (
                  <View style={styles.iosPickerCard}>
                    <DateTimePicker
                      value={preferredDateTime}
                      mode="time"
                      display="spinner"
                      onChange={
                        handleIosTimeChange
                      }
                    />
  
                    <Pressable
                      style={styles.doneButton}
                      onPress={() =>
                        setShowIosTimePicker(
                          false
                        )
                      }
                    >
                      <Text
                        style={
                          styles.doneButtonText
                        }
                      >
                        {text.done}
                      </Text>
                    </Pressable>
                  </View>
                )}
            </View>
  
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>
                {text.bookingSummary}
              </Text>
  
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  {text.worker}
                </Text>
  
                <Text style={styles.summaryValue}>
                  {worker.full_name}
                </Text>
              </View>
  
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  {text.service}
                </Text>
  
                <Text style={styles.summaryValue}>
                  {worker.category}
                </Text>
              </View>
  
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  {text.selectedDateTime}
                </Text>
  
                <Text style={styles.summaryValue}>
                  {completeDateTime}
                </Text>
              </View>
  
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  {text.estimatedPrice}
                </Text>
  
                <Text style={styles.summaryPrice}>
                  LKR{" "}
                  {estimatedPrice.toLocaleString()}
                </Text>
              </View>
  
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  {text.bookingStatus}
                </Text>
  
                <Text style={styles.pendingText}>
                  {text.pending}
                </Text>
              </View>
            </View>
  
            <Pressable
              style={({ pressed }) => [
                styles.submitButton,
                pressed &&
                  styles.pressedButton,
                (isSubmitting ||
                  !worker.is_available) &&
                  styles.disabledButton,
              ]}
              onPress={submitBooking}
              disabled={
                isSubmitting ||
                !worker.is_available
              }
            >
              {isSubmitting ? (
                <View style={styles.submittingRow}>
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
                  {text.submitBooking}
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
      marginTop: 15,
      fontSize: 21,
      fontWeight: "800",
      color: "#1F2937",
    },
  
    errorText: {
      marginTop: 8,
      lineHeight: 21,
      textAlign: "center",
      color: "#6B7280",
    },
  
    returnButton: {
      paddingHorizontal: 25,
      paddingVertical: 13,
      marginTop: 21,
      borderRadius: 10,
      backgroundColor: "#6D28D9",
    },
  
    returnButtonText: {
      fontWeight: "800",
      color: "#FFFFFF",
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
  
    languageButtonText: {
      fontSize: 12,
      fontWeight: "800",
      color: "#6D28D9",
    },
  
    title: {
      marginTop: 24,
      fontSize: 29,
      fontWeight: "800",
      color: "#1F2937",
    },
  
    subtitle: {
      marginTop: 7,
      fontSize: 14,
      lineHeight: 21,
      color: "#6B7280",
    },
  
    workerCard: {
      padding: 18,
      marginTop: 22,
      borderWidth: 1,
      borderColor: "#DDD6FE",
      borderRadius: 16,
      backgroundColor: "#FFFFFF",
    },
  
    sectionLabel: {
      marginBottom: 14,
      fontSize: 12,
      fontWeight: "800",
      color: "#6D28D9",
    },
  
    workerTopRow: {
      flexDirection: "row",
      alignItems: "center",
    },
  
    workerAvatar: {
      width: 57,
      height: 57,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 29,
      backgroundColor: "#EDE9FE",
    },
  
    workerAvatarText: {
      fontSize: 28,
    },
  
    workerInformation: {
      flex: 1,
      marginLeft: 13,
    },
  
    workerName: {
      fontSize: 18,
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
  
    badgeRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginTop: 15,
      marginHorizontal: -4,
    },
  
    badge: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      marginHorizontal: 4,
      marginBottom: 7,
      borderRadius: 14,
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
  
    workerStats: {
      flexDirection: "row",
      paddingTop: 15,
      marginTop: 8,
      borderTopWidth: 1,
      borderTopColor: "#E5E7EB",
    },
  
    statColumn: {
      flex: 1,
      paddingRight: 6,
    },
  
    statLabel: {
      fontSize: 10,
      color: "#9CA3AF",
    },
  
    statValue: {
      marginTop: 4,
      fontSize: 12,
      fontWeight: "700",
      color: "#374151",
    },
  
    priceText: {
      marginTop: 4,
      fontSize: 13,
      fontWeight: "800",
      color: "#047857",
    },
  
    warningCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      padding: 14,
      marginTop: 14,
      borderWidth: 1,
      borderColor: "#FCA5A5",
      borderRadius: 11,
      backgroundColor: "#FEF2F2",
    },
  
    warningIcon: {
      marginRight: 9,
      fontSize: 17,
    },
  
    warningText: {
      flex: 1,
      fontSize: 12,
      lineHeight: 18,
      color: "#B91C1C",
    },
  
    formCard: {
      padding: 18,
      marginTop: 15,
      borderWidth: 1,
      borderColor: "#E5E7EB",
      borderRadius: 16,
      backgroundColor: "#FFFFFF",
    },
  
    label: {
      marginTop: 8,
      marginBottom: 8,
      fontSize: 13,
      fontWeight: "700",
      color: "#374151",
    },
  
    input: {
      minHeight: 52,
      paddingHorizontal: 14,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: "#D1D5DB",
      borderRadius: 11,
      backgroundColor: "#FFFFFF",
      fontSize: 14,
      color: "#111827",
    },
  
    descriptionInput: {
      minHeight: 110,
      paddingTop: 14,
    },
  
    addressInput: {
      minHeight: 82,
      paddingTop: 14,
    },
  
    pickerButton: {
      minHeight: 57,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: "#D1D5DB",
      borderRadius: 11,
      backgroundColor: "#FFFFFF",
    },
  
    selectedPickerButton: {
      borderColor: "#8B5CF6",
      backgroundColor: "#F5F3FF",
    },
  
    pickerIcon: {
      marginRight: 11,
      fontSize: 21,
    },
  
    pickerButtonText: {
      flex: 1,
      fontSize: 14,
      fontWeight: "700",
      color: "#1F2937",
    },
  
    placeholderText: {
      fontWeight: "400",
      color: "#9CA3AF",
    },
  
    pickerArrow: {
      marginLeft: 8,
      fontSize: 27,
      color: "#6D28D9",
    },
  
    iosPickerCard: {
      padding: 10,
      marginBottom: 13,
      borderWidth: 1,
      borderColor: "#DDD6FE",
      borderRadius: 12,
      backgroundColor: "#F9FAFB",
    },
  
    doneButton: {
      alignItems: "center",
      paddingVertical: 11,
      borderRadius: 9,
      backgroundColor: "#6D28D9",
    },
  
    doneButtonText: {
      fontWeight: "800",
      color: "#FFFFFF",
    },
  
    summaryCard: {
      padding: 18,
      marginTop: 15,
      borderWidth: 1,
      borderColor: "#DDD6FE",
      borderRadius: 16,
      backgroundColor: "#F5F3FF",
    },
  
    summaryTitle: {
      marginBottom: 11,
      fontSize: 17,
      fontWeight: "800",
      color: "#1F2937",
    },
  
    summaryRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      paddingVertical: 8,
    },
  
    summaryLabel: {
      flex: 1,
      paddingRight: 10,
      fontSize: 12,
      color: "#6B7280",
    },
  
    summaryValue: {
      flex: 1,
      fontSize: 13,
      fontWeight: "700",
      textAlign: "right",
      color: "#374151",
    },
  
    summaryPrice: {
      flex: 1,
      fontSize: 14,
      fontWeight: "800",
      textAlign: "right",
      color: "#047857",
    },
  
    pendingText: {
      flex: 1,
      fontSize: 13,
      fontWeight: "800",
      textAlign: "right",
      color: "#92400E",
    },
  
    submitButton: {
      minHeight: 56,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 20,
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
  
    pressedButton: {
      opacity: 0.82,
    },
  
    disabledButton: {
      opacity: 0.5,
    },
  });