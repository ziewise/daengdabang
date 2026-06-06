# scripts/_archive/ — 과거 마이그레이션 스크립트

여기 있는 스크립트들은 **이미 1회성 마이그레이션을 완료**한 역사 기록입니다.
실행 결과는 `lib/catalog/raw.json` 에 반영돼 있고, **다시 실행할 필요 없음** (그리고 실행하면 안 됨).

## 보존 이유

- 데이터 변환의 **증거** (어떻게 catalog 가 지금 모양이 됐는지 추적 가능)
- 미래에 유사한 마이그레이션 필요 시 **참고 자료**
- 삭제하면 git history 검색이 더 번거로워짐

## ⚠ 경로 주의

이 안의 스크립트들은 `lib/catalog.json` 을 참조합니다. 현재 그 파일은 `lib/catalog/raw.json` 으로 이동돼 있어서 그대로 실행하면 파일을 못 찾습니다. 다시 돌릴 일이 있다면 경로 수정 필요.

## 파일별 역할

| 파일 | 역할 | 실행 시점 |
|------|------|-----------|
| `parse-catalog.py` | 원본 Excel(`pet_products_brand_purpose_season_detail.xlsx`) → catalog.json 1차 생성 | 프로젝트 초기 |
| `renumber-catalog.mjs` | 고양이 제외 후 No 1~333 연속 재번호 | parse 직후 |
| `renumber-mapping.json` | 재번호 매핑 (old no → new no) 기록 | renumber 산출물 |
| `find-missing-from-excel.mjs` | 엑셀에는 있는데 catalog 에 빠진 항목 점검 | 검증 단계 |
| `apply-excel-names.mjs` | 엑셀 정식 상품명 catalog 에 반영 (1차) | 정정 단계 |
| `apply-excel-names-pass2.mjs` | 엑셀 정식 상품명 catalog 에 반영 (2차 — 누락 보완) | 정정 단계 |
| `apply-name-corrections.mjs` | 오타 일괄 정정 (더스트→더스티 등 20건) | 정정 단계 |
| `match-folder-list.mjs` | Excel 폴더목록과 catalog 매칭 분석 | 폴더 통합 전 |
| `match-result.json` | match-folder-list 산출물 | match 결과물 |
| `link-product-images.mjs` | 상품-이미지 폴더 1차 매핑 (지금은 sync-images 가 대체) | 초기 매핑 |
| `phase2-migrate.mjs` | folder 필드 영구 추가 + image 경로 갱신 (Phase 2 통합) | 디렉토리 통합 시 |
| `verify-catalog.mjs` | 카탈로그 무결성 검증 (no, brand, 가격 등) | 마이그레이션 검증 |

## 활성 스크립트 (참고)

`scripts/` 루트에 있는 3개만 운영용:

- `sync-images.mjs` — npm predev/prebuild 훅. 폴더 스캔 → catalog.json image/gallery/details/sizeImage/video 자동 갱신
- `generate-product-list.py` — `data/product_list.xlsx` 재생성 (협업자용 안내 문서)
- `folder_list.json` — 참조 데이터 (sync-images 가 매칭에 사용)
