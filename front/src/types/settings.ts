export interface Settings {
    id: number;
    topDonatorsLimit: number;
    refreshInterval: number;
    soundEnabled: boolean;
    ttsEnabled: boolean;
    alertSound: string;
    alertVolume: number;
    overlayDuration: number;
    ttsVoice?: string;
    promptpayNumber?: string;

    // Payment
    minDonationAmount?: number | null;
    maxDonationAmount?: number | null;

    // Overlay
    overlayAnimation: "fade" | "slide" | "zoom" | "bounce";
    overlayImage?: string | null;
    // สีข้อความใน alert (#rrggbb)
    alertNameColor: string;
    alertAmountColor: string;
    alertMessageColor: string;

    // Sound & TTS
    readMessageEnabled: boolean;

    // Donation Goal
    monthlyGoalAmount?: number | null;
    monthlyGoalAutoReset: boolean;
    goalEffectEnabled: boolean;

    // Top Donators
    topDonatorMode: "all" | "campaign" | "custom";
    topDonatorFrom?: string | null;
    topDonatorTo?: string | null;

    // Timer donation — เรท: timerRateAmount บาท = timerRateMinutes นาที
    timerEnabled: boolean;
    timerRateAmount: number;
    timerRateMinutes: number;
    timerMinAmount?: number | null;

    // Video clip donation — เรท: videoRateAmount บาท = videoRateSeconds วินาที
    videoEnabled: boolean;
    videoRateAmount: number;
    videoRateSeconds: number;
    videoMinAmount?: number | null;
    videoMaxSeconds: number;
    videoStartDelay: number;
}

export interface MonthlyGoalProgress {
    goalAmount: number;
    currentAmount: number;
    percentage: number;
    autoReset: boolean;
}