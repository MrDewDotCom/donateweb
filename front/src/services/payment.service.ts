import axios from "axios";

const API_URL =
    "http://localhost:3000";

export const getQrCode =
    (
        phone: string,
        amount: number,
    ) =>
        axios.get(
            `${API_URL}/payment/qr`,
            {
                params: { phone, amount, },
            },
        );