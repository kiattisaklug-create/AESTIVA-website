/* =====================================================================
   analytics.js — ระบบนับสถิติของเว็บ AESTIVA (ทำงานเบื้องหลัง ไม่ต้องแก้ไฟล์นี้)
   - รับข้อมูลจาก pulse.js ที่ /api/pulse แล้วเก็บเป็นไฟล์บนเซิร์ฟเวอร์
   - หน้าดูสถิติอยู่ที่ /stats (ต้องใส่รหัสผ่านที่ตั้งไว้ใน Railway: STATS_PASSWORD)
   - ไม่เก็บ IP ที่อ่านออก ไม่ใช้คุกกี้ (แยกผู้เข้าชมด้วยค่า hash ที่เปลี่ยนใหม่ทุกวัน)
   ===================================================================== */
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const readline = require("readline");

/* ---------- ที่เก็บข้อมูล ---------- */
// ถ้าต่อ Volume ไว้ที่ Railway จะมีตัวแปร RAILWAY_VOLUME_MOUNT_PATH ให้เองอัตโนมัติ
const BASE = process.env.DATA_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname, "data");
let persistent = Boolean(process.env.DATA_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH);
let DIR = path.join(BASE, "aestiva-stats");
try {
  fs.mkdirSync(DIR, { recursive: true });
  fs.accessSync(DIR, fs.constants.W_OK);
} catch (err) {
  console.error("[stats] เขียนไฟล์ที่ " + DIR + " ไม่ได้ ใช้โฟลเดอร์ชั่วคราวแทน (ข้อมูลจะหายเมื่อ deploy ใหม่):", err.message);
  persistent = false;
  try {
    DIR = path.join(os.tmpdir(), "aestiva-stats");
    fs.mkdirSync(DIR, { recursive: true });
  } catch (err2) {
    console.error("[stats] ใช้โฟลเดอร์ชั่วคราวไม่ได้เช่นกัน ปิดการเก็บสถิติ (เว็บยังทำงานปกติ):", err2.message);
    DIR = null;
  }
}

function loadSecret() {
  if (process.env.STATS_SALT) return process.env.STATS_SALT;
  if (!DIR) return crypto.randomBytes(32).toString("hex");
  const file = path.join(DIR, ".secret");
  try {
    const s = fs.readFileSync(file, "utf8").trim();
    if (s) return s;
  } catch (e) { /* ยังไม่มีไฟล์ */ }
  const s = crypto.randomBytes(32).toString("hex");
  try { fs.writeFileSync(file, s, { mode: 0o600 }); } catch (e) { /* ใช้ค่าในหน่วยความจำต่อไป */ }
  return s;
}
const SECRET = loadSecret();

const STATS_PASSWORD = (process.env.STATS_PASSWORD || "").trim();
console.log("[stats] เก็บข้อมูลที่ " + DIR + " | ถาวร=" + (persistent ? "ใช่" : "ไม่ (ยังไม่ได้ต่อ Volume)") +
  " | ตั้งรหัสผ่านแล้ว=" + (STATS_PASSWORD ? "ใช่" : "ยังไม่ได้ตั้ง STATS_PASSWORD"));
if (STATS_PASSWORD && STATS_PASSWORD.length < 8) console.warn("[stats] รหัสผ่านสั้นเกินไป แนะนำอย่างน้อย 12 ตัวอักษร");

/* ---------- ตัวช่วย ---------- */
const DAY_MS = 86400000;
function bkk(ts) { // เวลาไทย (UTC+7)
  const t = new Date(ts + 7 * 3600 * 1000);
  return { d: t.toISOString().slice(0, 10), h: t.getUTCHours() };
}
function sha256(s) { return crypto.createHash("sha256").update(s).digest(); }

function clientIp(req) {
  const real = req.headers["x-real-ip"];
  if (real) return String(real).trim();
  const xff = req.headers["x-forwarded-for"];
  if (xff) return String(xff).split(",")[0].trim();
  return req.socket.remoteAddress || "";
}

const BOT_RE = /bot\b|bot\/|crawl|spider|slurp|facebookexternalhit|headlesschrome|lighthouse|pingdom|uptime|monitor|curl\/|wget|python|node-fetch|axios|go-http/i;

