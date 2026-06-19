import { router } from "expo-router";
import {
    Pressable,
    SafeAreaView,
    StyleSheet,
    Text,
    View,
} from "react-native";

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoIcon}>🛠️</Text>
        </View>

        <Text style={styles.title}>FixMate</Text>

        <Text style={styles.subtitle}>
          Find trusted skilled workers near you
        </Text>

        <Text style={styles.description}>
          Connect with electricians, plumbers, carpenters, cleaners and
          other local service professionals.
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.pressedButton,
          ]}
          onPress={() => router.push("/register")}
        >
          <Text style={styles.primaryButtonText}>Create Account</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.pressedButton,
          ]}
          onPress={() => router.push("/login")}
        >
          <Text style={styles.secondaryButtonText}>
            I Already Have an Account
          </Text>
        </Pressable>

        <Text style={styles.version}>FixMate MVP • Version 1.0</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F7F4FF",
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  logoContainer: {
    width: 105,
    height: 105,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    borderRadius: 53,
    backgroundColor: "#EDE9FE",
  },
  logoIcon: {
    fontSize: 50,
  },
  title: {
    marginBottom: 10,
    fontSize: 42,
    fontWeight: "800",
    color: "#6D28D9",
  },
  subtitle: {
    marginBottom: 16,
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    color: "#1F2937",
  },
  description: {
    maxWidth: 340,
    marginBottom: 32,
    fontSize: 15,
    lineHeight: 23,
    textAlign: "center",
    color: "#6B7280",
  },
  primaryButton: {
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: "#6D28D9",
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  secondaryButton: {
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
    paddingVertical: 15,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#6D28D9",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#6D28D9",
  },
  pressedButton: {
    opacity: 0.75,
  },
  version: {
    position: "absolute",
    bottom: 25,
    fontSize: 12,
    color: "#9CA3AF",
  },
});