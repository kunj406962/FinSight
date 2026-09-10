import axios from "axios";
import { getToken, clearToken } from "./authToken";
import { isDemoMode } from "../demo/demoState";
import { demoAdapter } from "../demo/demoAdapter";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

client.interceptors.request.use((config) => {
  if (isDemoMode()) {
    config.adapter = demoAdapter;
    return config;
  }
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearToken();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export default client;