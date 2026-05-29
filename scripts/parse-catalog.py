"""
parse-catalog.py — Excel 카탈로그를 JSON 으로 변환
----------------------------------------------------------
Input:  C:\\Users\\lee\\Downloads\\pet_products_brand_purpose_season_detail.xlsx
Output: lib/catalog.json (333개 상품, 고양이 12개 제외)

전체_세분류 시트 컬럼:
  No, 브랜드, 브랜드_영문, 대상, 용도대분류, 용도세분류,
  계절용품, 주요계절, 산책/외출, 사료/간식, 위생/케어,
  상품명, 가격, 가격숫자, 분류근거, 브랜드출처URL, 확인메모
"""
import openpyxl
import json
import re
import sys
from pathlib import Path

SRC = r"C:\Users\lee\Downloads\pet_products_brand_purpose_season_detail.xlsx"
OUT = Path(__file__).resolve().parent.parent / "lib" / "catalog.json"

# docs/03-제외-보류-항목.md 의 고양이 12개 No 번호
CAT_EXCLUDE = {99, 129, 130, 140, 179, 180, 181, 185, 203, 206, 209, 320}

# 컬럼명 매핑 (한글 → 영문 키)
COLS = [
    "no", "brandKo", "brandEn", "target", "useMain", "useSub",
    "seasonalFlag", "season", "isWalk", "isFood", "isHygiene",
    "name", "priceText", "priceNum", "categorizeNote", "sourceUrl", "verifyNote",
]


def slugify(s: str) -> str:
    """한글 → 영문 slug (간단판). 영문 brand_en 우선 사용."""
    if not s:
        return ""
    s = s.lower().strip()
    # 영문/숫자/공백/하이픈만
    s = re.sub(r"[^a-z0-9\s-]", "", s)
    s = re.sub(r"\s+", "-", s)
    return s.strip("-")


def main():
    wb = openpyxl.load_workbook(SRC, data_only=True)
    ws = wb["전체_세분류"]

    rows = []
    # 헤더는 row 2 (row 1은 시트 제목 merged)
    for r in ws.iter_rows(min_row=3, values_only=True):
        if not r or r[0] is None:
            continue
        obj = dict(zip(COLS, r))
        no = obj.get("no")
        if not isinstance(no, int):
            continue
        if no in CAT_EXCLUDE:
            continue
        # 가격 정리
        price = obj.get("priceNum")
        if not isinstance(price, (int, float)):
            # priceText 에서 숫자 추출 시도
            pt = obj.get("priceText") or ""
            m = re.search(r"[\d,]+", str(pt))
            price = int(m.group(0).replace(",", "")) if m else 0
        obj["priceNum"] = int(price) if price else 0
        # Y/N → bool
        for k in ("seasonalFlag", "isWalk", "isFood", "isHygiene"):
            obj[k] = (str(obj.get(k) or "").strip().upper() == "Y")
        # 문자열 trim
        for k in ("brandKo", "brandEn", "target", "useMain", "useSub", "season",
                 "name", "categorizeNote", "sourceUrl", "verifyNote", "priceText"):
            v = obj.get(k)
            obj[k] = (str(v).strip() if v is not None else "")
        rows.append(obj)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False, indent=2)

    # 요약 통계
    print(f"OUT: {OUT}")
    print(f"Total: {len(rows)} products (cat-excluded {len(CAT_EXCLUDE)})")
    brands = {}
    use_main = {}
    seasons = {}
    for o in rows:
        brands[o["brandKo"]] = brands.get(o["brandKo"], 0) + 1
        use_main[o["useMain"]] = use_main.get(o["useMain"], 0) + 1
        if o["season"]:
            seasons[o["season"]] = seasons.get(o["season"], 0) + 1
    print(f"\nTop 10 brands:")
    for b, c in sorted(brands.items(), key=lambda x: -x[1])[:10]:
        print(f"  {b}: {c}")
    print(f"\n용도대분류:")
    for u, c in sorted(use_main.items(), key=lambda x: -x[1]):
        print(f"  {u}: {c}")
    print(f"\n주요계절:")
    for s, c in sorted(seasons.items(), key=lambda x: -x[1]):
        print(f"  {s}: {c}")


if __name__ == "__main__":
    main()
