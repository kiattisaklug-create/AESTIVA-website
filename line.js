/* =====================================================================
   line.js — แจ้งเตือนยอดผู้เข้าชมเว็บผ่าน LINE (ทำงานเบื้องหลัง ไม่ต้องแก้ไฟล์นี้)

   ทำอะไร: ส่งข้อความเข้า LINE ของคุณ "ทุกครั้งที่มีคนเข้าชมเว็บ" พร้อมสรุปยอด
           วันนี้ / 7 วันล่าสุด / 30 วันล่าสุด

   ก่อนใช้งานต้องตั้งค่า 2 อย่างใน Railway → Variables:
     LINE_CHANNEL_ACCESS_TOKEN   (จาก LINE Developers Console)
     LINE_CHANNEL_SECRET         (จาก LINE Developers Console)

   ปรับความถี่ได้ (ไม่บังคับ ค่าเริ่มต้น = แจ้งทันทีทุกครั้ง):
     LINE_NOTIFY_GAP_HOURS = ห่างกันอย่างน้อยกี่ชั่วโมงต่อ 1 ข้อความ (ใส่ 0 = ไม่จำกัด/ทันทีทุกครั้ง)
     เช่นใส่ 3 → ถ้ามีคนเข้าเว็บถี่กว่า 3 ชม. จะยุบรวมเป็นข้อความเดียว (บอกจำนวนครั้งที่รวมไว้)
     แก้ค่านี้ได้เองที่ Railway → บริการเว็บ → แท็บ Variables (ไม่ต้องแก้ไฟล์นี้)

   ดูสถานะ/ทดสอบส่งได้ที่หน้า /stats (การ์ด "แจ้งเตือนผ่าน LINE")
   คู่มือการตั้งค่าแบบละเอียดอยู่ในไฟล์ START-HERE.html หัวข้อ "แจ้งเตือนผ่าน LINE"
   ===================================================================== */
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const https = require("https");
const analytics = require("./analytics"); // ใช้ aggregate()/authorized()/sendText() ร่วมกัน

/* ---------- ที่เก็บสถานะ (ใช้ Volume เดียวกับสถิติ ถ้ามี) ---------- */
const BASE = process.env.DATA_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname, "data");
let DIR = path.join(BASE, "aestiva-line");
let persistent = Boolean(process.env.DATA_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH);
try {
  fs.mkdirSync(DIR, { recursive: true });
  fs.accessSync(DIR, fs.constants.W_OK);
} catch (err) {
  console.error("[line] เขียนไฟล์ที่ " + DIR + " ไม่ได้ ใช้โฟลเดอร์ชั่วคราวแทน:", err.message);
  persistent = false;
  try {
    DIR = path.join(os.tmpdir(), "aestiva-line");
    fs.mkdirSync(DIR, { recursive: true });
  } catch (err2) {
    console.error("[line] ใช้โฟลเดอร์ชั่วคราวไม่ได้เช่นกัน ปิดระบบแจ้งเตือน LINE (เว็บยังทำงานปกติ):", err2.message);
    DIR = null;
  }
}
const STATE_FILE = DIR ? path.join(DIR, "state.json") : null;

function loadState() {
  const def = { setupCode: null, recipientUserId: null, lastNotifiedAt: null, pendingVisits: 0, log: [] };
  if (!STATE_FILE) return def;
  try {
    const s = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
    if (s && typeof s === "object") return Object.assign({}, def, s);
  } catch (e) { /* ยังไม่มีไฟล์ หรืออ่านไม่ได้ */ }
  return def;
}
function saveState(s) {
  if (!STATE_FILE) return;
  try {
    const tmp = STATE_FILE + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(s, null, 2), { mode: 0o600 });
    fs.renameSync(tmp, STATE_FILE);
  } catch (e) { console.error("[line] บันทึกสถานะไม่สำเร็จ:", e.message); }
}
function addLog(state, line) {
  const entry = "[" + new Date().toISOString() + "] " + line;
  state.log = [entry].concat(state.log || []).slice(0, 20);
}

