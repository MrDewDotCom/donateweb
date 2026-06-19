import axios from "axios";
import { API_URL } from "../config/api";
import { adminApi } from "./admin-api";

export const getCampaign =
    () =>
        axios.get(
            `${API_URL}/campaigns/active`
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

export const getTopDonators =
    () =>
        axios.get(
            `${API_URL}/campaigns/active/top-donators`
        );

export const getRecentDonations =
    () =>
        axios.get(
            `${API_URL}/campaigns/active/recent`
        );
