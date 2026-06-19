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

export default function WorkerDashboard() {
  const [fullName, setFullName] = useState("Worker");
  const [category, setCategory] = useState("Service Provider");

  useEffect(() => {
    loadWorkerProfile();
  }, []);

  const loadWorkerProfile = async () => {
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
        .select("full_name, role")
        .eq("id", user.id)
        .single();

    if (profileError || !profile) {
      console.error("Worker profile error:", profileError);
      return;
    }

    if (profile.role !== "worker") {
      router.replace("/customer-dashboard");
      return;
    }

    const { data: worker, error: workerError } =
      await supabase
        .from("worker_profiles")
        .select("category")
        .eq("id", user.id)
        .single();

    if (workerError) {
      console.error("Worker details error:", workerError);
    }

    setFullName(profile.full_name || "Worker");
    setCategory(worker?.category || "Service Provider");
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
            <Text style={styles.greeting}>Welcome,</Text>
            <Text style={styles.name}>{fullName}</Text>
            <Text style={styles.category}>{category}</Text>
          </View>

          <Pressable
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        </View>

        <View style={styles.heroCard}>
          <Text style={styles.heroIcon}>🧰</Text>
          <Text style={styles.heroTitle}>Worker Dashboard</Text>
          <Text style={styles.heroText}>
            Incoming customer booking requests will appear here.
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>0</Text>
            <Text style={styles.summaryLabel}>Pending</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>0</Text>
            <Text style={styles.summaryLabel}>Accepted</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>0</Text>
            <Text style={styles.summaryLabel}>Completed</Text>
          </View>
        </View>

        <View style={styles.statusCard}>
          <Text style={styles.statusIcon}>✅</Text>

          <View style={styles.statusContent}>
            <Text style={styles.statusTitle}>
              Worker login successful
            </Text>

            <Text style={styles.statusText}>
              Your worker account and service profile are connected
              to Supabase.
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
    fontSize: 14,
    color: "#6B7280",
  },
  name: {
    marginTop: 2,
    fontSize: 24,
    fontWeight: "800",
    color: "#1F2937",
  },
  category: {
    marginTop: 3,
    fontSize: 14,
    fontWeight: "700",
    color: "#6D28D9",
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
    padding: 27,
    marginTop: 32,
    borderRadius: 18,
    backgroundColor: "#6D28D9",
  },
  heroIcon: {
    marginBottom: 10,
    fontSize: 43,
  },
  heroTitle: {
    fontSize: 23,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  heroText: {
    marginTop: 9,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    color: "#EDE9FE",
  },
  summaryRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  summaryCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 17,
    borderWidth: 1,
    borderColor: "#DDD6FE",
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: "800",
    color: "#6D28D9",
  },
  summaryLabel: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
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