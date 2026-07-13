/**
 * /signup — 5단계 회원가입 stepper
 * ---------------------------------------------------------------------
 * 1. 약관 동의 (필수 3 + 선택 2 + 전체동의)
 * 2. 본인인증 (이름·생년월일·휴대폰 + 인증번호)
 * 3. 정보 입력 (이메일·비밀번호·확인)
 * 4. 펫 정보 (이름·견종·체중·성별) — 선택
 * 5. 완료
 *
 * 이전 단계형 화면. 현재 공개 가입 흐름은 /auth/signup 으로 모은다.
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { AuthField, inputClass, PrimaryButton, GhostButton } from "@/components/auth/AuthFields";

type Step = 1 | 2 | 3 | 4 | 5;

const STEP_LABELS: Record<Step, string> = {
    1: "약관",
    2: "본인인증",
    3: "정보입력",
    4: "펫 정보",
    5: "완료",
};

export default function SignupPage() {
    const router = useRouter();
    const { login } = useAuth();
    const [step, setStep] = useState<Step>(1);

    const next = () => setStep((s) => Math.min(5, s + 1) as Step);
    const prev = () => setStep((s) => Math.max(1, s - 1) as Step);

    const finish = () => {
        login("email");
        router.push("/main");
    };

    return (
        <div className="w-full max-w-lg glass-card rounded-3xl px-5 md:px-8 py-7 md:py-9">
            {/* Stepper */}
            <Stepper current={step} />

            <div className="mt-7 md:mt-8">
                {step === 1 && <Step1Terms onNext={next} />}
                {step === 2 && <Step2Identity onPrev={prev} onNext={next} />}
                {step === 3 && <Step3Info onPrev={prev} onNext={next} />}
                {step === 4 && <Step4Pet onPrev={prev} onNext={next} />}
                {step === 5 && <Step5Done onFinish={finish} />}
            </div>
        </div>
    );
}

