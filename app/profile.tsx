import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
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

type ProfileRecord = {
  full_name: string;
  phone: string | null;
  town: string | null;
  role: UserRole;
};

type WorkerRecord = {
  description: string | null;
  experience_years: number | null;
  base_price: number | null;
  is_available: boolean;
  is_verified: boolean;
  average_rating: number | null;
};

type SaveProfileResponse = {
  success: boolean;
  profiles_updated: number;
  worker_profiles_updated: number;
};

type ProfileText = {
  backToDashboard: string;
  language: string;
  title: string;
  subtitle: string;

  loading: string;
  unavailableTitle: string;
  profileLoadError: string;
  workerLoadError: string;
  unexpectedLoadError: string;
  tryAgain: string;
  goBack: string;

  accountType: string;
  customer: string;
  skilledWorker: string;
  administrator: string;

  personalInformation: string;
  fullName: string;
  fullNamePlaceholder: string;
  phone: string;
  phonePlaceholder: string;
  town: string;
  townPlaceholder: string;

  serviceInformation: string;
  serviceDescription: string;
  descriptionPlaceholder: string;
  experience: string;
  experiencePlaceholder: string;
  startingPrice: string;
  pricePlaceholder: string;

  availabilityTitle: string;
  availabilityDescription: string;
  acceptingBookings: string;
  notAcceptingBookings: string;

  verificationTitle: string;
  verified: string;
  notVerified: string;
  verifiedExplanation: string;
  notVerifiedExplanation: string;
  verificationNote: string;

  rating: string;
  newWorker: string;

  saveProfile: string;
  savingProfile: string;

  fullNameRequiredTitle: string;
  fullNameRequiredMessage: string;
  townRequiredTitle: string;
  townRequiredMessage: string;
  descriptionRequiredTitle: string;
  descriptionRequiredMessage: string;
  invalidExperienceTitle: string;
  invalidExperienceMessage: string;
  invalidPriceTitle: string;
  invalidPriceMessage: string;

  updateFailed: string;
  updateNotConfirmed: string;
  updateSuccessTitle: string;
  updateSuccessMessage: string;
  unexpectedErrorTitle: string;
  unexpectedSaveError: string;
};

const translations: Record<
  LanguageCode,
  ProfileText