let state = loadState();
if (!state.setupCode) {
  state.setupCode = "AESTIVA-" + crypto.randomBytes(3).toString("hex").toUpperCase();
  saveState(state);
}

/* ---------- ค่าตั้งค่าจาก Railway Variables ---------- */
function channelToken() { return (process.env.LINE_CHANNEL_ACCESS_TOKEN || "").trim(); }
function channelSecret() { return (process.env.LINE_CHANNEL_SECRET || "").trim(); }
function notifyGapHours() {
  const h = parseFloat(process.env.LINE_NOTIFY_GAP_HOURS);
  return h >= 0 && h <= 168 ? h : 0; // ค่าเริ่มต้น 0 = แจ้งทันทีทุกครั้ง, สูงสุด 168 ชม. (7 วัน)
}
function configured() { return Boolean(channelToken() && channelSecret()); }

/* ---------- เรียก LINE Messaging API (ใช้ https ในตัว Node ไม่ต้องลงไลบรารีเพิ่ม) ---------- */
function lineApi(apiPath, body) {
  return new Promise((resolve, reject) => {
    const data = Buffer.from(JSON.stringify(body));
    const req = https.request({
      hostname: "api.line.me", path: apiPath, method: "POST", timeout: 10000,
      headers: { "Content-Type": "application/json", "Content-Length": data.length, Authorization: "Bearer " + channelToken() }
    }, (res) => {
      let out = "";
      res.on("data", (c) => { out += c; });
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(out);
        else reject(new Error("LINE API ตอบกลับผิดพลาด " + res.statusCode + ": " + out.slice(0, 300)));
      });
    });
    req.on("timeout", () => req.destroy(new Error("ติดต่อ LINE API ไม่ทันเวลา (timeout)")));
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}
function pushMessage(userId, text) {
  return lineApi("/v2/bot/message/push", { to: userId, messages: [{ type: "text", text }] });
}
function replyMessage(replyToken, text) {
  return lineApi("/v2/bot/message/reply", { replyToken, messages: [{ type: "text", text }] });
}

/* ---------- ตัวช่วยวันที่ (เวลาไทย UTC+7 เหมือนกับ analytics.js) ---------- */
const MONTH_TH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
function thDate(d) {
  const p = d.split("-");
  return Number(p[2]) + " " + MONTH_TH[Number(p[1]) - 1] + " " + (Number(p[0]) + 543);
}

/* ---------- สร้างข้อความสรุป (ใช้ aggregate(30) ครั้งเดียว คำนวณวันนี้/7วัน/30วัน จากในนั้น) ---------- */
async function buildSummary(newCount) {
  const r = await analytics.aggregate(30);
  const daily = r.daily || [];
  const today = daily[daily.length - 1] || { views: 0, visitors: 0 };
  const last7 = daily.slice(-7);
  const sum7 = last7.reduce((a, x) => ({ views: a.views + x.views, visitors: a.visitors + x.visitors }), { views: 0, visitors: 0 });
  const siteUrl = (process.env.SITE_URL || "https://aestiva-website-production.up.railway.app").trim();
  let head = "🔔 มีคนเข้าชมเว็บ AESTIVA!";
  if (newCount > 1) head += " (+" + newCount + " ครั้งใหม่)";
  let text = head + "\n📅 " + thDate(r.to) + "\n\n" +
    "วันนี้: " + today.views + " ครั้ง (" + today.visitors + " คน)\n" +
    "7 วันล่าสุด: " + sum7.views + " ครั้ง (" + sum7.visitors + " คน)\n" +
    "30 วันล่าสุด: " + r.totals.views + " ครั้ง (" + r.totals.visitors + " คน)";
  if (siteUrl) text += "\n\nดูรายละเอียดเพิ่มเติม: " + siteUrl.replace(/\/$/, "") + "/stats";
  return text;
}

