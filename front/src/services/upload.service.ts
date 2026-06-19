import axios from "axios";
import { API_URL } from "../config/api";

export const uploadSlip = async (
    file: File,
    donationId: number,
    token: string,
) => {
    const formData = new FormData();

    formData.append("file", file);
    formData.append("donationId", String(donationId));
    formData.append("token", token);

    return axios.post(`${API_URL}/upload`, formData);
};