const SRC_MAP = [
  [/tiktok|musical\.ly/, "tiktok"],
  [/instagram/, "instagram"],
  [/(^|\.)line\.me$|line\.naver|liff\.line/, "line"],
  [/facebook|(^|\.)fb\.com$|(^|\.)fb\.me$|messenger/, "facebook"],
  [/google\./, "google"],
  [/bing\./, "bing"],
  [/youtube|youtu\.be/, "youtube"],
  [/(^|\.)t\.co$|twitter|(^|\.)x\.com$/, "x"]
];
function sourceOf(q, refHost) {
  const clean = String(q || "").toLowerCase().replace(/[^a-z0-9._ -]/g, "").trim().slice(0, 30);
  if (clean) return clean;
  const host = /^[a-z0-9.-]{1,80}$/i.test(refHost || "") ? refHost.toLowerCase() : "";
  if (!host) return "direct";
  for (const [re, name] of SRC_MAP) if (re.test(host)) return name;
  return host;
}
function deviceOf(w) {
  w = Number(w) || 0;
  if (w <= 0) return "unknown";
  if (w < 768) return "mobile";
  if (w < 1100) return "tablet";
  return "desktop";
}

const KINDS = new Set(["faq", "tab", "line", "tiktok", "instagram", "phone", "email", "link", "menu", "button"]);
const ID_RE = /^[a-z0-9_-]{1,24}$/;
function cleanLabel(s) {
  return String(s == null ? "" : s).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
}

/* ---------- กันการยิงถี่เกินไป ---------- */
const buckets = new Map(); // ip-hash -> { n, reset }
let globalBucket = { n: 0, reset: Date.now() + 60000 };
const PER_IP_PER_MIN = 90;
const GLOBAL_PER_MIN = 3000;
function allow(key) {
  const now = Date.now();
  if (now > globalBucket.reset) globalBucket = { n: 0, reset: now + 60000 };
  if (++globalBucket.n > GLOBAL_PER_MIN) return false;
  let b = buckets.get(key);
  if (!b || now > b.reset) { b = { n: 0, reset: now + 60000 }; buckets.set(key, b); }
  return ++b.n <= PER_IP_PER_MIN;
}
setInterval(() => {
  const now = Date.now();
  for (const [k, b] of buckets) if (now > b.reset) buckets.delete(k);
  for (const [k, f] of failures) if (now > f.until && now > f.first + 900000) failures.delete(k);
}, 60000).unref();

/* ---------- เขียนไฟล์ ---------- */
const MAX_FILE_BYTES = 300 * 1024 * 1024;
const sizes = new Map();
let fullWarned = false;
function appendEvent(rec) {
  if (!DIR) return;
  const file = path.join(DIR, "events-" + rec.d.slice(0, 7) + ".jsonl");
  let size = sizes.get(file);
  if (size === undefined) { try { size = fs.statSync(file).size; } catch (e) { size = 0; } }
  if (size > MAX_FILE_BYTES) {
    if (!fullWarned) { console.error("[stats] ไฟล์สถิติใหญ่เกินกำหนด หยุดบันทึกชั่วคราว"); fullWarned = true; }
    return;
  }
  const line = JSON.stringify(rec) + "\n";
  sizes.set(file, size + Buffer.byteLength(line));
  fs.appendFile(file, line, (err) => { if (err) console.error("[stats] เขียนไฟล์ไม่สำเร็จ:", err.message); });
}

function readBody(req, limit, cb) {
  let size = 0, done = false;
  const chunks = [];
  const finish = (v) => { if (!done) { done = true; cb(v); } };
  req.on("data", (c) => {
    size += c.length;
    if (size > limit) { finish(null); req.destroy(); return; }
    chunks.push(c);
  });
  req.on("end", () => finish(Buffer.concat(chunks).toString("utf8")));
  req.on("error", () => finish(null));
}

