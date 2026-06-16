import axios from "axios";

const API_URL = "http://localhost:3000/donations";

export const getDonations = () => {
    return axios.get(API_URL);
};

export const createDonation = (
    name: string,
    message: string,
    amount: number
) => {
    return axios.post(API_URL, {
        name,
        message,
        amount,
    });
};

export const markDonationAsPaid = (
    id: number
) => {
    return axios.patch(
        `${API_URL}/${id}`,
        {
            status: "paid",
        }
    );
};

export const getRecentDonations =
    () => axios.get("http://localhost:3000/donations/recent");

export const getDonation =
    (id: number, token: string,) => axios.get(`${API_URL}/${id}/${token}`,);