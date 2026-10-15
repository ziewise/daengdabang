"use client";

/**
 * 스티커북 시안 — 버튼 시안 모음(/app/sticker/buttons) · 로컬 확인용, 배포 X
 * ---------------------------------------------------------------------
 * 지금의 말랑한 3D 사탕 버튼(광택 · 두께)은 종이 질감의 스티커북과 재질이 달라 보여,
 * 다꾸(다이어리 꾸미기) 재료에서 모양을 가져온 버튼 "세트" 3가지를 비교한다. 세트마다 주요 · 보조 · 작은 버튼이 한 벌.
 *  0) 지금 버튼(비교용)
 *  1) 구름 씰스티커 — 시안 3 머리의 구름처럼 위아래가 몽글몽글한 씰스티커 + 흰 칼선(다이컷) + 작은 하트 스티커.
 *     누르면 종이에서 살짝 들렸다가 통 하고 다시 붙음
 *  2) 자수 와펜 — 댕다방 옷에 붙는 자수 패치처럼 새틴 테두리 + 안쪽 바느질 땀 + 천 결.
 *     천이라서 누르면 폭신하게 꺼짐(들리지 않음)
 *  3) 라벨 스티커 — 양 끝이 반달로 파인 이름표 라벨 + 왼쪽 아이콘 칸 절취선 + 발바닥 미니 스티커.
 *     누르면 왼쪽을 축으로 오른쪽 끝이 살짝 떼어짐
 *  공통) 잉크 도장 — 완료 · 신청 같은 확정 동작(누르면 쾅)
 * 휴대폰 손가락 기준: 누름 표시는 포인터 이벤트로(hover 없음). 진동은 지원 기기에서만.
 */

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { haptic } from "../gestures";
import { KIT_CSS, Squishy, TEXT, TEXT_SOFT } from "../kit";
import { HC_CSS } from "../shared";
import { DiaryBody, PARTS_CSS, SectionLabel } from "../sticker-parts";
import { STICKER_CSS } from "../sticker-kit";

type Vars = Record<string, string>;

/** 누름 상태를 포인터로 직접 — 휴대폰에서도 확실하게 */
function Press({ className, style, children, onTap, btnRef }: { className: string; style?: CSSProperties; children: ReactNode; onTap?: () => void; btnRef?: React.Ref<HTMLButtonElement> }) {
    const [down, setDown] = useState(false);
    return (
        <button ref={btnRef} type="button" className={`${className} ${down ? "is-down" : ""}`} style={style}
            onPointerDown={() => { setDown(true); haptic("light"); }}
            onPointerUp={() => { setDown(false); onTap?.(); }}
            onPointerLeave={() => setDown(false)} onPointerCancel={() => setDown(false)}>
            {children}
        </button>
    );
}

/**
 * 구름 모양 — 버튼 크기에 맞춰 알약 몸통 + 위아래 크고 작은 혹(원)을 번갈아 배치.
 * 같은 도형을 두 번 그림: 아래는 굵은 칼선 색 외곽선, 위는 면색 → 합쳐진 모양 둘레로 흰 칼선이 생김
 */
function cloudShapes(w: number, h: number) {
    const r = h / 2;
    const span = w - h; // 양 끝 반원 중심 사이 거리
    const n = Math.max(2, Math.round(span / (h * 0.42)));
    const out: { cx: number; cy: number; r: number }[] = [{ cx: r, cy: r, r }, { cx: w - r, cy: r, r }];
    for (let i = 0; i <= n; i += 1) {
        const x = r + (span * i) / n;
        const big = i % 2 === 0;
        // 위는 큰 혹 · 작은 혹 번갈아, 아래는 반대로 → 몽글몽글 고르지 않은 구름
        out.push({ cx: x, cy: h * 0.2, r: h * (big ? 0.3 : 0.24) });
        out.push({ cx: x + span / n / 2, cy: h * 0.8, r: h * (big ? 0.24 : 0.3) });
    }
    return out.map((c) => ({ cx: Math.round(c.cx * 100) / 100, cy: Math.round(c.cy * 100) / 100, r: Math.round(c.r * 100) / 100 }));
}

