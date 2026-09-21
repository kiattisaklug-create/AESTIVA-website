/* =====================================================================
   pulse.js — นับสถิติการเข้าชมแบบไม่ระบุตัวตน (ไม่ใช้คุกกี้)
   เก็บอะไรบ้าง: มีคนเปิดหน้าเว็บ / เลื่อนไปถึงส่วนไหน / กดปุ่มหรือแท็บอะไร /
                 มาจากช่องทางไหน / ใช้มือถือหรือคอม
   ไม่เก็บ: ชื่อ เบอร์โทร IP ที่อ่านออก หรือข้อมูลส่วนตัวใดๆ
   (ปกติไม่ต้องแก้ไฟล์นี้)

   ไม่ต้องการให้นับการเข้าชมของตัวเอง?
   เปิดเว็บด้วยลิงก์  https://ชื่อเว็บของคุณ/?notrack=1  หนึ่งครั้งบนเครื่องนั้น
   (ยกเลิก: ใช้ ?notrack=0)
   ===================================================================== */
(function () {
  "use strict";
  try {
    var d = document, w = window, nav = navigator, loc = location;
    if (loc.protocol === "file:") return; // เปิดไฟล์บนเครื่องตัวเอง ไม่นับ

    /* ---------- ไม่นับ: เจ้าของเว็บ / ผู้ที่ตั้งค่า Do Not Track ---------- */
    var store = null;
    try { store = w.localStorage; } catch (e) { store = null; }
    if (/[?&]notrack=1(&|$)/.test(loc.search)) { try { store && store.setItem("aestiva_notrack", "1"); } catch (e) {} }
    if (/[?&]notrack=0(&|$)/.test(loc.search)) { try { store && store.removeItem("aestiva_notrack"); } catch (e) {} }
    try { if (store && store.getItem("aestiva_notrack") === "1") return; } catch (e) {}
    if (nav.doNotTrack === "1" || w.doNotTrack === "1" || nav.msDoNotTrack === "1") return;

    var ENDPOINT = "/api/pulse";

    function send(obj) {
      var body;
      try { body = JSON.stringify(obj); } catch (e) { return; }
      try {
        if (nav.sendBeacon && nav.sendBeacon(ENDPOINT, new Blob([body], { type: "text/plain" }))) return;
      } catch (e) {}
      try {
        if (w.fetch) w.fetch(ENDPOINT, { method: "POST", body: body, headers: { "Content-Type": "text/plain" }, keepalive: true, credentials: "omit" });
      } catch (e) {}
    }

    function clean(s, max) {
      return String(s == null ? "" : s).replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "").slice(0, max || 60);
    }

    /* ---------- 1) นับการเปิดหน้าเว็บ ---------- */
    function param(name) {
      var m = new RegExp("[?&]" + name + "=([^&#]*)").exec(loc.search);
      if (!m) return "";
      try { return decodeURIComponent(m[1].replace(/\+/g, " ")); } catch (e) { return ""; }
    }
    function refHost() {
      var r = d.referrer || "";
      if (!r) return "";
      var m = /^https?:\/\/([^\/?#:]+)/i.exec(r);
      var h = m ? m[1].toLowerCase() : "";
      return h === loc.hostname.toLowerCase() ? "" : h; // มาจากในเว็บเดียวกัน = ไม่นับเป็นที่มา
    }

    var viewSent = false;
    function sendView() {
      if (viewSent) return;
      viewSent = true;
      send({
        t: "v",
        r: refHost(),
        q: clean(param("src") || param("utm_source"), 30),
        w: w.innerWidth || 0
      });
      watchSections();
    }
    // ถ้าหน้าถูกโหลดไว้เบื้องหลัง (เช่น พรีโหลด) ให้รอจนคนเห็นหน้านั้นจริงๆ ก่อนค่อยนับ
    if (d.visibilityState === "hidden" || d.visibilityState === "prerender") {
      var onVis = function () {
        if (d.visibilityState === "visible") { d.removeEventListener("visibilitychange", onVis); sendView(); }
      };
      d.addEventListener("visibilitychange", onVis);
    } else {
      sendView();
    }

    /* ---------- 2) ส่วนของหน้าเว็บที่คนเลื่อนไปถึง ---------- */
    function watchSections() {
      if (!("IntersectionObserver" in w)) return;
      var seen = {};
      var io = new IntersectionObserver(function (entries) {
        for (var i = 0; i < entries.length; i++) {
          var en = entries[i];
          var id = en.target.id;
          if (en.isIntersecting && id && !seen[id]) {
            seen[id] = true;
            send({ t: "s", s: id });
            io.unobserve(en.target);
          }
        }
      }, { threshold: 0.2 });
      var list = d.querySelectorAll("main section[id]");
      for (var i = 0; i < list.length; i++) io.observe(list[i]);
    }

    /* ---------- 3) นับการกดปุ่ม / ลิงก์ / แท็บ / คำถาม ---------- */
    function textOf(el) { return clean(el.textContent, 60); }

    function classify(target) {
      if (!target || !target.closest) return null;
      var el;
      if ((el = target.closest("summary"))) return { k: "faq", l: textOf(el) };
      if ((el = target.closest(".tab"))) {
        var tb = el.querySelector(".tab__text b");
        return { k: "tab", l: textOf(tb || el) };
      }
      if ((el = target.closest("a"))) {
        var h = el.getAttribute("href") || "";
        var label = el.id === "fab" ? "ปุ่มลอย LINE" : textOf(el) || clean(el.getAttribute("aria-label"), 60);
        if (/line\.me/i.test(h)) return { k: "line", l: label };
        if (/tiktok\.com/i.test(h)) return { k: "tiktok", l: label };
        if (/instagram\.com/i.test(h)) return { k: "instagram", l: label };
        if (/^tel:/i.test(h)) return { k: "phone", l: label };
        if (/^mailto:/i.test(h)) return { k: "email", l: label };
        if (h.charAt(0) === "#") return { k: "link", l: label };
        return { k: "link", l: label };
      }
      if ((el = target.closest("button"))) {
        if (el.id === "menu-btn") return { k: "menu", l: "เมนูมือถือ" };
        return { k: "button", l: textOf(el) || clean(el.getAttribute("aria-label"), 60) };
      }
      return null;
    }

    function placeOf(target) {
      if (target.closest("#fab")) return "fab";
      var el = target.closest("section[id]");
      if (el) return el.id;
      if (target.closest("header")) return "nav";
      if (target.closest("footer")) return "footer";
      return "";
    }

    d.addEventListener("click", function (e) {
      try {
        if (e.isTrusted === false) return;
        var info = classify(e.target);
        if (!info || !info.l) return;
        send({ t: "c", k: info.k, l: info.l, s: placeOf(e.target) });
      } catch (err) {}
    }, true);
  } catch (e) { /* การนับสถิติพัง ต้องไม่ทำให้หน้าเว็บพัง */ }
})();
