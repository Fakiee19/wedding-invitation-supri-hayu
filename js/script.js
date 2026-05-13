/**
 * Wedding Invitation — Supriyadi & Hayu Kartikasari
 * GSAP + Lenis + AOS + Lucide + Google Apps Script
 */

(function () {
  "use strict";

  /** @type {string} Ganti dengan URL Web App setelah deploy Apps Script */
  const WEB_APP_URL = "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec";

  const WEDDING_EVENT = new Date("2026-05-30T10:00:00+07:00");
  const RSVP_STORAGE_KEY = "rsvp_sent_supri_hayu_2026";
  const WISHES_CACHE_KEY = "wishes_cache_ts";

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  /* ---------- Utilities ---------- */
  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function formatTs(d) {
    try {
      return new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(d);
    } catch {
      return d.toISOString();
    }
  }

  /* ---------- Countdown ---------- */
  function tickCountdown() {
    const now = Date.now();
    const diff = Math.max(0, WEDDING_EVENT.getTime() - now);
    const s = Math.floor(diff / 1000) % 60;
    const m = Math.floor(diff / 60000) % 60;
    const h = Math.floor(diff / 3600000) % 24;
    const d = Math.floor(diff / 86400000);

    const ids = [
      ["cdDays", "cdHours", "cdMinutes", "cdSeconds"],
      ["cdDaysH", "cdHoursH", "cdMinsH", "cdSecsH"],
    ];
    const vals = [pad(d), pad(h), pad(m), pad(s)];
    ids.forEach((group) => {
      group.forEach((id, i) => {
        const el = document.getElementById(id);
        if (el) el.textContent = vals[i];
      });
    });
  }

  /* ---------- Loader ---------- */
  let loaderRemoved = false;
  function hideLoader() {
    if (loaderRemoved) return;
    loaderRemoved = true;
    loaderAnimRan = true;
    const loader = $("#loader");
    if (!loader) return;
    loader.classList.add("is-hidden");
    setTimeout(() => loader.remove(), 900);
  }

  let loaderAnimRan = false;

  /* ---------- Lenis ---------- */
  let lenis = null;
  function initLenis() {
    if (typeof Lenis === "undefined") return;
    lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
    if (typeof ScrollTrigger !== "undefined") {
      lenis.on("scroll", ScrollTrigger.update);
      ScrollTrigger.scrollerProxy(document.body, {
        scrollTop(value) {
          if (arguments.length && lenis) lenis.scrollTo(value, { immediate: true });
          return lenis ? lenis.scroll : window.scrollY || document.documentElement.scrollTop;
        },
        getBoundingClientRect() {
          return { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight };
        },
      });
    }
  }

  /* ---------- Scroll progress ---------- */
  function initScrollProgress() {
    const bar = $("#scrollProgress");
    if (!bar) return;
    const onScroll = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const p = max > 0 ? (doc.scrollTop / max) * 100 : 0;
      bar.style.width = `${p}%`;
      bar.setAttribute("aria-valuenow", String(Math.round(p)));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Navbar ---------- */
  function initNav() {
    const header = $("#navHeader");
    const nav = $("#mainNav");
    const toggle = $("#navToggle");
    if (!header) return;

    function getScrollY() {
      if (lenis != null) {
        const v = lenis.scroll;
        if (typeof v === "number" && !Number.isNaN(v)) return v;
      }
      return window.scrollY || document.documentElement.scrollTop;
    }

    let lastY = getScrollY();
    /** Akumulasi delta scroll — cegah toggle is-hidden karena mikro-getar Lenis / smooth scroll */
    let acc = 0;
    const ACC_THRESH = 40;
    const ACC_CLAMP = 80;
    const TOP_REVEAL = 96;
    const HIDE_MIN_Y = 180;

    let navRaf = false;
    function updateNavScroll() {
      const y = getScrollY();
      const dy = y - lastY;
      lastY = y;

      header.classList.toggle("is-scrolled", y > 40);

      if (y < TOP_REVEAL) {
        header.classList.remove("is-hidden");
        acc = 0;
        return;
      }

      acc += dy;
      acc = Math.max(-ACC_CLAMP, Math.min(ACC_CLAMP, acc));

      if (y > HIDE_MIN_Y) {
        if (acc >= ACC_THRESH) {
          header.classList.add("is-hidden");
          acc = 0;
        } else if (acc <= -ACC_THRESH) {
          header.classList.remove("is-hidden");
          acc = 0;
        }
      } else {
        header.classList.remove("is-hidden");
        acc = 0;
      }
    }

    function scheduleNavScroll() {
      if (navRaf) return;
      navRaf = true;
      requestAnimationFrame(() => {
        navRaf = false;
        updateNavScroll();
      });
    }

    window.addEventListener("scroll", scheduleNavScroll, { passive: true });
    if (lenis && typeof lenis.on === "function") {
      lenis.on("scroll", scheduleNavScroll);
    }
    scheduleNavScroll();

    toggle?.addEventListener("click", () => {
      const open = nav?.classList.toggle("is-open");
      toggle.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      document.body.style.overflow = open ? "hidden" : "";
    });

    nav?.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", () => {
        nav.classList.remove("is-open");
        toggle?.classList.remove("is-open");
        toggle?.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
      });
    });
  }

  /* ---------- Particles ---------- */
  function initParticles() {
    const canvas = document.getElementById("particles");
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let w = 0,
      h = 0;
    const particles = [];
    const COUNT = 55;

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize, { passive: true });

    for (let i = 0; i < COUNT; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 2.2 + 0.4,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.35 - 0.15,
        a: Math.random() * 0.5 + 0.15,
      });
    }

    function frame() {
      ctx.clearRect(0, 0, w, h);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(245, 230, 232, ${p.a})`;
        ctx.fill();
      });
      requestAnimationFrame(frame);
    }
    frame();
  }

  /* ---------- Spotlight on cards ---------- */
  function initSpotlights() {
    $$(".glass-card").forEach((card) => {
      card.addEventListener(
        "mousemove",
        (e) => {
          const r = card.getBoundingClientRect();
          const x = ((e.clientX - r.left) / r.width) * 100;
          const y = ((e.clientY - r.top) / r.height) * 100;
          card.style.setProperty("--sx", `${x}%`);
          card.style.setProperty("--sy", `${y}%`);
        },
        { passive: true }
      );
    });
  }

  /* ---------- Parallax hero ---------- */
  function initParallax() {
    const video = $(".hero__video");
    const lights = $(".hero__lights");
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return;
    gsap.registerPlugin(ScrollTrigger);

    if (video) {
      gsap.to(video, {
        yPercent: 12,
        ease: "none",
        scrollTrigger: {
          trigger: ".hero",
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
    }
    if (lights) {
      gsap.to(lights, {
        yPercent: -8,
        ease: "none",
        scrollTrigger: {
          trigger: ".hero",
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
    }

    $$(".section").forEach((sec) => {
      gsap.fromTo(
        sec,
        { opacity: 0.85, y: 28 },
        {
          opacity: 1,
          y: 0,
          duration: 1.1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: sec,
            start: "top 88%",
            toggleActions: "play none none reverse",
          },
        }
      );
    });
  }

  /* ---------- Hero video (optional file) ---------- */
  function initHeroVideo() {
    const v = /** @type {HTMLVideoElement} */ ($(".hero__video"));
    if (!v) return;
    const onReady = () => v.classList.add("is-ready");
    v.addEventListener("loadeddata", onReady, { once: true });
    v.addEventListener("canplay", onReady, { once: true });
    v.addEventListener("error", () => v.classList.remove("is-ready"), { passive: true });
    v.play().catch(() => {});
  }

  /* ---------- Open invitation + music ---------- */
  function initHeroOpen() {
    const main = $("#mainContent");
    const btn = $("#btnOpenInvite");
    const audio = /** @type {HTMLAudioElement} */ ($("#bgMusic"));
    const btnMusic = $("#btnMusic");

    const tryPlay = () => {
      if (!audio) return;
      audio.volume = 0.45;
      audio.play().catch(() => {});
    };

    btn?.addEventListener("click", () => {
      main?.classList.remove("is-locked");
      document.documentElement.classList.remove("invite-locked");
      document.body.style.touchAction = "";
      tryPlay();
      btnMusic?.classList.remove("is-muted");
      if (typeof AOS !== "undefined") AOS.refresh();
      if (typeof ScrollTrigger !== "undefined") ScrollTrigger.refresh();
    });

    btnMusic?.addEventListener("click", () => {
      if (!audio) return;
      if (audio.paused) {
        audio.play().catch(() => {});
        btnMusic.classList.remove("is-muted");
      } else {
        audio.pause();
        btnMusic.classList.add("is-muted");
      }
    });

    // Autoplay blocked until user gesture — set muted attempt optional
    if (audio) {
      audio.addEventListener(
        "play",
        () => btnMusic?.classList.remove("is-muted"),
        { passive: true }
      );
      audio.addEventListener(
        "pause",
        () => btnMusic?.classList.add("is-muted"),
        { passive: true }
      );
    }
  }

  /* ---------- Gallery lazy + lightbox ---------- */
  function initGallery() {
    const imgs = $$(".gallery-img");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          const img = /** @type {HTMLImageElement} */ (en.target);
          const src = img.dataset.src;
          if (src) {
            img.src = src;
            img.removeAttribute("data-src");
          }
          io.unobserve(img);
        });
      },
      { rootMargin: "120px" }
    );
    imgs.forEach((img) => io.observe(img));

    const lb = $("#lightbox");
    const lbImg = /** @type {HTMLImageElement} */ ($("#lightboxImg"));
    const closeBtn = $("#lightboxClose");

    function openLb(src, alt) {
      if (!lb || !lbImg) return;
      lbImg.src = src;
      lbImg.alt = alt || "";
      lb.classList.add("is-open");
      lb.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    }

    function closeLb() {
      if (!lb) return;
      lb.classList.remove("is-open");
      lb.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    }

    $$(".gallery-item").forEach((fig) => {
      fig.addEventListener("click", () => {
        const img = fig.querySelector("img");
        if (img?.src) openLb(img.src, img.alt);
      });
    });

    closeBtn?.addEventListener("click", closeLb);
    lb?.addEventListener("click", (e) => {
      if (e.target === lb) closeLb();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeLb();
    });
  }

  /* ---------- Copy rekening ---------- */
  function initCopy() {
    $$(".copy-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const val = btn.getAttribute("data-copy") || "";
        try {
          await navigator.clipboard.writeText(val);
          btn.classList.add("is-done");
          const old = btn.innerHTML;
          btn.innerHTML = '<i data-lucide="check"></i> Tersalin';
          if (window.lucide) lucide.createIcons();
          setTimeout(() => {
            btn.classList.remove("is-done");
            btn.innerHTML = old;
            if (window.lucide) lucide.createIcons();
          }, 2200);
        } catch {
          btn.textContent = "Salin manual";
        }
      });
    });
  }

  /* ---------- API helpers ---------- */
  function isConfigured() {
    return WEB_APP_URL && !WEB_APP_URL.includes("YOUR_DEPLOYMENT_ID");
  }

  async function postRsvp(payload) {
    const body = new URLSearchParams();
    body.set("action", "rsvp");
    body.set("data", JSON.stringify(payload));
    const res = await fetch(WEB_APP_URL, {
      method: "POST",
      body,
    });
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return { ok: false, error: text };
    }
  }

  async function fetchWishes() {
    if (!isConfigured()) return { ok: false, wishes: [] };
    const url = `${WEB_APP_URL}?action=wishes&_=${Date.now()}`;
    const res = await fetch(url, { method: "GET" });
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return { ok: false, wishes: [] };
    }
  }

  /* ---------- RSVP ---------- */
  function initRsvp() {
    const form = /** @type {HTMLFormElement} */ ($("#rsvpForm"));
    const submit = $("#rsvpSubmit");
    const modal = $("#modalSuccess");
    const modalClose = $("#modalSuccessClose");

    if (!form) return;

    function setErr(name, msg) {
      const span = document.querySelector(`.field-error[data-for="${name}"]`);
      if (span) span.textContent = msg || "";
    }

    function validate(data) {
      let ok = true;
      setErr("guestName", "");
      setErr("guestPhone", "");
      setErr("guestCount", "");
      setErr("attendance", "");

      if (!data.name || data.name.length < 2) {
        setErr("guestName", "Nama minimal 2 karakter.");
        ok = false;
      }
      const phoneRe = /^[0-9+][0-9\s-]{8,}$/;
      if (!phoneRe.test(data.phone)) {
        setErr("guestPhone", "Nomor WhatsApp tidak valid.");
        ok = false;
      }
      const count = Number(data.count);
      if (!count || count < 1 || count > 20) {
        setErr("guestCount", "Jumlah antara 1–20.");
        ok = false;
      }
      if (!data.attendance) {
        setErr("attendance", "Pilih konfirmasi kehadiran.");
        ok = false;
      }
      return ok;
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (sessionStorage.getItem(RSVP_STORAGE_KEY)) {
        modal?.classList.add("is-open");
        modal?.setAttribute("aria-hidden", "false");
        return;
      }

      const fd = new FormData(form);
      const payload = {
        name: String(fd.get("guestName") || "").trim(),
        phone: String(fd.get("guestPhone") || "").trim(),
        count: String(fd.get("guestCount") || "1"),
        attendance: String(fd.get("attendance") || ""),
        wish: String(fd.get("guestWish") || "").trim(),
      };

      if (!validate(payload)) return;

      if (!isConfigured()) {
        alert("Mohon set WEB_APP_URL di js/script.js setelah deploy Google Apps Script.");
        return;
      }

      submit?.classList.add("is-loading");

      try {
        const result = await postRsvp(payload);
        if (result && result.ok) {
          sessionStorage.setItem(RSVP_STORAGE_KEY, "1");
          form.reset();
          modal?.classList.add("is-open");
          modal?.setAttribute("aria-hidden", "false");
          loadWishes(true);
        } else {
          alert(result?.message || "Gagal mengirim. Coba lagi.");
        }
      } catch (err) {
        alert("Koneksi gagal. Periksa URL Web App dan izin deploy.");
      } finally {
        submit?.classList.remove("is-loading");
      }
    });

    modalClose?.addEventListener("click", () => {
      modal?.classList.remove("is-open");
      modal?.setAttribute("aria-hidden", "true");
    });
    modal?.querySelector(".modal__backdrop")?.addEventListener("click", () => {
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
    });
  }

  /* ---------- Wishes ---------- */
  async function loadWishes(force) {
    const cardsEl = $("#wishesCards");
    const ph = $("#wishesPlaceholder");
    if (!cardsEl) return;

    if (!isConfigured()) {
      if (ph) {
        ph.textContent =
          "Tambahkan WEB_APP_URL di script.js untuk menampilkan ucapan dari Google Spreadsheet.";
        ph.classList.remove("is-hidden");
      }
      return;
    }

    if (!force) {
      const last = Number(sessionStorage.getItem(WISHES_CACHE_KEY) || 0);
      if (Date.now() - last < 45000) return;
    }

    if (ph) {
      ph.textContent = "Memuat ucapan…";
      ph.classList.remove("is-hidden");
    }

    try {
      const data = await fetchWishes();
      sessionStorage.setItem(WISHES_CACHE_KEY, String(Date.now()));

      const wishes = Array.isArray(data.wishes) ? data.wishes : [];

      if (!wishes.length) {
        cardsEl.innerHTML = "";
        if (ph) {
          ph.textContent = "Belum ada ucapan. Jadilah yang pertama melalui RSVP.";
          ph.classList.remove("is-hidden");
        }
        return;
      }

      ph?.classList.add("is-hidden");
      cardsEl.innerHTML = wishes
        .map(
          (w) => `
        <article class="wish-card">
          <h4 class="wish-card__name">${escapeHtml(w.name)}</h4>
          <p class="wish-card__meta">${escapeHtml(w.meta || "")}</p>
          <p class="wish-card__text">${escapeHtml(w.text || "")}</p>
        </article>`
        )
        .join("");
    } catch {
      if (ph) {
        ph.textContent = "Gagal memuat ucapan. Tekan Muat ulang.";
        ph.classList.remove("is-hidden");
      }
    }
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function initWishes() {
    $("#btnRefreshWishes")?.addEventListener("click", () => {
      sessionStorage.removeItem(WISHES_CACHE_KEY);
      loadWishes(true);
    });
    loadWishes(true);
    setInterval(() => loadWishes(false), 60000);
  }

  /* ---------- Lucide ---------- */
  function initLucide() {
    if (window.lucide) lucide.createIcons();
  }

  /* ---------- Loader GSAP ---------- */
  function runLoaderAnim() {
    if (loaderAnimRan) return;
    loaderAnimRan = true;
    if (typeof gsap === "undefined") {
      setTimeout(hideLoader, 600);
      return;
    }
    const tl = gsap.timeline({ onComplete: hideLoader });
    tl.from(".loader__label", { y: 12, opacity: 0, duration: 0.6, ease: "power2.out" })
      .from(".loader__line", { scaleX: 0, duration: 0.7, ease: "power2.inOut" }, "-=0.2")
      .from(".loader__names", { y: 16, opacity: 0, duration: 0.8, ease: "power2.out" }, "-=0.3");
  }

  /* ---------- Boot ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    const main = $("#mainContent");
    if (main?.classList.contains("is-locked")) {
      document.documentElement.classList.add("invite-locked");
    }

    const safeLoader = () => {
      try {
        runLoaderAnim();
      } catch (e) {
        console.error(e);
        hideLoader();
      }
    };

    window.addEventListener("load", () => {
      safeLoader();
      if (typeof ScrollTrigger !== "undefined") ScrollTrigger.refresh();
      if (typeof AOS !== "undefined") AOS.refresh();
    });

    if (document.readyState === "complete") {
      requestAnimationFrame(safeLoader);
    }

    window.setTimeout(() => {
      const loader = $("#loader");
      if (loader && !loader.classList.contains("is-hidden")) {
        hideLoader();
      }
    }, 4500);

    try {
      tickCountdown();
      setInterval(tickCountdown, 1000);

      initHeroVideo();
      initLenis();
      initScrollProgress();
      initNav();
      initParticles();
      initSpotlights();
      initParallax();
      initHeroOpen();
      initGallery();
      initCopy();
      initRsvp();
      initWishes();
      initLucide();

      if (typeof AOS !== "undefined") {
        AOS.init({
          duration: 900,
          easing: "ease-out-cubic",
          once: true,
          offset: 80,
        });
      }
    } catch (e) {
      console.error(e);
      hideLoader();
    }
  });
})();
