import { io, type Socket } from "socket.io-client";
import { API_URL } from "../config/api";

/**
 * socket ตัวเดียวใช้ร่วมกันทั้งแอป พร้อมนับจำนวนผู้ใช้งาน
 *
 * ปัญหาเดิม 2 อย่าง:
 *  1) Overlay.tsx เรียก io() ไว้ระดับ module ทำให้ต่อ socket ตั้งแต่ตอน import
 *     ซึ่ง App.tsx import ทุกหน้าไว้หมด → คนที่เข้าหน้าแรกหรือหน้าโดเนทก็เปิด
 *     connection ทิ้งไว้ทั้งที่ไม่ได้ใช้ และไม่เคย disconnect เลย
 *  2) GoalWidget เปิด socket ของตัวเองอีกตัว → เปิดสองหน้าก็สองการเชื่อมต่อ
 *
 * ตอนนี้ทุกหน้าขอใช้ตัวเดียวกัน แล้วปิดจริงเมื่อไม่มีใครใช้แล้ว
 */

let socket: Socket | null = null;
let refCount = 0;

export function acquireSocket(): Socket {
    if (!socket) {
        socket = io(API_URL);
    }

    refCount++;
    return socket;
}

export function releaseSocket(): void {
    refCount = Math.max(0, refCount - 1);

    if (refCount === 0 && socket) {
        socket.disconnect();
        socket = null;
    }
}
