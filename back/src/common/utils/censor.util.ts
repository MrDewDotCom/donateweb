import { BANNED_WORDS } from "./banned-words";

const CENSOR_MASK = "***";

function escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalize(text: string): string {
    return text
        .toLowerCase()
        .normalize("NFC")

        // ลบช่องว่าง
        .replace(/\s+/g, "")

        // ลบเครื่องหมาย
        .replace(/[._\-~!@#$%^&*()+=[\]{}:;"'<>,?/\\|`]/g, "")

        // ลดตัวอักษรซ้ำ
        // ควยยยยย -> ควย
        // shiiiiit -> shit
        .replace(/(.)\1{2,}/g, "$1");
}

function buildRegex(word: string): RegExp {
    const chars = [...word].map((c) => escapeRegExp(c));

    return new RegExp(
        chars.join("[\\s._\\-]*"),
        "gi",
    );
}

export function censorMessage(
    text: string | null | undefined,
): string | null {
    if (!text) {
        return text ?? null;
    }

    let result = text;

    const normalized = normalize(text);

    for (const word of BANNED_WORDS) {
        const normalizedWord = normalize(word);

        if (!normalized.includes(normalizedWord)) {
            continue;
        }

        result = result.replace(buildRegex(word), CENSOR_MASK);
    }

    return result;
}