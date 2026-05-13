/**
 * PetlensFab — 우하단 플로팅 액션 버튼 (전역)
 * ---------------------------------------------------------------------
 * 모든 페이지에 떠있는 펫렌즈 진입점. 클릭 시 PetlensModal 열림.
 * 상태 관리: PetlensProvider 의 useContext 로 isOpen 토글.
 */
"use client";

import { usePetlens } from "./PetlensProvider";
import styles from "./petlens.module.css";

export default function PetlensFab() {
    const { open } = usePetlens();
    return (
        <button
            type="button"
            onClick={open}
            className={styles.fab}
            aria-label="펫렌즈 분석 시작"
        >
            <i className="fa-solid fa-paw" />
            <span>펫렌즈</span>
        </button>
    );
}