async function sendSummaryNow(newCount) {
  if (!configured()) throw new Error("ยังไม่ได้ตั้งค่า LINE_CHANNEL_ACCESS_TOKEN และ LINE_CHANNEL_SECRET ใน Railway");
  if (!state.recipientUserId) throw new Error("ยังไม่ได้เชื่อมต่อ LINE — ส่งรหัสตั้งค่าจาก LINE หาคุณก่อน (ดูที่หน้า /stats)");
  const text = await buildSummary(newCount || 0);
  await pushMessage(state.recipientUserId, text);
  return text;
}

/* ---------- แจ้งเตือนเมื่อมีคนเข้าเว็บ (เรียกจาก analytics.js ทุกครั้งที่มีคนเข้าเว็บจริง) ---------- */
let sending = false;
function flushPending() {
  if (sending) return; // กันส่งซ้อนกันถ้าเผลอถูกเรียกพร้อมกัน
  if (!configured() || !state.recipientUserId) return;
  if (!state.pendingVisits) return;
  const gapMs = notifyGapHours() * 3600000;
  const elapsed = Date.now() - (state.lastNotifiedAt || 0);
  if (state.lastNotifiedAt && elapsed < gapMs) return; // ยังไม่ถึงเวลา รอรอบถัดไป
  const count = state.pendingVisits;
  sending = true;
  sendSummaryNow(count).then(() => {
    state.pendingVisits = Math.max(0, state.pendingVisits - count); // เก็บยอดที่เข้ามาใหม่ระหว่างกำลังส่งไว้ ไม่ให้หายไป
    state.lastNotifiedAt = Date.now();
    addLog(state, "แจ้งเตือนสำเร็จ (" + count + " ครั้งที่เข้าเว็บ)");
    saveState(state);
    sending = false;
    flushPending(); // เช็คทันทีเผื่อมียอดค้างจากระหว่างที่กำลังส่ง (ถ้ายังไม่ถึงช่วงเวลาที่ตั้งไว้ จะรอรอบถัดไปเอง)
  }).catch((err) => {
    addLog(state, "แจ้งเตือนไม่สำเร็จ: " + err.message);
    saveState(state);
    console.error("[line] ส่งแจ้งเตือนไม่สำเร็จ:", err.message);
    sending = false; // ไม่ลองซ้ำทันที เพื่อไม่ให้ยิงรัวถ้า token ผิด — รอตัวตรวจสำรอง (ทุก 5 นาที) หรือคนเข้าเว็บครั้งถัดไป
  });
}
function notifyVisit() {
  if (!configured() || !state.recipientUserId) return; // ยังไม่ได้ตั้งค่า/เชื่อมต่อ — ไม่ต้องทำอะไร
  state.pendingVisits = (state.pendingVisits || 0) + 1;
  saveState(state);
  flushPending();
}

/* ---------- ตัวตรวจสำรอง: เผื่อมีรายการค้างจากช่วงที่ยังไม่ถึงเวลาส่ง ---------- */
let schedulerStarted = false;
function startScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;
  setInterval(flushPending, 5 * 60 * 1000).unref();
}

