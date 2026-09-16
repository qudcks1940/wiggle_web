// 위글 화면 캡처: 교사 로그인 → 명단 학급 → 회차 열기 → 학생 입장 → 그리기 → 각 화면 저장
import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";

const BASE = process.argv[2] ?? "http://localhost:3299";
const OUT = process.argv[3] ?? "/tmp/shots";
mkdirSync(OUT, { recursive: true });
const port = 9460;
const profile = resolve(tmpdir(), `cap-${Date.now()}`);
mkdirSync(profile, { recursive: true });
const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "--no-first-run", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=2", "about:blank"], { stdio: "ignore" });
async function wsUrl() { for (let i = 0; i < 60; i++) { try { const r = await fetch(`http://127.0.0.1:${port}/json/version`); return (await r.json()).webSocketDebuggerUrl; } catch { await new Promise((d) => setTimeout(d, 200)); } } throw new Error("no devtools"); }
class Cdp {
  constructor(s) { this.s = s; this.id = 0; this.p = new Map(); s.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && this.p.has(m.id)) { const { res, rej } = this.p.get(m.id); this.p.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); } }); }
  send(method, params = {}, sessionId) { const id = ++this.id; return new Promise((res, rej) => { this.p.set(id, { res, rej }); this.s.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) })); }); }
}
const wait = (ms) => new Promise((d) => setTimeout(d, ms));
const log = [];

