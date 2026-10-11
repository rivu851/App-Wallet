import { useCallback, useState } from "react";
import { Alert, FlatList, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { API_URL } from "../../constants/api";
import { formatDate } from "../../lib/utils";
import { COLORS } from "../../constants/colors";
import PageLoader from "../../components/PageLoader";
import { styles } from "../../assets/styles/home.styles";

export default function TransactionHistoryScreen() {
  const router = useRouter();
  const { user } = useUser();
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/transactions/history/${user.id}`);
      if (!response.ok) throw new Error("Could not load edit history");
      setHistory(await response.json());
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setIsLoading(false);
    }
  }, [user.id]);

  useFocusEffect(useCallback(() => {
    loadHistory();
  }, [loadHistory]));

  const restoreEntry = async (entry) => {
    try {
      const response = await fetch(
        `${API_URL}/transactions/${entry.transaction_id}/restore/${entry.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: user.id }),
        }
      );
      if (!response.ok) throw new Error("Could not restore transaction");
      await loadHistory();
      Alert.alert("Restored", "The previous transaction version was restored.");
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  if (isLoading) return <PageLoader />;

  return (
    <View style={screenStyles.container}>
      <View style={screenStyles.header}>
        <TouchableOpacity onPress={() => router.back()} style={screenStyles.backButton}>
          <Ionicons name="arrow-back" size={23} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={screenStyles.title}>Edit history</Text>
      </View>
      <FlatList
        data={history}
        keyExtractor={(entry) => String(entry.id)}
        contentContainerStyle={screenStyles.list}
        ListEmptyComponent={<Text style={styles.emptyStateText}>No edits or deletions yet.</Text>}
        renderItem={({ item }) => {
          const snapshot = typeof item.snapshot === "string" ? JSON.parse(item.snapshot) : item.snapshot;
          return (
            <View style={screenStyles.historyRow}>
              <View style={screenStyles.details}>
                <Text style={screenStyles.transactionTitle}>{snapshot.title}</Text>
                <Text style={screenStyles.description}>
                  {item.action === "deleted" ? "Deleted" : item.action === "updated" ? "Edited" : "Restored"}
                  {` · ${snapshot.source === "father" ? "Dad's money" : "My money"} · ${formatDate(item.created_at)}`}
                </Text>
                <Text style={screenStyles.amount}>
                  Rs{Math.abs(Number(snapshot.amount)).toFixed(2)} · {snapshot.category}
                </Text>
              </View>
              <TouchableOpacity style={screenStyles.restoreButton} onPress={() => restoreEntry(item)}>
                <Ionicons name="refresh-outline" size={18} color={COLORS.primary} />
                <Text style={screenStyles.restoreText}>Restore</Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </View>
  );
}

const screenStyles = {
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: { padding: 8, marginRight: 12 },
  title: { fontSize: 20, fontWeight: "700", color: COLORS.text },
  list: { padding: 16, paddingBottom: 28 },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    padding: 14,
    marginBottom: 10,
    borderRadius: 10,
  },
  details: { flex: 1, paddingRight: 10 },
  transactionTitle: { fontSize: 16, fontWeight: "600", color: COLORS.text },
  description: { fontSize: 12, color: COLORS.textLight, marginTop: 5 },
  amount: { fontSize: 13, color: COLORS.text, marginTop: 5 },
  restoreButton: { alignItems: "center", padding: 6 },
  restoreText: { color: COLORS.primary, fontSize: 12, fontWeight: "600", marginTop: 2 },
};