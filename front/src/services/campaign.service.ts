import axios from "axios";
import { API_URL } from "../config/api";
import { adminApi } from "./admin-api";

export const getCampaign =
    () =>
        axios.get(
            `${API_URL}/campaigns/active`
        );

// สร้างแคมเปญใหม่ (ใช้ adminApi เพราะ backend ต้อง login)
export const createCampaign =
    (data: {
        title: string;
        goalAmount: number;
        startDate: string;
        endDate: string;
    }) =>
        adminApi.post(
            `${API_URL}/campaigns`,
            data,
        );

export const updateCampaign =
    (
        id: number,
        data: any,
    ) =>
        adminApi.patch(
            `${API_URL}/campaigns/${id}`,
            data,
        );

export const getProgress =
    () =>
        axios.get(
            `${API_URL}/campaigns/active/progress`
        );

// limit (ไม่บังคับ) = จำนวนแถวที่ต้องการ 1-20, ไม่ส่ง = ใช้ค่าจาก campaign/settings
export const getTopDonators =
    (limit?: number) =>
        axios.get(
            `${API_URL}/campaigns/active/top-donators`,
            { params: limit ? { limit } : undefined },
        );

export const getRecentDonations =
    (limit?: number) =>
        axios.get(
            `${API_URL}/campaigns/active/recent`,
            { params: limit ? { limit } : undefined },
        );