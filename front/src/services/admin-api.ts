import axios from "axios";
import { ADMIN_API_KEY, API_URL } from "../config/api";

export const adminApi = axios.create({
    baseURL: API_URL,
});

adminApi.interceptors.request.use((config) => {
    if (ADMIN_API_KEY) {
        config.headers["x-admin-api-key"] = ADMIN_API_KEY;
    }

    return config;
});
