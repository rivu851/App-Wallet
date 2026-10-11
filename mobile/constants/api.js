const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "https://app-wallet-1g8q.onrender.com";

export const API_URL = `${API_BASE_URL.replace(/\/+$/, "")}/api`;
