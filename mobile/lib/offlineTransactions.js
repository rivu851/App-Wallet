import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { API_URL } from "../constants/api";

const queueKey = (userId) => `transactions:outbox:${userId}`;
const cacheKey = (userId) => `transactions:cache:${userId}`;
const summaryKey = (userId) => `transactions:summary:${userId}`;

export async function getPendingQueue(userId) {
  const stored = await AsyncStorage.getItem(queueKey(userId));
  return stored ? JSON.parse(stored) : [];
}

export async function getCachedTransactions(userId) {
  const stored = await AsyncStorage.getItem(cacheKey(userId));
  return stored ? JSON.parse(stored) : [];
}

export async function cacheTransactions(userId, transactions) {
  await AsyncStorage.setItem(cacheKey(userId), JSON.stringify(transactions));
}

export async function getCachedSummary(userId) {
  const stored = await AsyncStorage.getItem(summaryKey(userId));
  return stored ? JSON.parse(stored) : null;
}

export async function cacheSummary(userId, summary) {
  await AsyncStorage.setItem(summaryKey(userId), JSON.stringify(summary));
}

export async function pendingTransactions(userId) {
  const queue = await getPendingQueue(userId);
  return queue.map(({ payload }) => ({
    ...payload,
    id: `local:${payload.client_id}`,
    created_at: payload.created_at,
    pending_sync: true,
  }));
}

export async function submitTransaction(payload) {
  const clientId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const queuedPayload = { ...payload, client_id: clientId, created_at: new Date().toISOString() };
  const network = await NetInfo.fetch();

  if (network.isConnected && network.isInternetReachable !== false) {
    try {
      const response = await fetch(`${API_URL}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(queuedPayload),
      });
      if (response.ok) return { queued: false, transaction: await response.json() };
      if (response.status < 500) {
        const error = await response.json();
        const requestError = new Error(error.message || "Could not save transaction");
        requestError.status = response.status;
        throw requestError;
      }
    } catch (error) {
      if (error.status) throw error;
    }
  }

  const queue = await getPendingQueue(payload.user_id);
  queue.push({ payload: queuedPayload });
  await AsyncStorage.setItem(queueKey(payload.user_id), JSON.stringify(queue));
  return { queued: true };
}

export async function syncPendingTransactions(userId) {
  const queue = await getPendingQueue(userId);
  const remaining = [];

  for (const entry of queue) {
    try {
      const response = await fetch(`${API_URL}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry.payload),
      });
      if (!response.ok) {
        remaining.push(...queue.slice(queue.indexOf(entry)));
        break;
      }
    } catch {
      remaining.push(entry);
      remaining.push(...queue.slice(queue.indexOf(entry) + 1));
      break;
    }
  }

  await AsyncStorage.setItem(queueKey(userId), JSON.stringify(remaining));
  return remaining.length;
}