import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";

export default function HomeScreen() {
  const handleGetStarted = () => {
    console.log("Get Started button pressed");
  };

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
          Connect with electricians, plumbers, carpenters, cleaners and other
          service professionals.
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
          onPress={handleGetStarted}
        >
          <Text style={styles.buttonText}>Get Started</Text>
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
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EDE9FE",
    marginBottom: 20,
  },
  logoIcon: {
    fontSize: 48,
  },
  title: {
    fontSize: 42,
    fontWeight: "800",
    color: "#6D28D9",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    color: "#1F2937",
    marginBottom: 16,
  },
  description: {
    maxWidth: 330,
    fontSize: 15,
    lineHeight: 23,
    textAlign: "center",
    color: "#6B7280",
    marginBottom: 32,
  },
  button: {
    width: "100%",
    maxWidth: 330,
    paddingVertical: 16,
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "#6D28D9",
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  version: {
    position: "absolute",
    bottom: 25,
    fontSize: 12,
    color: "#9CA3AF",
  },
});