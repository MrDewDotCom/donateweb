import axios from "axios";
import { API_URL } from "../config/api";

const TOKEN_KEY = "admin_access_token";

export const getStoredToken = () => localStorage.getItem(TOKEN_KEY);
export const setStoredToken = (token: string) =>
    localStorage.setItem(TOKEN_KEY, token);
export const clearStoredToken = () => localStorage.removeItem(TOKEN_KEY);

export const adminApi = axios.create({
    baseURL: API_URL,
});

// แนบ JWT ไปทุก request แทน x-admin-api-key เดิม
adminApi.interceptors.request.use((config) => {
    const token = getStoredToken();

    if (token) {
        config.headers["Authorization"] = `Bearer ${token}`;
    }

    return config;
});

// ถ้า token หมดอายุ/ไม่ถูกต้อง (401) → เคลียร์ token ทิ้งแล้วเด้งไปหน้า login
adminApi.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            clearStoredToken();

            if (window.location.pathname !== "/login") {
                window.location.href = "/login";
            }
        }

        return Promise.reject(error);
    },
);