/** 1) 구름 씰스티커 — fill 면색 · ink 글씨 · cut 칼선(테두리)색 */
function CloudBtn({ children, fill, ink = "#fff", cut = "#fff", icon, small = false, rot = -1, heart = false }: { children: ReactNode; fill: string; ink?: string; cut?: string; icon?: string; small?: boolean; rot?: number; heart?: boolean }) {
    const ref = useRef<HTMLButtonElement>(null);
    const [size, setSize] = useState<[number, number] | null>(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        // 버튼 크기가 바뀌면(화면 회전 등) 구름을 다시 그림
        const ro = new ResizeObserver(() => setSize([el.offsetWidth, el.offsetHeight]));
        ro.observe(el);
        return () => ro.disconnect();
    }, []);
    const shapes = size ? cloudShapes(size[0], size[1]) : [];
    const body = size ? <rect x={size[1] / 2} y={0} width={size[0] - size[1]} height={size[1]} /> : null;
    return (
        <Press btnRef={ref} className={`sb-cloud ah-display ${small ? "is-small" : ""} ${size ? "" : "is-pending"}`} style={{ "--fill": fill, "--ink": ink, "--cut": cut, "--rot": `${rot}deg` } as Vars}>
            {size ? (
                <svg aria-hidden="true" className="sb-cloud-svg" viewBox={`-8 -8 ${size[0] + 16} ${size[1] + 16}`} style={{ left: -8, top: -8, width: size[0] + 16, height: size[1] + 16 }}>
                    {/* 칼선: 같은 도형을 굵은 외곽선으로 먼저 */}
                    <g fill={cut} stroke={cut} strokeWidth={small ? 7 : 8} strokeLinejoin="round">{body}{shapes.map((c, i) => <circle key={i} {...c} />)}</g>
                    {/* 면 */}
                    <g fill={fill}>{body}{shapes.map((c, i) => <circle key={i} {...c} />)}</g>
                </svg>
            ) : null}
            <span className="sb-cloud-txt">{children}{icon ? <i aria-hidden="true" className={`fa-solid ${icon} text-[0.85em]`} /> : null}</span>
            {/* 귀퉁이에 겹쳐 붙인 작은 하트 스티커 */}
            {heart ? <span aria-hidden="true" className="sb-mini" style={{ right: "6%", top: "-14px", rotate: "14deg", color: "#ff7aa0" }}><i className="fa-solid fa-heart" /></span> : null}
        </Press>
    );
}

/** 2) 자수 와펜 — fill 천색 · edge/edge2 새틴 테두리 실 두 가닥 · stitch 바느질 땀 색 */
function PatchBtn({ children, fill, ink = "#fff", edge, edge2, stitch = "rgba(255,255,255,.75)", icon, small = false }: { children: ReactNode; fill: string; ink?: string; edge: string; edge2: string; stitch?: string; icon?: string; small?: boolean }) {
    return (
        <Press className={`sb-patch ah-display ${small ? "is-small" : ""}`} style={{ "--fill": fill, "--ink": ink, "--edge": edge, "--edge2": edge2, "--stitch": stitch } as Vars}>
            <span className="sb-patch-face">
                <span className="relative inline-flex items-center gap-2">{children}{icon ? <i aria-hidden="true" className={`fa-solid ${icon} text-[0.85em]`} /> : null}</span>
            </span>
        </Press>
    );
}

/** 3) 라벨 스티커 — 왼쪽 아이콘 칸(절취선) + 글씨 칸, 양 끝 반달 홈 */
function LabelBtn({ children, fill, ink = "#fff", perf = "rgba(255,255,255,.7)", icon, small = false, paw = false }: { children: ReactNode; fill: string; ink?: string; perf?: string; icon: string; small?: boolean; paw?: boolean }) {
    return (
        <Press className={`sb-label ah-display ${small ? "is-small" : ""}`} style={{ "--fill": fill, "--ink": ink, "--perf": perf } as Vars}>
            <span className="sb-label-body">
                <span className="sb-label-stub"><i aria-hidden="true" className={`fa-solid ${icon}`} /></span>
                <span className="sb-label-txt">{children}</span>
            </span>
            {/* 오른쪽 위에 겹쳐 붙인 발바닥 미니 스티커 */}
            {paw ? <span aria-hidden="true" className="sb-mini" style={{ right: "-6px", top: "-11px", rotate: "-16deg", color: "#f2a33a" }}><i className="fa-solid fa-paw" /></span> : null}
        </Press>
    );
}

