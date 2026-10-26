/**
 * PetLensObservationSample — 행동·소리 분석 "결과 예시" 판(웹 연구소 페이지 전용 · 2026-10-23 사용자 선택 O1)
 * ---------------------------------------------------------------------
 * 촬영 전 화면에서 "분석하면 결과가 어떤 모양으로 나오는지"를 미리 보여 준다.
 *  - 실제 결과 화면(PetLensObservationResult)의 "시간별 행동·소리·건강 관찰" 그래프와 같은 방식:
 *    가로 = 영상 시간(초), 세로 = 근거 세기(지지도), 판단 하나 = 선 하나.
 *  - 아래 결과 카드 3장 · 결과와 함께 받는 것(추가 질문 · 영양식 비교 · 메일 · 원본 미보관) 알약.
 *  - 모든 값은 고정된 예시(서버 · 데이터 연결 없음, 누르는 버튼 없음). "예시 화면" 표시를 늘 붙인다.
 * 기본은 hidden — app/lab-web.css(웹 연구소 페이지)에서만 보이고, 앱 · 펫렌즈 창에서는 나오지 않는다.
 */
import Image from "next/image";

// 예시 선 — 판단 이름 · 무리(행동/소리/건강) · 색 · 15초 동안의 근거 세기(0~1, 1.5초 간격 11점)
const SAMPLE_LINES = [
    { label: "경계 가능성", group: "소리", color: "#f39ab5", points: [0.12, 0.3, 0.86, 0.62, 0.28, 0.2, 0.24, 0.36, 0.3, 0.18, 0.14] },
    { label: "주변 경계", group: "행동", color: "#a08ae6", points: [0.22, 0.28, 0.42, 0.66, 0.74, 0.7, 0.52, 0.4, 0.46, 0.56, 0.5] },
    { label: "호흡 관찰", group: "건강", color: "#62c9a3", points: [0.2, 0.22, 0.24, 0.26, 0.28, 0.3, 0.3, 0.28, 0.3, 0.29, 0.3] },
] as const;

// 예시 결과 카드 — 그림 · 무리 이름 · 판단 · 시점/근거
const SAMPLE_CARDS = [
    { art: "/images/ui/lab-sound-160.webp", group: "짖음 · 발성 맥락", title: "경계 가능성", note: "3초 무렵 · 근거 높음", tone: "is-pink" },
    { art: "/images/ui/lab-dog-256.webp", group: "행동 신호", title: "주변 경계", note: "6초 무렵 · 근거 보통", tone: "is-lav" },
    { art: "/images/ui/lab-health-160.webp", group: "건강 신호", title: "호흡 관찰", note: "평소 모습과 비교해 주세요", tone: "is-mint" },
] as const;

// 결과와 함께 받는 것(설명용 알약 — 누르는 버튼 아님)
const SAMPLE_EXTRAS = [
    { art: "/images/ui/lab-question-160.webp", label: "보호자 추가 질문" },
    { art: "/images/ui/hotpick-food-128.webp", label: "우리 아이 영양식 비교" },
    { art: "/images/ui/lab-mail-160.webp", label: "결과 메일로 받기" },
    { art: "/images/ui/lab-info-160.webp", label: "원본 영상은 보관하지 않아요" },
] as const;

// 그래프 칸 크기(viewBox) — 선은 부드러운 곡선(이웃 점 사이 가운데를 지나는 2차 곡선)
const CHART_W = 600;
const CHART_H = 150;
const CHART_PAD = 12;

