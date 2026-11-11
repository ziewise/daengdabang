import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { planAndroidRelease, resolveAndroidVersion, verifyAndroidReleaseEvidence } from '../scripts/android-release-version.mjs';

const certificate='a'.repeat(64);
const sourceCommit='b'.repeat(40);
const base={versionCode:4,versionName:'1.0.3'};
const release=(code=3,version='1.0.2',overrides={})=>({tag_name:`android-v${version}-build${code}`,draft:false,prerelease:false,
    assets:[{name:'DaengDaBang-Android.apk',digest:'sha256:'+'c'.repeat(64),browser_download_url:'https://github.com/ziewise/daengdabang/releases/download/test/DaengDaBang-Android.apk'}],...overrides});

test('each Android publication increments version and uses the previous public APK',()=>{
    const first=planAndroidRelease([release()],base);
    assert.equal(first.versionCode,4);assert.equal(first.versionName,'1.0.3');assert.equal(first.previous.versionCode,3);
    const second=planAndroidRelease([release(4,'1.0.3'),release()],base);
    assert.equal(second.versionCode,5);assert.equal(second.versionName,'1.0.4');assert.equal(second.previous.versionCode,4);
});
test('drafts reserve their version without becoming the upgrade baseline',()=>{
    const value=planAndroidRelease([release(5,'1.0.4',{draft:true}),release(4,'1.0.3'),{tag_name:'website-v20'}],base);
    assert.equal(value.versionCode,6);assert.equal(value.versionName,'1.0.5');assert.equal(value.previous.versionCode,4);
    assert.throws(()=>planAndroidRelease([release(4,'1.0.3',{draft:true})],base),/baseline/);
    assert.throws(()=>planAndroidRelease([release(3,'1.0.2',{assets:[]})],base),/missing/);
});
test('Gradle and packaged metadata use one validated CI version',()=>{
    assert.deepEqual(resolveAndroidVersion(base,{}),base);
    assert.deepEqual(resolveAndroidVersion(base,{DDB_ANDROID_VERSION_CODE:'8',DDB_ANDROID_VERSION_NAME:'1.0.7'}),{versionCode:8,versionName:'1.0.7'});
    for(const code of ['-1','0','NaN','1.5','2100000001'])assert.throws(()=>resolveAndroidVersion(base,{DDB_ANDROID_VERSION_CODE:code}));
});
test('publication rejects stale code, wrong signer, debuggable APKs and fresh-install-only evidence',()=>{
    const plan={...planAndroidRelease([release()],base),sourceCommit};
    const metadata={...base,sourceCommit,appStartPath:'/app/home-1/index.html'};
    const upgrade={fromVersionCode:3,toVersionCode:4,dataRetained:true};
    const info="package: name='com.daengdabang.app' versionCode='4' versionName='1.0.3'";
    const signature=`Number of signers: 1\nV2 Signer: certificate SHA-256 digest: ${certificate}`;
    assert.doesNotThrow(()=>verifyAndroidReleaseEvidence(plan,metadata,upgrade,info,signature,certificate));
    for(const changed of [{...metadata,sourceCommit:'d'.repeat(40)},{...metadata,versionCode:3},{...metadata,appStartPath:'/app/index.html'}])assert.throws(()=>verifyAndroidReleaseEvidence(plan,changed,upgrade,info,signature,certificate));
    for(const changed of [{...upgrade,dataRetained:false},{...upgrade,fromVersionCode:4},{...upgrade,toVersionCode:3}])assert.throws(()=>verifyAndroidReleaseEvidence(plan,metadata,changed,info,signature,certificate));
    assert.throws(()=>verifyAndroidReleaseEvidence(plan,metadata,upgrade,info+' application-debuggable',signature,certificate));
    assert.throws(()=>verifyAndroidReleaseEvidence(plan,metadata,upgrade,info,signature,'d'.repeat(64)));
});
test('main builds sign and publish only after Android validation, with stale main guards',()=>{
    const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
    const workflow=read('.github/workflows/native-package-validation.yml');
    assert.match(workflow,/inputs\.release \|\| github\.ref == 'refs\/heads\/main'/);
    assert.match(workflow,/publish-android:[\s\S]*needs: android/);
    assert.match(workflow,/cancel-in-progress: false/);
    const publish=read('scripts/android-release.mjs');
    assert.equal((publish.match(/if \(!await isCurrentMain\(\)\)/g)||[]).length,2);
    assert.match(publish,/draft: true, prerelease: false/);
    assert.match(publish,/make_latest: 'true'/);
    const startup=read('scripts/verify-android-release-startup.sh');
    assert.ok(startup.indexOf('adb install "$DDB_PREVIOUS_ANDROID_APK"')<startup.indexOf('adb install -r'));
    assert.equal((startup.match(/adb uninstall/g)||[]).length,1);
});
test('homepage Android downloads always target the latest stable APK and explain update compatibility',()=>{
    const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
    assert.match(read('lib/android-release.ts'),/releases\/latest\/download\/DaengDaBang-Android\.apk/);
    assert.match(read('components/pwa/install-guide/AndroidApkInstall.tsx'),/href=\{ANDROID_APK_URL\}/);
    assert.match(read('components/pwa/install-guide/AndroidApkInstall.tsx'),/1\.0\.2 이상/);
    assert.match(read('components/pwa/install-guide/AppInstallWeb.tsx'),/platform === "android" \? <AndroidApkInstall/);
});
