"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    customerApiErrorMessage,
    ddbApiReady,
    loadPetProfilesSmart,
    loginCustomer,
    savePetProfileSmart,
    setCustomerToken,
    signupCustomer,
} from "@/lib/customer-api";
import { resizePetPhoto } from "@/lib/pet-photo";
import { useAuth, type PetProfile } from "@/lib/store";
import SocialAuthButtons from "@/components/auth/SocialAuthButtons";

const CONCERN_OPTIONS = ["눈 보호", "피부/발바닥 케어", "체중 관리", "산책 안전", "놀이/분리불안"];

export default function SignupPage() {
    const router = useRouter();
    const { login } = useAuth();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [phone, setPhone] = useState("");
    const [petName, setPetName] = useState("");
    const [petAge, setPetAge] = useState("성견");
    const [petSize, setPetSize] = useState<PetProfile["size"]>("medium");
    const [petCoat, setPetCoat] = useState<PetProfile["coat"]>("medium");
    const [petActivity, setPetActivity] = useState<PetProfile["activity"]>("normal");
    const [petConcerns, setPetConcerns] = useState<string[]>(["일상 케어"]);
    const [petPhotoDataUrl, setPetPhotoDataUrl] = useState<string | undefined>();
    const [photoLoading, setPhotoLoading] = useState(false);
    const [photoError, setPhotoError] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [agreeTerms, setAgreeTerms] = useState(false);
    const [agreePrivacy, setAgreePrivacy] = useState(false);

    const toggleConcern = (concern: string) => {
        setPetConcerns((prev) =>
            prev.includes(concern)
                ? prev.filter((item) => item !== concern)
                : [...prev.filter((item) => item !== "일상 케어"), concern]
        );
    };

    const handlePetPhoto = (file?: File) => {
        if (!file) return;
        setPhotoLoading(true);
        setPhotoError("");
        resizePetPhoto(file)
            .then((dataUrl) => setPetPhotoDataUrl(dataUrl))
            .catch(() => setPhotoError("사진을 불러오지 못했습니다. 다른 이미지를 선택해 주세요."))
            .finally(() => setPhotoLoading(false));
    };

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setError("");
        if (!ddbApiReady()) {
            setCustomerToken();
            setError("회원가입을 사용하려면 운영 API 주소가 먼저 연결되어야 합니다.");
            return;
        }
        if (password.trim().length < 8) {
            setError("비밀번호는 8자 이상 입력해 주세요.");
            return;
        }
        if (!agreeTerms || !agreePrivacy) {
            setError("필수 약관과 개인정보 수집·이용에 동의해 주세요.");
            return;
        }
        const shouldCreatePet = Boolean(petName.trim() || petPhotoDataUrl);
        const pets: PetProfile[] = shouldCreatePet
            ? [{
                name: petName.trim() || "우리 아이",
                size: petSize,
                age: petAge.trim() || "성견",
                coat: petCoat,
                activity: petActivity,
                concerns: petConcerns.length > 0 ? petConcerns : ["일상 케어"],
                photoDataUrl: petPhotoDataUrl,
                lastAnalyzedAt: new Date().toISOString(),
            }]
            : [];

        setLoading(true);
        try {
            const apiUser = await signupCustomer({
                email: email.trim(),
                password: password.trim(),
                name: name.trim() || "댕다방 회원",
            });
            const token = await loginCustomer({ email: email.trim(), password: password.trim() });
            const apiAccessToken = token.access_token;
            setCustomerToken(apiAccessToken);

            if (pets[0]) {
                await savePetProfileSmart(pets[0], apiAccessToken);
            }
            const savedPets = (await loadPetProfilesSmart(apiAccessToken).catch(() => null)) || pets;

            login({
                apiUserId: apiUser.id,
                apiAccessToken,
                name: apiUser.name || name.trim() || "댕다방 회원",
                email: apiUser.email,
                phone: phone.trim(),
                joinedAt: new Date().toISOString(),
                pets: savedPets,
            });
            router.push("/mypage");
        } catch (err) {
            setCustomerToken();
            setError(customerApiErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="mx-auto max-w-2xl px-4 py-10">
            <h1 className="text-3xl font-black tracking-tight text-neutral-950">회원가입</h1>
            <SocialAuthButtons mode="signup" />
            <form onSubmit={submit} className="surface mt-6 grid gap-4 p-5">
                {!ddbApiReady() && (
                    <p className="rounded-md bg-amber-50 px-3 py-2 text-sm font-bold leading-6 text-amber-800">
                        운영 API와 OAuth 설정이 연결되면 이메일 가입과 간편가입이 활성화됩니다.
                    </p>
                )}
                {error && (
                    <p className="rounded-md bg-rose-50 px-3 py-2 text-sm font-bold leading-6 text-rose-700">
                        {error}
                    </p>
                )}
                <div className="grid gap-4 md:grid-cols-2">
                    <label>
                        <span className="mb-1 block text-xs font-black text-neutral-500">이름</span>
                        <input value={name} onChange={(event) => setName(event.target.value)} className="input" required autoComplete="name" />
                    </label>
                    <label>
                        <span className="mb-1 block text-xs font-black text-neutral-500">이메일</span>
                        <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="input" required autoComplete="email" />
                    </label>
                </div>
                <label>
                    <span className="mb-1 block text-xs font-black text-neutral-500">휴대폰</span>
                    <input value={phone} onChange={(event) => setPhone(event.target.value)} className="input" autoComplete="tel" />
                </label>
                <label>
                    <span className="mb-1 block text-xs font-black text-neutral-500">비밀번호</span>
                    <input
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        className="input"
                        minLength={8}
                        autoComplete="new-password"
                        placeholder="서버 계정 연동 시 8자 이상"
                    />
                </label>
                <div className="grid gap-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                    <div className="grid gap-4 md:grid-cols-[120px_1fr]">
                        <label className="block">
                            <span className="mb-1 block text-xs font-black text-neutral-500">사진</span>
                            <span className="grid aspect-square cursor-pointer place-items-center overflow-hidden rounded-md border border-dashed border-neutral-300 bg-white text-neutral-400 hover:border-indigo-300">
                                {petPhotoDataUrl ? (
                                    <img src={petPhotoDataUrl} alt="반려견 사진" className="h-full w-full object-cover" />
                                ) : (
                                    <i className="fa-solid fa-camera text-2xl" />
                                )}
                                <input type="file" accept="image/*" className="hidden" onChange={(event) => handlePetPhoto(event.target.files?.[0])} />
                            </span>
                            {photoLoading && <span className="mt-2 block text-xs font-black text-indigo-700">사진 준비 중</span>}
                            {photoError && <span className="mt-2 block text-xs font-black text-rose-600">{photoError}</span>}
                        </label>
                        <div className="grid gap-4 md:grid-cols-2">
                            <label>
                                <span className="mb-1 block text-xs font-black text-neutral-500">반려견 이름</span>
                                <input value={petName} onChange={(event) => setPetName(event.target.value)} className="input" />
                            </label>
                            <label>
                                <span className="mb-1 block text-xs font-black text-neutral-500">나이</span>
                                <input value={petAge} onChange={(event) => setPetAge(event.target.value)} className="input" />
                            </label>
                            <label>
                                <span className="mb-1 block text-xs font-black text-neutral-500">크기</span>
                                <select value={petSize} onChange={(event) => setPetSize(event.target.value as PetProfile["size"])} className="input">
                                    <option value="small">소형</option>
                                    <option value="medium">중형</option>
                                    <option value="large">대형</option>
                                </select>
                            </label>
                            <label>
                                <span className="mb-1 block text-xs font-black text-neutral-500">모질</span>
                                <select value={petCoat} onChange={(event) => setPetCoat(event.target.value as PetProfile["coat"])} className="input">
                                    <option value="short">단모</option>
                                    <option value="medium">중모</option>
                                    <option value="long">장모</option>
                                </select>
                            </label>
                            <label className="md:col-span-2">
                                <span className="mb-1 block text-xs font-black text-neutral-500">활동량</span>
                                <select value={petActivity} onChange={(event) => setPetActivity(event.target.value as PetProfile["activity"])} className="input">
                                    <option value="low">차분한 편</option>
                                    <option value="normal">보통 활동량</option>
                                    <option value="high">활동량 많음</option>
                                </select>
                            </label>
                        </div>
                    </div>
                    <div>
                        <span className="mb-2 block text-xs font-black text-neutral-500">관심 케어</span>
                        <div className="flex flex-wrap gap-2">
                            {CONCERN_OPTIONS.map((concern) => {
                                const checked = petConcerns.includes(concern);
                                return (
                                    <label
                                        key={concern}
                                        className={[
                                            "inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-xs font-black",
                                            checked
                                                ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                                                : "border-neutral-200 bg-white text-neutral-700",
                                        ].join(" ")}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => toggleConcern(concern)}
                                            className="h-3.5 w-3.5 accent-indigo-600"
                                        />
                                        {concern}
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                </div>
                <section className="grid gap-3 rounded-lg border border-neutral-200 bg-white p-4">
                    <h2 className="text-sm font-black text-neutral-950">필수 동의</h2>
                    <label className="flex items-start gap-3 text-sm font-bold leading-6 text-neutral-700">
                        <input
                            type="checkbox"
                            checked={agreeTerms}
                            onChange={(event) => setAgreeTerms(event.target.checked)}
                            className="mt-1 h-4 w-4 accent-indigo-600"
                        />
                        <span>
                            <b className="font-black text-neutral-950">[필수] 이용약관에 동의합니다.</b>{" "}
                            <Link href="/terms" className="font-black text-indigo-700">
                                보기
                            </Link>
                        </span>
                    </label>
                    <label className="flex items-start gap-3 text-sm font-bold leading-6 text-neutral-700">
                        <input
                            type="checkbox"
                            checked={agreePrivacy}
                            onChange={(event) => setAgreePrivacy(event.target.checked)}
                            className="mt-1 h-4 w-4 accent-indigo-600"
                        />
                        <span>
                            <b className="font-black text-neutral-950">[필수] 개인정보 수집·이용에 동의합니다.</b>{" "}
                            <Link href="/privacy" className="font-black text-indigo-700">
                                보기
                            </Link>
                        </span>
                    </label>
                    <p className="text-xs font-bold leading-5 text-neutral-500">
                        회원가입과 PetLens 개인화 제공에 필요한 최소 정보만 처리합니다.
                    </p>
                </section>
                <button type="submit" className="btn btn-primary w-full" disabled={photoLoading || loading}>
                    <i className="fa-solid fa-user-plus text-xs" />
                    {loading ? "가입 처리 중" : "가입하기"}
                </button>
            </form>
            <p className="mt-5 text-center text-sm font-bold text-neutral-600">
                이미 계정이 있다면{" "}
                <Link href="/auth/login" className="font-black text-indigo-700">
                    로그인
                </Link>
            </p>
        </main>
    );
}
