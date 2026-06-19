import axios from "axios";
import { API_URL } from "../config/api";


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