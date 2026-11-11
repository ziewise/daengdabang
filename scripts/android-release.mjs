import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { appendFile, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { androidReleases, planAndroidRelease, verifyAndroidReleaseEvidence } from './android-release-version.mjs';

const repo = process.env.GITHUB_REPOSITORY;
const sourceCommit = process.env.GITHUB_SHA;
const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
if (repo !== 'ziewise/daengdabang' || !/^[a-f0-9]{40}$/.test(sourceCommit || '') || !token) throw new Error('Expected repository, source commit and Actions token');
const apiBase = `https://api.github.com/repos/${repo}`;
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const stableName = 'DaengDaBang-Android.apk';

async function api(relative, body, method = body ? 'POST' : 'GET') {
    const response = await fetch(apiBase + relative, { method, headers: {
        Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28', ...(body ? { 'Content-Type': 'application/json' } : {}),
    }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(60000) });
    if (!response.ok) throw new Error(`GitHub ${method} ${relative}: ${response.status}`);
    return response.status === 204 ? null : response.json();
}
async function releases() {
    const result = [];
    for (let page = 1; ; page++) {
        const rows = await api(`/releases?per_page=100&page=${page}`);
        result.push(...rows);
        if (rows.length < 100) return result;
    }
}
async function publicBytes(url) {
    if (!url.startsWith(`https://github.com/${repo}/releases/download/`)) throw new Error('Unexpected release download origin');
    const response = await fetch(url, { signal: AbortSignal.timeout(180000) });
    if (!response.ok) throw new Error(`Public APK download failed: ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
}
async function summary(message) {
    console.log(message);
    if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, message + '\n');
}
async function prepare() {
    const base = JSON.parse(await readFile('android/version.json', 'utf8'));
    const plan = { ...planAndroidRelease(await releases(), base), sourceCommit };
    const previousApk = path.join(process.env.RUNNER_TEMP, 'ddb-previous-release.apk');
    const bytes = await publicBytes(plan.previous.url);
    if (sha256(bytes) !== plan.previous.sha256) throw new Error('Previous public APK checksum mismatch');
    await writeFile(previousApk, bytes);
    await writeFile(path.join(process.env.RUNNER_TEMP, 'android-release-plan.json'), JSON.stringify(plan, null, 2) + '\n');
    await appendFile(process.env.GITHUB_ENV, [
        `DDB_ANDROID_VERSION_CODE=${plan.versionCode}`, `DDB_ANDROID_VERSION_NAME=${plan.versionName}`,
        `DDB_PREVIOUS_ANDROID_APK=${previousApk}`, `DDB_PREVIOUS_ANDROID_VERSION_CODE=${plan.previous.versionCode}`,
    ].join('\n') + '\n');
    await summary(`Android ${plan.versionName} (build ${plan.versionCode}); upgrade baseline: ${plan.previous.tag}.`);
}
async function isCurrentMain() {
    return (await api('/git/ref/heads/main')).object.sha === sourceCommit;
}
async function publish(directory) {
    if (process.env.GITHUB_REF !== 'refs/heads/main') throw new Error('Only main can publish production APKs');
    const file = name => path.join(directory, name);
    const plan = JSON.parse(await readFile(file('release-plan.json'), 'utf8'));
    if (plan.sourceCommit !== sourceCommit) throw new Error('Release artifact came from a different source');
    const apk = await readFile(file('app-release.apk'));
    const metadata = JSON.parse(execFileSync('python3', ['-c',
        'import sys,zipfile; print(zipfile.ZipFile(sys.argv[1]).read("assets/public/native-build.json").decode())', file('app-release.apk')], { encoding: 'utf8' }));
    const upgrade = JSON.parse(await readFile(file('upgrade-check.json'), 'utf8'));
    const certificate = process.env.DDB_ANDROID_CERT_SHA256;
    verifyAndroidReleaseEvidence(plan, metadata, upgrade, await readFile(file('package.txt'), 'utf8'), await readFile(file('signature.txt'), 'utf8'), certificate);
    if (!(await readFile(file('window.xml'), 'utf8')).includes('댕다방에 오신 걸 환영해요')
        || !(await readFile(file('update-install.txt'), 'utf8')).includes('Success')) throw new Error('Android launch or update evidence is missing');
    if (!await isCurrentMain()) return summary('A newer main commit exists. This APK will not replace the latest release; the queued main build will publish it.');
    const published = androidReleases(await releases()).find(release => !release.draft && !release.prerelease);
    if (published.versionCode >= plan.versionCode && published.tag_name !== plan.tag) throw new Error('Refusing to replace a newer Android version');
    const digest = sha256(apk);
    const runUrl = `https://github.com/${repo}/actions/runs/${process.env.GITHUB_RUN_ID}`;
    const buildInfo = { ...metadata, apkSha256: digest, certificateSha256: certificate, validationRun: runUrl,
        previousVersionCode: plan.previous.versionCode, upgradeDataRetained: true };
    const notes = `웹과 같은 소스에서 자동 빌드한 댕다방 Android ${plan.versionName} (build ${plan.versionCode})입니다.

- 홈페이지 [앱 설치·업데이트](https://daengdabang.com/app/)에서 항상 최신 APK를 받을 수 있습니다.
- ${plan.previous.versionName}에서 앱을 삭제하지 않는 업데이트 설치와 앱 데이터 보존을 검사했습니다.
- 서명·패키지·정렬·홈 실행·회귀 검사를 통과한 APK만 공개합니다.
- 소스: \`${sourceCommit}\` · [자동 검사](${runUrl})

### 업데이트 방법
아래 ${stableName}을 받아 열고 **업데이트**를 누르세요. 1.0.2 이상은 기존 앱을 삭제할 필요가 없습니다.

예전 1.0.1 APK는 분실된 임시 키로 서명되어 직접 업데이트할 수 없습니다. 기존 앱을 삭제하기 전에 기기에만 있는 미전송 사진·임시 기록을 먼저 보관해야 합니다. 로그인 계정의 서버 데이터와 기기 안 자료는 별개입니다.

SHA-256: \`${digest}\`
`;
    let release = (await releases()).find(release => release.tag_name === plan.tag);
    if (release && release.target_commitish !== sourceCommit) throw new Error('Release tag belongs to another source commit');
    if (!release) release = await api('/releases', { tag_name: plan.tag, target_commitish: sourceCommit,
        name: `댕다방 Android ${plan.versionName} (build ${plan.versionCode})`, body: notes, draft: true, prerelease: false });
    const assets = await api(`/releases/${release.id}/assets`);
    for (const [name, bytes, type] of [
        [stableName, apk, 'application/vnd.android.package-archive'],
        ['SHA256SUMS.txt', Buffer.from(`${digest}  ${stableName}\n`), 'text/plain'],
        ['build-info.json', Buffer.from(JSON.stringify(buildInfo, null, 2) + '\n'), 'application/json'],
    ]) {
        const existing = assets.find(asset => asset.name === name);
        if (existing) {
            if (existing.digest !== `sha256:${sha256(bytes)}`) throw new Error(`Immutable release asset differs: ${name}`);
            continue;
        }
        if (!release.draft) throw new Error('Published release is incomplete; refusing partial mutation');
        const response = await fetch(`https://uploads.github.com/repos/${repo}/releases/${release.id}/assets?name=${encodeURIComponent(name)}`, {
            method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': type }, body: bytes, signal: AbortSignal.timeout(180000),
        });
        if (!response.ok) throw new Error(`Upload ${name}: ${response.status}`);
        const asset = await response.json();
        if (asset.digest !== `sha256:${sha256(bytes)}` || asset.size !== bytes.length) throw new Error(`Uploaded asset checksum differs: ${name}`);
    }
    if (!await isCurrentMain()) return summary('A newer main commit arrived during upload. The verified candidate remains a draft and will not replace the latest APK.');
    const download = `https://github.com/${repo}/releases/download/${plan.tag}/${stableName}`;
    await api(`/releases/${release.id}`, { draft: false, make_latest: 'true', body: notes }, 'PATCH');
    if (sha256(await publicBytes(download)) !== digest || (await api('/releases/latest')).tag_name !== plan.tag) throw new Error('Public release verification failed');
    await summary(`Published and publicly verified [Android ${plan.versionName}](${download}). Previous-version upgrade preserved app data. Homepage download now resolves to this release.`);
}

if (process.argv[2] === 'prepare') await prepare();
else if (process.argv[2] === 'publish' && process.argv[3]) await publish(process.argv[3]);
else throw new Error('Usage: android-release.mjs prepare | publish ARTIFACT_DIRECTORY');
