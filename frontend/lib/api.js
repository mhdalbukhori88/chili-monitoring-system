// Wrapper axios ke backend FastAPI. Token JWT disimpan di localStorage.
import axios from "axios";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        const path = window.location.pathname;
        if (!path.startsWith("/login") && !path.startsWith("/register")) {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export const register = (data) => api.post("/auth/register", data);
export const login = (username, password) => {
  const form = new URLSearchParams();
  form.append("username", username);
  form.append("password", password);
  return api.post("/auth/login", form, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
};
export const getCurrentUser = () => api.get("/auth/me");
export const updateProfile = (data) => api.put("/auth/me", data);
export const changePassword = (data) => api.post("/auth/change-password", data);

export const getDashboard = () => api.get("/dashboard/");
export const getPlants = () => api.get("/plants/");
export const getPlant = (plantId) => api.get(`/plants/${plantId}`);
export const createPlant = (data) => api.post("/plants/", data);
export const updatePlant = (plantId, data) => api.put(`/plants/${plantId}`, data);
export const deletePlant = (plantId) => api.delete(`/plants/${plantId}`);

export const getGrowth = (plantId) => api.get(`/growth/${plantId}`);
export const createGrowthRecord = (plantId, data) => api.post(`/growth/${plantId}`, data);
export const deleteGrowthRecord = (recordId) => api.delete(`/growth/record/${recordId}`);

export const getPredictions = (plantId) => api.get(`/predictions/${plantId}`);
export const generatePredictions = (plantId, horizonDays = 14) =>
  api.post(`/predictions/${plantId}`, { horizon_days: horizonDays });

export const getSensors = (plantId) => api.get(`/sensors/${plantId}`);
export const createSensorReading = (data) => api.post("/sensors/", data);
export const deleteSensorReading = (readingId) => api.delete(`/sensors/reading/${readingId}`);

export const getAllAlerts = (unresolvedOnly = true) =>
  api.get(`/alerts/?unresolved_only=${unresolvedOnly}`);
export const getAlerts = (plantId, unresolvedOnly = true) =>
  api.get(`/alerts/${plantId}?unresolved_only=${unresolvedOnly}`);
export const resolveAlert = (alertId) => api.post(`/alerts/${alertId}/resolve`);
export const resolveAllAlerts = () => api.post("/alerts/resolve-all");
export const testExternalNotification = (data) => api.post("/alerts/test-notification", data);

export const getPhotos = (plantId) => api.get(`/photos/${plantId}`);
export const uploadPhoto = (plantId, file) => {
  const formData = new FormData();
  formData.append("file", file);
  return api.post(`/photos/upload/${plantId}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};
export const deletePhoto = (photoId) => api.delete(`/photos/${photoId}`);

export const getChatHistory = (limit = 50) => api.get(`/chat/?limit=${limit}`);
export const clearChatHistory = () => api.delete("/chat/clear");
export const sendChatMessage = (message, plantId = null) =>
  api.post("/chat/", { message, plant_id: plantId });

export default api;
