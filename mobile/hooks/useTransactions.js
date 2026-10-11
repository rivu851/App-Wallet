// react custom hook file

import { useCallback, useEffect, useState } from "react";
import { Alert } from "react-native";
import { API_URL } from "../constants/api";
import NetInfo from "@react-native-community/netinfo";
import {
  cacheSummary,
  cacheTransactions,
  getCachedSummary,
  getCachedTransactions,
  pendingTransactions,
  syncPendingTransactions,
} from "../lib/offlineTransactions";

function summarizeTransactions(transactions) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - 6);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const result = {
    balance: 0, income: 0, expenses: 0, own_balance: 0, own_income: 0,
    own_expenses: 0, father_spending: 0, daily_spending: 0,
    weekly_spending: 0, monthly_spending: 0, own_daily_spending: 0,
    own_weekly_spending: 0, own_monthly_spending: 0, father_daily_spending: 0,
    father_weekly_spending: 0, father_monthly_spending: 0,
  };

  for (const transaction of transactions) {
    const amount = Number(transaction.amount) || 0;
    const source = transaction.source || "own";
    const date = new Date(transaction.created_at);
    const expense = amount < 0 ? Math.abs(amount) : 0;
    result.balance += amount;
    if (source === "own") {
      result.own_balance += amount;
      if (amount > 0) {
        result.own_income += amount;
        result.income += amount;
      } else {
        result.own_expenses += expense;
      }
    } else if (expense) {
      result.father_spending += expense;
    }
    if (!expense) continue;
    result.expenses -= expense;
    if (date >= today) result.daily_spending += expense;
    if (date >= weekStart) result.weekly_spending += expense;
    if (date >= monthStart) result.monthly_spending += expense;
    const prefix = source === "own" ? "own" : "father";
    if (date >= today) result[`${prefix}_daily_spending`] += expense;
    if (date >= weekStart) result[`${prefix}_weekly_spending`] += expense;
    if (date >= monthStart) result[`${prefix}_monthly_spending`] += expense;
  }
  return result;
}

export const useTransactions = (userId) => {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({
    balance: 0,
    income: 0,
    expenses: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);

  // useCallback is used for performance reasons, it will memoize the function
  const fetchTransactions = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/transactions/${userId}`);
      if (!response.ok) throw new Error("Could not fetch transactions");
      const data = await response.json();
      await cacheTransactions(userId, data);
      const pending = await pendingTransactions(userId);
      setTransactions([...pending, ...data]);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      const [cached, pending] = await Promise.all([
        getCachedTransactions(userId),
        pendingTransactions(userId),
      ]);
      setTransactions([...pending, ...cached]);
    }
  }, [userId]);

  const fetchSummary = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/transactions/summary/${userId}`);
      if (!response.ok) throw new Error("Could not fetch summary");
      const data = await response.json();
      setSummary(data);
      await cacheSummary(userId, data);
    } catch (error) {
      console.error("Error fetching summary:", error);
      const [cached, transactions, pending] = await Promise.all([
        getCachedSummary(userId),
        getCachedTransactions(userId),
        pendingTransactions(userId),
      ]);
      setSummary(cached ? summarizeTransactions([...pending, ...transactions]) : summarizeTransactions(pending));
    }
  }, [userId]);

  const loadData = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      const remaining = await syncPendingTransactions(userId);
      setPendingCount(remaining);
      await Promise.all([fetchTransactions(), fetchSummary()]);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [fetchTransactions, fetchSummary, userId]);

  useEffect(() => {
    let active = true;
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = Boolean(state.isConnected && state.isInternetReachable !== false);
      setIsOnline(online);
      if (online && active) loadData();
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [loadData]);

  const deleteTransaction = async (id) => {
    try {
      const response = await fetch(`${API_URL}/transactions/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      if (!response.ok) throw new Error("Failed to delete transaction");
      const result = await response.json();

      await loadData();
      return result;
    } catch (error) {
      console.error("Error deleting transaction:", error);
      Alert.alert("Error", error.message);
    }
  };

  const restoreTransaction = async (id, historyId) => {
    try {
      const response = await fetch(`${API_URL}/transactions/${id}/restore/${historyId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      if (!response.ok) throw new Error("Failed to restore transaction");
      await loadData();
      return true;
    } catch (error) {
      Alert.alert("Error", error.message);
      return false;
    }
  };

  return { transactions, summary, isLoading, isOnline, pendingCount, loadData, deleteTransaction, restoreTransaction };
};
