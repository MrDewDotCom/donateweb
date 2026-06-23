import axios from "axios";
import { API_URL } from "../config/api";
import { adminApi } from "./admin-api";

export const getSettings =
    () =>
        axios.get(
            `${API_URL}/settings`
        );

export const updateSettings =
    (data: any) =>
        adminApi.patch(
            `${API_URL}/settings`,
            data,
        );

export const getMonthlyGoalProgress =
    () =>
        axios.get(
            `${API_URL}/settings/monthly-goal`
        );

// เสียงที่อัปโหลดเอง
export const getCustomSounds =
    () => adminApi.get(`${API_URL}/settings/sounds`);

export const uploadSound = (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    return adminApi.post(`${API_URL}/settings/sounds`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
};

// รูป Overlay (รองรับ gif)
export const getOverlayImages =
    () => adminApi.get(`${API_URL}/settings/overlay-images`);

export const uploadOverlayImage = (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    return adminApi.post(`${API_URL}/settings/overlay-images`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
};

// ส่ง donation ปลอมไปแสดงที่หน้า Overlay จริงเพื่อพรีวิว
export const testOverlay =
    () => adminApi.post(`${API_URL}/settings/test-overlay`);