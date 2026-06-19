import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocales } from "expo-localization";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type LanguageCode = "en" | "ta" | "si";

type TranslationVariables = Record<
  string,
  string | number
>;

type LanguageContextValue = {
  language: LanguageCode;
  languageName: string;
  isLanguageReady: boolean;
  changeLanguage: (
    newLanguage: LanguageCode
  ) => Promise<void>;
  t: (
    key: string,
    variables?: TranslationVariables
  ) => string;
};

type LanguageProviderProps = {
  children: ReactNode;
};

const LANGUAGE_STORAGE_KEY =
  "fixmate-selected-language";

const languageNames: Record<
  LanguageCode,
  string
> = {
  en: "English",
  ta: "தமிழ்",
  si: "සිංහල",
};

const translations: Record<
  LanguageCode,
  Record<string, string>
> = {
  en: {
    "common.appName": "FixMate",
    "common.back": "Back",
    "common.cancel": "Cancel",
    "common.close": "Close",
    "common.confirm": "Confirm",
    "common.continue": "Continue",
    "common.loading": "Loading...",
    "common.logout": "Logout",
    "common.profile": "Profile",
    "common.retry": "Try again",
    "common.save": "Save",
    "common.submit": "Submit",
    "common.yes": "Yes",
    "common.no": "No",
    "common.available": "Available",
    "common.unavailable": "Unavailable",
    "common.verified": "Verified",
    "common.pending": "Pending",
    "common.accepted": "Accepted",
    "common.rejected": "Rejected",
    "common.inProgress": "In Progress",
    "common.completed": "Completed",
    "common.cancelled": "Cancelled",
    "common.notProvided": "Not provided",
    "common.years": "years",
    "common.live": "Live",
    "common.connecting": "Connecting",
    "common.language": "Language",

    "language.title": "Choose Your Language",
    "language.subtitle":
      "Select the language you want to use in FixMate.",
    "language.english": "English",
    "language.tamil": "தமிழ்",
    "language.sinhala": "සිංහල",
    "language.saved":
      "Your language preference has been saved.",

    "welcome.title": "Trusted help for every job",
    "welcome.subtitle":
      "Find skilled and verified workers near you.",
    "welcome.createAccount": "Create Account",
    "welcome.login": "Already Have an Account",
    "welcome.changeLanguage": "Change Language",

    "login.title": "Welcome Back",
    "login.subtitle":
      "Log in to continue using FixMate.",
    "login.email": "Email address",
    "login.emailPlaceholder": "Enter your email",
    "login.password": "Password",
    "login.passwordPlaceholder":
      "Enter your password",
    "login.button": "Log In",
    "login.noAccount":
      "Don't have an account?",
    "login.createAccount": "Create Account",
    "login.failed": "Login failed",

    "register.title": "Create Your Account",
    "register.subtitle":
      "Join FixMate as a customer or skilled worker.",
    "register.fullName": "Full name",
    "register.phone": "Phone number",
    "register.email": "Email address",
    "register.password": "Password",
    "register.town": "Town",
    "register.role": "Account type",
    "register.customer": "Customer",
    "register.worker": "Worker",
    "register.category": "Service category",
    "register.button": "Create Account",
    "register.haveAccount":
      "Already have an account?",
    "register.login": "Log In",

    "customer.welcome": "Welcome,",
    "customer.heroTitle":
      "Find the right person for the job",
    "customer.heroText":
      "Discover available skilled workers near you.",
    "customer.myBookings": "My Bookings",
    "customer.myBookingsText":
      "Track requests and service status updates",
    "customer.searchPlaceholder":
      "Search by worker, category or town",
    "customer.all": "All",
    "customer.availableWorkers":
      "Available Workers",
    "customer.noWorkers": "No workers found",
    "customer.noWorkersText":
      "Try another search or category.",
    "customer.experience": "Experience",
    "customer.rating": "Rating",
    "customer.from": "From",
    "customer.newWorker": "New",

    "worker.welcome": "Welcome,",
    "worker.heroTitle": "Manage Your Jobs",
    "worker.heroText":
      "New bookings and status changes appear automatically.",
    "worker.pending": "Pending",
    "worker.active": "Active",
    "worker.completed": "Completed",
    "worker.customerRequests":
      "Customer Requests",
    "worker.noRequests":
      "No booking requests yet",
    "worker.noRequestsText":
      "New customer bookings will appear here automatically.",
    "worker.service": "Service",
    "worker.customerRequest":
      "Customer request",
    "worker.serviceAddress":
      "Service address",
    "worker.preferredDate":
      "Preferred date and time",
    "worker.estimatedPrice":
      "Estimated starting price",
    "worker.acceptRequest":
      "Accept Request",
    "worker.reject": "Reject",
    "worker.startJob": "Start Job",
    "worker.markCompleted":
      "Mark Completed",
    "worker.noFurtherAction":
      "No further action is required for this booking.",

    "bookings.title": "My Bookings",
    "bookings.subtitle":
      "Track your service requests and their progress.",
    "bookings.history": "Booking History",
    "bookings.total": "{count} total",
    "bookings.noBookings": "No bookings yet",
    "bookings.noBookingsText":
      "Select an available worker and send your first service request.",
    "bookings.requestedService":
      "Requested service",
    "bookings.serviceAddress":
      "Service address",
    "bookings.preferredDate":
      "Preferred date and time",
    "bookings.estimatedPrice":
      "Estimated starting price",
    "bookings.cancelBooking":
      "Cancel Booking",
    "bookings.cancelQuestion":
      "Cancel booking?",
    "bookings.keepBooking":
      "Keep Booking",
    "bookings.acceptedMessage":
      "The worker accepted your booking request.",
    "bookings.startedMessage":
      "The worker has started this job.",
    "bookings.completedMessage":
      "This service has been completed.",
    "bookings.rejectedMessage":
      "The worker could not accept this booking.",
    "bookings.cancelledMessage":
      "You cancelled this booking request.",
    "bookings.leaveReview":
      "Leave a Review",
    "bookings.reviewSubmitted":
      "Review submitted",

    "booking.title": "Book This Worker",
    "booking.description":
      "Service description",
    "booking.descriptionPlaceholder":
      "Describe the work you need",
    "booking.address": "Service address",
    "booking.addressPlaceholder":
      "Enter the service location",
    "booking.date": "Preferred date",
    "booking.time": "Preferred time",
    "booking.price": "Estimated price",
    "booking.submit": "Send Booking Request",
    "booking.success":
      "Your booking request has been sent.",

    "profile.title": "My Profile",
    "profile.subtitle":
      "Manage your personal and service information.",
    "profile.fullName": "Full name",
    "profile.phone": "Phone number",
    "profile.town": "Town",
    "profile.description":
      "Service description",
    "profile.experience":
      "Experience in years",
    "profile.basePrice":
      "Starting price",
    "profile.availability":
      "Available for bookings",
    "profile.save": "Save Profile",
    "profile.saved":
      "Your profile has been updated.",

    "review.title": "Rate Your Service",
    "review.subtitle":
      "Your feedback helps customers choose trusted workers.",
    "review.rating": "Your rating",
    "review.selectRating":
      "Select a rating",
    "review.comment": "Review comment",
    "review.commentPlaceholder":
      "Describe your experience with this worker",
    "review.submit": "Submit Review",
    "review.success":
      "Thank you for submitting your review.",
    "review.alreadySubmitted":
      "Review already submitted",

    "verification.title":
      "Worker Verification",
    "verification.subtitle":
      "Submit your identification and skill information for administrator review.",
    "verification.nic":
      "NIC or identification number",
    "verification.certificate":
      "Skill or certificate information",
    "verification.notes":
      "Additional information",
    "verification.submit":
      "Submit for Verification",
    "verification.status":
      "Verification status",
    "verification.notSubmitted":
      "Not Submitted",
    "verification.pending":
      "Awaiting Review",
    "verification.approved": "Approved",
    "verification.rejected": "Rejected",

    "notifications.title": "Notifications",
    "notifications.subtitle":
      "View booking and account updates.",
    "notifications.empty":
      "No notifications yet",
    "notifications.emptyText":
      "Booking and verification updates will appear here.",
    "notifications.markRead":
      "Mark as Read",
    "notifications.markAllRead":
      "Mark All as Read",
    "notifications.unread": "Unread",
  },

  ta: {
    "common.appName": "FixMate",
    "common.back": "பின்செல்",
    "common.cancel": "ரத்து செய்",
    "common.close": "மூடு",
    "common.confirm": "உறுதிப்படுத்து",
    "common.continue": "தொடரவும்",
    "common.loading": "ஏற்றப்படுகிறது...",
    "common.logout": "வெளியேறு",
    "common.profile": "சுயவிவரம்",
    "common.retry": "மீண்டும் முயற்சி செய்",
    "common.save": "சேமி",
    "common.submit": "சமர்ப்பி",
    "common.yes": "ஆம்",
    "common.no": "இல்லை",
    "common.available": "கிடைக்கிறார்",
    "common.unavailable": "கிடைக்கவில்லை",
    "common.verified": "சரிபார்க்கப்பட்டது",
    "common.pending": "நிலுவையில்",
    "common.accepted": "ஏற்றுக்கொள்ளப்பட்டது",
    "common.rejected": "நிராகரிக்கப்பட்டது",
    "common.inProgress": "செயலில் உள்ளது",
    "common.completed": "முடிக்கப்பட்டது",
    "common.cancelled": "ரத்து செய்யப்பட்டது",
    "common.notProvided": "வழங்கப்படவில்லை",
    "common.years": "ஆண்டுகள்",
    "common.live": "நேரடி",
    "common.connecting": "இணைக்கப்படுகிறது",
    "common.language": "மொழி",

    "language.title": "உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்",
    "language.subtitle":
      "FixMate பயன்பாட்டில் பயன்படுத்த வேண்டிய மொழியைத் தேர்ந்தெடுக்கவும்.",
    "language.english": "English",
    "language.tamil": "தமிழ்",
    "language.sinhala": "සිංහල",
    "language.saved":
      "உங்கள் மொழி விருப்பம் சேமிக்கப்பட்டது.",

    "welcome.title":
      "ஒவ்வொரு வேலைக்கும் நம்பகமான உதவி",
    "welcome.subtitle":
      "உங்கள் அருகிலுள்ள திறமையான மற்றும் சரிபார்க்கப்பட்ட பணியாளர்களைக் கண்டறியுங்கள்.",
    "welcome.createAccount": "கணக்கை உருவாக்கு",
    "welcome.login": "ஏற்கனவே கணக்கு உள்ளதா?",
    "welcome.changeLanguage": "மொழியை மாற்று",

    "login.title": "மீண்டும் வரவேற்கிறோம்",
    "login.subtitle":
      "FixMate பயன்பாட்டைத் தொடர உள்நுழையவும்.",
    "login.email": "மின்னஞ்சல் முகவரி",
    "login.emailPlaceholder":
      "உங்கள் மின்னஞ்சலை உள்ளிடவும்",
    "login.password": "கடவுச்சொல்",
    "login.passwordPlaceholder":
      "உங்கள் கடவுச்சொல்லை உள்ளிடவும்",
    "login.button": "உள்நுழை",
    "login.noAccount": "கணக்கு இல்லையா?",
    "login.createAccount": "கணக்கை உருவாக்கு",
    "login.failed": "உள்நுழைவு தோல்வியடைந்தது",

    "register.title": "உங்கள் கணக்கை உருவாக்குங்கள்",
    "register.subtitle":
      "வாடிக்கையாளர் அல்லது திறமையான பணியாளராக FixMate இல் இணையுங்கள்.",
    "register.fullName": "முழுப் பெயர்",
    "register.phone": "தொலைபேசி எண்",
    "register.email": "மின்னஞ்சல் முகவரி",
    "register.password": "கடவுச்சொல்",
    "register.town": "நகரம்",
    "register.role": "கணக்கு வகை",
    "register.customer": "வாடிக்கையாளர்",
    "register.worker": "பணியாளர்",
    "register.category": "சேவை வகை",
    "register.button": "கணக்கை உருவாக்கு",
    "register.haveAccount":
      "ஏற்கனவே கணக்கு உள்ளதா?",
    "register.login": "உள்நுழை",

    "customer.welcome": "வரவேற்கிறோம்,",
    "customer.heroTitle":
      "வேலைக்கு சரியான நபரைக் கண்டறியுங்கள்",
    "customer.heroText":
      "உங்கள் அருகிலுள்ள திறமையான பணியாளர்களைக் கண்டறியுங்கள்.",
    "customer.myBookings": "எனது முன்பதிவுகள்",
    "customer.myBookingsText":
      "கோரிக்கைகள் மற்றும் சேவை நிலைகளைப் பாருங்கள்",
    "customer.searchPlaceholder":
      "பணியாளர், சேவை அல்லது நகரத்தைத் தேடுங்கள்",
    "customer.all": "அனைத்தும்",
    "customer.availableWorkers":
      "கிடைக்கும் பணியாளர்கள்",
    "customer.noWorkers":
      "பணியாளர்கள் கிடைக்கவில்லை",
    "customer.noWorkersText":
      "வேறு தேடல் அல்லது வகையை முயற்சிக்கவும்.",
    "customer.experience": "அனுபவம்",
    "customer.rating": "மதிப்பீடு",
    "customer.from": "தொடக்கம்",
    "customer.newWorker": "புதியவர்",

    "worker.welcome": "வரவேற்கிறோம்,",
    "worker.heroTitle": "உங்கள் வேலைகளை நிர்வகிக்கவும்",
    "worker.heroText":
      "புதிய முன்பதிவுகளும் நிலை மாற்றங்களும் தானாகத் தோன்றும்.",
    "worker.pending": "நிலுவையில்",
    "worker.active": "செயலில்",
    "worker.completed": "முடிக்கப்பட்டது",
    "worker.customerRequests":
      "வாடிக்கையாளர் கோரிக்கைகள்",
    "worker.noRequests":
      "முன்பதிவு கோரிக்கைகள் இல்லை",
    "worker.noRequestsText":
      "புதிய வாடிக்கையாளர் முன்பதிவுகள் தானாக இங்கே தோன்றும்.",
    "worker.service": "சேவை",
    "worker.customerRequest":
      "வாடிக்கையாளர் கோரிக்கை",
    "worker.serviceAddress":
      "சேவை முகவரி",
    "worker.preferredDate":
      "விருப்பமான தேதி மற்றும் நேரம்",
    "worker.estimatedPrice":
      "மதிப்பிடப்பட்ட தொடக்க விலை",
    "worker.acceptRequest":
      "கோரிக்கையை ஏற்றுக்கொள்",
    "worker.reject": "நிராகரி",
    "worker.startJob": "வேலையைத் தொடங்கு",
    "worker.markCompleted":
      "முடிந்ததாக குறிக்கவும்",
    "worker.noFurtherAction":
      "இந்த முன்பதிவிற்கு மேலதிக நடவடிக்கை தேவையில்லை.",

    "bookings.title": "எனது முன்பதிவுகள்",
    "bookings.subtitle":
      "உங்கள் சேவை கோரிக்கைகளையும் அவற்றின் நிலையையும் பாருங்கள்.",
    "bookings.history": "முன்பதிவு வரலாறு",
    "bookings.total": "மொத்தம் {count}",
    "bookings.noBookings":
      "முன்பதிவுகள் இல்லை",
    "bookings.noBookingsText":
      "ஒரு பணியாளரைத் தேர்ந்தெடுத்து முதல் சேவை கோரிக்கையை அனுப்புங்கள்.",
    "bookings.requestedService":
      "கோரப்பட்ட சேவை",
    "bookings.serviceAddress":
      "சேவை முகவரி",
    "bookings.preferredDate":
      "விருப்பமான தேதி மற்றும் நேரம்",
    "bookings.estimatedPrice":
      "மதிப்பிடப்பட்ட தொடக்க விலை",
    "bookings.cancelBooking":
      "முன்பதிவை ரத்து செய்",
    "bookings.cancelQuestion":
      "முன்பதிவை ரத்து செய்யவா?",
    "bookings.keepBooking":
      "முன்பதிவை வைத்திரு",
    "bookings.acceptedMessage":
      "பணியாளர் உங்கள் முன்பதிவை ஏற்றுக்கொண்டார்.",
    "bookings.startedMessage":
      "பணியாளர் வேலையைத் தொடங்கியுள்ளார்.",
    "bookings.completedMessage":
      "இந்த சேவை முடிக்கப்பட்டது.",
    "bookings.rejectedMessage":
      "பணியாளர் இந்த முன்பதிவை ஏற்க முடியவில்லை.",
    "bookings.cancelledMessage":
      "நீங்கள் இந்த முன்பதிவை ரத்து செய்துள்ளீர்கள்.",
    "bookings.leaveReview":
      "மதிப்புரை வழங்கு",
    "bookings.reviewSubmitted":
      "மதிப்புரை சமர்ப்பிக்கப்பட்டது",

    "booking.title": "இந்த பணியாளரை முன்பதிவு செய்",
    "booking.description": "சேவை விவரம்",
    "booking.descriptionPlaceholder":
      "உங்களுக்கு தேவையான வேலையை விவரிக்கவும்",
    "booking.address": "சேவை முகவரி",
    "booking.addressPlaceholder":
      "சேவை இடத்தை உள்ளிடவும்",
    "booking.date": "விருப்பமான தேதி",
    "booking.time": "விருப்பமான நேரம்",
    "booking.price": "மதிப்பிடப்பட்ட விலை",
    "booking.submit":
      "முன்பதிவு கோரிக்கையை அனுப்பு",
    "booking.success":
      "உங்கள் முன்பதிவு கோரிக்கை அனுப்பப்பட்டது.",

    "profile.title": "எனது சுயவிவரம்",
    "profile.subtitle":
      "உங்கள் தனிப்பட்ட மற்றும் சேவை தகவல்களை நிர்வகிக்கவும்.",
    "profile.fullName": "முழுப் பெயர்",
    "profile.phone": "தொலைபேசி எண்",
    "profile.town": "நகரம்",
    "profile.description": "சேவை விவரம்",
    "profile.experience": "அனுபவ ஆண்டுகள்",
    "profile.basePrice": "தொடக்க விலை",
    "profile.availability":
      "முன்பதிவுகளுக்கு கிடைக்கிறேன்",
    "profile.save": "சுயவிவரத்தை சேமி",
    "profile.saved":
      "உங்கள் சுயவிவரம் புதுப்பிக்கப்பட்டது.",

    "review.title": "உங்கள் சேவையை மதிப்பிடுங்கள்",
    "review.subtitle":
      "உங்கள் கருத்து நம்பகமான பணியாளர்களைத் தேர்வுசெய்ய உதவும்.",
    "review.rating": "உங்கள் மதிப்பீடு",
    "review.selectRating":
      "மதிப்பீட்டைத் தேர்ந்தெடுக்கவும்",
    "review.comment": "மதிப்புரை",
    "review.commentPlaceholder":
      "இந்த பணியாளருடன் உங்கள் அனுபவத்தை விவரிக்கவும்",
    "review.submit": "மதிப்புரையை சமர்ப்பி",
    "review.success":
      "உங்கள் மதிப்புரைக்கு நன்றி.",
    "review.alreadySubmitted":
      "மதிப்புரை ஏற்கனவே சமர்ப்பிக்கப்பட்டது",

    "verification.title":
      "பணியாளர் சரிபார்ப்பு",
    "verification.subtitle":
      "நிர்வாகி பரிசீலனைக்காக அடையாள மற்றும் திறன் தகவல்களைச் சமர்ப்பிக்கவும்.",
    "verification.nic":
      "தேசிய அடையாள அட்டை அல்லது அடையாள எண்",
    "verification.certificate":
      "திறன் அல்லது சான்றிதழ் தகவல்",
    "verification.notes":
      "கூடுதல் தகவல்",
    "verification.submit":
      "சரிபார்ப்புக்காக சமர்ப்பி",
    "verification.status":
      "சரிபார்ப்பு நிலை",
    "verification.notSubmitted":
      "சமர்ப்பிக்கப்படவில்லை",
    "verification.pending":
      "பரிசீலனையில்",
    "verification.approved":
      "அங்கீகரிக்கப்பட்டது",
    "verification.rejected":
      "நிராகரிக்கப்பட்டது",

    "notifications.title": "அறிவிப்புகள்",
    "notifications.subtitle":
      "முன்பதிவு மற்றும் கணக்கு புதுப்பிப்புகளைப் பாருங்கள்.",
    "notifications.empty":
      "அறிவிப்புகள் இல்லை",
    "notifications.emptyText":
      "முன்பதிவு மற்றும் சரிபார்ப்பு புதுப்பிப்புகள் இங்கே தோன்றும்.",
    "notifications.markRead":
      "படித்ததாக குறிக்கவும்",
    "notifications.markAllRead":
      "அனைத்தையும் படித்ததாக குறிக்கவும்",
    "notifications.unread": "படிக்காதவை",
  },

  si: {
    "common.appName": "FixMate",
    "common.back": "ආපසු",
    "common.cancel": "අවලංගු කරන්න",
    "common.close": "වසන්න",
    "common.confirm": "තහවුරු කරන්න",
    "common.continue": "ඉදිරියට",
    "common.loading": "පූරණය වෙමින්...",
    "common.logout": "ඉවත් වන්න",
    "common.profile": "පැතිකඩ",
    "common.retry": "නැවත උත්සාහ කරන්න",
    "common.save": "සුරකින්න",
    "common.submit": "යොමු කරන්න",
    "common.yes": "ඔව්",
    "common.no": "නැහැ",
    "common.available": "ලබා ගත හැක",
    "common.unavailable": "ලබා ගත නොහැක",
    "common.verified": "තහවුරු කළ",
    "common.pending": "අපේක්ෂිත",
    "common.accepted": "පිළිගත්",
    "common.rejected": "ප්‍රතික්ෂේප කළ",
    "common.inProgress": "ක්‍රියාත්මකයි",
    "common.completed": "සම්පූර්ණයි",
    "common.cancelled": "අවලංගු කළ",
    "common.notProvided": "ලබා දී නැත",
    "common.years": "වසර",
    "common.live": "සජීවී",
    "common.connecting": "සම්බන්ධ වෙමින්",
    "common.language": "භාෂාව",

    "language.title": "ඔබගේ භාෂාව තෝරන්න",
    "language.subtitle":
      "FixMate සඳහා භාවිතා කිරීමට අවශ්‍ය භාෂාව තෝරන්න.",
    "language.english": "English",
    "language.tamil": "தமிழ்",
    "language.sinhala": "සිංහල",
    "language.saved":
      "ඔබගේ භාෂා තේරීම සුරකින ලදී.",

    "welcome.title":
      "සෑම කාර්යයකටම විශ්වාසදායක සහාය",
    "welcome.subtitle":
      "ඔබ අසල සිටින දක්ෂ සහ තහවුරු කළ සේවකයන් සොයන්න.",
    "welcome.createAccount": "ගිණුමක් සාදන්න",
    "welcome.login": "දැනටමත් ගිණුමක් තිබේද?",
    "welcome.changeLanguage": "භාෂාව වෙනස් කරන්න",

    "login.title": "නැවත සාදරයෙන් පිළිගනිමු",
    "login.subtitle":
      "FixMate දිගටම භාවිතා කිරීමට පිවිසෙන්න.",
    "login.email": "විද්‍යුත් තැපැල් ලිපිනය",
    "login.emailPlaceholder":
      "විද්‍යුත් තැපෑල ඇතුළත් කරන්න",
    "login.password": "මුරපදය",
    "login.passwordPlaceholder":
      "මුරපදය ඇතුළත් කරන්න",
    "login.button": "පිවිසෙන්න",
    "login.noAccount": "ගිණුමක් නැද්ද?",
    "login.createAccount": "ගිණුමක් සාදන්න",
    "login.failed": "පිවිසීම අසාර්ථකයි",

    "register.title": "ඔබගේ ගිණුම සාදන්න",
    "register.subtitle":
      "පාරිභෝගිකයෙකු හෝ දක්ෂ සේවකයෙකු ලෙස FixMate සමඟ එක්වන්න.",
    "register.fullName": "සම්පූර්ණ නම",
    "register.phone": "දුරකථන අංකය",
    "register.email": "විද්‍යුත් තැපැල් ලිපිනය",
    "register.password": "මුරපදය",
    "register.town": "නගරය",
    "register.role": "ගිණුම් වර්ගය",
    "register.customer": "පාරිභෝගිකයා",
    "register.worker": "සේවකයා",
    "register.category": "සේවා වර්ගය",
    "register.button": "ගිණුම සාදන්න",
    "register.haveAccount":
      "දැනටමත් ගිණුමක් තිබේද?",
    "register.login": "පිවිසෙන්න",

    "customer.welcome": "සාදරයෙන් පිළිගනිමු,",
    "customer.heroTitle":
      "කාර්යයට සුදුසු පුද්ගලයා සොයන්න",
    "customer.heroText":
      "ඔබ අසල සිටින දක්ෂ සේවකයන් සොයාගන්න.",
    "customer.myBookings": "මගේ වෙන්කිරීම්",
    "customer.myBookingsText":
      "ඉල්ලීම් සහ සේවා තත්ත්වයන් බලන්න",
    "customer.searchPlaceholder":
      "සේවකයා, වර්ගය හෝ නගරය සොයන්න",
    "customer.all": "සියල්ල",
    "customer.availableWorkers":
      "ලබා ගත හැකි සේවකයන්",
    "customer.noWorkers":
      "සේවකයන් හමු නොවීය",
    "customer.noWorkersText":
      "වෙනත් සෙවුමක් හෝ වර්ගයක් උත්සාහ කරන්න.",
    "customer.experience": "පළපුරුද්ද",
    "customer.rating": "ඇගයීම",
    "customer.from": "ආරම්භක",
    "customer.newWorker": "නව",

    "worker.welcome": "සාදරයෙන් පිළිගනිමු,",
    "worker.heroTitle": "ඔබගේ කාර්යයන් කළමනාකරණය කරන්න",
    "worker.heroText":
      "නව වෙන්කිරීම් සහ තත්ත්ව වෙනස්කම් ස්වයංක්‍රීයව පෙන්වයි.",
    "worker.pending": "අපේක්ෂිත",
    "worker.active": "ක්‍රියාත්මක",
    "worker.completed": "සම්පූර්ණ",
    "worker.customerRequests":
      "පාරිභෝගික ඉල්ලීම්",
    "worker.noRequests":
      "වෙන්කිරීම් ඉල්ලීම් නොමැත",
    "worker.noRequestsText":
      "නව පාරිභෝගික වෙන්කිරීම් මෙහි ස්වයංක්‍රීයව පෙන්වයි.",
    "worker.service": "සේවාව",
    "worker.customerRequest":
      "පාරිභෝගික ඉල්ලීම",
    "worker.serviceAddress":
      "සේවා ලිපිනය",
    "worker.preferredDate":
      "කැමති දිනය සහ වේලාව",
    "worker.estimatedPrice":
      "ඇස්තමේන්තු ආරම්භක මිල",
    "worker.acceptRequest":
      "ඉල්ලීම පිළිගන්න",
    "worker.reject": "ප්‍රතික්ෂේප කරන්න",
    "worker.startJob": "කාර්යය ආරම්භ කරන්න",
    "worker.markCompleted":
      "සම්පූර්ණ ලෙස සලකුණු කරන්න",
    "worker.noFurtherAction":
      "මෙම වෙන්කිරීම සඳහා තවත් ක්‍රියාමාර්ග අවශ්‍ය නොවේ.",

    "bookings.title": "මගේ වෙන්කිරීම්",
    "bookings.subtitle":
      "ඔබගේ සේවා ඉල්ලීම් සහ ඒවායේ ප්‍රගතිය බලන්න.",
    "bookings.history": "වෙන්කිරීම් ඉතිහාසය",
    "bookings.total": "මුළු {count}",
    "bookings.noBookings":
      "වෙන්කිරීම් නොමැත",
    "bookings.noBookingsText":
      "සේවකයෙකු තෝරා ඔබගේ පළමු සේවා ඉල්ලීම යවන්න.",
    "bookings.requestedService":
      "ඉල්ලා ඇති සේවාව",
    "bookings.serviceAddress":
      "සේවා ලිපිනය",
    "bookings.preferredDate":
      "කැමති දිනය සහ වේලාව",
    "bookings.estimatedPrice":
      "ඇස්තමේන්තු ආරම්භක මිල",
    "bookings.cancelBooking":
      "වෙන්කිරීම අවලංගු කරන්න",
    "bookings.cancelQuestion":
      "වෙන්කිරීම අවලංගු කරන්නද?",
    "bookings.keepBooking":
      "වෙන්කිරීම තබාගන්න",
    "bookings.acceptedMessage":
      "සේවකයා ඔබගේ වෙන්කිරීම පිළිගෙන ඇත.",
    "bookings.startedMessage":
      "සේවකයා කාර්යය ආරම්භ කර ඇත.",
    "bookings.completedMessage":
      "මෙම සේවාව සම්පූර්ණ කර ඇත.",
    "bookings.rejectedMessage":
      "සේවකයාට මෙම වෙන්කිරීම පිළිගත නොහැකි විය.",
    "bookings.cancelledMessage":
      "ඔබ මෙම වෙන්කිරීම අවලංගු කර ඇත.",
    "bookings.leaveReview":
      "සමාලෝචනයක් දෙන්න",
    "bookings.reviewSubmitted":
      "සමාලෝචනය යොමු කර ඇත",

    "booking.title": "මෙම සේවකයා වෙන්කරන්න",
    "booking.description": "සේවා විස්තරය",
    "booking.descriptionPlaceholder":
      "ඔබට අවශ්‍ය කාර්යය විස්තර කරන්න",
    "booking.address": "සේවා ලිපිනය",
    "booking.addressPlaceholder":
      "සේවා ස්ථානය ඇතුළත් කරන්න",
    "booking.date": "කැමති දිනය",
    "booking.time": "කැමති වේලාව",
    "booking.price": "ඇස්තමේන්තු මිල",
    "booking.submit": "වෙන්කිරීමේ ඉල්ලීම යවන්න",
    "booking.success":
      "ඔබගේ වෙන්කිරීමේ ඉල්ලීම යවා ඇත.",

    "profile.title": "මගේ පැතිකඩ",
    "profile.subtitle":
      "ඔබගේ පුද්ගලික සහ සේවා තොරතුරු කළමනාකරණය කරන්න.",
    "profile.fullName": "සම්පූර්ණ නම",
    "profile.phone": "දුරකථන අංකය",
    "profile.town": "නගරය",
    "profile.description": "සේවා විස්තරය",
    "profile.experience": "පළපුරුද්ද වසර වලින්",
    "profile.basePrice": "ආරම්භක මිල",
    "profile.availability":
      "වෙන්කිරීම් සඳහා ලබා ගත හැක",
    "profile.save": "පැතිකඩ සුරකින්න",
    "profile.saved":
      "ඔබගේ පැතිකඩ යාවත්කාලීන කර ඇත.",

    "review.title": "ඔබගේ සේවාව ඇගයීමට ලක් කරන්න",
    "review.subtitle":
      "ඔබගේ අදහස් විශ්වාසදායක සේවකයන් තෝරා ගැනීමට උපකාරී වේ.",
    "review.rating": "ඔබගේ ඇගයීම",
    "review.selectRating":
      "ඇගයීමක් තෝරන්න",
    "review.comment": "සමාලෝචන අදහස",
    "review.commentPlaceholder":
      "මෙම සේවකයා සමඟ ඔබගේ අත්දැකීම විස්තර කරන්න",
    "review.submit": "සමාලෝචනය යොමු කරන්න",
    "review.success":
      "ඔබගේ සමාලෝචනයට ස්තූතියි.",
    "review.alreadySubmitted":
      "සමාලෝචනය දැනටමත් යොමු කර ඇත",

    "verification.title":
      "සේවක තහවුරු කිරීම",
    "verification.subtitle":
      "පරිපාලක සමාලෝචනය සඳහා හැඳුනුම් සහ කුසලතා තොරතුරු යොමු කරන්න.",
    "verification.nic":
      "ජාතික හැඳුනුම්පත් හෝ හැඳුනුම් අංකය",
    "verification.certificate":
      "කුසලතා හෝ සහතික තොරතුරු",
    "verification.notes":
      "අමතර තොරතුරු",
    "verification.submit":
      "තහවුරු කිරීම සඳහා යොමු කරන්න",
    "verification.status":
      "තහවුරු කිරීමේ තත්ත්වය",
    "verification.notSubmitted":
      "යොමු කර නැත",
    "verification.pending":
      "සමාලෝචනය වෙමින්",
    "verification.approved":
      "අනුමතයි",
    "verification.rejected":
      "ප්‍රතික්ෂේපයි",

    "notifications.title": "දැනුම්දීම්",
    "notifications.subtitle":
      "වෙන්කිරීම් සහ ගිණුම් යාවත්කාලීන බලන්න.",
    "notifications.empty":
      "දැනුම්දීම් නොමැත",
    "notifications.emptyText":
      "වෙන්කිරීම් සහ තහවුරු කිරීමේ යාවත්කාලීන මෙහි පෙන්වයි.",
    "notifications.markRead":
      "කියවූ ලෙස සලකුණු කරන්න",
    "notifications.markAllRead":
      "සියල්ල කියවූ ලෙස සලකුණු කරන්න",
    "notifications.unread": "නොකියවූ",
  },
};

