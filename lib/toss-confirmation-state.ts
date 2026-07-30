export type TossConfirmationErrorMetadata = {
    status?: number;
    apiCode?: string;
};

const UNCERTAIN_CONFIRMATION_STATUSES = new Set([429, 502, 504]);
const UNCERTAIN_CONFIRMATION_CODES = new Set([
    "CONFIRM_ATTEMPT_LIMIT",
    "PAYMENT_MODE_CHANGED",
]);

export function isTossConfirmationPendingError(error: TossConfirmationErrorMetadata) {
    if (error.status && UNCERTAIN_CONFIRMATION_STATUSES.has(error.status)) return true;
    const apiCode = error.apiCode?.trim().toUpperCase() ?? "";
    return (
        UNCERTAIN_CONFIRMATION_CODES.has(apiCode)
        || apiCode.includes("PENDING")
        || apiCode.includes("REVIEW")
    );
}
