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

    // Sound & TTS
    readMessageEnabled: boolean;

    // Donation Goal
    monthlyGoalAmount?: number | null;
    monthlyGoalAutoReset: boolean;
}

export interface MonthlyGoalProgress {
    goalAmount: number;
    currentAmount: number;
    percentage: number;
    autoReset: boolean;
}