const isSupportedLanguage = (
  value: string | null
): value is LanguageCode => {
  return (
    value === "en" ||
    value === "ta" ||
    value === "si"
  );
};

const getDeviceLanguage = (): LanguageCode => {
  const deviceLanguage =
    getLocales()[0]?.languageCode;

  if (deviceLanguage === "ta") {
    return "ta";
  }

  if (deviceLanguage === "si") {
    return "si";
  }

  return "en";
};

const insertVariables = (
  text: string,
  variables?: TranslationVariables
) => {
  if (!variables) {
    return text;
  }

  return Object.entries(variables).reduce(
    (result, [name, value]) =>
      result.replace(
        new RegExp(`\\{${name}\\}`, "g"),
        String(value)
      ),
    text
  );
};

const LanguageContext =
  createContext<LanguageContextValue | null>(
    null
  );

export function LanguageProvider({
  children,
}: LanguageProviderProps) {
  const [language, setLanguage] =
    useState<LanguageCode>(
      getDeviceLanguage()
    );

  const [
    isLanguageReady,
    setIsLanguageReady,
  ] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadSavedLanguage = async () => {
      try {
        const savedLanguage =
          await AsyncStorage.getItem(
            LANGUAGE_STORAGE_KEY
          );

        if (
          isMounted &&
          isSupportedLanguage(savedLanguage)
        ) {
          setLanguage(savedLanguage);
        }
      } catch (error) {
        console.error(
          "Language preference loading error:",
          error
        );
      } finally {
        if (isMounted) {
          setIsLanguageReady(true);
        }
      }
    };

    void loadSavedLanguage();

    return () => {
      isMounted = false;
    };
  }, []);

  const changeLanguage = async (
    newLanguage: LanguageCode
  ) => {
    setLanguage(newLanguage);

    try {
      await AsyncStorage.setItem(
        LANGUAGE_STORAGE_KEY,
        newLanguage
      );
    } catch (error) {
      console.error(
        "Language preference saving error:",
        error
      );
    }
  };

  const contextValue =
    useMemo<LanguageContextValue>(() => {
      const t = (
        key: string,
        variables?: TranslationVariables
      ) => {
        const selectedTranslation =
          translations[language][key];

        const englishTranslation =
          translations.en[key];

        const translatedText =
          selectedTranslation ??
          englishTranslation ??
          key;

        return insertVariables(
          translatedText,
          variables
        );
      };

      return {
        language,
        languageName:
          languageNames[language],
        isLanguageReady,
        changeLanguage,
        t,
      };
    }, [language, isLanguageReady]);

  return (
    <LanguageContext.Provider
      value={contextValue}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context =
    useContext(LanguageContext);

  if (!context) {
    throw new Error(
      "useLanguage must be used inside LanguageProvider."
    );
  }

  return context;
}