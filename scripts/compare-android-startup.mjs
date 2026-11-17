import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

// Software performance test for the disposable GitHub emulator. Never run on
// a person's phone. No UI clicks, accounts, approvals, or payment requests.
if (process.env.GITHUB_ACTIONS !== "true") throw new Error("CI emulator only");
const adb = (...args) => execFileSync("adb", args, {encoding:"utf8", timeout:90_000}).trim();
if (adb("shell", "getprop", "ro.kernel.qemu") !== "1") throw new Error("Refusing a non-emulator device");
const previous = process.env.DDB_PREVIOUS_ANDROID_APK;
if (!previous) throw new Error("Previous public APK required");
const debug = "android/app/build/outputs/apk/debug/app-debug.apk";
const out = "android/app/build/outputs/startup-comparison";
const temp = path.join(process.env.RUNNER_TEMP, "startup-comparison");
mkdirSync(out, {recursive:true});
execFileSync("python3", ["scripts/prepare-startup-comparison.py", debug, previous, temp], {stdio:"inherit"});
const packageName = "com.daengdabang.app";
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let requestId = 0;

function call(socket, method, params={}) {
    return new Promise((resolve, reject) => {
        const id=++requestId;
        const timer=setTimeout(()=>{socket.removeEventListener("message", receive); reject(new Error(`Timed out: ${method}`));},10_000);
        function receive(event) {
            const message=JSON.parse(String(event.data));
            if(message.id!==id)return;
            clearTimeout(timer);socket.removeEventListener("message",receive);
            if(message.error || message.result?.exceptionDetails)reject(new Error(JSON.stringify(message.error || message.result.exceptionDetails)));
            else resolve(message.result);
        }
        socket.addEventListener("message",receive);
        socket.send(JSON.stringify({id,method,params}));
    });
}
async function connect() {
    const deadline=Date.now()+45_000;
    while(Date.now()<deadline) {
        const pid=adb("shell","pidof",packageName).split(" ")[0];
        try {
            adb("forward","tcp:9222",`localabstract:webview_devtools_remote_${pid}`);
            const pages=await (await fetch("http://127.0.0.1:9222/json")).json();
            const page=pages.find(p=>p.type==="page" && p.url.includes("localhost"));
            if(page?.webSocketDebuggerUrl) {
                const socket=new WebSocket(page.webSocketDebuggerUrl);
                await new Promise((resolve,reject)=>{socket.addEventListener("open",resolve,{once:true});socket.addEventListener("error",reject,{once:true});});
                return socket;
            }
        } catch { /* The WebView starts after the activity. */ }
        await sleep(150);
    }
    throw new Error("No startup WebView");
}
const expression=`(() => ({
    origin: performance.timeOrigin,
    interactiveMs: performance.getEntriesByName('ddb-native-interactive')[0]?.startTime ?? null,
    firstContentfulPaintMs: performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null,
    homePresent: !!document.querySelector('.st-page'),
    tabInteractive: typeof document.querySelector('.app-tabbar a[href="/app/sticker/shop/"]')?.onclick === 'function',
    title: document.title, path: location.pathname,
    viewport: [innerWidth,innerHeight], userAgent: navigator.userAgent,
    fontsReady: document.fonts.status === 'loaded'
}))()`;
const report={
    scope:"Same API 35 emulator and debug native shell; previous public APK web assets vs candidate, fresh app storage each run. No S25 claim.",
    baselineApkSha256:createHash("sha256").update(readFileSync(previous)).digest("hex"),
    candidateDebugSha256:createHash("sha256").update(readFileSync(debug)).digest("hex"),
    baselineVersionCode:process.env.DDB_PREVIOUS_ANDROID_VERSION_CODE,
    candidateCommit:process.env.GITHUB_SHA,
    warmups:[], runs:[],
};
if (adb("shell","pm","list","packages",packageName).includes(`package:${packageName}`)) adb("uninstall",packageName);
// Balanced ABBA/BAAB order, with one excluded warmup per variant.
const order=["baseline","candidate", "baseline","candidate","candidate","baseline", "candidate","baseline","baseline","candidate", "baseline","candidate","candidate","baseline", "candidate","baseline","baseline","candidate"];
for (const [index,label] of order.entries()) {
    adb("install","-r",path.join(temp,`${label}.apk`));
    adb("shell","pm","clear",packageName);
    adb("shell","am","force-stop",packageName);
    await sleep(1500);
    const deviceStart=Number(adb("shell","date","+%s%3N"));
    if(!Number.isFinite(deviceStart))throw new Error("Device clock unavailable");
    const launch=adb("shell","am","start","-W","-n",`${packageName}/.MainActivity`);
    const socket=await connect();
    const deadline=Date.now()+45_000;
    let result;
    while(Date.now()<deadline) {
        result=(await call(socket,"Runtime.evaluate",{expression,returnByValue:true})).result.value;
        if(result?.interactiveMs && result.firstContentfulPaintMs && result.homePresent && result.tabInteractive && result.fontsReady)break;
        await sleep(200);
    }
    socket.close();
    if(!result?.interactiveMs || !result.firstContentfulPaintMs || !result.homePresent || !result.tabInteractive || !result.fontsReady)throw new Error(`Home did not become usable: ${JSON.stringify(result)}`);
    const row={label,index,...result,activityLaunchMs:Number(/TotalTime:\s*(\d+)/.exec(launch)?.[1]),launchToHomeMs:result.origin-deviceStart+result.interactiveMs};
    (index<2 ? report.warmups : report.runs).push(row);
    writeFileSync(`${out}/comparison.json`,JSON.stringify(report,null,2)+"\n");
    writeFileSync(`${out}/${index}-${label}-launch.txt`,launch);
    if(index<4)writeFileSync(`${out}/${index}-${label}.png`,execFileSync("adb",["exec-out","screencap","-p"]));
    console.log(JSON.stringify(row));
}
function median(values){values.sort((a,b)=>a-b);return (values[values.length/2-1]+values[values.length/2])/2;}
report.medians={};
for(const metric of ["firstContentfulPaintMs","interactiveMs","launchToHomeMs","activityLaunchMs"]) {
    const baseline=median(report.runs.filter(r=>r.label==="baseline").map(r=>r[metric]));
    const candidate=median(report.runs.filter(r=>r.label==="candidate").map(r=>r[metric]));
    report.medians[metric]={baseline,candidate,improvementPercent:100*(baseline-candidate)/baseline};
}
writeFileSync(`${out}/comparison.json`,JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify(report.medians,null,2));
adb("install","-r",debug);
adb("shell","pm","clear",packageName);
