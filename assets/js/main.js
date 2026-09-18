/* ==========================================================================
   ZOENLABS — Interações da landing page
   - Reveal on scroll (IntersectionObserver)
   - Nav com fundo ao rolar + menu mobile
   - Ano dinâmico no rodapé + scroll suave com offset do header
   - Carrossel de cases + formulário de aplicação para a sessão estratégica
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

  /* ---------- 6. Carrossel de cases ----------
     Alterna automaticamente entre os cases, pausa ao passar o mouse, ao focar
     com o teclado e quando a aba está em segundo plano. Respeita a preferência
     por menos movimento: sem troca automática, só navegação manual. */
  var cases = document.getElementById("cases");

  if (cases) {
    var slides = [].slice.call(cases.querySelectorAll(".case"));
    var dots = [].slice.call(cases.querySelectorAll(".cases__dot"));
    var arrows = [].slice.call(cases.querySelectorAll("[data-case-dir]"));
    var duration = parseInt(cases.getAttribute("data-autoplay"), 10) || 7000;
    var current = 0;
    var timer = null;
    var paused = false;

    cases.style.setProperty("--case-duration", duration + "ms");

    function show(index) {
      current = (index + slides.length) % slides.length;
      slides.forEach(function (slide, i) {
        var active = i === current;
        slide.classList.toggle("is-active", active);
        slide.hidden = !active;
        slide.setAttribute("aria-hidden", String(!active));
      });
      dots.forEach(function (dot, i) {
        var active = i === current;
        dot.classList.toggle("is-active", active);
        dot.setAttribute("aria-selected", String(active));
      });
      restart();
    }

    function restart() {
      if (timer) { clearTimeout(timer); timer = null; }
      cases.classList.remove("is-playing");
      if (prefersReduced || paused || slides.length < 2) return;
      // reinicia a animação da barra de progresso
      void cases.offsetWidth;
      cases.classList.add("is-playing");
      timer = setTimeout(function () { show(current + 1); }, duration);
    }

    function pause() { paused = true; restart(); }
    function resume() { paused = false; restart(); }

    arrows.forEach(function (btn) {
      btn.addEventListener("click", function () {
        show(current + parseInt(btn.getAttribute("data-case-dir"), 10));
      });
    });
    dots.forEach(function (dot, i) {
      dot.addEventListener("click", function () { show(i); });
    });

    cases.addEventListener("mouseenter", pause);
    cases.addEventListener("mouseleave", resume);
    cases.addEventListener("focusin", pause);
    cases.addEventListener("focusout", function (e) {
      if (!cases.contains(e.relatedTarget)) resume();
    });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { paused = true; restart(); }
      else { paused = false; restart(); }
    });

    show(0);
  }

  /* ---------- 7. Formulário de aplicação ----------
     O site é estático. Configure FORM_ENDPOINT com a URL de um serviço que
     receba POST JSON (ex.: Formspree, n8n, Make, Zapier, Google Apps Script).
     Sem endpoint, a aplicação é encaminhada pelo WhatsApp da ZoenLabs com o
     texto já preenchido (e um e-mail como alternativa). */
  var FORM_ENDPOINT = "";
  var WHATS_NUMBER = "5519995735894";
  var MAIL_TO = "contato@zoenlabs.com.br";

  var form = document.getElementById("applyForm");
  var success = document.getElementById("applySuccess");
  var successText = document.getElementById("applySuccessText");
  var errorBox = document.getElementById("formError");
  var submitBtn = document.getElementById("applySubmit");
  var whatsLink = document.getElementById("applyWhats");
  var mailLink = document.getElementById("applyMail");

  function fieldValue(name) {
    var el = form.elements[name];
    if (!el) return "";
    if (el.length && el[0] && el[0].type === "radio") {
      for (var i = 0; i < el.length; i++) if (el[i].checked) return el[i].value;
      return "";
    }
    return (el.value || "").trim();
  }

  function collect() {
    return {
      nome: fieldValue("nome"),
      email: fieldValue("email"),
      telefone: fieldValue("telefone"),
      empresa: fieldValue("empresa"),
      objetivo: fieldValue("objetivo"),
      papel: fieldValue("papel"),
      faturamento: fieldValue("faturamento"),
      impacto: fieldValue("impacto"),
      lgpd: !!(form.elements.lgpd && form.elements.lgpd.checked),
      origem: "zoenlabs.com.br/#aplicacao",
      enviadoEm: new Date().toISOString()
    };
  }

  function validate() {
    var ok = true;
    form.classList.add("was-validated");

    // inputs de texto
    var inputs = form.querySelectorAll("input[required]:not([type=radio]):not([type=checkbox])");
    for (var i = 0; i < inputs.length; i++) if (!inputs[i].checkValidity()) ok = false;

    // grupos de rádio
    var groups = form.querySelectorAll(".field--group");
    for (var g = 0; g < groups.length; g++) {
      var checked = groups[g].querySelector("input[type=radio]:checked");
      groups[g].classList.toggle("is-invalid", !checked);
      if (!checked) ok = false;
    }

    // consentimento LGPD
    var consent = form.querySelector(".consent");
    var lgpd = form.elements.lgpd;
    var consentOk = !!(lgpd && lgpd.checked);
    if (consent) consent.classList.toggle("is-invalid", !consentOk);
    if (!consentOk) ok = false;

    if (errorBox) errorBox.hidden = ok;
    if (!ok) {
      var first = form.querySelector(".field input:invalid, .field--group.is-invalid, .consent.is-invalid");
      if (first && first.scrollIntoView) first.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "center" });
    }
    return ok;
  }

  function buildMessage(d) {
    return [
      "Aplicação para a sessão estratégica (ZoenLabs)",
      "",
      "Nome: " + d.nome,
      "E-mail: " + d.email,
      "Telefone/WhatsApp: " + d.telefone,
      "Empresa: " + d.empresa,
      "",
      "O que quer fazer: " + d.objetivo,
      "Papel na empresa: " + d.papel,
      "Faturamento anual: " + d.faturamento,
      "Impacto na receita: " + d.impacto,
      "",
      "Autorizo o contato e o tratamento dos dados conforme a LGPD."
    ].join("\n");
  }

  function showSuccess(d, fallback) {
    form.hidden = true;
    success.hidden = false;
    if (fallback) {
      var msg = buildMessage(d);
      successText.textContent = "Sua aplicação está pronta. Envie pelo WhatsApp para garantirmos o seu horário, ou, se preferir, por e-mail.";
      whatsLink.href = "https://wa.me/" + WHATS_NUMBER + "?text=" + encodeURIComponent(msg);
      whatsLink.hidden = false;
      mailLink.href = "mailto:" + MAIL_TO + "?subject=" + encodeURIComponent("Aplicação para a sessão estratégica: " + d.empresa) + "&body=" + encodeURIComponent(msg);
      mailLink.hidden = false;
    }
    if (success.scrollIntoView) success.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "center" });
  }

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (form.elements.website && form.elements.website.value) return; // honeypot
      if (!validate()) return;

      var data = collect();

      if (!FORM_ENDPOINT) {
        // Sem backend: abre o WhatsApp já preenchido (gesto do usuário) e mostra alternativas
        var url = "https://wa.me/" + WHATS_NUMBER + "?text=" + encodeURIComponent(buildMessage(data));
        try { window.open(url, "_blank", "noopener"); } catch (err) {}
        showSuccess(data, true);
        return;
      }

      submitBtn.classList.add("is-loading");
      fetch(FORM_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(data)
      }).then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        showSuccess(data, false);
      }).catch(function () {
        // Falhou o envio: oferece WhatsApp/e-mail como plano B
        showSuccess(data, true);
      }).then(function () {
        submitBtn.classList.remove("is-loading");
      });
    });

    // limpa o estado de erro ao interagir
    form.addEventListener("input", function () {
      if (form.classList.contains("was-validated")) validate();
    });
  }

  /* ---------- 8. Ano dinâmico ---------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
