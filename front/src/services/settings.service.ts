import axios from "axios";

const API_URL =
    "http://localhost:3000";

export const getSettings =
    () =>
        axios.get(
            `${API_URL}/settings`
        );