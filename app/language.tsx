import { router } from "expo-router";
import { useState } from "react";

import {
  ActivityIndicator,
  Pressable,
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

type LanguageOption = {
  code: LanguageCode;
  name: string;
  nativeName: string;
  symbol: string;
  description: string;
};

const languageOptions: LanguageOption[] = [
  {
    code: "en",
    name: "English",
    nativeName: "English",
    symbol: "EN",
    description: "Use FixMate in English",
  },
  {
    code: "ta",
    name: "Tamil",
    nativeName: "தமிழ்",
    symbol: "த",
    description: "FixMate பயன்பாட்டை தமிழில் பயன்படுத்தவும்",
  },
  {
    code: "si",
    name: "Sinhala",
    nativeName: "සිංහල",
    symbol: "සි",
    description: "FixMate සිංහලෙන් භාවිතා කරන්න",
  },
];

export default function LanguageScreen() {
  const {
    language,
    changeLanguage,
    t,
  } = useLanguage();

  const [selectedLanguage, setSelectedLanguage] =
    useState<LanguageCode>(language);

  const [isSaving, setIsSaving] =
    useState(false);

  const handleContinue = async () => {
    setIsSaving(true);

    try {
      await changeLanguage(selectedLanguage);

      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/");
      }
    } catch (error) {
      console.error(
        "Language selection error:",
        error
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          style={styles.backButton}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/");
            }
          }}
        >
          <Text style={styles.backText}>
            ← {t("common.back")}
          </Text>
        </Pressable>

        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>
            🌐
          </Text>
        </View>

        <Text style={styles.appName}>
          FixMate
        </Text>

        <Text style={styles.title}>
          {t("language.title")}
        </Text>

        <Text style={styles.subtitle}>
          {t("language.subtitle")}
        </Text>

        <View style={styles.languageList}>
          {languageOptions.map((option) => {
            const isSelected =
              selectedLanguage === option.code;

            return (
              <Pressable
                key={option.code}
                style={[
                  styles.languageCard,

                  isSelected &&
                    styles.selectedLanguageCard,
                ]}
                onPress={() =>
                  setSelectedLanguage(
                    option.code
                  )
                }
              >
                <View
                  style={[
                    styles.languageSymbol,

                    isSelected &&
                      styles.selectedLanguageSymbol,
                  ]}
                >
                  <Text
                    style={[
                      styles.languageSymbolText,

                      isSelected &&
                        styles.selectedLanguageSymbolText,
                    ]}
                  >
                    {option.symbol}
                  </Text>
                </View>

                <View
                  style={
                    styles.languageInformation
                  }
                >
                  <Text
                    style={[
                      styles.languageName,

                      isSelected &&
                        styles.selectedLanguageName,
                    ]}
                  >
                    {option.nativeName}
                  </Text>

                  <Text
                    style={
                      styles.languageEnglishName
                    }
                  >
                    {option.name}
                  </Text>

                  <Text
                    style={
                      styles.languageDescription
                    }
                  >
                    {option.description}
                  </Text>
                </View>

                <View
                  style={[
                    styles.radioOuter,

                    isSelected &&
                      styles.selectedRadioOuter,
                  ]}
                >
                  {isSelected && (
                    <View
                      style={
                        styles.radioInner
                      }
                    />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.informationCard}>
          <Text style={styles.informationIcon}>
            ℹ️
          </Text>

          <Text style={styles.informationText}>
            You can change the language again from
            the app at any time.
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.continueButton,

            pressed &&
              styles.pressedButton,

            isSaving &&
              styles.disabledButton,
          ]}
          onPress={handleContinue}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator
              color="#FFFFFF"
            />
          ) : (
            <Text
              style={
                styles.continueButtonText
              }
            >
              {t("common.continue")}
            </Text>
          )}
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
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 40,
  },

  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 10,
  },

  backText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6D28D9",
  },

  logoCircle: {
    width: 76,
    height: 76,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginTop: 15,
    borderRadius: 38,
    backgroundColor: "#EDE9FE",
  },

  logoText: {
    fontSize: 38,
  },

  appName: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    color: "#6D28D9",
  },

  title: {
    marginTop: 22,
    fontSize: 29,
    fontWeight: "800",
    textAlign: "center",
    color: "#1F2937",
  },

  subtitle: {
    marginTop: 8,
    paddingHorizontal: 15,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    color: "#6B7280",
  },

  languageList: {
    marginTop: 28,
  },

  languageCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 17,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
  },

  selectedLanguageCard: {
    borderWidth: 2,
    borderColor: "#6D28D9",
    backgroundColor: "#F5F3FF",
  },

  languageSymbol: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 26,
    backgroundColor: "#F3F4F6",
  },

  selectedLanguageSymbol: {
    backgroundColor: "#6D28D9",
  },

  languageSymbolText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#4B5563",
  },

  selectedLanguageSymbolText: {
    color: "#FFFFFF",
  },

  languageInformation: {
    flex: 1,
    marginLeft: 14,
    paddingRight: 8,
  },

  languageName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1F2937",
  },

  selectedLanguageName: {
    color: "#6D28D9",
  },

  languageEnglishName: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
  },

  languageDescription: {
    marginTop: 5,
    fontSize: 11,
    lineHeight: 17,
    color: "#9CA3AF",
  },

  radioOuter: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#D1D5DB",
    borderRadius: 12,
  },

  selectedRadioOuter: {
    borderColor: "#6D28D9",
  },

  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#6D28D9",
  },

  informationCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    marginTop: 8,
    borderRadius: 11,
    backgroundColor: "#EFF6FF",
  },

  informationIcon: {
    marginRight: 9,
    fontSize: 16,
  },

  informationText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: "#1E40AF",
  },

  continueButton: {
    minHeight: 55,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    borderRadius: 12,
    backgroundColor: "#6D28D9",
  },

  continueButtonText: {
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
});