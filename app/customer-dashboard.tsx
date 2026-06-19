import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
    Alert,
    Pressable,
    SafeAreaView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { supabase } from "@/lib/supabase";

export default function CustomerDashboard() {
  const [fullName, setFullName] = useState("Customer");

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", user.id)
      .single();

    if (error || !data) {
      console.error("Customer profile error:", error);
      return;
    }

    if (data.role !== "customer") {
      router.replace("/worker-dashboard");
      return;
    }

    setFullName(data.full_name || "Customer");
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      Alert.alert("Logout failed", error.message);
      return;
    }

    router.replace("/login");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello,</Text>
            <Text style={styles.name}>{fullName}</Text>
          </View>

          <Pressable
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        </View>

        <View style={styles.heroCard}>
          <Text style={styles.heroIcon}>🔎</Text>
          <Text style={styles.heroTitle}>
            Find a Skilled Worker
          </Text>
          <Text style={styles.heroText}>
            Worker discovery and booking will be added in the next
            development stage.
          </Text>
        </View>

        <View style={styles.statusCard}>
          <Text style={styles.statusIcon}>✅</Text>
          <View style={styles.statusContent}>
            <Text style={styles.statusTitle}>
              Customer login successful
            </Text>
            <Text style={styles.statusText}>
              Your account and profile are connected to Supabase.
            </Text>
          </View>
        </View>
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
    paddingHorizontal: 22,
    paddingTop: 25,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  greeting: {
    fontSize: 15,
    color: "#6B7280",
  },
  name: {
    marginTop: 2,
    fontSize: 25,
    fontWeight: "800",
    color: "#1F2937",
  },
  logoutButton: {
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "#6D28D9",
    borderRadius: 9,
  },
  logoutText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6D28D9",
  },
  heroCard: {
    alignItems: "center",
    padding: 28,
    marginTop: 35,
    borderRadius: 18,
    backgroundColor: "#6D28D9",
  },
  heroIcon: {
    marginBottom: 12,
    fontSize: 44,
  },
  heroTitle: {
    fontSize: 23,
    fontWeight: "800",
    textAlign: "center",
    color: "#FFFFFF",
  },
  heroText: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    color: "#EDE9FE",
  },
  statusCard: {
    flexDirection: "row",
    padding: 18,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 14,
    backgroundColor: "#ECFDF5",
  },
  statusIcon: {
    marginRight: 12,
    fontSize: 22,
  },
  statusContent: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#065F46",
  },
  statusText: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    color: "#047857",
  },
});