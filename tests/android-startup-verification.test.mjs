import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, copyFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, basename } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { isAppHome, verifyWebView } from "../scripts/verify-android-webview.mjs";

const home = { url: "https://localhost/app/index.html", title: "댕다방", readyState: "complete", text: "댕다방 앱 홈" };
const page = { id: "app", type: "page", url: home.url, webSocketDebuggerUrl: "ws://127.0.0.1:9222/devtools/page/app" };
const noWait = async () => {};

test("startup still requires the rendered local app home", () => {
    assert.equal(isAppHome(home), true);
    for (const changed of [{text:""}, {title:""}, {readyState:"loading"}, {url:"https://localhost/offline/index.html"}, {url:"https://www.daengdabang.com/app/index.html"}, {url:"invalid"}]) {
        assert.ok(!isAppHome({...home, ...changed}));
    }
});

test("an unrelated page cannot hide the matching app target", async () => {
    const result = await verifyWebView({
        fetchTargets: async () => [{...page, id:"other", url:"about:blank"}, page],
        readDocument: async (target) => { assert.equal(target.id,"app"); return home; },
        wait:noWait,
    });
    assert.equal(result.passed,true);
});

test("a late WebView retries and must render before succeeding", async () => {
    let attempt=0;
    const result=await verifyWebView({fetchTargets:async()=> ++attempt===1 ? [] : [page], readDocument:async()=> attempt===2 ? {...home,readyState:"loading"} : home, wait:noWait,attempts:3});
    assert.equal(result.passed,true);
    assert.equal(result.attempt,3);
});

test("missing targets preserve diagnostic target metadata and fail", async () => {
    const result=await verifyWebView({fetchTargets:async()=>[{id:"worker",type:"service_worker",url:"https://localhost/sw.js",title:"worker"}], readDocument:async()=>{throw new Error("must not read worker");},wait:noWait,attempts:2});
    assert.equal(result.passed,false);
    assert.equal(result.targets[0].type,"service_worker");
    assert.equal(result.state,null);
    assert.match(result.error,/No debuggable/);
});

test("blank or wrong documents cannot pass and remain in the failure report", async () => {
    const blank={...home,text:""};
    const result=await verifyWebView({fetchTargets:async()=>[page],readDocument:async()=>blank,wait:noWait,attempts:2});
    assert.equal(result.passed,false);
    assert.deepEqual(result.state,blank);
});

test("target endpoint and document exceptions remain explicit failures", async () => {
    for (const mode of ["fetch","read"]) {
        const result=await verifyWebView({fetchTargets:async()=>{if(mode==="fetch")throw new Error("endpoint offline");return[page];},readDocument:async()=>{throw new Error("renderer unavailable");},wait:noWait,attempts:1});
        assert.equal(result.passed,false);
        assert.match(result.error,/offline|unavailable/);
    }
});

test("non-array target responses fail without silently accepting a page", async()=>{
    const result=await verifyWebView({fetchTargets:async()=>({error:"unexpected"}),wait:noWait,attempts:1});
    assert.equal(result.passed,false);
    assert.match(result.error,/not an array/);
});

for(const fails of [false,true])test(`startup shell binds the app PID and captures exit diagnostics (${fails ? "failure" : "success"})`,async()=>{
    const dir=await mkdtemp(join(tmpdir(),"ddb-native-startup-test-"));
    try {
        await mkdir(join(dir,"bin"));
        await mkdir(join(dir,"scripts"));
        const artifacts=join(dir,"android/app/build/outputs/apk/debug");
        await mkdir(artifacts,{recursive:true});
        await copyFile(fileURLToPath(new URL("../scripts/verify-android-apk-startup.sh",import.meta.url)),join(dir,"scripts/verify-android-apk-startup.sh"));
        const adb=`#!/bin/sh
printf '%s\\n' "$*" >> "$DDB_TEST_TRACE"
case "$*" in
 'shell pidof com.daengdabang.app') printf '2589\\r\\n' ;;
 'shell dumpsys activity activities') echo 'com.daengdabang.app/.MainActivity' ;;
 'shell cat /proc/net/unix') printf '000 @webview_devtools_remote_111\\n000 @webview_devtools_remote_2589\\n' ;;
 'exec-out screencap -p') echo 'test-only-screen-fixture' ;;
 'logcat -d -v threadtime --pid=2589') echo 'test-only-final-log' ;;
esac
`;
        for(const [name,contents]of Object.entries({adb,sleep:"#!/bin/sh\nexit 0\n",node:`#!/bin/sh\nprintf '{"passed":${!fails}}\\n'\nexit ${fails?1:0}\n`}))await writeFile(join(dir,"bin",name),contents,{mode:0o755});
        // The bundled Windows Git shell has no tee utility. Supply its text-only
        // behavior for this shell harness; Linux CI uses the system utility.
        if(process.platform==="win32")await writeFile(join(dir,"bin","tee"),`#!/bin/sh
if [ "$1" = '-a' ]; then shift; else : > "$1"; fi
while IFS= read -r line; do printf '%s\\n' "$line" >> "$1"; printf '%s\\n' "$line"; done
`,{mode:0o755});
        const shell=process.env.DDB_TEST_SH || "sh";
        const posix=(p)=>process.platform==="win32" ? p.replace(/^([A-Za-z]):/,(_,drive)=>`/${drive.toLowerCase()}`).replaceAll("\\","/") : p;
        const bin=posix(join(dir,"bin"));
        const trace=join(dir,"adb-trace.txt");
        const proc=spawnSync(shell,["-c",'PATH="$DDB_TEST_BIN:/usr/bin:/bin:$PATH"; export PATH; sh scripts/verify-android-apk-startup.sh'],{cwd:dir,encoding:"utf8",timeout:15_000,env:{...process.env,DDB_TEST_BIN:bin,DDB_TEST_TRACE:posix(trace)}});
        assert.equal(proc.status,fails?1:0,`${proc.stdout}\n${proc.stderr}`);
        const commands=await readFile(trace,"utf8");
        assert.match(commands,/forward tcp:9222 localabstract:webview_devtools_remote_2589/);
        assert.doesNotMatch(commands,/forward tcp:9222 localabstract:webview_devtools_remote_111/);
        assert.match(commands,/forward --remove tcp:9222/);
        assert.match(await readFile(join(artifacts,"app-debug-launch.png"),"utf8"),/test-only-screen/);
        assert.match(await readFile(join(artifacts,"app-debug-logcat.txt"),"utf8"),/test-only-final-log/);
        assert.equal(JSON.parse(await readFile(join(artifacts,"app-debug-webview.json"),"utf8")).passed,!fails);
    } finally {
        assert.equal(resolve(dir,".."),resolve(tmpdir()));
        assert.ok(basename(dir).startsWith("ddb-native-startup-test-"));
        await rm(dir,{recursive:true,force:true});
    }
});
