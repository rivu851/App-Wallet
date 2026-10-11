const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:5001";

export const API_URL = `${API_BASE_URL.replace(/\/+$/, "")}/api`;