/* ---------- ยืนยันว่าคำขอนี้มาจาก LINE จริง (ตรวจลายเซ็น HMAC-SHA256) ---------- */
function verifySignature(rawBody, signature) {
  if (!signature || !channelSecret()) return false;
  const expected = crypto.createHmac("SHA256", channelSecret()).update(rawBody).digest("base64");
  const a = Buffer.from(expected), b = Buffer.from(String(signature));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function readRawBody(req, limit, cb) {
  let size = 0, done = false;
  const chunks = [];
  const finish = (v) => { if (!done) { done = true; cb(v); } };
  req.on("data", (c) => { size += c.length; if (size > limit) { finish(null); req.destroy(); return; } chunks.push(c); });
  req.on("end", () => finish(Buffer.concat(chunks)));
  req.on("error", () => finish(null));
}

/* ---------- Webhook: LINE จะยิงมาที่นี่ทุกครั้งที่มีคนทักแชท OA ---------- */
function handleWebhook(req, res) {
  if (req.method !== "POST") { res.writeHead(405, { Allow: "POST" }); return res.end(); }
  readRawBody(req, 1024 * 1024, (raw) => {
    if (raw === null) { res.writeHead(413); return res.end(); }
    // ตอบ 200 เสมอโดยเร็ว (ตามข้อกำหนดของ LINE) ไม่ว่าข้างในจะทำอะไรต่อหรือไม่
    if (!configured() || !verifySignature(raw, req.headers["x-line-signature"])) {
      res.writeHead(200); return res.end();
    }
    res.writeHead(200); res.end();
    let body;
    try { body = JSON.parse(raw.toString("utf8")); } catch (e) { return; }
    const events = Array.isArray(body && body.events) ? body.events : [];
    events.forEach((ev) => {
      try {
        if (ev.type !== "message" || !ev.message || ev.message.type !== "text") return;
        const text = String(ev.message.text || "").trim();
        const userId = ev.source && ev.source.userId;
        if (!userId) return;
        if (text === state.setupCode) {
          state.recipientUserId = userId;
          addLog(state, "ตั้งค่าผู้รับการแจ้งเตือนใหม่สำเร็จ");
          saveState(state);
          if (ev.replyToken) {
            replyMessage(ev.replyToken, "✅ ตั้งค่าเรียบร้อย! ผมจะแจ้งเตือนทุกครั้งที่มีคนเข้าชมเว็บ AESTIVA\n\nทดสอบส่งได้ทันทีที่หน้า /stats ของเว็บ").catch((err) => {
              console.error("[line] ตอบกลับข้อความยืนยันไม่สำเร็จ:", err.message);
            });
          }
        }
        // ข้อความอื่นที่ไม่ตรงรหัส: ปล่อยผ่าน ไม่ตอบกลับอัตโนมัติ (เผื่อเป็นลูกค้าทักมาจริง ๆ)
      } catch (e) { console.error("[line] ประมวลผล event ผิดพลาด:", e.message); }
    });
  });
}

/* ---------- API สำหรับหน้า /stats: ดูสถานะ + ปุ่มทดสอบส่ง ---------- */
function maskId(id) { return id ? "••••" + id.slice(-4) : null; }

function handleStatus(req, res) {
  if (req.method !== "GET") { res.writeHead(405, { Allow: "GET" }); return res.end(); }
  if (!analytics.authorized(req, res)) return;
  res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" });
  res.end(JSON.stringify({
    configured: configured(),
    recipientSet: Boolean(state.recipientUserId),
    recipientMasked: maskId(state.recipientUserId),
    setupCode: state.setupCode,
    gapHours: notifyGapHours(),
    pendingVisits: state.pendingVisits || 0,
    lastNotifiedAt: state.lastNotifiedAt,
    persistent,
    log: state.log || []
  }));
}

function handleTest(req, res) {
  if (req.method !== "POST") { res.writeHead(405, { Allow: "POST" }); return res.end(); }
  if (!analytics.authorized(req, res)) return;
  sendSummaryNow().then((text) => {
    addLog(state, "ทดสอบส่งสำเร็จ (กดจากหน้า /stats)");
    saveState(state);
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    res.end(JSON.stringify({ ok: true, text }));
  }).catch((err) => {
    addLog(state, "ทดสอบส่งไม่สำเร็จ: " + err.message);
    saveState(state);
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    res.end(JSON.stringify({ ok: false, error: err.message }));
  });
}

function handle(req, res) {
  const url = req.url.split("?")[0];
  if (url === "/api/line-webhook") { handleWebhook(req, res); return true; }
  if (url === "/api/line-status") { handleStatus(req, res); return true; }
  if (url === "/api/line-test") { handleTest(req, res); return true; }
  return false;
}

module.exports = { handle, startScheduler, notifyVisit };
