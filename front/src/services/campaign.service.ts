import axios from "axios";

const API_URL =
    "http://localhost:3000";

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
        axios.patch(
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