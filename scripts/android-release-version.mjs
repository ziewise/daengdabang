export function resolveAndroidVersion(base, env = process.env) {
    const versionCode = Number(env.DDB_ANDROID_VERSION_CODE || base.versionCode);
    const versionName = env.DDB_ANDROID_VERSION_NAME || base.versionName;
    if (!Number.isSafeInteger(versionCode) || versionCode < 1 || versionCode > 2100000000
        || !/^\d+\.\d+\.\d+$/.test(versionName)) throw new Error('Invalid Android release version');
    return { versionCode, versionName };
}

export function androidReleases(releases) {
    return releases.flatMap(release => {
        const match = /^android-v(\d+\.\d+\.\d+)-build(\d+)$/.exec(release.tag_name);
        return match ? [{ ...release, versionName: match[1], versionCode: Number(match[2]) }] : [];
    }).sort((a, b) => b.versionCode - a.versionCode);
}

export function planAndroidRelease(releases, base) {
    const candidates = androidReleases(releases);
    const previous = candidates.find(release => !release.draft && !release.prerelease);
    if (!previous) throw new Error('A published signed Android baseline is required');
    const highest = candidates[0];
    const versionCode = Math.max(base.versionCode, highest.versionCode + 1);
    const parts = highest.versionName.split('.').map(Number);
    parts[2]++;
    const versionName = versionCode === base.versionCode ? base.versionName : parts.join('.');
    const asset = previous.assets.find(asset => asset.name === 'DaengDaBang-Android.apk')
        || previous.assets.find(asset => /^DaengDaBang-Android-.*\.apk$/.test(asset.name));
    if (!asset || !/^sha256:[a-f0-9]{64}$/.test(asset.digest || '')) throw new Error('Previous APK or verified digest is missing');
    return {
        ...resolveAndroidVersion({ versionCode, versionName }, {}),
        tag: `android-v${versionName}-build${versionCode}`,
        previous: { tag: previous.tag_name, versionCode: previous.versionCode, versionName: previous.versionName,
            url: asset.browser_download_url, sha256: asset.digest.slice(7) },
    };
}

export function verifyAndroidReleaseEvidence(plan, metadata, upgrade, packageInfo, signature, expectedCertificate) {
    if (metadata.sourceCommit !== plan.sourceCommit || metadata.versionCode !== plan.versionCode
        || metadata.versionName !== plan.versionName || metadata.appStartPath !== '/app/home-1/index.html') throw new Error('APK provenance mismatch');
    if (upgrade.fromVersionCode !== plan.previous.versionCode || upgrade.toVersionCode !== plan.versionCode
        || upgrade.dataRetained !== true || plan.versionCode <= plan.previous.versionCode) throw new Error('Previous-version update did not preserve data');
    if (!packageInfo.includes("name='com.daengdabang.app'")
        || !packageInfo.includes(`versionCode='${plan.versionCode}' versionName='${plan.versionName}'`)
        || packageInfo.includes('application-debuggable')) throw new Error('Unexpected Android package');
    if (!/^[a-f0-9]{64}$/.test(expectedCertificate || '') || !signature.includes('Number of signers: 1')
        || !signature.includes(`certificate SHA-256 digest: ${expectedCertificate}`)) throw new Error('Release signing identity changed');
}
