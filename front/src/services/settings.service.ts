import axios from "axios";
import { API_URL } from "../config/api";
import { adminApi } from "./admin-api";

export const getSettings =
    () =>
        axios.get(
            `${API_URL}/settings`
        );

export const updateSettings =
    (data: any) =>
        adminApi.patch(
            `${API_URL}/settings`,
            data,
        );

export const getMonthlyGoalProgress =
    () =>
        axios.get(
            `${API_URL}/settings/monthly-goal`
        );