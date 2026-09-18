# External review provenance and refresh

Verified in public Naver seller UI on 2026-09-18:

| Naver store | Seller | Channel |
| --- | --- | --- |
| daengdabang | (주)내츄럴랩스 | 101498628 |
| daengdabangmall | 주식회사 포엔치 | 1100217328 |

All review URLs in the preserved catalog point to the first, external seller.
They are not this storefront's or daengdabangmall's purchase reviews. Preserve
raw records and source URLs. Do not transfer these reviews to another seller.
External metrics have explicit fields and labels; `reviewCount` and `rating`
must not be populated from them or used as own-store structured ratings.

Product listing groups are navigation across seasons. They do not establish
that redesigned models are identical. Only the exact source product URL may
supply a product's review counts, bodies and summary. Each original route
remains available, along with its inventory and options.

`review-refresh.json` contains one imported and backend-model-verified update:
17 actual review bodies for product 13149785203, collected on 2026-09-18. The
source ID, body, rating, time and exact input keys accompany the summary. This
static update is not evidence of operational periodic collection.

The product review panel can read the deployed backend endpoint
`/api/v1/product-reviews/{folder}`. It only accepts known source URLs and a
summary bound to the complete returned inputs. Timeout, failed retrieval or
input mismatch retains the verified static fallback. Server scheduler, feed
and model must be deployed independently of Codex and the user's PC before
claiming automatic operation. No working server review feed has been verified.

Naver Commerce does not expose a review-body API; see the official discussion:
https://github.com/commerce-api-naver/commerce-api/discussions/3309

The native Naver AI widget is platform-controlled. This code does not publish
to it or alter Naver product options, inventory, IDs or reviews.