/** 공통) 잉크 도장 버튼 — 누르면 쾅, 한 번 더 누르면 처음으로 */
function StampBtn({ children, done, color = "#e0557f" }: { children: ReactNode; done: string; color?: string }) {
    const [on, setOn] = useState(false);
    return (
        <Press className={`sb-stamp ah-display ${on ? "is-on" : ""}`} style={{ "--c": color } as Vars} onTap={() => { setOn((v) => !v); if (!on) haptic("medium"); }}>
            <span key={String(on)} className={on ? "sb-stamp-in" : ""}>{on ? done : children}</span>
        </Press>
    );
}

/** 세트별 실제 자리 예시 카드(동네 돌봄 찾기) */
function Spot({ children }: { children: ReactNode }) {
    return (
        <div className="mt-4 rounded-[14px] bg-white/70 px-3.5 pb-5 pt-3 shadow-[inset_0_0_0_1.5px_#f3e3da]">
            <p className="ah-light text-center text-[11.5px]" style={{ color: TEXT_SOFT }}>실제 자리 · 동네 돌봄 찾기</p>
            {children}
        </div>
    );
}

export default function StickerButtons() {
    return (
        <div className="relative isolate flex-1 overflow-x-hidden break-keep px-3.5 pb-12 pt-4" style={{ color: TEXT }}>
            <style>{KIT_CSS + HC_CSS + STICKER_CSS + PARTS_CSS + BTN_CSS}</style>
            <div aria-hidden="true" className="ah-bg pointer-events-none fixed inset-0 -z-10" />
            <div className="mx-auto w-full max-w-md">
                <p className="ah-display mb-3 text-center text-[13px]" style={{ color: TEXT_SOFT }}>직접 눌러 보세요 · 세트마다 누르는 느낌이 달라요</p>
                <DiaryBody pageKey="buttons" dir={1}>
                    {/* 0) 지금 */}
                    <SectionLabel>지금 버튼 (비교용)</SectionLabel>
                    <p className="ah-light mt-1 text-[12px]" style={{ color: TEXT_SOFT }}>말랑한 3D 사탕 · 광택과 두께가 있는 플라스틱 질감</p>
                    <div className="mt-3"><Squishy><span className="relative">현재 위치로 병원 찾기</span><i aria-hidden="true" className="fa-solid fa-location-crosshairs relative text-[14px]" /></Squishy></div>

                    {/* 1) 구름 씰스티커 */}
                    <SectionLabel className="mt-9" icon="fa-cloud">1. 구름 씰스티커</SectionLabel>
                    <p className="ah-light mt-1 text-[12px]" style={{ color: TEXT_SOFT }}>홈 구름처럼 몽글몽글 · 흰 칼선 · 누르면 들렸다가 통 붙어요</p>
                    <div className="mt-5"><CloudBtn fill="#f47aa0" icon="fa-location-crosshairs" heart>현재 위치로 병원 찾기</CloudBtn></div>
                    <div className="mt-5"><CloudBtn fill="#fff" ink="#d2457a" cut="#ffd3e0" rot={0.8}>지난주 기록 보기</CloudBtn></div>
                    <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-4">
                        <CloudBtn fill="#86d6b1" small rot={-1.5} icon="fa-location-dot">돌봄 찾기</CloudBtn>
                        <CloudBtn fill="#a993f2" small rot={1.2} icon="fa-envelope">소식 받기</CloudBtn>
                        <CloudBtn fill="#f6b84e" small rot={1} icon="fa-paw">로그인</CloudBtn>
                        <CloudBtn fill="#86b9f2" small rot={-1.2} icon="fa-camera">사진 올리기</CloudBtn>
                    </div>
                    <Spot>
                        <div className="mt-4"><CloudBtn fill="#f47aa0" icon="fa-location-crosshairs">현재 위치로 병원 찾기</CloudBtn></div>
                        <div className="mt-4 grid grid-cols-2 gap-3">
                            <CloudBtn fill="#fff" ink="#1f9e75" cut="#cdeedd" small rot={-1}>지도에서 보기</CloudBtn>
                            <CloudBtn fill="#fff" ink="#7457d8" cut="#e3daff" small rot={1}>케어톡에 묻기</CloudBtn>
                        </div>
                    </Spot>

                    {/* 2) 자수 와펜 */}
                    <SectionLabel className="mt-9" icon="fa-shirt">2. 자수 와펜</SectionLabel>
                    <p className="ah-light mt-1 text-[12px]" style={{ color: TEXT_SOFT }}>강아지 옷에 붙는 자수 패치 · 새틴 테두리와 바느질 땀 · 누르면 폭신하게 꺼져요</p>
                    <div className="mt-4"><PatchBtn fill="#f2789d" edge="#d9547d" edge2="#ea6d93" icon="fa-location-crosshairs">현재 위치로 병원 찾기</PatchBtn></div>
                    <div className="mt-4"><PatchBtn fill="#fff6ee" ink="#c4456f" edge="#f4a9bf" edge2="#f8c3d2" stitch="rgba(226,107,145,.55)">지난주 기록 보기</PatchBtn></div>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                        <PatchBtn fill="#7fcfa9" edge="#4fae84" edge2="#68c299" small icon="fa-location-dot">돌봄 찾기</PatchBtn>
                        <PatchBtn fill="#a68ff0" edge="#7f66d8" edge2="#957de6" small icon="fa-envelope">소식 받기</PatchBtn>
                        <PatchBtn fill="#f5b445" edge="#d99520" edge2="#e8a838" small icon="fa-paw">로그인</PatchBtn>
                        <PatchBtn fill="#82b5f0" edge="#5a93d6" edge2="#71a6e6" small icon="fa-camera">사진 올리기</PatchBtn>
                    </div>
                    <Spot>
                        <div className="mt-3"><PatchBtn fill="#f2789d" edge="#d9547d" edge2="#ea6d93" icon="fa-location-crosshairs">현재 위치로 병원 찾기</PatchBtn></div>
                        <div className="mt-3 grid grid-cols-2 gap-3">
                            <PatchBtn fill="#f2fbf6" ink="#1f8a66" edge="#9edcbf" edge2="#bde8d3" stitch="rgba(31,138,102,.45)" small>지도에서 보기</PatchBtn>
                            <PatchBtn fill="#f7f3ff" ink="#6448c8" edge="#c6b6f6" edge2="#d9cdfa" stitch="rgba(100,72,200,.45)" small>케어톡에 묻기</PatchBtn>
                        </div>
                    </Spot>

                    {/* 3) 라벨 스티커 */}
                    <SectionLabel className="mt-9" icon="fa-tag">3. 라벨 스티커</SectionLabel>
                    <p className="ah-light mt-1 text-[12px]" style={{ color: TEXT_SOFT }}>이름표 라벨 · 아이콘 칸 절취선 · 누르면 오른쪽 끝이 살짝 떼어져요</p>
                    <div className="mt-5"><LabelBtn fill="#f47aa0" icon="fa-location-crosshairs" paw>현재 위치로 병원 찾기</LabelBtn></div>
                    <div className="mt-4"><LabelBtn fill="#fff" ink="#d2457a" perf="rgba(226,107,145,.5)" icon="fa-book-open">지난주 기록 보기</LabelBtn></div>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                        <LabelBtn fill="#86d6b1" small icon="fa-location-dot">돌봄 찾기</LabelBtn>
                        <LabelBtn fill="#a993f2" small icon="fa-envelope">소식 받기</LabelBtn>
                        <LabelBtn fill="#f6b84e" small icon="fa-paw">로그인</LabelBtn>
                        <LabelBtn fill="#86b9f2" small icon="fa-camera">사진 올리기</LabelBtn>
                    </div>
                    <Spot>
                        <div className="mt-4"><LabelBtn fill="#f47aa0" icon="fa-location-crosshairs">현재 위치로 병원 찾기</LabelBtn></div>
                        <div className="mt-3 grid grid-cols-2 gap-3">
                            <LabelBtn fill="#fff" ink="#1f8a66" perf="rgba(31,138,102,.4)" small icon="fa-map">지도에서 보기</LabelBtn>
                            <LabelBtn fill="#fff" ink="#6448c8" perf="rgba(100,72,200,.4)" small icon="fa-comment-dots">케어톡에 묻기</LabelBtn>
                        </div>
                    </Spot>

                    {/* 공통) 잉크 도장 */}
                    <SectionLabel className="mt-9" icon="fa-stamp">공통 · 잉크 도장 (확정 동작)</SectionLabel>
                    <p className="ah-light mt-1 text-[12px]" style={{ color: TEXT_SOFT }}>어느 세트와도 같이 써요 · 완료 · 신청처럼 한 번 찍고 끝나는 동작</p>
                    <div className="mt-4 flex flex-wrap items-center gap-4">
                        <StampBtn done="신청 완료!">소식 받기</StampBtn>
                        <StampBtn done="출근 완료!" color="#1f9e75">출근하기</StampBtn>
                        <StampBtn done="골랐어요!" color="#d9822b">이 굿즈 고르기</StampBtn>
                    </div>
                </DiaryBody>
            </div>
        </div>
    );
}

