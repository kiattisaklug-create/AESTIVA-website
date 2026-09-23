/* =====================================================================
   server.js — เซิร์ฟเวอร์เล็ก ๆ สำหรับเปิดเว็บไซต์บน Railway
   (ปกติไม่ต้องแก้ไฟล์นี้)
   - เปิดให้ดาวน์โหลดเฉพาะไฟล์ของหน้าเว็บ (ไม่เปิดไฟล์ระบบอย่าง server.js)
   - ไฟล์ html/css/js ตรวจเวอร์ชันใหม่ทุกครั้ง → แก้แล้วเห็นผลทันทีหลัง deploy
   - บีบอัดไฟล์ข้อความ (gzip) ให้เว็บโหลดเร็วขึ้น
   ===================================================================== */
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const analytics = require("./analytics"); // ระบบนับสถิติ (ดูไฟล์ analytics.js)
const lineNotify = require("./line"); // ระบบแจ้งเตือนยอดเข้าชมผ่าน LINE (ดูไฟล์ line.js)
analytics.setViewHook(lineNotify.notifyVisit); // ให้ analytics.js เรียก line.js ทุกครั้งที่มีคนเข้าเว็บจริง

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".mp4": "video/mp4",
  ".webm": "video/webm"
};
const STREAM_EXT = new Set([".mp4", ".webm"]); // ไฟล์วิดีโอ: ส่งแบบแบ่งช่วง (Range) เพื่อให้ Safari/iOS เล่นได้และประหยัด RAM

// ไฟล์ที่อนุญาตให้คนทั่วไปเปิดดูได้
const PUBLIC_FILES = new Set(["/index.html", "/styles.css", "/script.js", "/content.js", "/pulse.js", "/robots.txt", "/sitemap.xml"]);
const PUBLIC_DIRS = ["/assets/"];
const COMPRESSIBLE = new Set([".html", ".css", ".js", ".json", ".txt", ".xml", ".svg"]);

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()"
};

const NOT_FOUND_HTML = `<!doctype html><html lang="th"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ไม่พบหน้านี้ | AESTIVA</title>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#FAF9F6;color:#3A2E1F;font-family:system-ui,'Leelawadee UI',Tahoma,sans-serif;text-align:center;padding:24px">
<div><p style="font-size:14px;letter-spacing:.3em;color:#8A6410;margin:0">AESTIVA</p>
<h1 style="font-weight:600;font-size:28px;margin:12px 0">ไม่พบหน้าที่คุณต้องการ</h1>
<a href="/" style="display:inline-block;margin-top:12px;padding:12px 28px;border-radius:999px;background:#D4AF37;color:#2B1F0D;text-decoration:none;font-weight:600">กลับไปหน้าแรก</a></div></body></html>`;

function resolvePublicPath(rawUrl) {
  let pathname;
  try {
    pathname = decodeURIComponent(rawUrl.split("?")[0].split("#")[0]);
  } catch (e) {
    return null;
  }
  if (pathname === "/") pathname = "/index.html";
  if (pathname.includes("\0") || pathname.includes("..")) return null;
  const allowed = PUBLIC_FILES.has(pathname) || PUBLIC_DIRS.some((d) => pathname.startsWith(d));
  if (!allowed) return null;
  const full = path.join(ROOT, path.normalize(pathname));
  if (!full.startsWith(ROOT + path.sep)) return null;
  return full;
}

function cacheControl(ext, filePath) {
  if ([".html", ".css", ".js"].includes(ext)) return "no-cache"; // ตรวจเวอร์ชันใหม่ทุกครั้ง (มี ETag ช่วยให้เร็ว)
  if (ext === ".woff2") return "public, max-age=31536000, immutable";
  return "public, max-age=86400"; // รูปภาพ: จำไว้ 1 วัน
}

const gzipCache = new Map();

const server = http.createServer((req, res) => {
  // เส้นทางของระบบสถิติ: /api/pulse (รับข้อมูล), /stats (หน้าดูสถิติ), /api/stats
  if (analytics.handle(req, res)) return;
  if (lineNotify.handle(req, res)) return;

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { Allow: "GET, HEAD" });
    return res.end();
  }

  if (req.url === "/healthz") {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end("ok");
  }

  const filePath = resolvePublicPath(req.url);
  const notFound = () => {
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8", ...SECURITY_HEADERS });
    res.end(req.method === "HEAD" ? undefined : NOT_FOUND_HTML);
  };
  if (!filePath) return notFound();

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) return notFound();

    const ext = path.extname(filePath).toLowerCase();
    const etag = `W/"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`;
    const headers = {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": cacheControl(ext, filePath),
      ETag: etag,
      Vary: "Accept-Encoding",
      ...SECURITY_HEADERS
    };

    if (req.headers["if-none-match"] === etag) {
      res.writeHead(304, headers);
      return res.end();
    }

    if (STREAM_EXT.has(ext)) {
      // วิดีโอ: สตรีมจากดิสก์โดยตรง (ไม่โหลดทั้งไฟล์เข้า RAM) และรองรับ Range request
      headers["Accept-Ranges"] = "bytes";
      const range = req.headers.range;
      if (range) {
        const m = /^bytes=(\d*)-(\d*)$/.exec(range);
        const start = m && m[1] !== "" ? parseInt(m[1], 10) : 0;
        const end = m && m[2] !== "" ? parseInt(m[2], 10) : stat.size - 1;
        if (!m || isNaN(start) || isNaN(end) || start > end || start < 0 || end >= stat.size) {
          res.writeHead(416, { "Content-Range": `bytes */${stat.size}`, ...SECURITY_HEADERS });
          return res.end();
        }
        res.writeHead(206, { ...headers, "Content-Range": `bytes ${start}-${end}/${stat.size}`, "Content-Length": end - start + 1 });
        if (req.method === "HEAD") return res.end();
        return fs.createReadStream(filePath, { start, end }).pipe(res);
      }
      res.writeHead(200, { ...headers, "Content-Length": stat.size });
      if (req.method === "HEAD") return res.end();
      return fs.createReadStream(filePath).pipe(res);
    }

    fs.readFile(filePath, (readErr, data) => {
      if (readErr) return notFound();

      const wantsGzip = /\bgzip\b/.test(req.headers["accept-encoding"] || "");
      if (wantsGzip && COMPRESSIBLE.has(ext) && data.length > 512) {
        let zipped = gzipCache.get(etag);
        if (!zipped) {
          zipped = zlib.gzipSync(data, { level: 9 });
          gzipCache.set(etag, zipped);
        }
        headers["Content-Encoding"] = "gzip";
        headers["Content-Length"] = zipped.length;
        res.writeHead(200, headers);
        return res.end(req.method === "HEAD" ? undefined : zipped);
      }

      headers["Content-Length"] = data.length;
      res.writeHead(200, headers);
      res.end(req.method === "HEAD" ? undefined : data);
    });
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`AESTIVA website listening on port ${PORT}`);
  lineNotify.startScheduler(); // ตัวตรวจสำรอง เผื่อมีรายการค้างจากช่วงยังไม่ถึงเวลาส่ง (ดูไฟล์ line.js)
});

// ให้ Railway ปิดเซิร์ฟเวอร์อย่างนุ่มนวลเมื่อมีการ deploy ใหม่
process.on("SIGTERM", () => server.close(() => process.exit(0)));
