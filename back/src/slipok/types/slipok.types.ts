export interface SlipOkSenderReceiver {
  displayName: string;
  name: string;
  proxy: { type: string | null; value: string | null };
  account: { type: string; value: string };
}

export interface SlipOkData {
  success: boolean;
  message: string;
  language?: string;
  receivingBank: string;
  sendingBank: string;
  transRef: string;
  transDate: string;
  transTime: string;
  transTimestamp?: string;
  sender: SlipOkSenderReceiver;
  receiver: SlipOkSenderReceiver;
  amount: number;
  paidLocalAmount?: number;
  paidLocalCurrency?: string;
  countryCode: string;
  transFeeAmount?: number;
  ref1?: string;
  ref2?: string;
  ref3?: string;
  toMerchantId?: string;
}

export interface SlipOkSuccessResponse {
  success: true;
  data: SlipOkData;
}

export enum SlipOkErrorCode {
  MISSING_QR_DATA = 1000,
  BRANCH_NOT_FOUND = 1001,
  INVALID_AUTH = 1002,
  PACKAGE_EXPIRED = 1003,
  QUOTA_EXCEEDED = 1004,
  INVALID_FILE_TYPE = 1005,
  INVALID_IMAGE = 1006,
  NO_QR_IN_IMAGE = 1007,
  NOT_PAYMENT_QR = 1008,
  BANK_TEMP_DOWN = 1009,
  BANK_DELAY = 1010,
  QR_EXPIRED_OR_NOT_FOUND = 1011,
  DUPLICATE_SLIP = 1012,
  AMOUNT_MISMATCH = 1013,
  RECEIVER_MISMATCH = 1014,
  PACKAGE_NOT_FOUND = 1015,
}

export interface SlipOkErrorResponse {
  code: SlipOkErrorCode;
  message: string;
  data?: Partial<SlipOkData> & {
    qrcodeData?: string;
    bankCode?: string;
    bankName?: string;
    delay?: number;
  };
}