/* ---------- รับข้อมูลจากหน้าเว็บ: POST /api/pulse ---------- */
function handlePulse(req, res) {
  if (req.method !== "POST") { res.writeHead(405, { Allow: "POST" }); return res.end(); }
  const ua = String(req.headers["user-agent"] || "").slice(0, 300);
  const ip = clientIp(req);
  const now = Date.now();
  const { d, h } = bkk(now);
  const visitor = crypto.createHash("sha256").update(SECRET + "|" + d + "|" + ip + "|" + ua).digest("hex").slice(0, 12);

  if (!allow(visitor)) { res.writeHead(429); return res.end(); }

  readBody(req, 2048, (raw) => {
    if (raw === null) { res.writeHead(413); return res.end(); }
    let e;
    try { e = JSON.parse(raw); } catch (err) { res.writeHead(400); return res.end(); }
    if (!e || typeof e !== "object") { res.writeHead(400); return res.end(); }

    // บอท / ตัวตรวจเว็บ: รับแต่ไม่นับ
    if (!ua || BOT_RE.test(ua)) { res.writeHead(204); return res.end(); }

    const rec = { ts: now, d, h, v: visitor };
    if (e.t === "v") {
      rec.t = "v";
      rec.src = sourceOf(e.q, e.r);
      rec.dev = deviceOf(e.w);
    } else if (e.t === "s") {
      if (typeof e.s !== "string" || !ID_RE.test(e.s)) { res.writeHead(400); return res.end(); }
      rec.t = "s"; rec.s = e.s;
    } else if (e.t === "c") {
      const label = cleanLabel(e.l);
      if (!KINDS.has(e.k) || !label) { res.writeHead(400); return res.end(); }
      if (e.s && (typeof e.s !== "string" || !ID_RE.test(e.s))) { res.writeHead(400); return res.end(); }
      rec.t = "c"; rec.k = e.k; rec.l = label; rec.s = e.s || "";
    } else {
      res.writeHead(400); return res.end();
    }
    appendEvent(rec);
    res.writeHead(204, { "Cache-Control": "no-store" });
    res.end();
  });
}

/* ---------- รหัสผ่านหน้าสถิติ ---------- */
const failures = new Map(); // ip-hash -> { n, first, until }
const NO_PASSWORD_HTML = `<!doctype html><html lang="th"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>ยังไม่ได้ตั้งรหัสผ่าน | AESTIVA</title>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#FAF9F6;color:#3A2E1F;font-family:system-ui,'Leelawadee UI',Tahoma,sans-serif;padding:24px;line-height:1.8">
<div style="max-width:520px"><p style="font-size:14px;letter-spacing:.3em;color:#8A6410;margin:0">AESTIVA</p>
<h1 style="font-weight:600;font-size:26px;margin:12px 0">ยังไม่ได้ตั้งรหัสผ่านหน้าสถิติ</h1>
<p>เพื่อความปลอดภัย หน้านี้จะเปิดได้ก็ต่อเมื่อตั้งรหัสผ่านแล้ว</p>
<p>ไปที่ Railway → บริการของเว็บ → แท็บ <b>Variables</b> → เพิ่มตัวแปรชื่อ <code>STATS_PASSWORD</code> แล้วใส่รหัสผ่านที่คุณต้องการ (ดูขั้นตอนละเอียดในคู่มือ START-HERE ข้อ 7)</p></div></body></html>`;

function sendText(res, code, body, extra) {
  res.writeHead(code, Object.assign({
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Robots-Tag": "noindex, nofollow",
    "X-Content-Type-Options": "nosniff"
  }, extra || {}));
  res.end(body);
}

function authorized(req, res) {
  if (!STATS_PASSWORD) { sendText(res, 503, NO_PASSWORD_HTML); return false; }
  const key = crypto.createHash("sha256").update("f|" + clientIp(req)).digest("hex").slice(0, 12);
  const now = Date.now();
  const f = failures.get(key);
  if (f && f.n >= 10 && now < f.until) {
    sendText(res, 429, "<meta charset=\"utf-8\">ลองรหัสผิดหลายครั้งเกินไป กรุณารอ 15 นาทีแล้วลองใหม่");
    return false;
  }
  const m = /^Basic\s+(.+)$/i.exec(req.headers.authorization || "");
  if (m) {
    let given = "";
    try {
      const dec = Buffer.from(m[1], "base64").toString("utf8");
      const i = dec.indexOf(":");
      given = i >= 0 ? dec.slice(i + 1) : dec;
    } catch (e) { given = ""; }
    if (crypto.timingSafeEqual(sha256(given), sha256(STATS_PASSWORD))) { failures.delete(key); return true; }
    const cur = failures.get(key);
    if (!cur || now > cur.first + 900000) failures.set(key, { n: 1, first: now, until: now + 900000 });
    else { cur.n++; cur.until = now + 900000; }
  }
  sendText(res, 401, "<meta charset=\"utf-8\">ต้องใส่รหัสผ่านเพื่อดูสถิติ", {
    "WWW-Authenticate": "Basic realm=\"AESTIVA Stats\", charset=\"UTF-8\""
  });
  return false;
}

/* ---------- รวมตัวเลข ---------- */
function dayList(days) {
  const [y, m, dd] = bkk(Date.now()).d.split("-").map(Number);
  const base = Date.UTC(y, m - 1, dd);
  const out = [];
  for (let i = days - 1; i >= 0; i--) out.push(new Date(base - i * DAY_MS).toISOString().slice(0, 10));
  return out;
}

