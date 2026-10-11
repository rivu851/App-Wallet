import { useUser } from "@clerk/clerk-expo";
import { useFocusEffect, useRouter } from "expo-router";
import { Alert, FlatList, Image, RefreshControl, Text, TouchableOpacity, View } from "react-native";
import { SignOutButton } from "@/components/SignOutButton";
import { useTransactions } from "../../hooks/useTransactions";
import { useCallback, useState } from "react";
import PageLoader from "../../components/PageLoader";
import { styles } from "../../assets/styles/home.styles";
import { Ionicons } from "@expo/vector-icons";
import { BalanceCard } from "../../components/BalanceCard";
import { TransactionItem } from "../../components/TransactionItem";
import NoTransactionsFound from "../../components/NoTransactionsFound";

export default function Page() {
  const { user } = useUser();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [source, setSource] = useState("own");
  const [undoEntry, setUndoEntry] = useState(null);

  const { transactions, summary, isLoading, isOnline, pendingCount, loadData, deleteTransaction, restoreTransaction } = useTransactions(
    user.id
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  useFocusEffect(useCallback(() => {
    loadData();
  }, [loadData]));

  const handleDelete = (id) => {
    Alert.alert("Delete Transaction", "Are you sure you want to delete this transaction?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const result = await deleteTransaction(id);
          if (result?.history_id) setUndoEntry({ id, historyId: result.history_id });
        },
      },
    ]);
  };

  const handleEdit = (item) => {
    router.push({
      pathname: "/create",
      params: {
        id: item.id,
        title: item.title,
        amount: String(item.amount),
        category: item.category,
        source: item.source || "own",
      },
    });
  };

  const visibleTransactions = transactions.filter((item) => (item.source || "own") === source);

  if (isLoading && !refreshing) return <PageLoader />;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* HEADER */}
        <View style={styles.header}>
          {/* LEFT */}
          <View style={styles.headerLeft}>
            <Image
              source={require("../../assets/images/logo.png")}
              style={styles.headerLogo}
              resizeMode="contain"
            />
            <View style={styles.welcomeContainer}>
              <Text style={styles.welcomeText}>Welcome,</Text>
              <Text style={styles.usernameText}>
                {user?.emailAddresses[0]?.emailAddress.split("@")[0]}
              </Text>
            </View>
          </View>
          {/* RIGHT */}
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.historyButton} onPress={() => router.push("/history")}>
              <Ionicons name="time-outline" size={21} color="#263238" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.addButton} onPress={() => router.push("/create")}>
              <Ionicons name="add" size={20} color="#FFF" />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
            <SignOutButton />
          </View>
        </View>

        <View style={styles.connectionStatus}>
          <Text style={styles.connectionText}>
            {isOnline ? "Online" : "Offline"}{pendingCount > 0 ? ` · ${pendingCount} waiting to sync` : ""}
          </Text>
        </View>

        <View style={styles.sourceTabs}>
          {[
            { id: "own", label: "My money" },
            { id: "father", label: "Dad's money" },
          ].map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[styles.sourceTab, source === option.id && styles.sourceTabActive]}
              onPress={() => setSource(option.id)}
            >
              <Text style={[styles.sourceTabText, source === option.id && styles.sourceTabTextActive]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <BalanceCard summary={summary} source={source} />

        {undoEntry && (
          <View style={styles.undoBar}>
            <Text style={styles.undoText}>Transaction deleted</Text>
            <TouchableOpacity
              onPress={async () => {
                if (await restoreTransaction(undoEntry.id, undoEntry.historyId)) setUndoEntry(null);
              }}
            >
              <Text style={styles.undoAction}>Undo</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.transactionsHeaderContainer}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
        </View>
      </View>

      {/* FlatList is a performant way to render long lists in React Native. */}
      {/* it renders items lazily — only those on the screen. */}
      <FlatList
        style={styles.transactionsList}
        contentContainerStyle={styles.transactionsListContent}
        data={visibleTransactions}
        renderItem={({ item }) => <TransactionItem item={item} onDelete={handleDelete} onEdit={handleEdit} />}
        ListEmptyComponent={<NoTransactionsFound />}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />
    </View>
  );
}
