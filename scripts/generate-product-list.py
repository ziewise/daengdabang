"""
scripts/generate-product-list.py
---------------------------------
Daengdabang_Shop/data/product_list.xlsx 를 생성한다.

데이터 소스:
- lib/catalog.json: 333개 카탈로그 (정정 + 재번호 1~333 완료)
- scripts/folder_list.json: Excel 폴더목록 (folder_name 매칭용)
- 원본 Excel (C:\\Users\\lee\\Downloads\\pet_products_brand_purpose_season_detail.xlsx): 고양이 12개 추출용

시트 구성:
- "products" 시트: 333개 강아지 상품 (no = 1~333, 재번호됨)
- "cats" 시트:     12개 고양이 상품 (원본 Excel no 보존, 별도 분류)

컬럼 (products 시트):
  no | product_name | folder_name | main_image | detail_image | detail_url

컬럼 (cats 시트):
  original_no | brand | product_name | folder_name | note

규칙:
- main_image = {folder_name}.png
- detail_image = info.png (고정)
- detail_url = https://www.daengdabang.com/product/{folder_name}
- 고양이 시트는 비활성 상품 — 향후 활성화 시 강아지 시트로 옮김
"""
import json
import re
from pathlib import Path

import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

ROOT = Path(__file__).resolve().parent.parent
CATALOG_PATH = ROOT / "lib" / "catalog.json"
FOLDER_LIST_PATH = ROOT / "scripts" / "folder_list.json"
ORIGINAL_EXCEL = Path(r"C:\Users\lee\Downloads\pet_products_brand_purpose_season_detail.xlsx")
DATA_DIR = ROOT / "data"
OUT_PATH = DATA_DIR / "product_list.xlsx"

# no=5 신규 부여 (Excel 에 없는 유일한 catalog 항목)
# 다른 릿지라인 시리즈 패턴 따름
NEW_FOLDERS = {
    5: "rw_ridgeline_leash_26",
}

BASE_URL = "https://www.daengdabang.com"

# 고양이 상품 12개 (원본 Excel 의 No)
CAT_NUMBERS = {99, 129, 130, 140, 179, 180, 181, 185, 203, 206, 209, 320}


def norm(s: str) -> str:
    s = (s or "").lower().strip()
    s = re.sub(r"\.\.\.$", "", s)
    s = re.sub(r"\s+", "", s)
    s = re.sub(r"[()（）\[\]·.,\-_·•&/!?]", "", s)
    s = s.replace("리프웨어", "러프웨어")
    s = s.replace("팔리세이드", "팰리세이드")
    s = s.replace("핏드림하우스", "펫드림하우스")
    s = s.replace("탐라이프", "탑라이프")
    s = s.replace("퍼그너티", "페그너티")
    s = s.replace("프런트", "프론트")
    s = s.replace("크랙그", "크래그")
    return s


def get_borders():
    return Border(
        left=Side(style="thin", color="D1D5DB"),
        right=Side(style="thin", color="D1D5DB"),
        top=Side(style="thin", color="D1D5DB"),
        bottom=Side(style="thin", color="D1D5DB"),
    )


def write_header(ws, headers, fill_color="4B5563"):
    header_font = Font(bold=True, color="FFFFFF", size=11)
    header_fill = PatternFill("solid", fgColor=fill_color)
    header_alignment = Alignment(horizontal="center", vertical="center")
    border = get_borders()
    for col_idx, h in enumerate(headers, start=1):
        cell = ws.cell(row=1, column=col_idx, value=h)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = header_alignment
        cell.border = border