function aggregate(days) {
  const list = dayList(days);
  const daySet = new Set(list);
  const months = Array.from(new Set(list.map((d) => d.slice(0, 7))));

  const daily = new Map(list.map((d) => [d, { d, views: 0, visitors: new Set(), clicks: 0 }]));
  const hours = new Array(24).fill(0);
  const sections = new Map();
  const clicks = new Map();
  const sources = new Map();
  const devices = { mobile: 0, tablet: 0, desktop: 0, unknown: 0 };
  const contactVisitors = new Set();
  let views = 0, clickTotal = 0, contactActions = 0;

  const files = DIR ? months.map((mo) => path.join(DIR, "events-" + mo + ".jsonl")).filter((f) => fs.existsSync(f)) : [];

  return files.reduce((chain, file) => chain.then(() => new Promise((resolve) => {
    const rl = readline.createInterface({ input: fs.createReadStream(file, { encoding: "utf8" }), crlfDelay: Infinity });
    rl.on("line", (line) => {
      let e;
      try { e = JSON.parse(line); } catch (err) { return; }
      if (!e || !daySet.has(e.d)) return;
      const day = daily.get(e.d);
      day.visitors.add(e.v);
      if (e.t === "v") {
        views++; day.views++;
        if (e.h >= 0 && e.h < 24) hours[e.h]++;
        sources.set(e.src || "direct", (sources.get(e.src || "direct") || 0) + 1);
        devices[e.dev] = (devices[e.dev] || 0) + 1;
      } else if (e.t === "s") {
        sections.set(e.s, (sections.get(e.s) || 0) + 1);
      } else if (e.t === "c") {
        clickTotal++; day.clicks++;
        const key = e.k + "|" + e.l + "|" + (e.s || "");
        const cur = clicks.get(key);
        if (cur) cur.count++; else clicks.set(key, { k: e.k, l: e.l, s: e.s || "", count: 1 });
        if (e.k === "line" || e.k === "phone" || e.k === "email") { contactActions++; contactVisitors.add(e.d + "|" + e.v); }
      }
    });
    rl.on("close", resolve);
    rl.on("error", resolve);
  })), Promise.resolve()).then(() => {
    const dailyOut = list.map((d) => { const x = daily.get(d); return { d, views: x.views, visitors: x.visitors.size, clicks: x.clicks }; });
    const visitors = dailyOut.reduce((s, x) => s + x.visitors, 0);
    return {
      days, from: list[0], to: list[list.length - 1], persistent, generatedAt: Date.now(),
      totals: { views, visitors, clicks: clickTotal, contactActions, contactVisitors: contactVisitors.size },
      daily: dailyOut,
      hours,
      sections: Array.from(sections, ([s, count]) => ({ s, count })),
      clicks: Array.from(clicks.values()).sort((a, b) => b.count - a.count).slice(0, 40),
      sources: Array.from(sources, ([src, n]) => ({ src, views: n })).sort((a, b) => b.views - a.views).slice(0, 15),
      devices
    };
  });
}

/* ---------- ทางเข้าของเซิร์ฟเวอร์ ---------- */
const STATS_PAGE = path.join(__dirname, "stats.html");

function handle(req, res) {
  const url = req.url.split("?")[0];

  if (url === "/api/pulse") { handlePulse(req, res); return true; }

  if (url === "/stats" || url === "/stats/") {
    if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405, { Allow: "GET, HEAD" }); res.end(); return true; }
    if (!authorized(req, res)) return true;
    fs.readFile(STATS_PAGE, (err, data) => {
      if (err) return sendText(res, 500, "ไม่พบไฟล์ stats.html");
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "Referrer-Policy": "no-referrer"
      });
      res.end(req.method === "HEAD" ? undefined : data);
    });
    return true;
  }

  if (url === "/api/stats") {
    if (req.method !== "GET") { res.writeHead(405, { Allow: "GET" }); res.end(); return true; }
    if (!authorized(req, res)) return true;
    const q = new URLSearchParams(req.url.split("?")[1] || "");
    let days = parseInt(q.get("days"), 10);
    if (!(days >= 1)) days = 30;
    days = Math.min(days, 365);
    aggregate(days).then((out) => {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" });
      res.end(JSON.stringify(out));
    }).catch((err) => {
      console.error("[stats] รวมตัวเลขไม่สำเร็จ:", err);
      sendText(res, 500, "เกิดข้อผิดพลาด");
    });
    return true;
  }

  return false;
}

module.exports = { handle };
