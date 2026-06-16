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
}