import { useState, type InputHTMLAttributes } from "react";

type BaseProps = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type" | "defaultValue">;

const format = (v: number | null | undefined) => (v == null || Number.isNaN(v) ? "" : String(v));

function parse(text: string): number | null {
    if (text.trim() === "") return null;
    const n = Number(text);
    return Number.isFinite(n) ? n : null;
}

/**
 * ช่องกรอกตัวเลขที่ลบจนว่างได้จริง
 *
 * ปัญหาเดิม: value={x} + onChange={Number(e.target.value)} → ลบหมดแล้วกลายเป็น 0 ทันที
 * พอพิมพ์ต่อเลยได้ "0123" หรือ "1230"
 *
 * ตอนนี้เก็บข้อความที่พิมพ์ไว้เอง ส่งค่าออกไปเฉพาะตอนเป็นตัวเลขที่ถูกต้อง
 * คลิกเข้าช่องแล้วเลือกตัวเลขทั้งหมดให้ พิมพ์ทับได้เลย
 */
function useNumberText(value: number | null | undefined) {
    const [text, setText] = useState(() => format(value));
    const [prevValue, setPrevValue] = useState(value);

    // ค่าเปลี่ยนจากข้างนอก (โหลดใหม่ / กดค่าเดิม) → อัปเดตข้อความ
    // ยกเว้นตอนข้อความที่พิมพ์อยู่ตรงกับค่านั้นแล้ว (กันเคอร์เซอร์กระโดดตอนพิมพ์ "1." ฯลฯ)
    if (value !== prevValue) {
        setPrevValue(value);
        if (parse(text) !== (value ?? null)) setText(format(value));
    }

    return [text, setText] as const;
}

/**
 * ช่องที่ต้องมีค่าเสมอ: ลบหมด → แสดง 0 (เหมือนเดิม)
 * แต่ 0 ตัวนั้นไม่ปนกับตัวเลขที่พิมพ์ต่อ — พิมพ์ 1 ได้ 1 ไม่ใช่ 01 หรือ 10
 * และตัด 0 นำหน้าออกเสมอ (0123 → 123)
 */
function cleanTyped(raw: string, prevText: string): string {
    if (raw === "") return "0";

    let next = raw;
    // ช่องเป็น "0" อยู่แล้วพิมพ์เพิ่ม 1 ตัว (ไม่ว่าเคอร์เซอร์อยู่หน้า/หลัง 0) → เอา 0 เดิมออก
    if (prevText === "0" && /^\d{2}$/.test(next) && next.includes("0")) {
        next = next.replace("0", "");
    }
    // ตัด 0 นำหน้า (แต่เก็บ "0" ตัวเดียวและทศนิยม "0.5" ไว้)
    return next.replace(/^(-?)0+(?=\d)/, "$1");
}

export function NumberInput({
    value,
    onChange,
    onBlur,
    onFocus,
    ...rest
}: BaseProps & { value: number; onChange: (v: number) => void }) {
    const [text, setText] = useNumberText(value);

    return (
        <input
            {...rest}
            type="number"
            inputMode="numeric"
            value={text}
            onFocus={(e) => {
                e.target.select();
                onFocus?.(e);
            }}
            onChange={(e) => {
                const next = cleanTyped(e.target.value, text);
                setText(next);
                const n = parse(next);
                if (n !== null) onChange(n);
            }}
            onBlur={(e) => {
                // เผื่อพิมพ์รูปแบบแปลก ๆ ที่ไม่ใช่ตัวเลข → กลับเป็นค่าล่าสุด
                if (parse(text) === null) setText(format(value));
                onBlur?.(e);
            }}
        />
    );
}

// ไม่บังคับ — ปล่อยว่าง = null (เช่น "ไม่จำกัด", "ใช้ขั้นต่ำทั่วไป")
export function OptionalNumberInput({
    value,
    onChange,
    onFocus,
    ...rest
}: BaseProps & { value: number | null | undefined; onChange: (v: number | null) => void }) {
    const [text, setText] = useNumberText(value);

    return (
        <input
            {...rest}
            type="number"
            inputMode="numeric"
            value={text}
            onFocus={(e) => {
                e.target.select();
                onFocus?.(e);
            }}
            onChange={(e) => {
                setText(e.target.value);
                onChange(parse(e.target.value));
            }}
        />
    );
}
