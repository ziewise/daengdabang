/**
 * open-next.config.ts — OpenNext 어댑터 설정 (Cloudflare Workers 빌드)
 * ---------------------------------------------------------------------
 * `npx opennextjs-cloudflare build` 가 이 설정을 읽어 .open-next/ 산출.
 *
 * 현재: 최소 설정 (정적 라우트만)
 * 향후 추가 옵션 (필요 시점에 enable):
 *   - incrementalCache: R2 캐시 (ISR 도입 시) — r2IncrementalCache import
 *   - tagCache: 태그 기반 무효화 (on-demand revalidate 시)
 *   - queue: 비동기 작업 큐
 */
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({});
