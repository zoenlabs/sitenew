/* ==========================================================================
   ZOENLABS — Interações da landing page
   - Reveal on scroll (IntersectionObserver)
   - Nav com fundo ao rolar + menu mobile
   - Ano dinâmico no rodapé + scroll suave com offset do header
   ========================================================================== */
(function () {
  "use strict";

  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 1. Reveal on scroll ----------
     IntersectionObserver como mecanismo principal, com rede de segurança
     por scroll/load para garantir que nada fique invisível se o IO falhar
     ou atrasar em algum navegador. */
  var revealEls = [].slice.call(document.querySelectorAll(".reveal"));

  function revealInView() {
    var vh = window.innerHeight || document.documentElement.clientHeight;
    for (var i = 0; i < revealEls.length; i++) {
      var el = revealEls[i];
      if (el.classList.contains("is-visible")) continue;
      var r = el.getBoundingClientRect();
      if (r.top < vh * 0.92 && r.bottom > 0) el.classList.add("is-visible");
    }
  }

  if (prefersReduced) {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  } else {
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            obs.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
      revealEls.forEach(function (el) { io.observe(el); });
    }

    // Rede de segurança (funciona mesmo sem IO):
    revealInView();
    window.addEventListener("scroll", revealInView, { passive: true });
    window.addEventListener("load", revealInView);
    // último recurso: se nada foi revelado logo após o load, revela tudo
    setTimeout(function () {
      if (!document.querySelector(".reveal.is-visible")) {
        revealEls.forEach(function (el) { el.classList.add("is-visible"); });
      }
    }, 1200);
  }

  /* ---------- 2. Nav: fundo ao rolar ---------- */
  var nav = document.getElementById("nav");
  function onScroll() {
    if (window.scrollY > 24) nav.classList.add("is-scrolled");
    else nav.classList.remove("is-scrolled");
  }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- 3. Menu mobile ---------- */
  var toggle = document.getElementById("navToggle");
  var mobile = document.getElementById("navMobile");

  function closeMenu() {
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Abrir menu");
    mobile.hidden = true;
  }
  function openMenu() {
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "Fechar menu");
    mobile.hidden = false;
  }

  toggle.addEventListener("click", function () {
    if (toggle.getAttribute("aria-expanded") === "true") closeMenu();
    else openMenu();
  });

  mobile.querySelectorAll("a").forEach(function (a) {
    a.addEventListener("click", closeMenu);
  });

  window.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeMenu();
  });

  /* ---------- 4. Vídeo institucional ----------
     Desktop: autoplay (mudo, em loop) ao entrar no site.
     Mobile/touch: toca ao passar por cima / tocar no vídeo.
     Botão de som permite ativar o áudio a qualquer momento. */
  var video = document.getElementById("heroVideo");
  var frame = document.getElementById("videoFrame");
  var playBtn = document.getElementById("videoPlay");
  var muteBtn = document.getElementById("videoMute");

  if (video) {
    video.muted = true;
    video.loop = true;

    var canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    function tryPlay() {
      var p = video.play();
      if (p && typeof p.then === "function") { p.catch(function () {}); }
    }
    function hideOverlay() { if (playBtn) playBtn.classList.add("is-hidden"); }

    if (canHover) {
      // Desktop: começa a tocar assim que possível
      hideOverlay();
      tryPlay();
      // se o autoplay for bloqueado, tenta ao mover o mouse pela página
      window.addEventListener("pointermove", function once() {
        if (video.paused) tryPlay();
        window.removeEventListener("pointermove", once);
      }, { passive: true });
    } else {
      // Mobile/touch: toca ao passar por cima / tocar no vídeo
      var start = function () { hideOverlay(); tryPlay(); };
      if (frame) {
        frame.addEventListener("pointerenter", start);
        frame.addEventListener("touchstart", start, { passive: true });
      }
      if (playBtn) playBtn.addEventListener("click", start);
    }

    // Botão de som (ativar/silenciar)
    if (muteBtn) {
      muteBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        video.muted = !video.muted;
        if (video.paused) tryPlay();
        muteBtn.classList.toggle("is-unmuted", !video.muted);
        muteBtn.setAttribute("aria-pressed", String(!video.muted));
        muteBtn.setAttribute("aria-label", video.muted ? "Ativar som" : "Silenciar");
      });
    }
  }

  /* ---------- 5. Ano dinâmico ---------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