function linePath(points: readonly number[]) {
    const step = CHART_W / (points.length - 1);
    const xy = points.map((value, index) => [index * step, CHART_PAD + (1 - value) * (CHART_H - CHART_PAD * 2)] as const);
    let d = `M${xy[0][0]} ${xy[0][1].toFixed(1)}`;
    for (let index = 1; index < xy.length; index += 1) {
        const [px, py] = xy[index - 1];
        const [x, y] = xy[index];
        const mx = (px + x) / 2;
        const my = (py + y) / 2;
        d += ` Q${px} ${py.toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
        if (index === xy.length - 1) d += ` T${x} ${y.toFixed(1)}`;
    }
    return d;
}

// 가장 높은 점(봉우리) 자리 — 동그라미 표시용
// 2026-10-26: 곡선은 점을 "당기는 점"으로만 쓰고 이웃 점 사이 가운데를 지나서, 뾰족한 봉우리일수록 원래 점보다 아래로 지나감
// (분홍 선 0.30 → 0.86 → 0.62 에서 동그라미가 선 위로 떠 보이던 것). 봉우리 점을 당기는 곡선 조각의 실제 꼭대기에
// 동그라미를 둔다. 맨 앞 · 맨 끝 점은 곡선이 그 점을 지나므로 그대로.
function peak(points: readonly number[]) {
    const top = points.reduce((best, value, index) => (value > points[best] ? index : best), 0);
    const step = CHART_W / (points.length - 1);
    const yOf = (value: number) => CHART_PAD + (1 - value) * (CHART_H - CHART_PAD * 2);
    if (top === 0 || top === points.length - 1) return { x: top * step, y: yOf(points[top]) };
    // 2차 곡선(앞 가운데점 A → 당기는 점 B → 뒤 가운데점 C)에서 가장 높은 자리 t = (A − B) / (A − 2B + C)
    const a = yOf((points[top - 1] + points[top]) / 2);
    const b = yOf(points[top]);
    const c = yOf((points[top] + points[top + 1]) / 2);
    const t = Math.min(1, Math.max(0, (a - b) / (a - 2 * b + c || 1)));
    const ax = (top - 0.5) * step;
    const cx = (top + 0.5) * step;
    return {
        x: (1 - t) ** 2 * ax + 2 * (1 - t) * t * top * step + t ** 2 * cx,
        y: (1 - t) ** 2 * a + 2 * (1 - t) * t * b + t ** 2 * c,
    };
}

export default function PetLensObservationSample() {
    return (
        <section className="dw-csheet is-lav lab-obs-sample hidden" aria-labelledby="lab-obs-sample-title">
            {/* 머리 — 이름표 · 제목 · "예시 화면" 표시 */}
            <div className="lab-obs-sample-top">
                <div>
                    <p className="ddb-crayon-kicker dw-kicker">SAMPLE REPORT</p>
                    <h2 id="lab-obs-sample-title">이렇게 결과가 나와요</h2>
                </div>
                <span className="lab-obs-sample-tag">
                    <i className="fa-solid fa-eye" aria-hidden="true" />예시 화면 · 실제 결과는 영상마다 달라요
                </span>
            </div>

            {/* 시간별 그래프(예시) — 실제 결과 화면과 같은 축: 가로 시간 · 세로 지지도 */}
            <figure className="lab-obs-chart">
                <figcaption className="lab-obs-legend">
                    {SAMPLE_LINES.map((line) => (
                        <span key={line.label}><i style={{ background: line.color }} aria-hidden="true" />{line.label}<small>{line.group}</small></span>
                    ))}
                    <em>가로 시간 · 세로 지지도</em>
                </figcaption>
                <div className="lab-obs-plot">
                <svg
                    viewBox={`0 0 ${CHART_W} ${CHART_H}`}
                    preserveAspectRatio="none"
                    role="img"
                    aria-label="예시 그래프: 3초 무렵 경계 가능성, 6초 무렵 주변 경계가 가장 높고 호흡 관찰은 낮게 이어짐"
                >
                    <g stroke="#eef0f4" strokeWidth="1">
                        {[0.25, 0.5, 0.75].map((ratio) => <line key={ratio} x1="0" y1={CHART_H * ratio} x2={CHART_W} y2={CHART_H * ratio} />)}
                    </g>
                    {SAMPLE_LINES.map((line) => (
                        <path key={line.label} d={linePath(line.points)} fill="none" stroke={line.color} strokeWidth="5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                    ))}
                </svg>
                {/* 봉우리 동그라미는 늘어나는 그래프 위에 따로 얹음(찌그러지지 않게) */}
                <div className="lab-obs-peaks" aria-hidden="true">
                    {SAMPLE_LINES.slice(0, 2).map((line) => {
                        const spot = peak(line.points);
                        return <span key={line.label} style={{ left: `${(spot.x / CHART_W) * 100}%`, top: `${(spot.y / CHART_H) * 100}%`, borderColor: line.color }} />;
                    })}
                </div>
                </div>
                <div className="lab-obs-axis" aria-hidden="true"><span>0초</span><span>7.5초</span><span>15초</span></div>
            </figure>

            {/* 결과 카드 3장(예시) */}
            <ul className="lab-obs-cards">
                {SAMPLE_CARDS.map((card) => (
                    <li key={card.title} className={card.tone}>
                        <Image src={card.art} alt="" width={52} height={52} aria-hidden="true" />
                        <div>
                            <small>{card.group}</small>
                            <b>{card.title}</b>
                            <em>{card.note}</em>
                        </div>
                    </li>
                ))}
            </ul>

            {/* 결과와 함께 받는 것 */}
            <ul className="lab-obs-extras" aria-label="결과와 함께 받는 것">
                {SAMPLE_EXTRAS.map((extra) => (
                    <li key={extra.label}>
                        <Image src={extra.art} alt="" width={30} height={30} aria-hidden="true" />{extra.label}
                    </li>
                ))}
            </ul>
        </section>
    );
}
