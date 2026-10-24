"use client";

/**
 * 마이페이지 배송지 관리
 * 앱: 목록 + 아래 입력 칸(원래 그대로).
 * 웹(2026-10-24 사용자): 저장된 배송지 카드만 보이고(카드마다 수정 · 기본으로 · 삭제), 머리 띠의 "배송지 추가" · 카드 "수정"을 누르면
 *   같은 창(AddressModal — 주소 검색으로 우편번호까지 채움)이 열림. 저장 · 수정 · 삭제 · 기본 지정은 아래 함수 그대로.
 *   아래 입력 칸은 웹에서 숨김(app/mypage-web.css "배송지 관리").
 */
import { FormEvent, useCallback, useEffect, useState } from "react";
import MypageSectionLayout, { MypageLoginGate } from "@/components/mypage/MypageSectionLayout";
import AddressModal from "@/components/mypage/AddressModal";
import { usePetModalHost } from "@/components/mypage/PetProfileModal";
import {
    createCustomerAddress,
    deleteCustomerAddress,
    DdbApiError,
    getCustomerToken,
    loadCustomerAddresses,
    setDefaultCustomerAddress,
    updateCustomerAddress,
    type CustomerAddress,
    type CustomerAddressInput,
} from "@/lib/customer-api";
import { useAuth } from "@/lib/store";

const EMPTY_ADDRESS: CustomerAddressInput = {
    label: "집",
    recipientName: "",
    phone: "",
    postalCode: "",
    addressLine1: "",
    addressLine2: "",
    isDefault: false,
};

