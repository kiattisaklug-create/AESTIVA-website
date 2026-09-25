/* =====================================================================
   AESTIVA — script.js
   หน้าที่: อ่านข้อมูลจาก content.js มาสร้างส่วนราคา/โมดูล/อัปเดต/คลินิก/คำถาม/ภาพหน้าจอ
            + เมนูมือถือ + แท็บตัวอย่างระบบ + เอฟเฟกต์ตอนเลื่อนหน้า
   (ปกติไม่ต้องแก้ไฟล์นี้ — แก้ข้อมูลที่ content.js แทน)
   ===================================================================== */
(function () {
  "use strict";

  var doc = document;
  var root = doc.documentElement;
  var C = window.AESTIVA_CONTENT;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isDev = location.protocol === "file:" || /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  var problems = [];

  /* ---------- ตัวช่วยเล็ก ๆ ---------- */
  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }
  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }
  function handle(v) { return String(v || "").replace(/^@+/, "").replace(/\s+/g, ""); }
  function arr(v) { return Array.isArray(v) ? v : []; }
  function fmtNum(n) { return Number(n).toLocaleString("en-US"); }
  var ICONS = ["clipboard", "chat", "shield", "chart", "calendar", "file", "pill", "people", "layers"];
  function icon(name) {
    return '<svg class="ico" aria-hidden="true" focusable="false"><use href="#i-' + esc(name) + '"/></svg>';
  }
  function safely(label, fn) {
    try { fn(); } catch (err) {
      problems.push(label);
      if (window.console) console.error("[AESTIVA] " + label, err);
    }
  }

  /* ---------- ลิงก์ LINE ---------- */
  var contact = (C && C.contact) || {};
  var lineId = contact.lineId ? "@" + handle(contact.lineId) : "";
  function lineAdd() { return "https://line.me/R/ti/p/" + lineId; }
  function lineMsg(text) { return "https://line.me/R/oaMessage/" + lineId + "/?" + encodeURIComponent(text); }

  /* ---------- 1) ช่องทางติดต่อ ---------- */
  function renderContact() {
    if (!lineId) return;
    $$("[data-line='add']").forEach(function (a) { a.href = lineAdd(); });
    $$("[data-line-msg]").forEach(function (a) { a.href = lineMsg(a.getAttribute("data-line-msg")); });
    $$("[data-render='line-id']").forEach(function (el) { el.textContent = lineId; });
    var qr = $("[data-render='line-qr']");
    if (qr && contact.lineQrImage) qr.src = contact.lineQrImage;

    var items = [];
    items.push({ i: "chat", label: "LINE OA", value: lineId, href: lineAdd(), ext: true });
    if (contact.tiktok) items.push({ i: "tiktok", label: "TikTok", value: "@" + handle(contact.tiktok), href: "https://www.tiktok.com/@" + handle(contact.tiktok), ext: true });
    if (contact.instagram) items.push({ i: "instagram", label: "Instagram", value: "@" + handle(contact.instagram), href: "https://www.instagram.com/" + handle(contact.instagram) + "/", ext: true });
    if (contact.phone) items.push({ i: "phone", label: "โทรศัพท์", value: contact.phone, href: "tel:" + String(contact.phone).replace(/[^\d+]/g, "") });
    if (contact.email) items.push({ i: "mail", label: "อีเมล", value: contact.email, href: "mailto:" + contact.email });

    var html = items.map(function (it) {
      return '<li><a href="' + esc(it.href) + '"' + (it.ext ? ' target="_blank" rel="noopener"' : "") + ">" +
        icon(it.i) + "<span><small>" + esc(it.label) + "</small><b>" + esc(it.value) + "</b></span></a></li>";
    }).join("");
    $$("[data-render='contact-list'],[data-render='footer-contact']").forEach(function (ul) { ul.innerHTML = html; });
  }

  /* ---------- 2) ราคา ---------- */
  function renderPlans() {
    var el = $("[data-render='plans']");
    if (!el) return;
    el.innerHTML = arr(C.plans).map(function (p, i) {
      var style = p.style === "featured" || p.style === "dark" ? p.style : "plain";
      var cls = "plan reveal" + (style === "featured" ? " plan--featured" : "") + (style === "dark" ? " plan--dark" : "");
      var btn = style === "dark" ? "btn btn--night" : style === "featured" ? "btn btn--gold" : "btn btn--line";
      var isNum = isFinite(Number(p.price)) && p.price !== "" && p.price !== null;
      var price = isNum
        ? '<span class="price__cur">฿</span><span class="price__num">' + fmtNum(p.price) + "</span>"
        : '<span class="price__num price__num--text">' + esc(p.price) + "</span>";
      var href = lineId ? lineMsg("สนใจแพ็กเกจ " + p.name + " ของ AESTIVA") : "#contact";
      return '<article class="' + cls + '" style="--i:' + i + '">' +
        (p.badge ? '<span class="plan__badge">' + esc(p.badge) + "</span>" : "") +
        '<h3 class="plan__name">' + esc(p.name) + "</h3>" +
        '<p class="plan__tag">' + esc(p.tagline) + "</p>" +
        '<p class="price">' + price + (p.period && isNum ? '<span class="price__per">' + esc(p.period) + "</span>" : "") + "</p>" +
        '<ul class="plan__list">' + arr(p.features).map(function (f) { return "<li>" + icon("check") + "<span>" + esc(f) + "</span></li>"; }).join("") + "</ul>" +
        '<a class="' + btn + ' btn--block" href="' + esc(href) + '" target="_blank" rel="noopener">' + esc(p.cta || "สนใจแพ็กเกจนี้") + "</a>" +
        "</article>";
    }).join("");
    var note = $("[data-render='plan-note']");
    if (note) note.textContent = C.planNote || "";
  }

  /* ---------- 3) Module ---------- */
  function renderModules() {
    var el = $("[data-render='modules']");
    if (!el) return;
    el.innerHTML = arr(C.modules).map(function (m, i) {
      var ic = ICONS.indexOf(m.icon) > -1 ? m.icon : "layers";
      return '<li class="step reveal" style="--i:' + i + '">' +
        '<span class="step__node">' + icon(ic) + "</span>" +
        '<span class="step__group">' + esc(m.group) + "</span>" +
        "<h3>" + esc(m.name) + "</h3>" +
        "<p>" + esc(m.items) + "</p>" +
        (m.badge || m.version
          ? '<span class="chip chip--gold">' + esc(m.badge) + (m.version ? '<span class="step__ver">' + esc(m.version) + "</span>" : "") + "</span>"
          : "") +
        "</li>";
    }).join("");
  }

  /* ---------- 4) อัปเดต / เวอร์ชัน ---------- */
  var STATUS = { released: "เปิดใช้งานแล้ว", now: "กำลังพัฒนา", soon: "เร็ว ๆ นี้" };
  function renderUpdates() {
    var el = $("[data-render='updates']");
    if (!el) return;
    el.innerHTML = arr(C.updates).map(function (u, i) {
      var st = STATUS[u.status] ? u.status : "soon";
      return '<li class="tl-item reveal" data-status="' + st + '" style="--i:' + i + '">' +
        '<div class="tl-item__top"><span class="tl-item__ver">' + esc(u.version) + "</span>" +
        (u.date ? '<span class="tl-item__date">' + esc(u.date) + "</span>" : "") +
        '<span class="status status--' + st + '">' + STATUS[st] + "</span></div>" +
        "<h3>" + esc(u.title) + "</h3><p>" + esc(u.text) + "</p></li>";
    }).join("");
    var chip = $("[data-render='latest-version']");
    if (chip && C.latestVersion) {
      chip.innerHTML = "<b>" + esc(C.latestVersion) + "</b>เวอร์ชันล่าสุด";
      chip.hidden = false;
    }
  }

  /* ---------- 5) คลินิกที่ใช้ ---------- */
  function renderClinics() {
    var sec = $("#clinics"), el = $("[data-render='clinics']");
    if (!sec || !el) return;
    // ซ่อนทั้งส่วนไว้จนกว่าเจ้าของเว็บจะเปิดใช้งาน (clinicsEnabled) และมีอย่างน้อย 1 คลินิกที่ใส่โลโก้แล้ว
    var list = arr(C.clinics).filter(function (c) { return c && c.logo; });
    if (!C.clinicsEnabled || !list.length) return;
    el.innerHTML = '<div class="clinics">' + list.map(function (c, i) {
      return '<div class="clinic reveal" style="--i:' + i + '">' +
        '<img src="' + esc(c.logo) + '" alt="โลโก้ ' + esc(c.name) + '" loading="lazy">' +
        "<div><b>" + esc(c.name) + "</b>" + (c.note ? "<small>" + esc(c.note) + "</small>" : "") + "</div></div>";
    }).join("") + "</div>";
    sec.hidden = false;
    $$("[data-clinics-nav]").forEach(function (a) { a.hidden = false; });
  }

  /* ---------- 6) คำถามที่พบบ่อย ---------- */
  function renderFaq() {
    var el = $("[data-render='faq']");
    if (!el) return;
    el.innerHTML = arr(C.faq).map(function (f) {
      return "<details><summary>" + esc(f.q) + '</summary><div class="faq__a"><p>' + esc(f.a) + "</p></div></details>";
    }).join("");
  }

  /* ---------- 7) ภาพหน้าจอโปรแกรม (ไม่มีภาพ = ซ่อนทั้งส่วน) ---------- */
  var shotList = [];
  function renderScreens() {
    var sec = $("#screens"), el = $("[data-render='screens']");
    if (!sec || !el) return;
    shotList = arr(C.screenshots).filter(function (s) { return s && s.image && !s.hidden; });
    if (!shotList.length) return;
    var t = $("[data-render='screens-title']"), x = $("[data-render='screens-text']");
    if (t && C.screensTitle) t.textContent = C.screensTitle;
    if (x && C.screensText) x.textContent = C.screensText;
    el.innerHTML = shotList.map(function (s, i) {
      var size = s.size === "small" || s.size === "large" ? s.size : "medium";
      var framed = s.frame !== false;
      var dims = s.w && s.h ? ' width="' + Number(s.w) + '" height="' + Number(s.h) + '"' : "";
      var name = s.title || "ภาพหน้าจอ";
      return '<figure class="shot shot--' + size + ' reveal" style="--i:' + (i % 4) + '">' +
        '<button class="shot__btn" type="button" data-shot="' + i + '" aria-label="ขยายภาพ: ' + esc(name) + '">' +
        (framed ? '<span class="shot__bar" aria-hidden="true"><i></i><i></i><i></i></span>' : "") +
        '<img src="' + esc(s.image) + '" alt="' + esc(s.alt || name) + '"' + dims + ' loading="lazy" decoding="async"></button>' +
        (s.title || s.caption ? "<figcaption>" + (s.title ? "<b>" + esc(s.title) + "</b>" : "") + (s.caption ? "<span>" + esc(s.caption) + "</span>" : "") + "</figcaption>" : "") +
        "</figure>";
    }).join("");
    sec.hidden = false;
    $$("[data-screens-nav]").forEach(function (a) { a.hidden = false; });
    initLightbox();
  }

  function initLightbox() {
    var dlg = $("#lightbox");
    if (!dlg) return;
    var img = $(".lightbox__img", dlg), cap = $(".lightbox__cap", dlg);
    var idx = 0, opener = null;
    function show(i) {
      idx = (i + shotList.length) % shotList.length;
      var s = shotList[idx];
      img.src = s.image;
      img.alt = s.alt || s.title || "ภาพหน้าจอโปรแกรม AESTIVA";
      cap.textContent = [s.title, s.caption].filter(Boolean).join(" — ") + (shotList.length > 1 ? "  (" + (idx + 1) + "/" + shotList.length + ")" : "");
    }
    $$(".shot__btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        opener = btn;
        var i = parseInt(btn.getAttribute("data-shot"), 10) || 0;
        if (typeof dlg.showModal !== "function") { window.open(shotList[i].image, "_blank", "noopener"); return; }
        show(i);
        dlg.showModal();
      });
    });
    var multi = shotList.length > 1;
    $$("[data-lb='prev'],[data-lb='next']", dlg).forEach(function (b) { b.hidden = !multi; });
    dlg.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest("[data-lb]");
      if (b) {
        var a = b.getAttribute("data-lb");
        if (a === "close") dlg.close();
        else if (a === "prev") show(idx - 1);
        else if (a === "next") show(idx + 1);
      } else if (e.target === dlg || e.target.classList.contains("lightbox__box")) {
        dlg.close();
      }
    });
    dlg.addEventListener("keydown", function (e) {
      if (!multi) return;
      if (e.key === "ArrowLeft") { show(idx - 1); e.preventDefault(); }
      if (e.key === "ArrowRight") { show(idx + 1); e.preventDefault(); }
    });
    dlg.addEventListener("close", function () { if (opener) opener.focus(); });
  }

  /* ---------- 8) วิดีโอสาธิตการใช้งาน (ไม่มีคลิป/ไม่ Active = ไม่แสดงช่องนั้น) ---------- */
  function renderVideos() {
    var sec = $("#videos"), el = $("[data-render='videos']");
    if (!sec || !el) return;
    var list = arr(C.demoVideos).filter(function (v) { return v && v.src && v.active !== false; });
    if (!list.length) return;
    var t = $("[data-render='videos-title']"), x = $("[data-render='videos-text']");
    if (t && C.demoVideosTitle) t.textContent = C.demoVideosTitle;
    if (x && C.demoVideosText) x.textContent = C.demoVideosText;
    el.innerHTML = list.map(function (v, i) {
      var name = v.title || "วิดีโอสาธิต";
      var poster = v.poster ? ' poster="' + esc(v.poster) + '"' : "";
      return '<div class="video-card reveal" style="--i:' + (i % 3) + '">' +
        '<div class="video-card__frame">' +
        '<video class="video-card__el" data-src="' + esc(v.src) + '" muted loop playsinline preload="none"' + poster + ' aria-label="' + esc(name) + '"></video>' +
        (v.module ? '<span class="video-card__badge">' + esc(v.module) + "</span>" : "") +
        '<button class="video-card__mute" type="button" data-mute-btn aria-label="เปิดเสียง" aria-pressed="false"><svg><use href="#i-mute"/></svg></button>' +
        "</div>" +
        (v.title || v.caption ? '<div class="video-card__body">' + (v.title ? "<b>" + esc(v.title) + "</b>" : "") + (v.caption ? "<p>" + esc(v.caption) + "</p>" : "") + "</div>" : "") +
        "</div>";
    }).join("");
    sec.hidden = false;
    $$("[data-videos-nav]").forEach(function (a) { a.hidden = false; });
    initVideoCards();
  }

  function initVideoCards() {
    var cards = $$(".video-card__frame");
    if (!cards.length) return;

    cards.forEach(function (card) {
      var vid = $(".video-card__el", card), btn = $("[data-mute-btn]", card);
      if (btn) {
        btn.addEventListener("click", function () {
          vid.muted = !vid.muted;
          btn.setAttribute("aria-pressed", String(!vid.muted));
          btn.setAttribute("aria-label", vid.muted ? "เปิดเสียง" : "ปิดเสียง");
          btn.innerHTML = '<svg><use href="#i-' + (vid.muted ? "mute" : "volume") + '"/></svg>';
        });
      }
    });

    if (!("IntersectionObserver" in window) || reduce) {
      // ไม่รองรับ หรือผู้ใช้ตั้งค่าลดการเคลื่อนไหว: โหลดวิดีโอไว้เฉยๆ ไม่เล่นอัตโนมัติ (กดปุ่มลำโพง/คลิกที่วิดีโอเพื่อดูได้)
      cards.forEach(function (card) {
        var vid = $(".video-card__el", card);
        if (vid.dataset.src) { vid.src = vid.dataset.src; vid.controls = true; vid.removeAttribute("data-src"); }
      });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var vid = $(".video-card__el", en.target);
        if (!vid) return;
        if (en.isIntersecting) {
          if (vid.dataset.src) {
            vid.src = vid.dataset.src;
            vid.removeAttribute("data-src");
            vid.load(); // จำเป็นเมื่อกำหนด src ด้วยสคริปต์ขณะ preload="none" ไม่งั้นบางเบราว์เซอร์จะยกเลิกการโหลดเอง
          }
          var p = vid.play();
          if (p && p.catch) p.catch(function () {}); // เบราว์เซอร์บางตัวบล็อกการเล่นอัตโนมัติ ไม่ถือเป็นข้อผิดพลาด
        } else {
          vid.pause();
        }
      });
    }, { threshold: 0.35, rootMargin: "80px 0px" });
    cards.forEach(function (card) { io.observe(card); });
  }

  /* ---------- แท็บตัวอย่างระบบ ---------- */
  function countUp(el) {
    var target = parseInt(el.getAttribute("data-count"), 10);
    if (isNaN(target)) return;
    if (reduce) { el.textContent = fmtNum(target); return; }
    var t0 = null, dur = 1100;
    function tick(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min((ts - t0) / dur, 1);
      el.textContent = fmtNum(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(tick);
    }
    el.textContent = "0";
    requestAnimationFrame(tick);
  }
  function initTabs() {
    var tabs = $$(".tab");
    var panels = $$(".panel");
    if (!tabs.length) return;
    function select(i, focus) {
      tabs.forEach(function (t, k) {
        var on = k === i;
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.tabIndex = on ? 0 : -1;
        panels[k].hidden = !on;
        panels[k].classList.toggle("is-active", on);
      });
      $$("[data-count]", panels[i]).forEach(countUp);
      if (focus) tabs[i].focus();
      var strip = tabs[i].parentNode;
      if (strip.scrollWidth > strip.clientWidth) {
        strip.scrollTo({ left: tabs[i].offsetLeft - 20, behavior: reduce ? "auto" : "smooth" });
      }
    }
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { select(i, false); });
      t.addEventListener("keydown", function (e) {
        var n = tabs.length, k = null;
        if (e.key === "ArrowDown" || e.key === "ArrowRight") k = (i + 1) % n;
        else if (e.key === "ArrowUp" || e.key === "ArrowLeft") k = (i - 1 + n) % n;
        else if (e.key === "Home") k = 0;
        else if (e.key === "End") k = n - 1;
        if (k !== null) { e.preventDefault(); select(k, true); }
      });
    });
    // นับตัวเลขของแท็บแรกเมื่อเลื่อนมาถึง
    var stage = $(".stage");
    if (stage && "IntersectionObserver" in window && !reduce) {
      var once = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { $$("[data-count]", panels[0]).forEach(countUp); once.disconnect(); }
      }, { threshold: 0.35 });
      once.observe(stage);
    }
  }

  /* ---------- เมนูมือถือ ---------- */
  function initMenu() {
    var btn = $("#menu-btn"), links = $("#nav-links");
    if (!btn || !links) return;
    function set(open) {
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      btn.setAttribute("aria-label", open ? "ปิดเมนู" : "เปิดเมนู");
      links.classList.toggle("is-open", open);
      root.classList.toggle("menu-open", open);
    }
    btn.addEventListener("click", function () { set(btn.getAttribute("aria-expanded") !== "true"); });
    $$("a", links).forEach(function (a) { a.addEventListener("click", function () { set(false); }); });
    doc.addEventListener("keydown", function (e) { if (e.key === "Escape") set(false); });
    window.addEventListener("resize", function () { if (window.innerWidth > 1040) set(false); });
  }

  /* ---------- ไฮไลต์เมนูตามหัวข้อที่กำลังอ่าน ---------- */
  function initActiveNav() {
    if (!("IntersectionObserver" in window)) return;
    var map = {};
    $$(".nav__links a[href^='#']").forEach(function (a) { map[a.getAttribute("href").slice(1)] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        Object.keys(map).forEach(function (k) { map[k].removeAttribute("aria-current"); });
        var a = map[en.target.id];
        if (a) a.setAttribute("aria-current", "true");
      });
    }, { rootMargin: "-42% 0px -55% 0px" });
    $$("main > section[id]").forEach(function (s) { io.observe(s); });
  }

  /* ---------- ปรากฏเมื่อเลื่อนถึง ---------- */
  function initReveal() {
    var els = $$(".reveal, .path");
    if (!("IntersectionObserver" in window) || reduce) {
      els.forEach(function (e) { e.classList.add("is-in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ---------- เอฟเฟกต์ตอนเลื่อนหน้า (เมนู / ไทม์ไลน์ / ปุ่มลอย) ---------- */
  function initScroll() {
    var nav = $("#nav"), fab = $("#fab"), tl = $("#timeline");
    var fill = tl && $(".timeline__fill", tl);
    var contactSec = $("#contact");
    var contactInView = false;
    if (contactSec && "IntersectionObserver" in window) {
      new IntersectionObserver(function (es) { contactInView = es[0].isIntersecting; update(); }, { threshold: 0.25 }).observe(contactSec);
    }
    var ticking = false;
    function update() {
      ticking = false;
      var y = window.pageYOffset || root.scrollTop;
      if (nav) nav.classList.toggle("is-scrolled", y > 24);
      if (fab) fab.classList.toggle("is-visible", y > window.innerHeight * 0.75 && !contactInView);
      if (tl && fill) {
        var trigger = window.innerHeight * 0.62;
        var r = tl.getBoundingClientRect();
        var p = Math.max(0, Math.min(1, (trigger - r.top) / r.height));
        fill.style.height = (p * 100).toFixed(1) + "%";
        $$(".tl-item", tl).forEach(function (it) {
          it.classList.toggle("is-reached", it.getBoundingClientRect().top < trigger);
        });
      }
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
  }

  /* ---------- เหรียญโลโก้เอียงตามเมาส์ (เฉพาะคอมพิวเตอร์) ---------- */
  function initTilt() {
    var hero = $(".hero"), art = $("#medallion"), disc = art && $(".medallion__disc", art);
    if (!hero || !disc || reduce) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    function clamp(v) { return Math.max(-1, Math.min(1, v)); }
    hero.addEventListener("pointermove", function (e) {
      var r = art.getBoundingClientRect();
      var dx = clamp((e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2));
      var dy = clamp((e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2));
      disc.style.setProperty("--ry", (dx * 7).toFixed(2) + "deg");
      disc.style.setProperty("--rx", (-dy * 6).toFixed(2) + "deg");
    });
    hero.addEventListener("pointerleave", function () {
      disc.style.setProperty("--ry", "0deg");
      disc.style.setProperty("--rx", "0deg");
    });
  }

  /* ---------- แถบเตือน (เห็นเฉพาะตอนเปิดดูบนเครื่องตัวเอง) ---------- */
  function showDevBanner() {
    if (!isDev || !problems.length) return;
    var bar = doc.createElement("div");
    bar.setAttribute("role", "alert");
    bar.style.cssText = "position:fixed;left:0;right:0;top:0;z-index:999;padding:12px 16px;background:#B3261E;color:#fff;font:600 15px/1.5 sans-serif;text-align:center";
    bar.textContent = "⚠️ มีข้อผิดพลาดในไฟล์ content.js (ส่วน: " + problems.join(", ") +
      ") — ตรวจดูว่าเครื่องหมาย , \" \" { } [ ] ไม่ขาดหรือเกิน แล้วกดรีเฟรชหน้านี้ (ดูวิธีแก้ใน START-HERE.html)";
    doc.body.appendChild(bar);
  }

  /* ---------- เริ่มทำงาน ---------- */
  var y = $("#year");
  if (y) y.textContent = new Date().getFullYear();

  if (!C) {
    problems.push("อ่านไฟล์ไม่สำเร็จ");
  } else {
    safely("contact", renderContact);
    safely("plans", renderPlans);
    safely("modules", renderModules);
    safely("updates", renderUpdates);
    safely("clinics", renderClinics);
    safely("faq", renderFaq);
    safely("screens", renderScreens);
    safely("videos", renderVideos);
  }
  safely("tabs", initTabs);
  safely("menu", initMenu);
  safely("nav", initActiveNav);
  safely("reveal", initReveal);
  safely("scroll", initScroll);
  safely("tilt", initTilt);
  showDevBanner();
})();
