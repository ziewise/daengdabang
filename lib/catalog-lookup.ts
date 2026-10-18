/**
 * catalog-lookup — 상품 데이터(lib/catalog, 약 6MB)를 "필요할 때만" 불러오는 가벼운 연결 고리 (2026-10-18 앱 속도 최적화)
 * ---------------------------------------------------------------------
 * 장바구니(lib/store.tsx)는 담기 · 수량 늘리기 때 그 옵션을 살 수 있는지 검사하려고 상품을 찾는다(findById).
 * 예전에는 store 가 lib/catalog 를 바로 import 해서, 모든 화면(앱 홈 · 마이 등 상품과 상관없는 화면까지)이
 * 상품 목록 · 영상 검수 데이터 6MB 를 처음부터 내려받고 해석했다(폰에서 앱을 열 때 1~3초 멈춤의 주원인).
 *
 * 이제 store 는 이 파일만 import 하고, 상품 데이터는 담기 · 수량 변경을 실제로 할 때 동적 import() 로 불러온다.
 * 검사 규칙(살 수 없는 옵션은 담기 · 늘리기 막기)은 그대로 — 불러오기가 끝난 뒤에 같은 검사를 거쳐 담긴다.
 * 상품 화면(쇼핑 · 상품 상세)은 원래 상품 데이터를 쓰므로 그 화면에서는 이미 불러온 상태라 기다림이 없다.
 */
import type { CatalogProduct } from "@/lib/catalog/types";

type FindById = (id: string) => CatalogProduct | undefined;

let lookup: FindById | null = null;
let loading: Promise<void> | null = null;

/** 상품 데이터를 불러왔으면 상품을 찾아 주고, 아직이면 undefined(그 경우 store 는 담기를 하지 않음 — 아래 ensure 후에만 담기) */
export function findById(id: string): CatalogProduct | undefined {
    return lookup ? lookup(id) : undefined;
}

/** 상품 데이터 불러오기(한 번만) — 담기 · 수량 변경 직전에 기다린다 */
export function ensureCatalogLookup(): Promise<void> {
    if (lookup) return Promise.resolve();
    if (!loading) {
        loading = import("@/lib/catalog")
            .then((catalog) => {
                lookup = catalog.findById;
            })
            .catch((error) => {
                // 불러오기 실패(네트워크 끊김 등) — 다음 담기 때 다시 시도
                loading = null;
                throw error;
            });
    }
    return loading;
}
