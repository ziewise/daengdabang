# Customer commerce (2026-11-11)

Frontend and API use the same live routes in web/PWA and packaged Android.

- Member reviews: text 250P, photos add 750P, total 1,000P. Editing text into photo adds only the difference. Each purchased line has one review; retries cannot issue a second reward. Original reward settings are retained per review. Photo removal, deletion and verified full refunds reverse the appropriate reward. Existing wallet debt accounting handles already-spent rewards.
- Guest reviews: only after lookup with an order-scoped token, no wallet or points. Guest passwords are scrypt hashes; buyer and address details are encrypted separately. Tokens expire after one hour. Credentials never appear in query strings.
- Review eligibility: real, paid, delivered orders within 90 days. Test orders and orders with active cancellation/return requests are excluded. Photos are re-encoded to WebP, stripped of metadata, limited to 5 per review / 20 MB each.
- Customers can request cancellation or per-line return and explicitly confirm delivery. A paid order before preparation can use the existing verified provider cancellation service. Prepared orders require operator handling. The management UI offers full-order refunds only, clearly labelled; partial refund settlement remains the existing payment-provider reconciliation workflow.
- Operators manage delivery steps, carrier/tracking, requests, reviews, reports, seller replies and future reward settings in the console Orders panel. Only ADMIN can execute a provider refund. These controls are not registered as AI money actions.
- Newsletter withdrawal uses the existing audited outbound-consent endpoint; suppression must be confirmed before the UI reports success.
- Phone registration imports a number from a consented Kakao/Naver profile using the existing OAuth callback. This is social-account phone registration, not CI identity verification. Provider phone-data permissions remain necessary; their production approval could not be inspected from the available browser. Missing numbers never become a successful registration. Android uses an external auth window and returns via the existing app scheme without carrying a phone or token in the URL.
- Phone callbacks preserve the exact official website origin (`www` or bare domain) in signed OAuth state so browser-local sign-in survives the round trip. Cancellation and provider failure return to the profile without overwriting the previous number. Account withdrawal deletes the optional phone and pending phone-link requests in the same transaction as deactivation.
- Both native and web profile screens expose phone registration and email consent withdrawal. Callbacks return to `/mypage/profile/` (or `daengdabang://mypage/profile/`), where the actual settings component is mounted. The Android bridge closes the auth browser and refreshes the masked number. Unsubscribe failures retain the previous consent display.
- The prelaunch payment lock remains enabled. Implementing these routes does not open checkout or perform a real payment.

API migration: 20261111_1600. Before deploying this frontend, the API must provide `/api/v1/reviews/reward-settings` and `/api/v1/commerce/orders/{orderId}`. Guest UI is enabled by default and can be disabled explicitly with `NEXT_PUBLIC_GUEST_ORDER=0`.

On each main push, the native release workflow builds this same frontend, verifies the pinned signer and an update from the previous public APK with preserved data, then publishes the stable latest APK link. See android-apk-release.md.