/* 버튼 시안 CSS */
const BTN_CSS = `
/* 공통: 귀퉁이에 겹쳐 붙인 작은 다이컷 스티커(하트 · 발바닥) */
.sb-mini { position: absolute; z-index: 2; display: grid; place-items: center; width: 26px; height: 26px; border-radius: 999px; background: #fff; font-size: 12px;
  box-shadow: 0 0 0 1px rgba(200,160,150,.25), 0 3px 5px -2px rgba(120,60,70,.35); pointer-events: none; }

/* 1) 구름 씰스티커 — 모양은 SVG(칼선 + 면), 여기선 크기 · 그림자 · 누름만 */
.sb-cloud { position: relative; display: flex; width: 100%; height: 48px; align-items: center; justify-content: center; margin: 8px 0;
  color: var(--ink); font-size: 16.5px; rotate: var(--rot);
  transition: transform .5s cubic-bezier(.3,1.7,.45,1), rotate .3s; -webkit-tap-highlight-color: transparent; }
.sb-cloud.is-small { height: 38px; font-size: 14px; margin: 6px 0; }
/* 크기를 재기 전(첫 그림) 잠깐은 알약으로 */
.sb-cloud.is-pending { border-radius: 999px; background: var(--fill); }
.sb-cloud-svg { position: absolute; overflow: visible; pointer-events: none;
  filter: drop-shadow(0 0 .6px rgba(170,120,115,.6)) drop-shadow(0 5px 4px rgba(120,60,70,.2)); transition: filter .25s; }
.sb-cloud-txt { position: relative; z-index: 1; display: inline-flex; align-items: center; gap: 8px; }
/* 누르면 종이에서 들림(그림자 멀어짐) → 놓으면 탄성으로 다시 붙음 */
.sb-cloud.is-down { transform: translateY(-5px) scale(1.04); rotate: 0deg; transition-duration: .14s; }
.sb-cloud.is-down .sb-cloud-svg { filter: drop-shadow(0 0 .6px rgba(170,120,115,.6)) drop-shadow(0 14px 9px rgba(120,60,70,.24)); }

/* 2) 자수 와펜 — 바깥(새틴 실 테두리 사선 결) + 안쪽 천(가로세로 결) + 바느질 땀(점선) */
.sb-patch { display: block; width: 100%; padding: 4px; border-radius: 999px;
  background: repeating-linear-gradient(72deg, var(--edge) 0 2px, var(--edge2) 2px 3.4px);
  box-shadow: 0 0 0 1px rgba(0,0,0,.06), 0 7px 9px -6px rgba(110,60,60,.45), inset 0 1px 0 rgba(255,255,255,.35);
  transition: transform .45s cubic-bezier(.3,1.6,.5,1), box-shadow .25s; -webkit-tap-highlight-color: transparent; }
.sb-patch-face { position: relative; display: flex; height: 46px; align-items: center; justify-content: center; border-radius: 999px; color: var(--ink); font-size: 16px;
  text-shadow: 0 1px 0 rgba(0,0,0,.13);
  background: repeating-linear-gradient(0deg, rgba(255,255,255,.07) 0 1px, transparent 1px 3px),
              repeating-linear-gradient(90deg, rgba(0,0,0,.035) 0 1px, transparent 1px 3px), var(--fill);
  box-shadow: inset 0 0 0 1px rgba(0,0,0,.05); transition: box-shadow .25s; }
/* 바느질 땀 — 테두리 안쪽을 따라 한 바퀴 */
.sb-patch-face::after { content: ""; position: absolute; inset: 4px; border-radius: 999px; border: 2px dashed var(--stitch); pointer-events: none; }
.sb-patch.is-small { padding: 3px; }
.sb-patch.is-small .sb-patch-face { height: 38px; font-size: 13.5px; }
.sb-patch.is-small .sb-patch-face::after { inset: 3px; border-width: 1.5px; }
/* 천이라 누르면 폭신하게 꺼짐 — 작아지고 안쪽 그늘 */
.sb-patch.is-down { transform: scale(.96); transition-duration: .12s; box-shadow: 0 0 0 1px rgba(0,0,0,.06), 0 3px 4px -3px rgba(110,60,60,.45); }
.sb-patch.is-down .sb-patch-face { box-shadow: inset 0 3px 8px rgba(0,0,0,.16); }

/* 3) 라벨 스티커 — 양 끝 반달 홈(마스크) · 흰 칼선(겹친 그림자) · 왼쪽 아이콘 칸 절취선 */
.sb-label { position: relative; display: block; width: 100%; transform-origin: 8% 50%;
  filter: drop-shadow(2.5px 0 0 #fff) drop-shadow(-2.5px 0 0 #fff) drop-shadow(0 2.5px 0 #fff) drop-shadow(0 -2.5px 0 #fff)
          drop-shadow(0 0 .6px rgba(170,120,115,.55)) drop-shadow(0 6px 5px rgba(120,60,70,.2));
  transition: transform .5s cubic-bezier(.3,1.7,.45,1), filter .25s; -webkit-tap-highlight-color: transparent; }
.sb-label-body { display: flex; height: 50px; align-items: stretch; border-radius: 12px; background: var(--fill); color: var(--ink); font-size: 16px;
  -webkit-mask: radial-gradient(circle 8px at 0 50%, #0000 96%, #000) 0 0 / 51% 100% no-repeat, radial-gradient(circle 8px at 100% 50%, #0000 96%, #000) 100% 0 / 51% 100% no-repeat;
          mask: radial-gradient(circle 8px at 0 50%, #0000 96%, #000) 0 0 / 51% 100% no-repeat, radial-gradient(circle 8px at 100% 50%, #0000 96%, #000) 100% 0 / 51% 100% no-repeat; }
.sb-label-stub { display: grid; width: 54px; place-items: center; border-right: 2px dashed var(--perf); font-size: 15px; }
.sb-label-txt { display: flex; flex: 1; align-items: center; justify-content: center; padding-right: 12px; }
.sb-label.is-small .sb-label-body { height: 42px; font-size: 13.5px; border-radius: 10px;
  -webkit-mask: radial-gradient(circle 6px at 0 50%, #0000 96%, #000) 0 0 / 51% 100% no-repeat, radial-gradient(circle 6px at 100% 50%, #0000 96%, #000) 100% 0 / 51% 100% no-repeat;
          mask: radial-gradient(circle 6px at 0 50%, #0000 96%, #000) 0 0 / 51% 100% no-repeat, radial-gradient(circle 6px at 100% 50%, #0000 96%, #000) 100% 0 / 51% 100% no-repeat; }
.sb-label.is-small .sb-label-stub { width: 36px; font-size: 12.5px; border-right-width: 1.5px; }
.sb-label.is-small .sb-label-txt { padding-right: 8px; }
/* 누르면 왼쪽을 축으로 오른쪽 끝이 들림(떼어지는 느낌) */
.sb-label.is-down { transform: rotate(-2.2deg) translateY(-3px) scale(1.02); transition-duration: .14s;
  filter: drop-shadow(2.5px 0 0 #fff) drop-shadow(-2.5px 0 0 #fff) drop-shadow(0 2.5px 0 #fff) drop-shadow(0 -2.5px 0 #fff)
          drop-shadow(0 0 .6px rgba(170,120,115,.55)) drop-shadow(4px 12px 8px rgba(120,60,70,.24)); }

/* 공통) 잉크 도장 — 이중 원 · 누르면 쾅 + 잉크 번짐 */
.sb-stamp { display: inline-grid; place-items: center; min-width: 96px; min-height: 96px; padding: 10px; border-radius: 999px; color: var(--c); font-size: 15px; line-height: 1.15;
  border: 3px solid var(--c); outline: 1.5px solid var(--c); outline-offset: -8px; background: rgba(255,255,255,.5); rotate: -8deg;
  transition: transform .35s cubic-bezier(.3,1.6,.5,1), background .3s; -webkit-tap-highlight-color: transparent; }
.sb-stamp.is-down { transform: scale(.92); transition-duration: .1s; }
.sb-stamp.is-on { background: color-mix(in srgb, var(--c) 14%, white); animation: sb-thud .5s cubic-bezier(.2,1.4,.4,1); }
.sb-stamp-in { display: inline-block; animation: hc-slam .5s cubic-bezier(.2,1.4,.4,1) both; }
@keyframes sb-thud { 0% { transform: scale(1.35); } 55% { transform: scale(.94); } 100% { transform: scale(1); } }
@media (prefers-reduced-motion: reduce) { .sb-cloud, .sb-patch, .sb-label, .sb-stamp { transition: none; } .sb-stamp.is-on, .sb-stamp-in { animation: none; } }
`;
