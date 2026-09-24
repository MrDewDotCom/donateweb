import axios from "axios";
import { API_URL } from "../config/api";
import { adminApi } from "./admin-api";

export interface VideoItem {
    donationId: number;
    name: string;
    amount: number;
    message: string | null;
    videoId: string;
    title: string | null;
    start: number;
    seconds: number;
}

export interface VideoSnapshot {
    current: (VideoItem & { startsAt: string; endsAt: string }) | null;
    queue: VideoItem[];
    serverNow: string;
}

const VIDEO_API = `${API_URL}/video`;

// public — overlay ใช้
export const getVideoState = () => axios.get<VideoSnapshot>(VIDEO_API);

// admin
export const skipVideo = () => adminApi.post<VideoSnapshot>(`${VIDEO_API}/skip`);
export const removeQueuedVideo = (donationId: number) =>
    adminApi.post<VideoSnapshot>(`${VIDEO_API}/${donationId}/remove`);
