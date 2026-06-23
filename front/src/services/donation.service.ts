import axios from "axios";
import { API_URL } from "../config/api";
import { adminApi } from "./admin-api";

const DONATION_API = `${API_URL}/donations`;

export const getDonations = () => {
    return adminApi.get(DONATION_API);
};

export const createDonation = (name: string, message: string, amount: number) => {
    return axios.post(DONATION_API, { name, message, amount, });
};

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