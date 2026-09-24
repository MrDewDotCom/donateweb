import axios from "axios";
import { API_URL } from "../config/api";
import { adminApi } from "./admin-api";
import type { Donation } from "../types/donation";

const DONATION_API = `${API_URL}/donations`;

export interface DonationPage {
    items: Donation[];
    total: number;
    limit: number;
    offset: number;
}

// backend แบ่งหน้าแล้ว — ส่ง filter/search ไปให้ DB ทำแทนที่จะดึงมาทั้งหมดแล้วกรองในเบราว์เซอร์
export type DonationSort = "newest" | "oldest" | "amount";

export const getDonations = (params: {
    limit?: number;
    offset?: number;
    status?: string;
    search?: string;
    sort?: DonationSort;
} = {}) => {
    return adminApi.get<DonationPage>(DONATION_API, {
        params: {
            ...params,
            // ส่งเฉพาะที่มีค่าจริง กัน ?status=all หลุดไปถึง backend
            status: params.status && params.status !== "all" ? params.status : undefined,
            search: params.search?.trim() || undefined,
        },
    });
};

export type DonationType = "standard" | "timer" | "video";

export const createDonation = (
    name: string,
    message: string,
    amount: number,
    type: DonationType = "standard",
    video?: { videoUrl: string; videoStart?: number; videoAlert?: boolean },
) => {
    return axios.post(DONATION_API, { name, message, amount, type, ...(type === "video" ? video : {}) });
};

export interface DonationSummary {
    totalAmount: number;
    paidCount: number;
    totalCount: number;
}

// ยอดรวมทั้งระบบ — คำนวณจากหน้าเดียวไม่ได้แล้วหลังแบ่งหน้า
export const getDonationSummary = () =>
    adminApi.get<DonationSummary>(`${DONATION_API}/stats/summary`);

export const markDonationAsPaid = (id: number) => {
    return adminApi.patch(`${DONATION_API}/${id}/mark-paid`);
};

export const getRecentDonations =
    () => axios.get(`${DONATION_API}/recent`);

export const getDonation =
    (id: number, token: string,) => axios.get(`${DONATION_API}/${id}/${token}`,);

// สรุปยอดรายวัน (default 7 วันล่าสุด) — admin เท่านั้น
export const getDailyStats =
    (days = 7) => adminApi.get(`${DONATION_API}/stats/daily?days=${days}`);