try {
  const ws = new WebSocket(await wsUrl());
  await new Promise((d) => ws.addEventListener("open", d, { once: true }));
  const cdp = new Cdp(ws);
  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
  const { sessionId: s } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
  await cdp.send("Page.enable", {}, s);
  await cdp.send("Runtime.enable", {}, s);

  const size = (w, h) => cdp.send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 2, mobile: w < 700 }, s);
  const ev = async (expr) => {
    const r = await cdp.send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }, s);
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? "eval");
    return r.result.value;
  };
  const evSafe = async (expr) => { try { return await Promise.race([ev(expr), new Promise((_, rj) => setTimeout(() => rj(new Error("t")), 2500))]); } catch { return null; } };
  const nav = async (url) => {
    await cdp.send("Page.navigate", { url }, s);
    for (let i = 0; i < 90; i++) { await wait(150); if (await evSafe("document.readyState") === "complete") break; }
    await wait(900);
  };
  const shot = async (name) => {
    const r = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }, s);
    writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.data, "base64"));
    log.push(`saved ${name}`);
    console.log("saved", name);
  };
  const waitFor = async (selector, tries = 70) => {
    for (let i = 0; i < tries; i++) { if (await evSafe(`Boolean(document.querySelector(${JSON.stringify(selector)}))`)) return true; await wait(150); }
    return false;
  };

  // ── 시드 ────────────────────────────────────────────────────────────────
  await size(1440, 900);
  await nav(`${BASE}/teacher`);
  const seeded = await ev(`(async () => {
    const post = async (body) => { const r = await fetch('/api/teacher', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store' }); return { status: r.status, data: await r.json().catch(() => ({})) }; };
    const login = await post({ action: 'login', email: 'capture@local.test', pin: 'capturedemo12' });
    if (login.status >= 400) return { error: 'login', login };
    const created = await post({ action: 'createClassroom', displayName: '햇살 2반', roster: [
      { seatNumber: 1, realName: '김민준' }, { seatNumber: 2, realName: '이서연' }, { seatNumber: 3, realName: '박지호' },
      { seatNumber: 4, realName: '최하윤' }, { seatNumber: 5, realName: '정다은' }, { seatNumber: 6, realName: '한지우' },
    ] });
    if (!created.data.classroom) return { error: 'classroom', created };
    const classroomId = created.data.classroom.id;
    await post({ action: 'toggleAdmission', classroomId, open: true });
    await post({ action: 'setEpisode', classroomId, arcId: 'circle-story', episodeId: 'circle-story-seed' });
    const codes = Object.fromEntries(created.data.entryCodes.map((r) => [r.seatNumber, r.entryCode]));
    // 반 친구 몇 명을 미리 입장시켜 교사 화면이 비어 보이지 않게 한다.
    const others = [];
    for (const [seat, animal] of [[2, '🐻'], [3, '🦊'], [4, '🐼']]) {
      const r = await fetch('/api/student', { method: 'POST', headers: { 'content-type': 'application/json' }, cache: 'no-store', body: JSON.stringify({ action: 'join', entry: created.data.classroom.classCode, entryCode: codes[seat], animal }) });
      const j = await r.json().catch(() => ({}));
      if (j.deviceToken) others.push({ seat, token: j.deviceToken, id: j.student.id });
    }
    return { classroomId, classCode: created.data.classroom.classCode, joinToken: created.data.classroom.joinToken, codes, others };
  })()`);
  if (seeded.error) throw new Error(JSON.stringify(seeded));
  console.log("seeded", seeded.classCode, JSON.stringify(seeded.codes));

  // ── 1. 대문 ─────────────────────────────────────────────────────────────
  for (const [w, h, tag] of [[1440, 900, "desktop"], [390, 844, "phone"]]) {
    await size(w, h);
    await nav(`${BASE}/`);
    await shot(`01-landing-${tag}`);
  }

  // ── 2. 학생 입장: 참여 코드 수첩 ─────────────────────────────────────────
  const fillCode = (value) => `(() => { const el = document.querySelector('.entry-code-input'); const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('input', { bubbles: true })); return el.value; })()`;
  for (const [w, h, tag] of [[1440, 900, "desktop"], [390, 844, "phone"]]) {
    await size(w, h);
    await nav(`${BASE}/join?code=${seeded.classCode}`);
    await waitFor(".entry-code-input");
    await ev(`(() => { [...document.querySelectorAll('button')].filter((b) => /^[0-9]$/.test(b.textContent.trim())).slice(0, 4).forEach((b) => b.click()); return 1; })()`);
    await wait(300);
    await shot(`02-entry-code-${tag}`);
    // 틀린 코드 → 선생님 불러요
    await ev(fillCode("000000"));
    await wait(200);
    await ev(`document.querySelector('.code-card .child-primary-action').click()`);
    await waitFor(".teacher-call-button");
    await ev(`(() => { const b = document.querySelector('.teacher-call-button'); b && b.click(); return 1; })()`);
    await wait(400);
    await shot(`03-entry-wrong-code-${tag}`);
  }

  // ── 3. 동물 고르기 (1번 자리, 아직 미사용) ───────────────────────────────
  for (const [w, h, tag] of [[1440, 900, "desktop"], [390, 844, "phone"]]) {
    await size(w, h);
    await nav(`${BASE}/join?code=${seeded.classCode}`);
    await waitFor(".entry-code-input");
    await ev(fillCode(seeded.codes[1]));
    await wait(200);
    await ev(`(() => { setTimeout(() => document.querySelector('.code-card .child-primary-action').click(), 0); return 1; })()`);
    await waitFor(".animal-card");
    await ev(`(() => { const b = [...document.querySelectorAll('.animal-choice-grid .emoji-chip')].find((x) => x.getAttribute('aria-label') === '토끼 고르기'); b && b.click(); return 1; })()`);
    await wait(400);
    await shot(`04-entry-animal-${tag}`);
  }

  // 1번 아이로 실제 입장해 홈·그리기 캡처
  await size(1440, 900);
  await ev(`(() => { setTimeout(() => document.querySelector('.animal-card .child-primary-action').click(), 0); return 1; })()`);
  for (let i = 0; i < 90; i++) { await wait(200); if ((await evSafe("location.pathname") ?? "").startsWith("/student")) break; }
  await wait(1500);

  // ── 4. 학생 홈 ──────────────────────────────────────────────────────────
  for (const [w, h, tag] of [[1440, 900, "desktop"], [390, 844, "phone"]]) {
    await size(w, h);
    await nav(`${BASE}/student`);
    await waitFor(".today-episode-card", 90);
    await shot(`05-student-home-${tag}`);
  }

  // ── 5. 그리기 화면 (오늘 회차: 씨앗 동그라미) ────────────────────────────
  await size(1440, 900);
  await nav(`${BASE}/student`);
  await waitFor(".today-episode-card", 90);
  await ev(`(() => { const b = [...document.querySelectorAll('.today-episode-card button')].find((e) => e.textContent.includes('그리기 시작')); if (b) { setTimeout(() => b.click(), 0); return true; } return false; })()`);
  for (let i = 0; i < 120; i++) { await wait(200); if ((await evSafe("location.pathname") ?? "").startsWith("/student/draw")) break; }
  await waitFor("canvas", 120);
  await wait(2500);
  const drawUrl = await evSafe("location.href");
  // 아이가 그린 것처럼 몇 획을 남긴다(씨앗 동그라미 위에 얼굴).
  const box = await evSafe(`(() => { const c = document.querySelector('.draw-canvas') || document.querySelector('canvas'); if (!c) return null; const b = c.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; })()`);
  if (box) {
    const stroke = async (points) => {
      const [first, ...rest] = points;
      await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: box.x + first[0] * box.w, y: box.y + first[1] * box.h, button: "left", clickCount: 1, buttons: 1 }, s);
      for (const [px, py] of rest) { await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: box.x + px * box.w, y: box.y + py * box.h, button: "left", buttons: 1 }, s); await wait(12); }
      const last = points[points.length - 1];
      await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: box.x + last[0] * box.w, y: box.y + last[1] * box.h, button: "left", clickCount: 1, buttons: 1 }, s);
      await wait(200);
    };
    const arc = (cx, cy, r, from, to, n = 16) => Array.from({ length: n + 1 }, (_, i) => { const t = from + (to - from) * (i / n); return [cx + Math.cos(t) * r, cy + Math.sin(t) * r * 1.6]; });
    await stroke([[0.455, 0.44], [0.457, 0.47]]);              // 왼쪽 눈
    await stroke([[0.545, 0.44], [0.547, 0.47]]);              // 오른쪽 눈
    await stroke(arc(0.5, 0.5, 0.055, 0.35 * Math.PI, 0.65 * Math.PI, 14)); // 웃는 입
    await stroke([[0.5, 0.38], [0.5, 0.3], [0.54, 0.26]]);     // 꼭지
    await stroke([[0.62, 0.5], [0.72, 0.44]]);                 // 옆 선
    await wait(700);
  }
  for (const [w, h, tag] of [[1440, 900, "desktop"], [390, 844, "phone"]]) {
    await size(w, h);
    await wait(900);
    await shot(`06-drawing-studio-${tag}`);
  }
  log.push(`draw url ${drawUrl}`);

  // ── 6. 내 그림 / 그림책 ──────────────────────────────────────────────────
  await size(1440, 900);
  await nav(`${BASE}/student/archive`);
  await wait(1200);
  await shot("07-student-archive-desktop");
  await nav(`${BASE}/student/books`);
  await wait(1200);
  await shot("08-student-books-desktop");

  // ── 7. 교사 화면 ────────────────────────────────────────────────────────
  await size(1440, 900);
  await nav(`${BASE}/teacher`);
  await wait(1400);
  await shot("09-teacher-classes-desktop");
  for (const [view, name] of [["", "10-teacher-today"], ["?view=archive", "11-teacher-works"], ["?view=settings", "12-teacher-roster"]]) {
    await nav(`${BASE}/teacher/class/${seeded.classroomId}${view}`);
    await wait(1600);
    await shot(`${name}-desktop`);
  }
  // 교사 조종석(회차 변경)과 입장 QR
  await nav(`${BASE}/teacher/class/${seeded.classroomId}`);
  await wait(1400);
  await ev(`(() => { const b = [...document.querySelectorAll('button')].find((x) => /회차|이야기/.test(x.textContent)); if (b) { b.click(); return b.textContent.trim().slice(0, 20); } return null; })()`).then((v) => log.push(`episode dialog: ${v}`));
  await wait(900);
  if (await evSafe("Boolean(document.querySelector('.arc-cockpit, dialog, .tcw-dialog'))")) await shot("13-teacher-episode-desktop");
  await nav(`${BASE}/teacher/class/${seeded.classroomId}?view=settings`);
  await wait(1400);
  await ev(`(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('QR 보기')); if (b) { b.click(); return true; } return false; })()`);
  await wait(900);
  if (await evSafe("Boolean(document.querySelector('.large-qr-dialog'))")) await shot("14-teacher-qr-desktop");

  // ── 8. 정책 문서 ────────────────────────────────────────────────────────
  await nav(`${BASE}/privacy`);
  await wait(900);
  await shot("15-privacy-desktop");

  console.log("SEED", JSON.stringify({ classCode: seeded.classCode, classroomId: seeded.classroomId, codes: seeded.codes, drawUrl }));
} finally {
  chrome.kill();
  console.log(log.join("\n"));
}
