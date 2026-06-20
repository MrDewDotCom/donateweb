import axios from "axios";
import { API_URL } from "../config/api";
import { setStoredToken, clearStoredToken, getStoredToken } from "./admin-api";

const AUTH_API = `${API_URL}/auth`;

export const login = async (username: string, password: string) => {
    const res = await axios.post<{ accessToken: string }>(
        `${AUTH_API}/login`,
        { username, password },
    );

    setStoredToken(res.data.accessToken);
    return res.data;
};

export const logout = () => {
    clearStoredToken();
};

export const isAuthenticated = () => {
    return Boolean(getStoredToken());
};