export type PetCompanionSaveAccess =
    | { allowed: true }
    | {
        allowed: false;
        title: string;
        message: string;
        actionLabel: string;
        href: "/auth/signup";
    };

const MEMBER_SAVE_ACCESS: PetCompanionSaveAccess = { allowed: true };

export const GUEST_PET_COMPANION_SAVE_ACCESS: PetCompanionSaveAccess = {
    allowed: false,
    title: "회원가입 후 이용할 수 있어요",
    message: "산책 친구를 변경하고 저장하려면 회원가입이 필요해요. 가입 후 우리 아이 설정에서 언제든 다시 바꿀 수 있습니다.",
    actionLabel: "회원가입하기",
    href: "/auth/signup",
};

export function resolvePetCompanionSaveAccess(user: unknown): PetCompanionSaveAccess {
    return user ? MEMBER_SAVE_ACCESS : GUEST_PET_COMPANION_SAVE_ACCESS;
}