/* ============ Stepper bar ============ */
function Stepper({ current }: { current: Step }) {
    return (
        <div className="flex items-center justify-between gap-1.5">
            {([1, 2, 3, 4, 5] as Step[]).map((n, i) => {
                const isActive = n === current;
                const isDone = n < current;
                return (
                    <div key={n} className="flex items-center flex-1 last:flex-initial">
                        <div className="flex flex-col items-center gap-1.5">
                            <span
                                className={`w-7 h-7 md:w-9 md:h-9 rounded-full flex items-center justify-center text-[11px] md:text-sm font-black transition ${
                                    isActive
                                        ? "bg-gradient-to-r from-aurora-blue to-aurora-indigo text-white shadow-card scale-110"
                                        : isDone
                                            ? "bg-aurora-indigo/15 text-aurora-indigo"
                                            : "bg-neutral-100 text-neutral-400"
                                }`}
                            >
                                {isDone ? <i className="fa-solid fa-check" /> : n}
                            </span>
                            <span
                                className={`text-[9px] md:text-[10px] font-extrabold tracking-wider ${
                                    isActive ? "text-foreground" : "text-neutral-400"
                                }`}
                            >
                                {STEP_LABELS[n]}
                            </span>
                        </div>
                        {i < 4 && (
                            <span
                                className={`flex-1 h-0.5 mx-1.5 mb-5 rounded-full ${
                                    n < current ? "bg-aurora-indigo/40" : "bg-neutral-200"
                                }`}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

/* ============ Step 1 — 약관 ============ */
function Step1Terms({ onNext }: { onNext: () => void }) {
    const [all, setAll] = useState(false);
    const [items, setItems] = useState([false, false, false, false, false]);
    const required = [true, true, true, false, false];
    const labels = [
        "[필수] 만 14세 이상입니다",
        "[필수] 이용약관에 동의",
        "[필수] 개인정보 처리방침에 동의",
        "[선택] 마케팅 정보 수신 동의 (이메일·SMS)",
        "[선택] 제3자 정보 제공 동의",
    ];

    const toggleAll = (v: boolean) => {
        setAll(v);
        setItems(items.map(() => v));
    };
    const toggleItem = (i: number, v: boolean) => {
        const next = [...items];
        next[i] = v;
        setItems(next);
        setAll(next.every(Boolean));
    };

    return (
        <>
            <h2 className="text-xl md:text-2xl font-black tracking-tight mb-1">약관에 동의해주세요</h2>
            <p className="text-xs md:text-sm text-neutral-500 mb-5">
                서비스 이용을 위해 아래 약관을 확인하고 동의해주세요.
            </p>
            <div className="rounded-2xl border border-neutral-200/70 p-3 mb-4 space-y-2">
                <Check label="전체 동의" checked={all} onChange={toggleAll} bold />
                <div className="h-px bg-neutral-200/70 my-1" />
                {labels.map((label, i) => (
                    <Check
                        key={i}
                        label={label}
                        checked={items[i]}
                        onChange={(v) => toggleItem(i, v)}
                        required={required[i]}
                    />
                ))}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-5">
                <Link
                    href="/login"
                    className="text-center py-3 rounded-xl bg-white border-2 border-neutral-200 hover:border-aurora-indigo text-foreground text-sm font-extrabold no-underline transition"
                >
                    로그인
                </Link>
                <PrimaryButton type="button" onClick={onNext}>다음</PrimaryButton>
            </div>
        </>
    );
}

/* ============ Step 2 — 본인 확인 ============ */
function Step2Identity({ onPrev, onNext }: { onPrev: () => void; onNext: () => void }) {
    const [codeSent, setCodeSent] = useState(false);
    return (
        <>
            <h2 className="text-xl md:text-2xl font-black tracking-tight mb-1">본인 확인을 해주세요</h2>
            <p className="text-xs md:text-sm text-neutral-500 mb-5">
                안전한 서비스 이용을 위해 휴대폰 본인인증을 진행합니다.
            </p>
            <div className="space-y-3.5 mb-4">
                <AuthField label="이름">
                    <input type="text" placeholder="홍길동" className={inputClass} />
                </AuthField>
                <AuthField label="생년월일">
                    <input type="text" placeholder="19960501" maxLength={8} className={inputClass} />
                </AuthField>
                <AuthField label="휴대폰 번호">
                    <div className="flex gap-2">
                        <input type="tel" placeholder="01012345678" maxLength={11} className={inputClass} />
                        <button
                            type="button"
                            onClick={() => setCodeSent(true)}
                            className="px-4 py-2.5 rounded-xl bg-foreground text-white text-xs font-bold whitespace-nowrap hover:bg-neutral-800"
                        >
                            인증번호 받기
                        </button>
                    </div>
                </AuthField>
                {codeSent && (
                    <AuthField label="인증번호">
                        <div className="flex gap-2">
                            <input type="text" placeholder="6자리 숫자" maxLength={6} className={inputClass} />
                            <button type="button" className="px-4 py-2.5 rounded-xl bg-aurora-indigo text-white text-xs font-bold whitespace-nowrap hover:opacity-90">
                                확인
                            </button>
                        </div>
                    </AuthField>
                )}
            </div>
            {codeSent && (
                <p className="rounded-2xl bg-aurora-indigo/5 px-4 py-3 text-xs font-bold leading-5 text-aurora-indigo">
                    인증번호를 입력해 주세요.
                </p>
            )}
            <div className="grid grid-cols-2 gap-2 mt-5">
                <GhostButton onClick={onPrev}>이전</GhostButton>
                <PrimaryButton type="button" onClick={onNext}>다음</PrimaryButton>
            </div>
        </>
    );
}

/* ============ Step 3 — 정보 입력 ============ */
function Step3Info({ onPrev, onNext }: { onPrev: () => void; onNext: () => void }) {
    return (
        <>
            <h2 className="text-xl md:text-2xl font-black tracking-tight mb-1">기본 정보를 입력해주세요</h2>
            <p className="text-xs md:text-sm text-neutral-500 mb-5">로그인에 사용할 이메일과 비밀번호를 설정해주세요.</p>
            <div className="space-y-3.5 mb-4">
                <AuthField label="이메일">
                    <div className="flex gap-2">
                        <input type="email" placeholder="email@example.com" className={inputClass} />
                        <button type="button" className="px-4 py-2.5 rounded-xl bg-foreground text-white text-xs font-bold whitespace-nowrap hover:bg-neutral-800">
                            중복확인
                        </button>
                    </div>
                </AuthField>
                <AuthField label="비밀번호" hint="영문·숫자·특수문자 조합 8자 이상">
                    <input type="password" placeholder="" className={inputClass} />
                </AuthField>
                <AuthField label="비밀번호 확인">
                    <input type="password" placeholder="비밀번호 재입력" className={inputClass} />
                </AuthField>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-5">
                <GhostButton onClick={onPrev}>이전</GhostButton>
                <PrimaryButton type="button" onClick={onNext}>다음</PrimaryButton>
            </div>
        </>
    );
}

/* ============ Step 4 — 펫 정보 (선택) ============ */
function Step4Pet({ onPrev, onNext }: { onPrev: () => void; onNext: () => void }) {
    return (
        <>
            <h2 className="text-xl md:text-2xl font-black tracking-tight mb-1">우리 댕댕이를 알려주세요</h2>
            <p className="text-xs md:text-sm text-neutral-500 mb-5">
                맞춤 상품·사이즈 추천에 활용돼요. 나중에 마이페이지에서도 추가할 수 있어요.
            </p>
            <div className="space-y-3.5 mb-4">
                <AuthField label="댕댕이 이름">
                    <input type="text" placeholder="예: 럭키" className={inputClass} />
                </AuthField>
                <AuthField label="견종">
                    <input type="text" placeholder="예: 골든리트리버" className={inputClass} />
                </AuthField>
                <AuthField label="체중 (kg)">
                    <input type="number" step="0.1" placeholder="예: 25.5" className={inputClass} />
                </AuthField>
                <AuthField label="성별">
                    <div className="grid grid-cols-2 gap-2">
                        <GenderRadio value="male"   label="남아 (수컷)" />
                        <GenderRadio value="female" label="여아 (암컷)" />
                    </div>
                </AuthField>
            </div>
            <p className="rounded-2xl bg-aurora-indigo/5 px-4 py-3 text-xs font-bold leading-5 text-aurora-indigo">
                반려견 정보는 가입 후 마이페이지에서도 다시 등록할 수 있어요.
            </p>
            <div className="grid grid-cols-2 gap-2 mt-5">
                <GhostButton onClick={onPrev}>이전</GhostButton>
                <PrimaryButton type="button" onClick={onNext}>다음</PrimaryButton>
            </div>
        </>
    );
}

function GenderRadio({ value, label }: { value: string; label: string }) {
    return (
        <label className="flex items-center gap-2 px-3.5 py-3 rounded-xl border-2 border-neutral-200 cursor-pointer has-[:checked]:border-aurora-indigo has-[:checked]:bg-aurora-indigo/[0.06] transition">
            <input type="radio" name="pet-gender" value={value} className="accent-aurora-indigo w-4 h-4" />
            <span className="text-sm font-bold">{label}</span>
        </label>
    );
}

/* ============ Step 5 — 완료 ============ */
function Step5Done({ onFinish }: { onFinish: () => void }) {
    return (
        <div className="text-center py-6">
            <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-gradient-to-br from-success to-aurora-indigo flex items-center justify-center text-white text-3xl shadow-card">
                <i className="fa-solid fa-check" />
            </div>
            <h2 className="text-2xl font-black tracking-tight mb-1.5">가입을 환영해요!</h2>
            <p className="text-sm text-neutral-500 mb-7">
                댕다방과 함께 우리 댕댕이의 매일을 더 특별하게 만들어보세요.
            </p>
            <PrimaryButton type="button" onClick={onFinish}>
                메인 페이지로 이동
            </PrimaryButton>
        </div>
    );
}

/* ============ 체크박스 ============ */
function Check({ label, checked, onChange, required, bold }: {
    label: string;
    checked: boolean;
    onChange: (v: boolean) => void;
    required?: boolean;
    bold?: boolean;
}) {
    return (
        <label className="flex items-center gap-2 cursor-pointer py-1.5">
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                className="accent-aurora-indigo w-4 h-4 flex-shrink-0"
            />
            <span className={`text-xs md:text-sm ${bold ? "font-extrabold" : "font-medium"} ${required && !checked ? "text-foreground" : ""}`}>
                {label}
            </span>
        </label>
    );
}
