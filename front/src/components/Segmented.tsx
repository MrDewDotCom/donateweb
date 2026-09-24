import styles from "./Segmented.module.css";

interface Props<T extends string | boolean> {
    options: readonly (readonly [T, string])[];
    value: T;
    onChange: (v: T) => void;
    ariaLabel: string;
    size?: "md" | "sm";
}

/**
 * ตัวเลือกแบบแถบ (segmented control) พร้อมไฮไลต์ที่เลื่อนไปยังตัวที่เลือก
 * ทุกตัวเลือกกว้างเท่ากัน → คำนวณตำแหน่งไฮไลต์จาก index ได้ด้วย CSS ล้วน
 */
export default function Segmented<T extends string | boolean>({
    options,
    value,
    onChange,
    ariaLabel,
    size = "md",
}: Props<T>) {
    const index = Math.max(0, options.findIndex(([v]) => v === value));

    return (
        <div
            className={`${styles.root} ${size === "sm" ? styles.sm : ""}`}
            role="radiogroup"
            aria-label={ariaLabel}
            style={{ "--count": options.length, "--index": index } as React.CSSProperties}
        >
            <span className={styles.indicator} aria-hidden="true" />
            {options.map(([v, label]) => (
                <button
                    key={String(v)}
                    type="button"
                    role="radio"
                    aria-checked={v === value}
                    className={`${styles.option} ${v === value ? styles.active : ""}`}
                    onClick={() => onChange(v)}
                >
                    {label}
                </button>
            ))}
        </div>
    );
}
