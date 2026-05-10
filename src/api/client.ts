import axios from "axios";

import {
  clearStoredAuthToken,
  getStoredAuthToken,
  notifyUnauthorized,
} from "../utils/authStorage";


export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});


apiClient.interceptors.request.use((config) => {
  const token = getStoredAuthToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});


apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      clearStoredAuthToken();
      notifyUnauthorized();

      if (window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
    }

    return Promise.reject(error);
  },
);
