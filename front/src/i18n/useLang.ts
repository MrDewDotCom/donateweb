import { useCallback, useEffect, useState } from 'react';

export type Lang = 'th' | 'en';

const STORAGE_KEY = 'lang';

function readLang(): Lang {
    try {
        const v = localStorage.getItem(STORAGE_KEY);
        if (v === 'th' || v === 'en') return v;
    } catch {
        // localStorage อาจใช้ไม่ได้ (private mode ฯลฯ) — ใช้ค่า default
    }
    return 'th';
}

// ภาษาที่ผู้ใช้เลือก จำไว้ใน browser และใช้ร่วมกันได้ทุกหน้า
export function useLang() {
    const [lang, setLangState] = useState<Lang>(readLang);

    useEffect(() => {
        document.documentElement.lang = lang;
    }, [lang]);

    const setLang = useCallback((next: Lang) => {
        setLangState(next);
        try {
            localStorage.setItem(STORAGE_KEY, next);
        } catch {
            // ignore
        }
    }, []);

    return { lang, setLang };
}