export default function MypageAddressPage() {
    const { user } = useAuth();
    const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
    const [form, setForm] = useState<CustomerAddressInput>(EMPTY_ADDRESS);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleteCandidate, setDeleteCandidate] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState("");
    const [feedback, setFeedback] = useState("");
    // 웹 배송지 창(추가 · 수정 같은 창) — 앱은 열리지 않음
    const [modalOpen, setModalOpen] = useState(false);
    const modalHost = usePetModalHost(modalOpen);
    const token = user?.apiAccessToken || getCustomerToken();

    const refresh = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        setError("");
        try {
            setAddresses(await loadCustomerAddresses(token));
        } catch (caught) {
            setError(caught instanceof DdbApiError
                ? caught.message
                : "배송지 목록을 불러오지 못했습니다.");
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        const timer = window.setTimeout(() => void refresh(), 0);
        return () => window.clearTimeout(timer);
    }, [refresh]);
    if (!user) return <MypageLoginGate redirect="/mypage/address/" />;

    const update = <K extends keyof CustomerAddressInput>(key: K, value: CustomerAddressInput[K]) => {
        setForm((current) => ({ ...current, [key]: value }));
        setError("");
        setFeedback("");
    };
    const resetForm = () => {
        setEditingId(null);
        setForm(EMPTY_ADDRESS);
    };
    const isWebScreen = () => !document.documentElement.classList.contains("ddb-app-mode");
    const openAdd = () => {
        resetForm();
        setError("");
        setFeedback("");
        setModalOpen(true);
    };
    const closeModal = () => {
        setModalOpen(false);
        resetForm();
        setError("");
    };
    const startEdit = (address: CustomerAddress) => {
        setEditingId(address.id);
        setForm({
            label: address.label,
            recipientName: address.recipientName,
            phone: address.phone,
            postalCode: address.postalCode,
            addressLine1: address.addressLine1,
            addressLine2: address.addressLine2,
            isDefault: address.isDefault,
        });
        setFeedback("");
        setError("");
        if (isWebScreen()) {
            setModalOpen(true);
            return;
        }
        document.getElementById("address-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!token || pending) return;
        setPending(true);
        setError("");
        try {
            if (editingId) {
                await updateCustomerAddress(editingId, form, token);
                setFeedback("배송지를 수정했습니다.");
            } else {
                await createCustomerAddress(form, token);
                setFeedback("배송지를 안전하게 저장했습니다.");
            }
            resetForm();
            setModalOpen(false);
            await refresh();
        } catch (caught) {
            setError(caught instanceof DdbApiError
                ? caught.message
                : "배송지를 저장하지 못했습니다. 입력값을 확인해 주세요.");
        } finally {
            setPending(false);
        }
    };
    const makeDefault = async (addressId: string) => {
        if (!token || pending) return;
        setPending(true);
        try {
            await setDefaultCustomerAddress(addressId, token);
            setFeedback("기본 배송지를 변경했습니다.");
            await refresh();
        } catch (caught) {
            setError(caught instanceof DdbApiError ? caught.message : "기본 배송지를 변경하지 못했습니다.");
        } finally {
            setPending(false);
        }
    };
    const remove = async (addressId: string) => {
        if (!token || pending || deleteCandidate !== addressId) return;
        setPending(true);
        try {
            await deleteCustomerAddress(addressId, token);
            setDeleteCandidate(null);
            setFeedback("배송지를 삭제했습니다.");
            if (editingId === addressId) resetForm();
            await refresh();
        } catch (caught) {
            setError(caught instanceof DdbApiError ? caught.message : "배송지를 삭제하지 못했습니다.");
        } finally {
            setPending(false);
        }
    };

    return (
        <MypageSectionLayout
            eyebrow="MY 정보"
            title="배송지 관리"
            description="자주 쓰는 배송지를 최대 10개까지 암호화해 저장하고 기본 배송지를 지정합니다."
        >
            <div className="grid gap-5">
                <section className="surface p-5 sm:p-6" aria-labelledby="saved-address-heading" data-mp-card>
                    <div className="flex items-center justify-between gap-3" data-mp-band="mint" data-mp-art="home">
                        <div>
                            <h2 id="saved-address-heading" className="text-lg font-black text-neutral-950" data-mp-kicker="MY ADDRESS">저장된 배송지</h2>
                            <p className="mt-1 text-xs font-bold text-neutral-500">주소와 연락처는 서버에서 암호화해 보관합니다.</p>
                        </div>
                        <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-black text-neutral-600">{addresses.length}/10</span>
                        {/* 웹 전용 — 배송지 추가(창) */}
                        <button type="button" className="hidden" data-address-add onClick={openAdd} disabled={addresses.length >= 10}>
                            <i className="fa-solid fa-plus" aria-hidden="true" />배송지 추가
                        </button>
                    </div>

                    {/* 웹 전용 — 저장 · 삭제 · 기본 변경 결과 안내(앱은 아래 입력 칸에 표시) */}
                    {!modalOpen && (error || feedback) && <p className="hidden" data-address-status={error ? "error" : "ok"} role="status">{error || feedback}</p>}

                    {loading ? (
                        <p className="mt-5 text-sm font-bold text-neutral-500" role="status">배송지를 확인하고 있어요.</p>
                    ) : addresses.length === 0 ? (
                        <>
                            <div className="mt-5 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-5 text-sm font-bold text-neutral-600" data-address-empty>
                                저장된 배송지가 없습니다. 아래에서 첫 배송지를 추가해 주세요.
                            </div>
                            {/* 웹 전용 빈 상태 — 3D 집 그림 · 안내 · 첫 배송지 추가(창) */}
                            <div className="hidden" data-address-empty-web>
                                {/* eslint-disable-next-line @next/next/no-img-element -- 작은 3D 그림 */}
                                <img src="/images/ui/pet-home-96.webp" alt="" aria-hidden="true" />
                                <strong>아직 저장된 배송지가 없어요</strong>
                                <span>주소 검색으로 한 번만 저장해 두면 주문할 때 바로 불러와요.</span>
                                <button type="button" onClick={openAdd}><i className="fa-solid fa-plus" aria-hidden="true" />첫 배송지 추가</button>
                            </div>
                        </>
                    ) : (
                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                            {addresses.map((address) => (
                                <article key={address.id} className="rounded-2xl border border-neutral-200 p-4" data-address-card data-default={address.isDefault || undefined}>
                                    <div className="flex items-start justify-between gap-2">
                                        <h3 className="font-black text-neutral-950">{address.label}</h3>
                                        {address.isDefault && <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-black text-indigo-700">기본 배송지</span>}
                                    </div>
                                    <p className="mt-3 text-sm font-black text-neutral-800">{address.recipientName} · {address.phone}</p>
                                    <p className="mt-1 text-xs font-bold leading-5 text-neutral-600">[{address.postalCode}] {address.addressLine1} {address.addressLine2}</p>
                                    <div className="mt-4 flex flex-wrap gap-1.5">
                                        <button type="button" className="btn btn-secondary !px-3 !py-2 text-xs" onClick={() => startEdit(address)}>수정</button>
                                        {!address.isDefault && <button type="button" className="btn btn-secondary !px-3 !py-2 text-xs" disabled={pending} onClick={() => void makeDefault(address.id)}>기본으로</button>}
                                        {deleteCandidate === address.id ? (
                                            <>
                                                <button type="button" className="btn !bg-red-700 !px-3 !py-2 text-xs text-white" disabled={pending} onClick={() => void remove(address.id)}>정말 삭제</button>
                                                <button type="button" className="btn btn-secondary !px-3 !py-2 text-xs" onClick={() => setDeleteCandidate(null)}>취소</button>
                                            </>
                                        ) : (
                                            <button type="button" className="btn btn-secondary !px-3 !py-2 text-xs text-red-700" onClick={() => setDeleteCandidate(address.id)}>삭제</button>
                                        )}
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>

                <form id="address-editor" className="surface scroll-mt-24 p-5 sm:p-6" onSubmit={submit} data-mp-card>
                    <h2 className="text-lg font-black text-neutral-950" data-mp-band="yellow" data-mp-art="memo" data-mp-kicker="ADDRESS">{editingId ? "배송지 수정" : "새 배송지 추가"}</h2>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <AddressField label="배송지 이름" value={form.label} onChange={(value) => update("label", value)} maxLength={40} placeholder="집, 회사" />
                        <AddressField label="받는 분" value={form.recipientName} onChange={(value) => update("recipientName", value)} maxLength={50} autoComplete="shipping name" />
                        <AddressField label="연락처" value={form.phone} onChange={(value) => update("phone", value)} maxLength={20} autoComplete="shipping tel" placeholder="010-0000-0000" />
                        <AddressField label="우편번호" value={form.postalCode} onChange={(value) => update("postalCode", value)} maxLength={10} autoComplete="shipping postal-code" />
                        <div className="sm:col-span-2"><AddressField label="기본 주소" value={form.addressLine1} onChange={(value) => update("addressLine1", value)} maxLength={200} autoComplete="shipping address-line1" /></div>
                        <div className="sm:col-span-2"><AddressField label="상세 주소" value={form.addressLine2} onChange={(value) => update("addressLine2", value)} maxLength={200} autoComplete="shipping address-line2" required={false} /></div>
                    </div>
                    <label className="mt-4 flex items-center gap-2 text-sm font-bold text-neutral-700">
                        <input type="checkbox" checked={form.isDefault} onChange={(event) => update("isDefault", event.target.checked)} />
                        기본 배송지로 설정
                    </label>
                    {(error || feedback) && <p className={`mt-4 rounded-xl border px-4 py-3 text-sm font-bold ${error ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`} role="status">{error || feedback}</p>}
                    <div className="mt-5 flex flex-wrap gap-2">
                        <button type="submit" disabled={pending || addresses.length >= 10 && !editingId} className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-45">{pending ? "저장 중…" : editingId ? "수정 저장" : "배송지 저장"}</button>
                        {editingId && <button type="button" className="btn btn-secondary" onClick={resetForm}>수정 취소</button>}
                    </div>
                </form>
            </div>
            {modalHost && (
                <AddressModal
                    host={modalHost}
                    editing={Boolean(editingId)}
                    form={form}
                    onField={update}
                    onSubmit={submit}
                    onClose={closeModal}
                    pending={pending}
                    error={error}
                    saveDisabled={addresses.length >= 10 && !editingId}
                />
            )}
        </MypageSectionLayout>
    );
}

function AddressField({
    label,
    value,
    onChange,
    maxLength,
    autoComplete,
    placeholder,
    required = true,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    maxLength: number;
    autoComplete?: string;
    placeholder?: string;
    required?: boolean;
}) {
    return (
        <label className="block">
            <span className="mb-1.5 block text-xs font-black text-neutral-600">{label}{!required && <span className="font-bold text-neutral-400"> (선택)</span>}</span>
            <input className="input" value={value} onChange={(event) => onChange(event.target.value)} required={required} maxLength={maxLength} autoComplete={autoComplete} placeholder={placeholder} />
        </label>
    );
}