> = {
  en: {
    backToDashboard: "Back to Dashboard",
    language: "Language",
    title: "My Profile",
    subtitle:
      "Manage your FixMate account information.",

    loading: "Loading your profile...",
    unavailableTitle: "Profile unavailable",
    profileLoadError:
      "Your profile could not be loaded.",
    workerLoadError:
      "Your worker information could not be loaded.",
    unexpectedLoadError:
      "Something went wrong while loading your profile.",
    tryAgain: "Try Again",
    goBack: "Go Back",

    accountType: "Account type",
    customer: "Customer",
    skilledWorker: "Skilled Worker",
    administrator: "Administrator",

    personalInformation: "Personal Information",
    fullName: "Full name",
    fullNamePlaceholder:
      "Enter your full name",
    phone: "Phone number",
    phonePlaceholder:
      "Enter your phone number",
    town: "Town",
    townPlaceholder: "Enter your town",

    serviceInformation: "Service Information",
    serviceDescription: "Service description",
    descriptionPlaceholder:
      "Describe your skills and services",
    experience: "Years of experience",
    experiencePlaceholder: "Example: 4",
    startingPrice: "Starting price (LKR)",
    pricePlaceholder: "Example: 2500",

    availabilityTitle: "Available for bookings",
    availabilityDescription:
      "Turn this off when you are not accepting new work.",
    acceptingBookings:
      "You are accepting new bookings.",
    notAcceptingBookings:
      "You are not accepting new bookings.",

    verificationTitle: "Worker Verification",
    verified: "Verified",
    notVerified: "Not Verified",
    verifiedExplanation:
      "Your worker profile has been reviewed and verified by the FixMate administrator.",
    notVerifiedExplanation:
      "Your worker profile has not been verified yet. An administrator must review and approve it.",
    verificationNote:
      "Workers cannot edit their own verification status or rating.",

    rating: "Customer rating",
    newWorker: "New worker",

    saveProfile: "Save Profile",
    savingProfile: "Saving profile...",

    fullNameRequiredTitle:
      "Full name required",
    fullNameRequiredMessage:
      "Please enter your full name.",
    townRequiredTitle: "Town required",
    townRequiredMessage:
      "Please enter your town.",
    descriptionRequiredTitle:
      "Description required",
    descriptionRequiredMessage:
      "Please describe your skills and services.",
    invalidExperienceTitle:
      "Invalid experience",
    invalidExperienceMessage:
      "Enter valid years of experience.",
    invalidPriceTitle: "Invalid price",
    invalidPriceMessage:
      "Enter a valid starting price.",

    updateFailed: "Profile update failed",
    updateNotConfirmed:
      "Supabase did not confirm the profile update.",
    updateSuccessTitle: "Profile updated",
    updateSuccessMessage:
      "Your FixMate profile was saved successfully.",
    unexpectedErrorTitle: "Unexpected error",
    unexpectedSaveError:
      "Something went wrong while saving your profile.",
  },

  ta: {
    backToDashboard:
      "முகப்புப் பலகைக்குத் திரும்பவும்",
    language: "மொழி",
    title: "எனது சுயவிவரம்",
    subtitle:
      "உங்கள் FixMate கணக்குத் தகவல்களை நிர்வகிக்கவும்.",

    loading:
      "உங்கள் சுயவிவரம் ஏற்றப்படுகிறது...",
    unavailableTitle:
      "சுயவிவரம் கிடைக்கவில்லை",
    profileLoadError:
      "உங்கள் சுயவிவரத்தை ஏற்ற முடியவில்லை.",
    workerLoadError:
      "உங்கள் பணியாளர் தகவலை ஏற்ற முடியவில்லை.",
    unexpectedLoadError:
      "உங்கள் சுயவிவரத்தை ஏற்றும்போது ஏதோ தவறு ஏற்பட்டது.",
    tryAgain: "மீண்டும் முயற்சிக்கவும்",
    goBack: "பின்செல்",

    accountType: "கணக்கு வகை",
    customer: "வாடிக்கையாளர்",
    skilledWorker: "திறமையான பணியாளர்",
    administrator: "நிர்வாகி",

    personalInformation: "தனிப்பட்ட தகவல்கள்",
    fullName: "முழுப் பெயர்",
    fullNamePlaceholder:
      "உங்கள் முழுப் பெயரை உள்ளிடவும்",
    phone: "தொலைபேசி எண்",
    phonePlaceholder:
      "உங்கள் தொலைபேசி எண்ணை உள்ளிடவும்",
    town: "நகரம்",
    townPlaceholder:
      "உங்கள் நகரத்தை உள்ளிடவும்",

    serviceInformation: "சேவை தகவல்",
    serviceDescription: "சேவை விவரம்",
    descriptionPlaceholder:
      "உங்கள் திறமைகள் மற்றும் சேவைகளை விவரிக்கவும்",
    experience: "அனுபவ ஆண்டுகள்",
    experiencePlaceholder: "உதாரணம்: 4",
    startingPrice: "தொடக்க கட்டணம் (LKR)",
    pricePlaceholder: "உதாரணம்: 2500",

    availabilityTitle:
      "முன்பதிவுகளுக்கு கிடைக்கிறார்",
    availabilityDescription:
      "புதிய பணிகளை ஏற்காதபோது இதை அணைக்கவும்.",
    acceptingBookings:
      "நீங்கள் புதிய முன்பதிவுகளை ஏற்கிறீர்கள்.",
    notAcceptingBookings:
      "நீங்கள் புதிய முன்பதிவுகளை ஏற்கவில்லை.",

    verificationTitle:
      "பணியாளர் சரிபார்ப்பு",
    verified: "சரிபார்க்கப்பட்டது",
    notVerified: "சரிபார்க்கப்படவில்லை",
    verifiedExplanation:
      "உங்கள் பணியாளர் சுயவிவரம் FixMate நிர்வாகியால் மதிப்பாய்வு செய்யப்பட்டு சரிபார்க்கப்பட்டுள்ளது.",
    notVerifiedExplanation:
      "உங்கள் பணியாளர் சுயவிவரம் இன்னும் சரிபார்க்கப்படவில்லை. நிர்வாகி அதை மதிப்பாய்வு செய்து அங்கீகரிக்க வேண்டும்.",
    verificationNote:
      "பணியாளர்கள் தங்களின் சரிபார்ப்பு நிலை அல்லது மதிப்பீட்டை மாற்ற முடியாது.",

    rating: "வாடிக்கையாளர் மதிப்பீடு",
    newWorker: "புதிய பணியாளர்",

    saveProfile:
      "சுயவிவரத்தைச் சேமிக்கவும்",
    savingProfile:
      "சுயவிவரம் சேமிக்கப்படுகிறது...",

    fullNameRequiredTitle:
      "முழுப் பெயர் தேவை",
    fullNameRequiredMessage:
      "உங்கள் முழுப் பெயரை உள்ளிடவும்.",
    townRequiredTitle: "நகரம் தேவை",
    townRequiredMessage:
      "உங்கள் நகரத்தை உள்ளிடவும்.",
    descriptionRequiredTitle:
      "சேவை விவரம் தேவை",
    descriptionRequiredMessage:
      "உங்கள் திறமைகள் மற்றும் சேவைகளை விவரிக்கவும்.",
    invalidExperienceTitle:
      "தவறான அனுபவம்",
    invalidExperienceMessage:
      "சரியான அனுபவ ஆண்டுகளை உள்ளிடவும்.",
    invalidPriceTitle:
      "தவறான கட்டணம்",
    invalidPriceMessage:
      "சரியான தொடக்க கட்டணத்தை உள்ளிடவும்.",

    updateFailed:
      "சுயவிவரத்தைப் புதுப்பிக்க முடியவில்லை",
    updateNotConfirmed:
      "சுயவிவரப் புதுப்பிப்பை Supabase உறுதிப்படுத்தவில்லை.",
    updateSuccessTitle:
      "சுயவிவரம் புதுப்பிக்கப்பட்டது",
    updateSuccessMessage:
      "உங்கள் FixMate சுயவிவரம் வெற்றிகரமாகச் சேமிக்கப்பட்டது.",
    unexpectedErrorTitle:
      "எதிர்பாராத பிழை",
    unexpectedSaveError:
      "உங்கள் சுயவிவரத்தைச் சேமிக்கும்போது ஏதோ தவறு ஏற்பட்டது.",
  },

  si: {
    backToDashboard:
      "උපකරණ පුවරුවට ආපසු",
    language: "භාෂාව",
    title: "මගේ පැතිකඩ",
    subtitle:
      "ඔබගේ FixMate ගිණුම් තොරතුරු කළමනාකරණය කරන්න.",

    loading:
      "ඔබගේ පැතිකඩ පූරණය වෙමින්...",
    unavailableTitle:
      "පැතිකඩ ලබා ගත නොහැක",
    profileLoadError:
      "ඔබගේ පැතිකඩ පූරණය කළ නොහැක.",
    workerLoadError:
      "ඔබගේ සේවා සපයන්නාගේ තොරතුරු පූරණය කළ නොහැක.",
    unexpectedLoadError:
      "ඔබගේ පැතිකඩ පූරණය කිරීමේදී දෝෂයක් ඇති විය.",
    tryAgain: "නැවත උත්සාහ කරන්න",
    goBack: "ආපසු",

    accountType: "ගිණුම් වර්ගය",
    customer: "පාරිභෝගිකයා",
    skilledWorker: "දක්ෂ සේවා සපයන්නා",
    administrator: "පරිපාලක",

    personalInformation: "පුද්ගලික තොරතුරු",
    fullName: "සම්පූර්ණ නම",
    fullNamePlaceholder:
      "ඔබගේ සම්පූර්ණ නම ඇතුළත් කරන්න",
    phone: "දුරකථන අංකය",
    phonePlaceholder:
      "ඔබගේ දුරකථන අංකය ඇතුළත් කරන්න",
    town: "නගරය",
    townPlaceholder:
      "ඔබගේ නගරය ඇතුළත් කරන්න",

    serviceInformation: "සේවා තොරතුරු",
    serviceDescription: "සේවා විස්තරය",
    descriptionPlaceholder:
      "ඔබගේ කුසලතා සහ සේවා විස්තර කරන්න",
    experience: "පළපුරුදු වසර",
    experiencePlaceholder: "උදාහරණය: 4",
    startingPrice: "ආරම්භක මිල (LKR)",
    pricePlaceholder: "උදාහරණය: 2500",

    availabilityTitle:
      "වෙන්කිරීම් සඳහා ලබා ගත හැක",
    availabilityDescription:
      "ඔබ නව වැඩ භාර නොගන්නා විට මෙය අක්‍රිය කරන්න.",
    acceptingBookings:
      "ඔබ නව වෙන්කිරීම් භාර ගනිමින් සිටී.",
    notAcceptingBookings:
      "ඔබ නව වෙන්කිරීම් භාර නොගනී.",

    verificationTitle:
      "සේවා සපයන්නා තහවුරු කිරීම",
    verified: "තහවුරු කර ඇත",
    notVerified: "තහවුරු කර නැත",
    verifiedExplanation:
      "ඔබගේ සේවා සපයන්නාගේ පැතිකඩ FixMate පරිපාලකයෙකු විසින් සමාලෝචනය කර තහවුරු කර ඇත.",
    notVerifiedExplanation:
      "ඔබගේ සේවා සපයන්නාගේ පැතිකඩ තවම තහවුරු කර නැත. පරිපාලකයෙකු එය සමාලෝචනය කර අනුමත කළ යුතුය.",
    verificationNote:
      "සේවා සපයන්නන්ට තම තහවුරු කිරීමේ තත්ත්වය හෝ ඇගයීම වෙනස් කළ නොහැක.",

    rating: "පාරිභෝගික ඇගයීම",
    newWorker: "නව සේවා සපයන්නෙක්",

    saveProfile: "පැතිකඩ සුරකින්න",
    savingProfile: "පැතිකඩ සුරකිමින්...",

    fullNameRequiredTitle:
      "සම්පූර්ණ නම අවශ්‍යයි",
    fullNameRequiredMessage:
      "ඔබගේ සම්පූර්ණ නම ඇතුළත් කරන්න.",
    townRequiredTitle:
      "නගරය අවශ්‍යයි",
    townRequiredMessage:
      "ඔබගේ නගරය ඇතුළත් කරන්න.",
    descriptionRequiredTitle:
      "සේවා විස්තරය අවශ්‍යයි",
    descriptionRequiredMessage:
      "ඔබගේ කුසලතා සහ සේවා විස්තර කරන්න.",
    invalidExperienceTitle:
      "වලංගු නොවන පළපුරුද්ද",
    invalidExperienceMessage:
      "වලංගු පළපුරුදු වසර ගණනක් ඇතුළත් කරන්න.",
    invalidPriceTitle:
      "වලංගු නොවන මිල",
    invalidPriceMessage:
      "වලංගු ආරම්භක මිලක් ඇතුළත් කරන්න.",

    updateFailed:
      "පැතිකඩ යාවත්කාලීන කිරීම අසාර්ථකයි",
    updateNotConfirmed:
      "Supabase විසින් පැතිකඩ යාවත්කාලීන කිරීම තහවුරු කර නැත.",
    updateSuccessTitle:
      "පැතිකඩ යාවත්කාලීන කරන ලදී",
    updateSuccessMessage:
      "ඔබගේ FixMate පැතිකඩ සාර්ථකව සුරකින ලදී.",
    unexpectedErrorTitle:
      "අනපේක්ෂිත දෝෂයක්",
    unexpectedSaveError:
      "ඔබගේ පැතිකඩ සුරැකීමේදී දෝෂයක් ඇති විය.",
  },
};

