import axios from "axios";
import { API_URL } from "../config/api";
import { adminApi } from "./admin-api";

export interface TimerSnapshot {
    isRunning: boolean;
    remainingSec: number;
    endsAt: string | null;
    serverNow: string;
}

const TIMER_API = `${API_URL}/timer`;

// public — หน้า overlay ใช้
export const getTimer = () => axios.get<TimerSnapshot>(TIMER_API);

// admin
export const pauseTimer = () => adminApi.post<TimerSnapshot>(`${TIMER_API}/pause`);
export const resumeTimer = () => adminApi.post<TimerSnapshot>(`${TIMER_API}/resume`);
export const resetTimer = () => adminApi.post<TimerSnapshot>(`${TIMER_API}/reset`);
export const adjustTimer = (seconds: number) =>
    adminApi.post<TimerSnapshot>(`${TIMER_API}/adjust`, { seconds });
