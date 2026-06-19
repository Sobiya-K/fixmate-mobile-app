import { router } from "expo-router";

import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useLanguage } from "@/contexts/LanguageContext";

export default function WelcomeScreen() {
  const {
    languageName,
    t,
  } = useLanguage();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          <Text style={styles.brandName}>
            {t("common.appName")}
          </Text>

          <Pressable
            style={styles.languageButton}
            onPress={() =>
              router.push("/language")
            }
          >
            <Text style={styles.languageButtonText}>
              🌐 {languageName}
            </Text>
          </Pressable>
        </View>

        <View style={styles.heroArea}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoIcon}>
              🛠️
            </Text>
          </View>

          <Text style={styles.title}>
            {t("welcome.title")}
          </Text>

          <Text style={styles.subtitle}>
            {t("welcome.subtitle")}
          </Text>
        </View>

        <View style={styles.featureCard}>
          <View style={styles.featureRow}>
            <View style={styles.featureIcon}>
              <Text style={styles.featureIconText}>
                ✓
              </Text>
            </View>

            <Text style={styles.featureText}>
              Verified skilled workers
            </Text>
          </View>

          <View style={styles.featureRow}>
            <View style={styles.featureIcon}>
              <Text style={styles.featureIconText}>
                ⚡
              </Text>
            </View>

            <Text style={styles.featureText}>
              Fast and simple booking
            </Text>
          </View>

          <View style={styles.featureRow}>
            <View style={styles.featureIcon}>
              <Text style={styles.featureIconText}>
                ⭐
              </Text>
            </View>

            <Text style={styles.featureText}>
              Customer ratings and reviews
            </Text>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.pressedButton,
          ]}
          onPress={() =>
            router.push("/register")
          }
        >
          <Text style={styles.primaryButtonText}>
            {t("welcome.createAccount")}
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.pressedButton,
          ]}
          onPress={() =>
            router.push("/login")
          }
        >
          <Text style={styles.secondaryButtonText}>
            {t("welcome.login")}
          </Text>
        </Pressable>

        <Pressable
          style={styles.changeLanguageButton}
          onPress={() =>
            router.push("/language")
          }
        >
          <Text style={styles.changeLanguageText}>
            🌐 {t("welcome.changeLanguage")}
          </Text>
        </Pressable>

        <Text style={styles.footerText}>
          Local skills. Trusted service. Better communities.
        </Text>
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
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 35,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  brandName: {
    fontSize: 21,
    fontWeight: "800",
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

  heroArea: {
    alignItems: "center",
    marginTop: 56,
  },

  logoCircle: {
    width: 105,
    height: 105,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 53,
    backgroundColor: "#EDE9FE",
  },

  logoIcon: {
    fontSize: 51,
  },

  title: {
    marginTop: 30,
    fontSize: 32,
    lineHeight: 40,
    fontWeight: "800",
    textAlign: "center",
    color: "#1F2937",
  },

  subtitle: {
    maxWidth: 320,
    marginTop: 12,
    fontSize: 15,
    lineHeight: 23,
    textAlign: "center",
    color: "#6B7280",
  },

  featureCard: {
    padding: 19,
    marginTop: 35,
    borderWidth: 1,
    borderColor: "#DDD6FE",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
  },

  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 7,
  },

  featureIcon: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderRadius: 17,
    backgroundColor: "#EDE9FE",
  },

  featureIconText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#6D28D9",
  },

  featureText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
  },

  primaryButton: {
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 30,
    borderRadius: 12,
    backgroundColor: "#6D28D9",
  },

  primaryButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  secondaryButton: {
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 13,
    borderWidth: 1,
    borderColor: "#6D28D9",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },

  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#6D28D9",
  },

  changeLanguageButton: {
    alignItems: "center",
    paddingVertical: 15,
    marginTop: 6,
  },

  changeLanguageText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6D28D9",
  },

  pressedButton: {
    opacity: 0.8,
  },

  footerText: {
    marginTop: 18,
    fontSize: 11,
    textAlign: "center",
    color: "#9CA3AF",
  },
});