# tools/sticker-assets — 스티커북 시안 이미지 변환 (로컬 시안 전용)

사용자가 만든 3D 클레이 투명 PNG를 앱용 webp로 줄이는 스크립트. 운영 빌드에는 쓰이지 않는다.

- `sticker_icon_webp.py <원본폴더> <결과폴더> [원본.png 결과.webp]`
  떨어진 잡티 점을 지우고(반짝이 같은 장식은 유지) 여백을 다듬어 384px 정사각 webp로 저장.
- `tab_icon_webp.py <원본폴더> <결과폴더>`
  탭바 아이콘(메뉴홈 · 메뉴연구소 · 메뉴쇼핑 · 메뉴댕다방 · 메뉴마이) → 192px webp.

필요: Python 3 + Pillow + numpy
