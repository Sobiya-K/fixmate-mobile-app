import {
    router,
    useFocusEffect,
  } from "expo-router";
  
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
  
  type AdminSummary = {
    admin_name: string;
    customers: number;
    workers: number;
    verified_workers: number;
    pending_workers: number;
    total_bookings: number;
    completed_bookings: number;
    reviews: number;
  };
  
  type AdminWorker = {
    id: string;
    full_name: string;
    phone: string | null;
    town: string | null;
    category: string;
    description: string | null;
    experience_years: number;
    base_price: number | string;
    is_verified: boolean;
    is_available: boolean;
    average_rating: number | string;
    created_at: string;
  };
  
  type WorkerFilter =
    | "pending"
    | "verified"
    | "all";
  
  type ScreenText = {
    roleLabel: string;
    administrator: string;
    logout: string;
    logoutFailed: string;
    language: string;
  
    heroTitle: string;
    heroText: string;
  
    loading: string;
    loadFailed: string;
    retry: string;
    unauthorizedTitle: string;
    unauthorizedMessage: string;
  
    platformOverview: string;
    customers: string;
    workers: string;
    verified: string;
    awaitingReview: string;
    bookings: string;
    completedBookings: string;
    reviews: string;
  
    workerVerification: string;
    verificationDescription: string;
    searchPlaceholder: string;
    pending: string;
    all: string;
  
    noWorkers: string;
    noWorkersText: string;
    noSearchResults: string;
    noSearchResultsText: string;
  
    description: string;
    noDescription: string;
    experience: string;
    years: string;
    startingPrice: string;
    rating: string;
    newWorker: string;
    availability: string;
    available: string;
    unavailable: string;
    phoneNotProvided: string;
    joined: string;
    unknownDate: string;
  
    verifiedStatus: string;
    pendingStatus: string;
    verificationExplanation: string;
    pendingExplanation: string;
  
    verifyWorker: string;
    removeVerification: string;
    verifying: string;
  
    verifyTitle: string;
    verifyMessage: string;
    removeTitle: string;
    removeMessage: string;
    cancel: string;
    confirmVerify: string;
    confirmRemove: string;
  
    verificationFailed: string;
    workerVerifiedTitle: string;
    workerVerifiedMessage: string;
    verificationRemovedTitle: string;
    verificationRemovedMessage: string;
    unexpectedError: string;
    unexpectedVerificationError: string;
  };
  
  const translations: Record<
    LanguageCode,
    ScreenText
  > = {
    en: {
      roleLabel: "FixMate Administrator",
      administrator: "Administrator",
      logout: "Logout",
      logoutFailed: "Logout failed",
      language: "Language",
  
      heroTitle: "Platform Control Centre",
      heroText:
        "Review worker accounts, control verification and monitor FixMate activity.",
  
      loading:
        "Loading administrator dashboard...",
      loadFailed:
        "The administrator dashboard could not be loaded.",
      retry: "Try Again",
      unauthorizedTitle: "Access denied",
      unauthorizedMessage:
        "Only administrator accounts can open this dashboard.",
  
      platformOverview: "Platform Overview",
      customers: "Customers",
      workers: "Workers",
      verified: "Verified",
      awaitingReview: "Awaiting Review",
      bookings: "Bookings",
      completedBookings: "Completed",
      reviews: "Reviews",
  
      workerVerification: "Worker Verification",
      verificationDescription:
        "Review worker information carefully before granting verified status.",
      searchPlaceholder:
        "Search by worker, category, town or phone",
      pending: "Pending",
      all: "All",
  
      noWorkers: "No workers in this section",
      noWorkersText:
        "Select another filter to view registered workers.",
      noSearchResults: "No matching workers",
      noSearchResultsText:
        "Try another worker name, category, town or phone number.",
  
      description: "Description",
      noDescription:
        "No service description was provided.",
      experience: "Experience",
      years: "years",
      startingPrice: "Starting price",
      rating: "Rating",
      newWorker: "New worker",
      availability: "Availability",
      available: "Available",
      unavailable: "Unavailable",
      phoneNotProvided: "Phone not provided",
      joined: "Joined",
      unknownDate: "Unknown",
  
      verifiedStatus: "Verified",
      pendingStatus: "Pending Review",
      verificationExplanation:
        "This worker is visible as a verified FixMate service provider.",
      pendingExplanation:
        "This worker has not yet received administrator verification.",
  
      verifyWorker: "Verify Worker",
      removeVerification: "Remove Verification",
      verifying: "Updating...",
  
      verifyTitle: "Verify this worker?",
      verifyMessage:
        "Confirm that this worker profile has been reviewed and approved.",
      removeTitle: "Remove verification?",
      removeMessage:
        "The worker will no longer appear as a verified FixMate service provider.",
      cancel: "Cancel",
      confirmVerify: "Verify Worker",
      confirmRemove: "Remove Verification",
  
      verificationFailed:
        "Verification update failed",
      workerVerifiedTitle: "Worker verified",
      workerVerifiedMessage:
        "is now a verified FixMate worker.",
      verificationRemovedTitle:
        "Verification removed",
      verificationRemovedMessage:
        "is no longer marked as verified.",
      unexpectedError: "Unexpected error",
      unexpectedVerificationError:
        "Something went wrong while updating the worker.",
    },
  
    ta: {
      roleLabel: "FixMate நிர்வாகி",
      administrator: "நிர்வாகி",
      logout: "வெளியேறு",
      logoutFailed:
        "வெளியேற முடியவில்லை",
      language: "மொழி",
  
      heroTitle:
        "தளக் கட்டுப்பாட்டு மையம்",
      heroText:
        "பணியாளர் கணக்குகளை மதிப்பாய்வு செய்து, சரிபார்ப்பை நிர்வகித்து, FixMate செயல்பாடுகளைக் கண்காணிக்கவும்.",
  
      loading:
        "நிர்வாக முகப்புப் பலகை ஏற்றப்படுகிறது...",
      loadFailed:
        "நிர்வாக முகப்புப் பலகையை ஏற்ற முடியவில்லை.",
      retry: "மீண்டும் முயற்சிக்கவும்",
      unauthorizedTitle:
        "அணுகல் மறுக்கப்பட்டது",
      unauthorizedMessage:
        "நிர்வாகி கணக்குகள் மட்டுமே இந்த முகப்புப் பலகையைத் திறக்க முடியும்.",
  
      platformOverview:
        "தளத்தின் மேலோட்டம்",
      customers: "வாடிக்கையாளர்கள்",
      workers: "பணியாளர்கள்",
      verified: "சரிபார்க்கப்பட்டவர்கள்",
      awaitingReview:
        "மதிப்பாய்வுக்காக காத்திருப்பவர்கள்",
      bookings: "முன்பதிவுகள்",
      completedBookings:
        "முடிக்கப்பட்டவை",
      reviews: "மதிப்புரைகள்",
  
      workerVerification:
        "பணியாளர் சரிபார்ப்பு",
      verificationDescription:
        "சரிபார்க்கப்பட்ட நிலையை வழங்குவதற்கு முன் பணியாளர் தகவலை கவனமாக மதிப்பாய்வு செய்யவும்.",
      searchPlaceholder:
        "பெயர், சேவை, நகரம் அல்லது தொலைபேசி மூலம் தேடவும்",
      pending: "நிலுவையில்",
      all: "அனைத்தும்",
  
      noWorkers:
        "இந்தப் பிரிவில் பணியாளர்கள் இல்லை",
      noWorkersText:
        "பதிவுசெய்யப்பட்ட பணியாளர்களைப் பார்க்க மற்றொரு வடிகட்டியைத் தேர்ந்தெடுக்கவும்.",
      noSearchResults:
        "பொருந்தும் பணியாளர்கள் இல்லை",
      noSearchResultsText:
        "வேறு பெயர், சேவை, நகரம் அல்லது தொலைபேசி எண்ணைப் பயன்படுத்தவும்.",
  
      description: "விவரம்",
      noDescription:
        "சேவை விவரம் வழங்கப்படவில்லை.",
      experience: "அனுபவம்",
      years: "ஆண்டுகள்",
      startingPrice: "தொடக்க கட்டணம்",
      rating: "மதிப்பீடு",
      newWorker: "புதிய பணியாளர்",
      availability: "கிடைக்கும் நிலை",
      available: "கிடைக்கிறார்",
      unavailable: "கிடைக்கவில்லை",
      phoneNotProvided:
        "தொலைபேசி எண் வழங்கப்படவில்லை",
      joined: "இணைந்த தேதி",
      unknownDate: "தெரியவில்லை",
  
      verifiedStatus:
        "சரிபார்க்கப்பட்டவர்",
      pendingStatus:
        "மதிப்பாய்வு நிலுவையில்",
      verificationExplanation:
        "இந்த பணியாளர் சரிபார்க்கப்பட்ட FixMate சேவை வழங்குநராகக் காட்டப்படுகிறார்.",
      pendingExplanation:
        "இந்த பணியாளர் இன்னும் நிர்வாகியின் சரிபார்ப்பைப் பெறவில்லை.",
  
      verifyWorker:
        "பணியாளரைச் சரிபார்க்கவும்",
      removeVerification:
        "சரிபார்ப்பை நீக்கவும்",
      verifying:
        "புதுப்பிக்கப்படுகிறது...",
  
      verifyTitle:
        "இந்த பணியாளரைச் சரிபார்க்கவா?",
      verifyMessage:
        "இந்த பணியாளர் சுயவிவரம் மதிப்பாய்வு செய்யப்பட்டு அங்கீகரிக்கப்பட்டதை உறுதிப்படுத்தவும்.",
      removeTitle:
        "சரிபார்ப்பை நீக்கவா?",
      removeMessage:
        "இந்த பணியாளர் இனி சரிபார்க்கப்பட்ட FixMate சேவை வழங்குநராகக் காட்டப்பட மாட்டார்.",
      cancel: "ரத்து செய்",
      confirmVerify:
        "பணியாளரைச் சரிபார்க்கவும்",
      confirmRemove:
        "சரிபார்ப்பை நீக்கவும்",
  
      verificationFailed:
        "சரிபார்ப்பைப் புதுப்பிக்க முடியவில்லை",
      workerVerifiedTitle:
        "பணியாளர் சரிபார்க்கப்பட்டார்",
      workerVerifiedMessage:
        "இப்போது சரிபார்க்கப்பட்ட FixMate பணியாளராக உள்ளார்.",
      verificationRemovedTitle:
        "சரிபார்ப்பு நீக்கப்பட்டது",
      verificationRemovedMessage:
        "இனி சரிபார்க்கப்பட்டவராகக் குறிக்கப்படவில்லை.",
      unexpectedError:
        "எதிர்பாராத பிழை",
      unexpectedVerificationError:
        "பணியாளரைப் புதுப்பிக்கும்போது ஏதோ தவறு ஏற்பட்டது.",
    },
  
    si: {
      roleLabel: "FixMate පරිපාලක",
      administrator: "පරිපාලක",
      logout: "ඉවත් වන්න",
      logoutFailed:
        "ඉවත් වීම අසාර්ථකයි",
      language: "භාෂාව",
  
      heroTitle:
        "වේදිකා පාලන මධ්‍යස්ථානය",
      heroText:
        "සේවා සපයන්නාගේ ගිණුම් සමාලෝචනය කර, තහවුරු කිරීම් පාලනය කර FixMate ක්‍රියාකාරකම් නිරීක්ෂණය කරන්න.",
  
      loading:
        "පරිපාලක උපකරණ පුවරුව පූරණය වෙමින්...",
      loadFailed:
        "පරිපාලක උපකරණ පුවරුව පූරණය කළ නොහැක.",
      retry: "නැවත උත්සාහ කරන්න",
      unauthorizedTitle:
        "ප්‍රවේශය ප්‍රතික්ෂේප කරන ලදී",
      unauthorizedMessage:
        "මෙම උපකරණ පුවරුව විවෘත කළ හැක්කේ පරිපාලක ගිණුම්වලට පමණි.",
  
      platformOverview:
        "වේදිකාවේ සාරාංශය",
      customers: "පාරිභෝගිකයින්",
      workers: "සේවා සපයන්නන්",
      verified: "තහවුරු කළ",
      awaitingReview:
        "සමාලෝචනයට බලා සිටී",
      bookings: "වෙන්කිරීම්",
      completedBookings:
        "සම්පූර්ණ කළ",
      reviews: "සමාලෝචන",
  
      workerVerification:
        "සේවා සපයන්නා තහවුරු කිරීම",
      verificationDescription:
        "තහවුරු කළ තත්ත්වය ලබා දීමට පෙර සේවා සපයන්නාගේ තොරතුරු හොඳින් සමාලෝචනය කරන්න.",
      searchPlaceholder:
        "නම, සේවාව, නගරය හෝ දුරකථනයෙන් සොයන්න",
      pending: "පොරොත්තුවෙන්",
      all: "සියල්ල",
  
      noWorkers:
        "මෙම කොටසේ සේවා සපයන්නන් නොමැත",
      noWorkersText:
        "ලියාපදිංචි සේවා සපයන්නන් බැලීමට වෙනත් පෙරහනක් තෝරන්න.",
      noSearchResults:
        "ගැළපෙන සේවා සපයන්නන් නොමැත",
      noSearchResultsText:
        "වෙනත් නමක්, සේවාවක්, නගරයක් හෝ දුරකථන අංකයක් භාවිතා කරන්න.",
  
      description: "විස්තරය",
      noDescription:
        "සේවා විස්තරයක් ලබා දී නොමැත.",
      experience: "පළපුරුද්ද",
      years: "වසර",
      startingPrice: "ආරම්භක මිල",
      rating: "ඇගයීම",
      newWorker: "නව සේවා සපයන්නෙක්",
      availability: "ලබාගත හැකි තත්ත්වය",
      available: "ලබා ගත හැක",
      unavailable: "ලබා ගත නොහැක",
      phoneNotProvided:
        "දුරකථන අංකයක් ලබා දී නොමැත",
      joined: "සම්බන්ධ වූ දිනය",
      unknownDate: "නොදනී",
  
      verifiedStatus: "තහවුරු කළ",
      pendingStatus:
        "සමාලෝචනයට පොරොත්තුවෙන්",
      verificationExplanation:
        "මෙම සේවා සපයන්නා තහවුරු කළ FixMate සේවා සපයන්නෙකු ලෙස පෙන්වයි.",
      pendingExplanation:
        "මෙම සේවා සපයන්නාට තවම පරිපාලක තහවුරු කිරීම ලැබී නොමැත.",
  
      verifyWorker:
        "සේවා සපයන්නා තහවුරු කරන්න",
      removeVerification:
        "තහවුරු කිරීම ඉවත් කරන්න",
      verifying:
        "යාවත්කාලීන කරමින්...",
  
      verifyTitle:
        "මෙම සේවා සපයන්නා තහවුරු කරන්නද?",
      verifyMessage:
        "මෙම සේවා සපයන්නාගේ පැතිකඩ සමාලෝචනය කර අනුමත කර ඇති බව තහවුරු කරන්න.",
      removeTitle:
        "තහවුරු කිරීම ඉවත් කරන්නද?",
      removeMessage:
        "මෙම සේවා සපයන්නා තවදුරටත් තහවුරු කළ FixMate සේවා සපයන්නෙකු ලෙස නොපෙන්වයි.",
      cancel: "අවලංගු කරන්න",
      confirmVerify:
        "සේවා සපයන්නා තහවුරු කරන්න",
      confirmRemove:
        "තහවුරු කිරීම ඉවත් කරන්න",
  
      verificationFailed:
        "තහවුරු කිරීම යාවත්කාලීන කිරීම අසාර්ථකයි",
      workerVerifiedTitle:
        "සේවා සපයන්නා තහවුරු කරන ලදී",
      workerVerifiedMessage:
        "දැන් තහවුරු කළ FixMate සේවා සපයන්නෙකු වේ.",
      verificationRemovedTitle:
        "තහවුරු කිරීම ඉවත් කරන ලදී",
      verificationRemovedMessage:
        "තවදුරටත් තහවුරු කළ ලෙස සලකුණු කර නොමැත.",
      unexpectedError:
        "අනපේක්ෂිත දෝෂයක්",
      unexpectedVerificationError:
        "සේවා සපයන්නා යාවත්කාලීන කිරීමේදී දෝෂයක් ඇති විය.",
    },
  };
  
  const getLocalizedDate = (
    dateValue: string,
    language: LanguageCode,
    unknownDateText: string
  ): string => {
    const date = new Date(dateValue);
  
    if (Number.isNaN(date.getTime())) {
      return unknownDateText;
    }
  
    let locale = "en-LK";
  
    if (language === "ta") {
      locale = "ta-LK";
    }
  
    if (language === "si") {
      locale = "si-LK";
    }
  
    return date.toLocaleDateString(
      locale,
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };
  
  export default function AdminDashboard() {
    const {
      language,
      languageName,
    } = useLanguage();
  
    const text = translations[language];
  
    const [summary, setSummary] =
      useState<AdminSummary | null>(null);
  
    const [adminName, setAdminName] =
      useState(text.administrator);
  
    const [workers, setWorkers] =
      useState<AdminWorker[]>([]);
  
    const [
      selectedFilter,
      setSelectedFilter,
    ] = useState<WorkerFilter>("pending");
  
    const [searchText, setSearchText] =
      useState("");
  
    const [isLoading, setIsLoading] =
      useState(true);
  
    const [isRefreshing, setIsRefreshing] =
      useState(false);
  
    const [
      updatingWorkerId,
      setUpdatingWorkerId,
    ] = useState<string | null>(null);
  
    const [errorMessage, setErrorMessage] =
      useState("");
  
    const routeNonAdminUser = useCallback(
      (role: UserRole) => {
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
  
        router.replace("/login");
      },
      []
    );
  
    const loadDashboard = useCallback(
      async (
        refreshing = false
      ): Promise<void> => {
        if (refreshing) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }
  
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
            .select("full_name, role")
            .eq("id", user.id)
            .single();
  
          if (
            profileError ||
            !profileData
          ) {
            console.error(
              "Admin profile loading error:",
              profileError
            );
  
            setErrorMessage(
              text.loadFailed
            );
  
            return;
          }
  
          const role =
            profileData.role as UserRole;
  
          if (role !== "admin") {
            Alert.alert(
              text.unauthorizedTitle,
              text.unauthorizedMessage,
              [
                {
                  text: "OK",
                  onPress: () =>
                    routeNonAdminUser(role),
                },
              ]
            );
  
            return;
          }
  
          setAdminName(
            profileData.full_name ||
              text.administrator
          );
  
          const {
            data: summaryData,
            error: summaryError,
          } = await supabase.rpc(
            "get_admin_dashboard"
          );
  
          console.log(
            "Admin summary response:",
            {
              data: summaryData,
              error: summaryError,
            }
          );
  
          if (summaryError) {
            console.error(
              "Admin summary loading error:",
              summaryError
            );
  
            setErrorMessage(
              summaryError.message
            );
  
            return;
          }
  
          const normalizedSummary =
            Array.isArray(summaryData)
              ? summaryData[0]
              : summaryData;
  
          if (
            !normalizedSummary ||
            typeof normalizedSummary !==
              "object"
          ) {
            setErrorMessage(
              text.loadFailed
            );
  
            return;
          }
  
          const preparedSummary =
            normalizedSummary as AdminSummary;
  
          setSummary(preparedSummary);
  
          if (
            preparedSummary.admin_name &&
            preparedSummary.admin_name.trim() !==
              ""
          ) {
            setAdminName(
              preparedSummary.admin_name
            );
          }
  
          const {
            data: workerData,
            error: workerError,
          } = await supabase.rpc(
            "get_admin_workers"
          );
  
          console.log(
            "Admin workers response:",
            {
              data: workerData,
              error: workerError,
            }
          );
  
          if (workerError) {
            console.error(
              "Admin workers loading error:",
              workerError
            );
  
            setErrorMessage(
              workerError.message
            );
  
            return;
          }
  
          setWorkers(
            Array.isArray(workerData)
              ? (workerData as AdminWorker[])
              : []
          );
        } catch (error) {
          console.error(
            "Unexpected admin dashboard error:",
            error
          );
  
          setErrorMessage(
            text.loadFailed
          );
        } finally {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      },
      [
        routeNonAdminUser,
        text.administrator,
        text.loadFailed,
        text.unauthorizedMessage,
        text.unauthorizedTitle,
      ]
    );
  
    useFocusEffect(
      useCallback(() => {
        void loadDashboard();
      }, [loadDashboard])
    );
  
    const pendingWorkerCount =
      useMemo(() => {
        return workers.filter(
          (worker) =>
            !worker.is_verified
        ).length;
      }, [workers]);
  
    const verifiedWorkerCount =
      useMemo(() => {
        return workers.filter(
          (worker) =>
            worker.is_verified
        ).length;
      }, [workers]);
  
    const filteredWorkers = useMemo(() => {
      const cleanedSearch =
        searchText.trim().toLowerCase();
  
      return workers.filter((worker) => {
        const matchesFilter =
          selectedFilter === "all" ||
          (selectedFilter === "pending" &&
            !worker.is_verified) ||
          (selectedFilter === "verified" &&
            worker.is_verified);
  
        if (!matchesFilter) {
          return false;
        }
  
        if (cleanedSearch === "") {
          return true;
        }
  
        const searchableValues = [
          worker.full_name,
          worker.phone || "",
          worker.town || "",
          worker.category,
          worker.description || "",
        ];
  
        return searchableValues.some(
          (value) =>
            value
              .toLowerCase()
              .includes(cleanedSearch)
        );
      });
    }, [
      workers,
      selectedFilter,
      searchText,
    ]);
  
    const getConfirmationMessage = (
      worker: AdminWorker,
      newVerificationValue: boolean
    ): string => {
      const baseMessage =
        newVerificationValue
          ? text.verifyMessage
          : text.removeMessage;
  
      return (
        worker.full_name +
        "\n\n" +
        baseMessage
      );
    };
  
    const performVerification = async (
      worker: AdminWorker,
      newVerificationValue: boolean
    ) => {
      setUpdatingWorkerId(worker.id);
  
      try {
        const {
          data,
          error,
        } = await supabase.rpc(
          "set_worker_verification",
          {
            p_worker_id: worker.id,
            p_is_verified:
              newVerificationValue,
          }
        );
  
        console.log(
          "Worker verification response:",
          {
            data,
            error,
          }
        );
  
        if (error) {
          Alert.alert(
            text.verificationFailed,
            error.message
          );
  
          return;
        }
  
        setWorkers(
          (currentWorkers) =>
            currentWorkers.map(
              (currentWorker) =>
                currentWorker.id ===
                worker.id
                  ? {
                      ...currentWorker,
                      is_verified:
                        newVerificationValue,
                    }
                  : currentWorker
            )
        );
  
        Alert.alert(
          newVerificationValue
            ? text.workerVerifiedTitle
            : text.verificationRemovedTitle,
  
          worker.full_name +
            " " +
            (newVerificationValue
              ? text.workerVerifiedMessage
              : text.verificationRemovedMessage)
        );
  
        await loadDashboard(true);
      } catch (error) {
        console.error(
          "Unexpected verification error:",
          error
        );
  
        Alert.alert(
          text.unexpectedError,
          text.unexpectedVerificationError
        );
      } finally {
        setUpdatingWorkerId(null);
      }
    };
  
    const confirmVerification = (
      worker: AdminWorker
    ) => {
      const newVerificationValue =
        !worker.is_verified;
  
      Alert.alert(
        newVerificationValue
          ? text.verifyTitle
          : text.removeTitle,
  
        getConfirmationMessage(
          worker,
          newVerificationValue
        ),
  
        [
          {
            text: text.cancel,
            style: "cancel",
          },
          {
            text: newVerificationValue
              ? text.confirmVerify
              : text.confirmRemove,
  
            style: newVerificationValue
              ? "default"
              : "destructive",
  
            onPress: () =>
              performVerification(
                worker,
                newVerificationValue
              ),
          },
        ]
      );
    };
  
    const handleLogout = async () => {
      const {
        error,
      } = await supabase.auth.signOut();
  
      if (error) {
        Alert.alert(
          text.logoutFailed,
          error.message
        );
  
        return;
      }
  
      router.replace("/login");
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
  
    return (
      <SafeAreaView
        style={styles.safeArea}
      >
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
                loadDashboard(true)
              }
              colors={["#6D28D9"]}
            />
          }
        >
          <View style={styles.header}>
            <View
              style={
                styles.headerInformation
              }
            >
              <Text
                style={styles.roleLabel}
              >
                {text.roleLabel}
              </Text>
  
              <Text
                style={styles.adminName}
              >
                {adminName}
              </Text>
            </View>
  
            <View
              style={styles.headerActions}
            >
              <Pressable
                style={
                  styles.languageButton
                }
                onPress={() =>
                  router.push("/language")
                }
              >
                <Text
                  style={
                    styles.languageButtonText
                  }
                >
                  🌐 {languageName}
                </Text>
              </Pressable>
  
              <Pressable
                style={styles.logoutButton}
                onPress={handleLogout}
              >
                <Text
                  style={styles.logoutText}
                >
                  {text.logout}
                </Text>
              </Pressable>
            </View>
          </View>
  
          <View style={styles.heroCard}>
            <Text style={styles.heroIcon}>
              🛡️
            </Text>
  
            <View
              style={
                styles.heroInformation
              }
            >
              <Text
                style={styles.heroTitle}
              >
                {text.heroTitle}
              </Text>
  
              <Text
                style={styles.heroText}
              >
                {text.heroText}
              </Text>
            </View>
          </View>
  
          {errorMessage !== "" && (
            <View style={styles.errorCard}>
              <Text
                style={styles.errorText}
              >
                {errorMessage}
              </Text>
  
              <Pressable
                onPress={() =>
                  loadDashboard(true)
                }
              >
                <Text
                  style={styles.retryText}
                >
                  {text.retry}
                </Text>
              </Pressable>
            </View>
          )}
  
          <Text style={styles.sectionTitle}>
            {text.platformOverview}
          </Text>
  
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Text
                style={styles.summaryNumber}
              >
                {summary?.customers ?? 0}
              </Text>
  
              <Text
                style={styles.summaryLabel}
              >
                {text.customers}
              </Text>
            </View>
  
            <View style={styles.summaryCard}>
              <Text
                style={styles.summaryNumber}
              >
                {summary?.workers ?? 0}
              </Text>
  
              <Text
                style={styles.summaryLabel}
              >
                {text.workers}
              </Text>
            </View>
  
            <View style={styles.summaryCard}>
              <Text
                style={styles.summaryNumber}
              >
                {summary?.verified_workers ??
                  verifiedWorkerCount}
              </Text>
  
              <Text
                style={styles.summaryLabel}
              >
                {text.verified}
              </Text>
            </View>
  
            <View style={styles.summaryCard}>
              <Text
                style={styles.summaryNumber}
              >
                {summary?.pending_workers ??
                  pendingWorkerCount}
              </Text>
  
              <Text
                style={styles.summaryLabel}
              >
                {text.awaitingReview}
              </Text>
            </View>
  
            <View style={styles.summaryCard}>
              <Text
                style={styles.summaryNumber}
              >
                {summary?.total_bookings ??
                  0}
              </Text>
  
              <Text
                style={styles.summaryLabel}
              >
                {text.bookings}
              </Text>
            </View>
  
            <View style={styles.summaryCard}>
              <Text
                style={styles.summaryNumber}
              >
                {summary?.completed_bookings ??
                  0}
              </Text>
  
              <Text
                style={styles.summaryLabel}
              >
                {text.completedBookings}
              </Text>
            </View>
  
            <View
              style={[
                styles.summaryCard,
                styles.fullSummaryCard,
              ]}
            >
              <Text
                style={styles.summaryNumber}
              >
                {summary?.reviews ?? 0}
              </Text>
  
              <Text
                style={styles.summaryLabel}
              >
                {text.reviews}
              </Text>
            </View>
          </View>
  
          <View
            style={styles.sectionHeader}
          >
            <View
              style={
                styles.sectionHeaderInformation
              }
            >
              <Text
                style={styles.sectionTitle}
              >
                {text.workerVerification}
              </Text>
  
              <Text
                style={styles.sectionText}
              >
                {
                  text.verificationDescription
                }
              </Text>
            </View>
  
            <Text
              style={styles.workerCount}
            >
              {filteredWorkers.length}
            </Text>
          </View>
  
          <View
            style={styles.searchContainer}
          >
            <Text style={styles.searchIcon}>
              🔍
            </Text>
  
            <TextInput
              style={styles.searchInput}
              value={searchText}
              onChangeText={setSearchText}
              placeholder={
                text.searchPlaceholder
              }
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              autoCorrect={false}
            />
  
            {searchText.trim() !== "" && (
              <Pressable
                style={styles.clearButton}
                onPress={() =>
                  setSearchText("")
                }
              >
                <Text
                  style={styles.clearText}
                >
                  ✕
                </Text>
              </Pressable>
            )}
          </View>
  
          <View style={styles.filterRow}>
            <Pressable
              style={[
                styles.filterButton,
  
                selectedFilter ===
                  "pending" &&
                  styles.activeFilterButton,
              ]}
              onPress={() =>
                setSelectedFilter("pending")
              }
            >
              <Text
                style={[
                  styles.filterText,
  
                  selectedFilter ===
                    "pending" &&
                    styles.activeFilterText,
                ]}
              >
                {text.pending} (
                {pendingWorkerCount})
              </Text>
            </Pressable>
  
            <Pressable
              style={[
                styles.filterButton,
  
                selectedFilter ===
                  "verified" &&
                  styles.activeFilterButton,
              ]}
              onPress={() =>
                setSelectedFilter(
                  "verified"
                )
              }
            >
              <Text
                style={[
                  styles.filterText,
  
                  selectedFilter ===
                    "verified" &&
                    styles.activeFilterText,
                ]}
              >
                {text.verified} (
                {verifiedWorkerCount})
              </Text>
            </Pressable>
  
            <Pressable
              style={[
                styles.filterButton,
  
                selectedFilter === "all" &&
                  styles.activeFilterButton,
              ]}
              onPress={() =>
                setSelectedFilter("all")
              }
            >
              <Text
                style={[
                  styles.filterText,
  
                  selectedFilter ===
                    "all" &&
                    styles.activeFilterText,
                ]}
              >
                {text.all} ({workers.length})
              </Text>
            </Pressable>
          </View>
  
          {filteredWorkers.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>
                {searchText.trim() !== ""
                  ? "🔍"
                  : "✅"}
              </Text>
  
              <Text
                style={styles.emptyTitle}
              >
                {searchText.trim() !== ""
                  ? text.noSearchResults
                  : text.noWorkers}
              </Text>
  
              <Text
                style={styles.emptyText}
              >
                {searchText.trim() !== ""
                  ? text.noSearchResultsText
                  : text.noWorkersText}
              </Text>
            </View>
          ) : (
            filteredWorkers.map(
              (worker) => {
                const isUpdating =
                  updatingWorkerId ===
                  worker.id;
  
                const ratingValue =
                  Number(
                    worker.average_rating
                  );
  
                const rating =
                  Number.isNaN(ratingValue)
                    ? 0
                    : ratingValue;
  
                const priceValue =
                  Number(worker.base_price);
  
                const price =
                  Number.isNaN(priceValue)
                    ? 0
                    : priceValue;
  
                return (
                  <View
                    key={worker.id}
                    style={styles.workerCard}
                  >
                    <View
                      style={
                        styles.workerTopRow
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
                          styles.workerMainInformation
                        }
                      >
                        <Text
                          style={
                            styles.workerName
                          }
                        >
                          {worker.full_name}
                        </Text>
  
                        <Text
                          style={
                            styles.workerCategory
                          }
                        >
                          {worker.category}
                        </Text>
  
                        <Text
                          style={
                            styles.workerTown
                          }
                        >
                          📍{" "}
                          {worker.town ||
                            text.unknownDate}
                        </Text>
                      </View>
  
                      <View
                        style={[
                          styles.verificationBadge,
  
                          worker.is_verified
                            ? styles.verifiedBadge
                            : styles.pendingBadge,
                        ]}
                      >
                        <Text
                          style={[
                            styles.verificationBadgeText,
  
                            worker.is_verified
                              ? styles.verifiedText
                              : styles.pendingText,
                          ]}
                        >
                          {worker.is_verified
                            ? "✓ " +
                              text.verifiedStatus
                            : "○ " +
                              text.pendingStatus}
                        </Text>
                      </View>
                    </View>
  
                    <View
                      style={styles.divider}
                    />
  
                    <Text
                      style={
                        styles.verificationExplanation
                      }
                    >
                      {worker.is_verified
                        ? text.verificationExplanation
                        : text.pendingExplanation}
                    </Text>
  
                    <Text
                      style={styles.detailLabel}
                    >
                      {text.description}
                    </Text>
  
                    <Text
                      style={styles.description}
                    >
                      {worker.description ||
                        text.noDescription}
                    </Text>
  
                    <View
                      style={
                        styles.detailsGrid
                      }
                    >
                      <View
                        style={
                          styles.detailItem
                        }
                      >
                        <Text
                          style={
                            styles.detailLabel
                          }
                        >
                          {text.experience}
                        </Text>
  
                        <Text
                          style={
                            styles.detailValue
                          }
                        >
                          {
                            worker.experience_years
                          }{" "}
                          {text.years}
                        </Text>
                      </View>
  
                      <View
                        style={
                          styles.detailItem
                        }
                      >
                        <Text
                          style={
                            styles.detailLabel
                          }
                        >
                          {text.startingPrice}
                        </Text>
  
                        <Text
                          style={
                            styles.detailValue
                          }
                        >
                          LKR{" "}
                          {price.toLocaleString()}
                        </Text>
                      </View>
  
                      <View
                        style={
                          styles.detailItem
                        }
                      >
                        <Text
                          style={
                            styles.detailLabel
                          }
                        >
                          {text.rating}
                        </Text>
  
                        <Text
                          style={
                            styles.detailValue
                          }
                        >
                          {rating > 0
                            ? "⭐ " +
                              rating.toFixed(1)
                            : text.newWorker}
                        </Text>
                      </View>
  
                      <View
                        style={
                          styles.detailItem
                        }
                      >
                        <Text
                          style={
                            styles.detailLabel
                          }
                        >
                          {text.availability}
                        </Text>
  
                        <Text
                          style={[
                            styles.detailValue,
  
                            worker.is_available
                              ? styles.availableText
                              : styles.unavailableText,
                          ]}
                        >
                          {worker.is_available
                            ? "● " +
                              text.available
                            : "○ " +
                              text.unavailable}
                        </Text>
                      </View>
                    </View>
  
                    <View
                      style={styles.contactCard}
                    >
                      <Text
                        style={styles.contactText}
                      >
                        📞{" "}
                        {worker.phone ||
                          text.phoneNotProvided}
                      </Text>
  
                      <Text
                        style={styles.joinedText}
                      >
                        {text.joined}{" "}
                        {getLocalizedDate(
                          worker.created_at,
                          language,
                          text.unknownDate
                        )}
                      </Text>
                    </View>
  
                    <Pressable
                      style={({ pressed }) => [
                        styles.verificationButton,
  
                        worker.is_verified
                          ? styles.removeButton
                          : styles.verifyButton,
  
                        pressed &&
                          styles.pressedButton,
  
                        isUpdating &&
                          styles.disabledButton,
                      ]}
                      onPress={() =>
                        confirmVerification(
                          worker
                        )
                      }
                      disabled={isUpdating}
                    >
                      {isUpdating ? (
                        <View
                          style={
                            styles.updatingRow
                          }
                        >
                          <ActivityIndicator
                            size="small"
                            color="#FFFFFF"
                          />
  
                          <Text
                            style={
                              styles.verificationButtonText
                            }
                          >
                            {text.verifying}
                          </Text>
                        </View>
                      ) : (
                        <Text
                          style={
                            styles.verificationButtonText
                          }
                        >
                          {worker.is_verified
                            ? text.removeVerification
                            : text.verifyWorker}
                        </Text>
                      )}
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
      paddingTop: 22,
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
      fontSize: 14,
      textAlign: "center",
      color: "#6B7280",
    },
  
    header: {
      flexDirection: "row",
      alignItems: "center",
    },
  
    headerInformation: {
      flex: 1,
      paddingRight: 10,
    },
  
    roleLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: "#6D28D9",
    },
  
    adminName: {
      marginTop: 3,
      fontSize: 24,
      fontWeight: "800",
      color: "#1F2937",
    },
  
    headerActions: {
      alignItems: "flex-end",
    },
  
    languageButton: {
      paddingHorizontal: 11,
      paddingVertical: 8,
      marginBottom: 7,
      borderWidth: 1,
      borderColor: "#C4B5FD",
      borderRadius: 18,
      backgroundColor: "#FFFFFF",
    },
  
    languageButtonText: {
      fontSize: 11,
      fontWeight: "800",
      color: "#6D28D9",
    },
  
    logoutButton: {
      paddingHorizontal: 14,
      paddingVertical: 8,
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
      padding: 20,
      marginTop: 23,
      borderRadius: 17,
      backgroundColor: "#4C1D95",
    },
  
    heroIcon: {
      marginRight: 14,
      fontSize: 40,
    },
  
    heroInformation: {
      flex: 1,
    },
  
    heroTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: "#FFFFFF",
    },
  
    heroText: {
      marginTop: 5,
      fontSize: 13,
      lineHeight: 19,
      color: "#EDE9FE",
    },
  
    errorCard: {
      padding: 15,
      marginTop: 17,
      borderWidth: 1,
      borderColor: "#FCA5A5",
      borderRadius: 11,
      backgroundColor: "#FEF2F2",
    },
  
    errorText: {
      fontSize: 13,
      lineHeight: 19,
      color: "#B91C1C",
    },
  
    retryText: {
      marginTop: 7,
      fontWeight: "800",
      color: "#6D28D9",
    },
  
    sectionTitle: {
      marginTop: 25,
      fontSize: 19,
      fontWeight: "800",
      color: "#1F2937",
    },
  
    sectionText: {
      marginTop: 4,
      fontSize: 12,
      lineHeight: 18,
      color: "#6B7280",
    },
  
    summaryGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      marginTop: 13,
    },
  
    summaryCard: {
      width: "48.5%",
      alignItems: "center",
      paddingVertical: 17,
      paddingHorizontal: 7,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: "#DDD6FE",
      borderRadius: 13,
      backgroundColor: "#FFFFFF",
    },
  
    fullSummaryCard: {
      width: "100%",
    },
  
    summaryNumber: {
      fontSize: 24,
      fontWeight: "800",
      color: "#6D28D9",
    },
  
    summaryLabel: {
      marginTop: 4,
      fontSize: 11,
      fontWeight: "600",
      textAlign: "center",
      color: "#6B7280",
    },
  
    sectionHeader: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
    },
  
    sectionHeaderInformation: {
      flex: 1,
      paddingRight: 10,
    },
  
    workerCount: {
      minWidth: 34,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 15,
      overflow: "hidden",
      textAlign: "center",
      fontWeight: "800",
      color: "#6D28D9",
      backgroundColor: "#EDE9FE",
    },
  
    searchContainer: {
      minHeight: 52,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      marginTop: 16,
      borderWidth: 1,
      borderColor: "#D1D5DB",
      borderRadius: 12,
      backgroundColor: "#FFFFFF",
    },
  
    searchIcon: {
      marginRight: 9,
      fontSize: 17,
    },
  
    searchInput: {
      flex: 1,
      minHeight: 50,
      fontSize: 14,
      color: "#111827",
    },
  
    clearButton: {
      padding: 8,
    },
  
    clearText: {
      fontSize: 14,
      fontWeight: "800",
      color: "#9CA3AF",
    },
  
    filterRow: {
      flexDirection: "row",
      marginTop: 14,
      marginBottom: 15,
      marginHorizontal: -3,
    },
  
    filterButton: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 45,
      paddingHorizontal: 4,
      marginHorizontal: 3,
      borderWidth: 1,
      borderColor: "#DDD6FE",
      borderRadius: 10,
      backgroundColor: "#FFFFFF",
    },
  
    activeFilterButton: {
      borderColor: "#6D28D9",
      backgroundColor: "#6D28D9",
    },
  
    filterText: {
      fontSize: 10,
      fontWeight: "700",
      textAlign: "center",
      color: "#6B7280",
    },
  
    activeFilterText: {
      color: "#FFFFFF",
    },
  
    workerCard: {
      padding: 18,
      marginBottom: 15,
      borderWidth: 1,
      borderColor: "#E5E7EB",
      borderRadius: 16,
      backgroundColor: "#FFFFFF",
    },
  
    workerTopRow: {
      flexDirection: "row",
      alignItems: "flex-start",
    },
  
    workerAvatar: {
      width: 52,
      height: 52,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 26,
      backgroundColor: "#EDE9FE",
    },
  
    workerAvatarText: {
      fontSize: 25,
    },
  
    workerMainInformation: {
      flex: 1,
      marginLeft: 12,
      paddingRight: 7,
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
      fontSize: 12,
      color: "#6B7280",
    },
  
    verificationBadge: {
      maxWidth: 105,
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderRadius: 15,
    },
  
    verifiedBadge: {
      backgroundColor: "#D1FAE5",
    },
  
    pendingBadge: {
      backgroundColor: "#FEF3C7",
    },
  
    verificationBadgeText: {
      fontSize: 9,
      fontWeight: "800",
      textAlign: "center",
    },
  
    verifiedText: {
      color: "#047857",
    },
  
    pendingText: {
      color: "#92400E",
    },
  
    divider: {
      height: 1,
      marginVertical: 14,
      backgroundColor: "#E5E7EB",
    },
  
    verificationExplanation: {
      padding: 11,
      marginBottom: 13,
      borderRadius: 9,
      backgroundColor: "#F9FAFB",
      fontSize: 11,
      lineHeight: 17,
      color: "#4B5563",
    },
  
    description: {
      marginTop: 5,
      fontSize: 13,
      lineHeight: 20,
      color: "#374151",
    },
  
    detailsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      marginTop: 10,
    },
  
    detailItem: {
      width: "48%",
      padding: 12,
      marginTop: 9,
      borderRadius: 10,
      backgroundColor: "#F9FAFB",
    },
  
    detailLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: "#6B7280",
    },
  
    detailValue: {
      marginTop: 5,
      fontSize: 13,
      fontWeight: "800",
      color: "#1F2937",
    },
  
    availableText: {
      color: "#047857",
    },
  
    unavailableText: {
      color: "#B91C1C",
    },
  
    contactCard: {
      padding: 13,
      marginTop: 14,
      borderRadius: 10,
      backgroundColor: "#F3F4F6",
    },
  
    contactText: {
      fontSize: 13,
      fontWeight: "700",
      color: "#374151",
    },
  
    joinedText: {
      marginTop: 5,
      fontSize: 11,
      color: "#6B7280",
    },
  
    verificationButton: {
      minHeight: 49,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 15,
      borderRadius: 10,
    },
  
    verifyButton: {
      backgroundColor: "#059669",
    },
  
    removeButton: {
      backgroundColor: "#DC2626",
    },
  
    updatingRow: {
      flexDirection: "row",
      alignItems: "center",
    },
  
    verificationButtonText: {
      marginLeft: 7,
      fontSize: 13,
      fontWeight: "800",
      textAlign: "center",
      color: "#FFFFFF",
    },
  
    pressedButton: {
      opacity: 0.82,
    },
  
    disabledButton: {
      opacity: 0.55,
    },
  
    emptyCard: {
      alignItems: "center",
      paddingVertical: 40,
      paddingHorizontal: 20,
      borderWidth: 1,
      borderColor: "#E5E7EB",
      borderRadius: 15,
      backgroundColor: "#FFFFFF",
    },
  
    emptyIcon: {
      fontSize: 42,
    },
  
    emptyTitle: {
      marginTop: 12,
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
  });