export default function ProfileScreen() {
  const {
    language,
    languageName,
  } = useLanguage();

  const text = translations[language];

  const [role, setRole] =
    useState<UserRole>("customer");

  const [fullName, setFullName] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [town, setTown] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [
    experienceYears,
    setExperienceYears,
  ] = useState("");

  const [basePrice, setBasePrice] =
    useState("");

  const [isAvailable, setIsAvailable] =
    useState(true);

  const [isVerified, setIsVerified] =
    useState(false);

  const [averageRating, setAverageRating] =
    useState(0);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      const {
        data: profileData,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select(
          "full_name, phone, town, role"
        )
        .eq("id", user.id)
        .single();

      if (profileError || !profileData) {
        console.error(
          "Profile loading error:",
          profileError
        );

        setErrorMessage(
          text.profileLoadError
        );

        return;
      }

      const profile =
        profileData as ProfileRecord;

      setRole(profile.role);
      setFullName(
        profile.full_name || ""
      );
      setPhone(profile.phone || "");
      setTown(profile.town || "");

      if (profile.role === "worker") {
        const {
          data: workerData,
          error: workerError,
        } = await supabase
          .from("worker_profiles")
          .select(
            `
              description,
              experience_years,
              base_price,
              is_available,
              is_verified,
              average_rating
            `
          )
          .eq("id", user.id)
          .single();

        if (
          workerError ||
          !workerData
        ) {
          console.error(
            "Worker profile loading error:",
            workerError
          );

          setErrorMessage(
            text.workerLoadError
          );

          return;
        }

        const worker =
          workerData as WorkerRecord;

        setDescription(
          worker.description || ""
        );

        setExperienceYears(
          worker.experience_years === null
            ? ""
            : String(
                worker.experience_years
              )
        );

        setBasePrice(
          worker.base_price === null
            ? ""
            : String(worker.base_price)
        );

        setIsAvailable(
          Boolean(worker.is_available)
        );

        setIsVerified(
          Boolean(worker.is_verified)
        );

        const ratingValue = Number(
          worker.average_rating ?? 0
        );

        setAverageRating(
          Number.isNaN(ratingValue)
            ? 0
            : ratingValue
        );
      } else {
        setDescription("");
        setExperienceYears("");
        setBasePrice("");
        setIsAvailable(true);
        setIsVerified(false);
        setAverageRating(0);
      }
    } catch (error) {
      console.error(
        "Unexpected profile loading error:",
        error
      );

      setErrorMessage(
        text.unexpectedLoadError
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    text.profileLoadError,
    text.unexpectedLoadError,
    text.workerLoadError,
  ]);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile])
  );

  const validateProfile = (): boolean => {
    if (!fullName.trim()) {
      Alert.alert(
        text.fullNameRequiredTitle,
        text.fullNameRequiredMessage
      );

      return false;
    }

    if (!town.trim()) {
      Alert.alert(
        text.townRequiredTitle,
        text.townRequiredMessage
      );

      return false;
    }

    if (role === "worker") {
      const experience = Number(
        experienceYears
      );

      const price = Number(basePrice);

      if (!description.trim()) {
        Alert.alert(
          text.descriptionRequiredTitle,
          text.descriptionRequiredMessage
        );

        return false;
      }

      if (
        experienceYears.trim() === "" ||
        Number.isNaN(experience) ||
        experience < 0
      ) {
        Alert.alert(
          text.invalidExperienceTitle,
          text.invalidExperienceMessage
        );

        return false;
      }

      if (
        basePrice.trim() === "" ||
        Number.isNaN(price) ||
        price < 0
      ) {
        Alert.alert(
          text.invalidPriceTitle,
          text.invalidPriceMessage
        );

        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateProfile()) {
      return;
    }

    setIsSaving(true);

    try {
      const isWorker =
        role === "worker";

      const {
        data,
        error,
      } = await supabase.rpc(
        "save_my_profile_v2",
        {
          p_full_name:
            fullName.trim(),

          p_phone:
            phone.trim(),

          p_town:
            town.trim(),

          p_description: isWorker
            ? description.trim()
            : null,

          p_experience_years: isWorker
            ? Number(experienceYears)
            : null,

          p_base_price: isWorker
            ? Number(basePrice)
            : null,

          p_is_available: isWorker
            ? isAvailable
            : null,
        }
      );

      console.log(
        "Profile save response:",
        {
          data,
          error,
        }
      );

      if (error) {
        console.error(
          "Profile update error:",
          error
        );

        let message = error.message;

        if (error.details) {
          message =
            message +
            "\n\n" +
            error.details;
        }

        Alert.alert(
          text.updateFailed,
          message
        );

        return;
      }

      const result = (
        Array.isArray(data)
          ? data[0]
          : data
      ) as SaveProfileResponse | null;

      if (!result?.success) {
        Alert.alert(
          text.updateFailed,
          text.updateNotConfirmed
        );

        return;
      }

      await loadProfile();

      Alert.alert(
        text.updateSuccessTitle,
        text.updateSuccessMessage
      );
    } catch (error) {
      console.error(
        "Unexpected profile update error:",
        error
      );

      Alert.alert(
        text.unexpectedErrorTitle,
        text.unexpectedSaveError
      );
    } finally {
      setIsSaving(false);
    }
  };

  const goBack = () => {
    if (role === "customer") {
      router.replace(
        "/customer-dashboard"
      );

      return;
    }

    if (role === "worker") {
      router.replace(
        "/worker-dashboard"
      );

      return;
    }

    if (role === "admin") {
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

  const getRoleName = (): string => {
    if (role === "worker") {
      return text.skilledWorker;
    }

    if (role === "admin") {
      return text.administrator;
    }

    return text.customer;
  };

  if (isLoading) {
    return (
      <SafeAreaView
        style={styles.safeArea}
      >
        <View
          style={
            styles.centerContainer
          }
        >
          <ActivityIndicator
            size="large"
            color="#6D28D9"
          />

          <Text
            style={styles.loadingText}
          >
            {text.loading}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (errorMessage !== "") {
    return (
      <SafeAreaView
        style={styles.safeArea}
      >
        <View
          style={
            styles.centerContainer
          }
        >
          <Text style={styles.errorIcon}>
            ⚠️
          </Text>

          <Text style={styles.errorTitle}>
            {text.unavailableTitle}
          </Text>

          <Text style={styles.errorText}>
            {errorMessage}
          </Text>

          <Pressable
            style={styles.retryButton}
            onPress={loadProfile}
          >
            <Text
              style={
                styles.retryButtonText
              }
            >
              {text.tryAgain}
            </Text>
          </Pressable>

          <Pressable
            style={styles.backLink}
            onPress={goBack}
          >
            <Text
              style={styles.backLinkText}
            >
              {text.goBack}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.safeArea}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        <ScrollView
          contentContainerStyle={
            styles.content
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={
            false
          }
        >
          <View style={styles.header}>
            <Pressable
              style={styles.backButton}
              onPress={goBack}
              disabled={isSaving}
            >
              <Text
                style={styles.backText}
              >
                ← {text.backToDashboard}
              </Text>
            </Pressable>

            <Pressable
              style={
                styles.languageButton
              }
              onPress={() =>
                router.push("/language")
              }
              disabled={isSaving}
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

          <View style={styles.roleCard}>
            <Text style={styles.roleIcon}>
              {role === "worker"
                ? "🛠️"
                : role === "admin"
                ? "🛡️"
                : "👤"}
            </Text>

            <View
              style={
                styles.roleInformation
              }
            >
              <Text
                style={styles.roleLabel}
              >
                {text.accountType}
              </Text>

              <Text
                style={styles.roleValue}
              >
                {getRoleName()}
              </Text>
            </View>
          </View>

          <Text
            style={styles.sectionTitle}
          >
            {text.personalInformation}
          </Text>

          <Text style={styles.label}>
            {text.fullName} *
          </Text>

          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder={
              text.fullNamePlaceholder
            }
            placeholderTextColor="#9CA3AF"
            autoCapitalize="words"
            editable={!isSaving}
          />

          <Text style={styles.label}>
            {text.phone}
          </Text>

          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder={
              text.phonePlaceholder
            }
            placeholderTextColor="#9CA3AF"
            keyboardType="phone-pad"
            editable={!isSaving}
          />

          <Text style={styles.label}>
            {text.town} *
          </Text>

          <TextInput
            style={styles.input}
            value={town}
            onChangeText={setTown}
            placeholder={
              text.townPlaceholder
            }
            placeholderTextColor="#9CA3AF"
            autoCapitalize="words"
            editable={!isSaving}
          />

          {role === "worker" && (
            <>
              <Text
                style={
                  styles.sectionTitle
                }
              >
                {text.serviceInformation}
              </Text>

              <Text style={styles.label}>
                {text.serviceDescription} *
              </Text>

              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                ]}
                value={description}
                onChangeText={
                  setDescription
                }
                placeholder={
                  text.descriptionPlaceholder
                }
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                maxLength={500}
                editable={!isSaving}
              />

              <Text
                style={
                  styles.characterCount
                }
              >
                {description.length}/500
              </Text>

              <Text style={styles.label}>
                {text.experience} *
              </Text>

              <TextInput
                style={styles.input}
                value={experienceYears}
                onChangeText={
                  setExperienceYears
                }
                placeholder={
                  text.experiencePlaceholder
                }
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                editable={!isSaving}
              />

              <Text style={styles.label}>
                {text.startingPrice} *
              </Text>

              <TextInput
                style={styles.input}
                value={basePrice}
                onChangeText={setBasePrice}
                placeholder={
                  text.pricePlaceholder
                }
                placeholderTextColor="#9CA3AF"
                keyboardType="decimal-pad"
                editable={!isSaving}
              />

              <View
                style={
                  styles.availabilityCard
                }
              >
                <View
                  style={
                    styles.availabilityInformation
                  }
                >
                  <Text
                    style={
                      styles.availabilityTitle
                    }
                  >
                    {text.availabilityTitle}
                  </Text>

                  <Text
                    style={
                      styles.availabilityText
                    }
                  >
                    {
                      text.availabilityDescription
                    }
                  </Text>

                  <Text
                    style={[
                      styles.availabilityStatus,
                      isAvailable
                        ? styles.availableStatus
                        : styles.unavailableStatus,
                    ]}
                  >
                    {isAvailable
                      ? "● " +
                        text.acceptingBookings
                      : "○ " +
                        text.notAcceptingBookings}
                  </Text>
                </View>

                <Switch
                  value={isAvailable}
                  onValueChange={
                    setIsAvailable
                  }
                  disabled={isSaving}
                  trackColor={{
                    false: "#D1D5DB",
                    true: "#C4B5FD",
                  }}
                  thumbColor={
                    isAvailable
                      ? "#6D28D9"
                      : "#9CA3AF"
                  }
                />
              </View>

              <View
                style={[
                  styles.verificationCard,
                  isVerified
                    ? styles.verifiedCard
                    : styles.unverifiedCard,
                ]}
              >
                <Text
                  style={
                    styles.verificationIcon
                  }
                >
                  {isVerified
                    ? "🛡️"
                    : "ℹ️"}
                </Text>

                <View
                  style={
                    styles.verificationInformation
                  }
                >
                  <Text
                    style={
                      styles.verificationHeading
                    }
                  >
                    {
                      text.verificationTitle
                    }
                  </Text>

                  <View
                    style={[
                      styles.verificationBadge,
                      isVerified
                        ? styles.verifiedBadge
                        : styles.unverifiedBadge,
                    ]}
                  >
                    <Text
                      style={[
                        styles.verificationBadgeText,
                        isVerified
                          ? styles.verifiedBadgeText
                          : styles.unverifiedBadgeText,
                      ]}
                    >
                      {isVerified
                        ? "✓ " +
                          text.verified
                        : "○ " +
                          text.notVerified}
                    </Text>
                  </View>

                  <Text
                    style={
                      styles.verificationText
                    }
                  >
                    {isVerified
                      ? text.verifiedExplanation
                      : text.notVerifiedExplanation}
                  </Text>
                </View>
              </View>

              <View
                style={
                  styles.ratingCard
                }
              >
                <View>
                  <Text
                    style={
                      styles.ratingLabel
                    }
                  >
                    {text.rating}
                  </Text>

                  <Text
                    style={
                      styles.ratingValue
                    }
                  >
                    {averageRating > 0
                      ? "⭐ " +
                        averageRating.toFixed(
                          1
                        )
                      : text.newWorker}
                  </Text>
                </View>
              </View>

              <Text
                style={styles.statusNote}
              >
                {text.verificationNote}
              </Text>
            </>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.saveButton,
              pressed &&
                styles.pressedButton,
              isSaving &&
                styles.disabledButton,
            ]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <View
                style={
                  styles.savingContainer
                }
              >
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                />

                <Text
                  style={
                    styles.saveButtonText
                  }
                >
                  {text.savingProfile}
                </Text>
              </View>
            ) : (
              <Text
                style={
                  styles.saveButtonText
                }
              >
                {text.saveProfile}
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
    paddingTop: 20,
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
    fontSize: 14,
    color: "#6B7280",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  backButton: {
    flex: 1,
    paddingVertical: 10,
    paddingRight: 10,
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
    marginTop: 20,
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

  roleCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 17,
    marginTop: 22,
    borderWidth: 1,
    borderColor: "#DDD6FE",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
  },

  roleIcon: {
    fontSize: 32,
  },

  roleInformation: {
    flex: 1,
    marginLeft: 13,
  },

  roleLabel: {
    fontSize: 12,
    color: "#6B7280",
  },

  roleValue: {
    marginTop: 3,
    fontSize: 16,
    fontWeight: "800",
    color: "#6D28D9",
  },

  sectionTitle: {
    marginTop: 27,
    marginBottom: 3,
    fontSize: 19,
    fontWeight: "800",
    color: "#6D28D9",
  },

  label: {
    marginTop: 15,
    marginBottom: 7,
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
  },

  input: {
    width: "100%",
    minHeight: 52,
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

  characterCount: {
    marginTop: 5,
    fontSize: 11,
    textAlign: "right",
    color: "#9CA3AF",
  },

  availabilityCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 17,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#C4B5FD",
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
  },

  availabilityInformation: {
    flex: 1,
    paddingRight: 12,
  },

  availabilityTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1F2937",
  },

  availabilityText: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: "#6B7280",
  },

  availabilityStatus: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: "800",
  },

  availableStatus: {
    color: "#047857",
  },

  unavailableStatus: {
    color: "#B91C1C",
  },

  verificationCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 17,
    marginTop: 15,
    borderWidth: 1,
    borderRadius: 13,
  },

  verifiedCard: {
    borderColor: "#86EFAC",
    backgroundColor: "#F0FDF4",
  },

  unverifiedCard: {
    borderColor: "#FCD34D",
    backgroundColor: "#FFFBEB",
  },

  verificationIcon: {
    marginRight: 11,
    fontSize: 25,
  },

  verificationInformation: {
    flex: 1,
  },

  verificationHeading: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1F2937",
  },

  verificationBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 8,
    borderRadius: 14,
  },

  verifiedBadge: {
    backgroundColor: "#D1FAE5",
  },

  unverifiedBadge: {
    backgroundColor: "#FEF3C7",
  },

  verificationBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },

  verifiedBadgeText: {
    color: "#047857",
  },

  unverifiedBadgeText: {
    color: "#92400E",
  },

  verificationText: {
    marginTop: 9,
    fontSize: 12,
    lineHeight: 19,
    color: "#4B5563",
  },

  ratingCard: {
    padding: 16,
    marginTop: 13,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },

  ratingLabel: {
    fontSize: 12,
    color: "#6B7280",
  },

  ratingValue: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: "800",
    color: "#1F2937",
  },

  statusNote: {
    marginTop: 10,
    fontSize: 11,
    fontStyle: "italic",
    lineHeight: 17,
    color: "#6B7280",
  },

  saveButton: {
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 28,
    borderRadius: 13,
    backgroundColor: "#6D28D9",
  },

  saveButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  savingContainer: {
    flexDirection: "row",
    alignItems: "center",
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