def build_products_sheet(ws, catalog, excel_by_norm):
    headers = ["no", "product_name", "folder_name", "main_image", "detail_image", "detail_url"]
    write_header(ws, headers)
    border = get_borders()

    matched_count = 0
    no5_assigned = False

    for c in sorted(catalog, key=lambda x: x["no"]):
        no = c["no"]
        name = c["name"]

        # folder_name 결정
        if no == 5:
            # 재번호 후 no=5 가 릿지라인 리드줄(2026)
            folder = NEW_FOLDERS[5]
            no5_assigned = True
        else:
            folder = excel_by_norm.get(norm(name), "")

        if folder:
            matched_count += 1
            main_image = f"{folder}.png"
            detail_image = "info.png"
            detail_url = f"{BASE_URL}/product/{folder}"
        else:
            main_image = ""
            detail_image = ""
            detail_url = f"{BASE_URL}/product/p_{no}"

        row_idx = ws.max_row + 1
        for col_idx, value in enumerate(
            [no, name, folder, main_image, detail_image, detail_url],
            start=1,
        ):
            cell = ws.cell(row=row_idx, column=col_idx, value=value)
            cell.border = border
            cell.alignment = Alignment(vertical="center")

    widths = {1: 6, 2: 60, 3: 32, 4: 28, 5: 12, 6: 60}
    for col_idx, w in widths.items():
        ws.column_dimensions[openpyxl.utils.get_column_letter(col_idx)].width = w
    ws.freeze_panes = "A2"
    ws.row_dimensions[1].height = 24

    return matched_count


def build_cats_sheet(ws):
    """원본 Excel 에서 12개 고양이 상품 추출 → cats 시트"""
    headers = ["original_no", "brand", "product_name", "folder_name", "note"]
    write_header(ws, headers, fill_color="9CA3AF")  # 회색 — 비활성
    border = get_borders()

    cat_items = []
    try:
        wb_src = openpyxl.load_workbook(ORIGINAL_EXCEL, data_only=True)
        ws_src = wb_src["전체_세분류"]
        for row in ws_src.iter_rows(min_row=3, values_only=True):
            no = row[0]
            if not isinstance(no, int) or no not in CAT_NUMBERS:
                continue
            cat_items.append({
                "no": no,
                "brand": row[1] or "",
                "name": row[11] or "",
            })
    except Exception as ex:
        print(f"⚠ 원본 Excel 읽기 실패: {ex}")
        return 0

    # 고양이 폴더명도 비워두지 말고 영문 약어 부여 (작업자가 채울 자리)
    # 추후 활성화하려면 이 시트에서 데이터 갖고 와서 강아지 시트로 옮기면 됨
    for c in sorted(cat_items, key=lambda x: x["no"]):
        row_idx = ws.max_row + 1
        for col_idx, value in enumerate(
            [c["no"], c["brand"], c["name"], "", "고양이 상품 - 보류 (향후 활성화 시 products 시트로 이동)"],
            start=1,
        ):
            cell = ws.cell(row=row_idx, column=col_idx, value=value)
            cell.border = border
            cell.font = Font(color="6B7280")  # 회색 — 비활성 표시
            cell.alignment = Alignment(vertical="center")

    widths = {1: 12, 2: 16, 3: 60, 4: 32, 5: 30}
    for col_idx, w in widths.items():
        ws.column_dimensions[openpyxl.utils.get_column_letter(col_idx)].width = w
    ws.freeze_panes = "A2"
    ws.row_dimensions[1].height = 24

    return len(cat_items)


def main():
    catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    folder_list = json.loads(FOLDER_LIST_PATH.read_text(encoding="utf-8"))

    excel_by_norm = {}
    for e in folder_list:
        k = norm(e["name"])
        if k not in excel_by_norm:
            excel_by_norm[k] = e["folder"]

    DATA_DIR.mkdir(parents=True, exist_ok=True)

    wb = openpyxl.Workbook()

    # 시트 1: products (333개 강아지 상품)
    ws_products = wb.active
    ws_products.title = "products"
    matched = build_products_sheet(ws_products, catalog, excel_by_norm)

    # 시트 2: cats (12개 고양이 상품, 별도 분류)
    ws_cats = wb.create_sheet(title="cats")
    cat_count = build_cats_sheet(ws_cats)

    wb.save(OUT_PATH)

    # 결과 출력 (cp949 호환 — 이모지 X)
    print(f"[OK] product_list.xlsx 생성 완료")
    print(f"  - 위치: {OUT_PATH}")
    print(f"  - products 시트: {len(catalog)} 행 (no=1~{len(catalog)})")
    print(f"  - products 시트 folder_name 매칭됨: {matched}")
    print(f"  - cats sheet: {cat_count} rows (cats - 보류)")


if __name__ == "__main__":
    main()
