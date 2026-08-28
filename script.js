/* =============================================
   LUMEA SHIFT — script.js (Animation v2)
   ============================================= */

document.addEventListener('DOMContentLoaded', function () {

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------
     FAQ アコーディオン（aria対応）
  ------------------------------------------ */
  document.querySelectorAll('.faq-q-row').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const ans    = this.nextElementSibling;
      const isOpen = ans.classList.contains('open');

      document.querySelectorAll('.faq-ans').forEach(function (el) { el.classList.remove('open'); });
      document.querySelectorAll('.faq-toggle').forEach(function (el) { el.classList.remove('open'); });
      document.querySelectorAll('.faq-q-row').forEach(function (el) { el.setAttribute('aria-expanded', 'false'); });

      if (!isOpen) {
        ans.classList.add('open');
        this.setAttribute('aria-expanded', 'true');
        const toggle = this.querySelector('.faq-toggle');
        if (toggle) toggle.classList.add('open');
      }
    });
  });

  /* ------------------------------------------
     見出しの文字分割（1文字ずつ立ち上がる）
     <br> を保持しつつ span.ch に分解する
  ------------------------------------------ */
  function splitChars(el, baseDelay, step) {
    if (reduceMotion) return;
    const nodes = Array.from(el.childNodes);
    el.textContent = '';
    el.classList.add('split-heading');
    let i = 0;
    nodes.forEach(function (node) {
      if (node.nodeType === Node.TEXT_NODE) {
        Array.from(node.textContent).forEach(function (chr) {
          const span = document.createElement('span');
          span.className = 'ch';
          span.textContent = chr === ' ' ? '\u00A0' : chr;
          span.style.setProperty('--chd', (baseDelay + i * step) + 's');
          el.appendChild(span);
          i++;
        });
      } else {
        el.appendChild(node.cloneNode(true)); // <br> など
      }
    });
  }

  // ヒーロー見出し：ロード直後に文字ごとに
  const heroCopy = document.querySelector('.hero-copy');
  if (heroCopy) splitChars(heroCopy, 0.35, 0.045);

  // スクロールで現れる見出し
  const splitTargets = document.querySelectorAll(
    '.pain-h, .concept-main, .scene-intro h2, .howto-h, .pricing-h, .product-h'
  );
  splitTargets.forEach(function (el) { splitChars(el, 0, 0.03); });

  /* ------------------------------------------
     リビール（出現）エンジン
     data-reveal 属性が無い要素には自動で "up" を付与。
     同一親内の要素は 0.1s ずつスタガー。
  ------------------------------------------ */
  const autoUp = document.querySelectorAll(
    '.pain-card, .feat-list li, .voice-card, .faq-item, ' +
    '.howto-step, .howto-note, .howto-time, .concept-sub, ' +
    '.pricing-sub, .pricing-feats li, .product-tag, .hero-scroll-none'
  );
  autoUp.forEach(function (el) {
    if (!el.dataset.reveal) el.dataset.reveal = 'up';
  });

  // 見出し（split済み）はrv管理のみ（文字アニメはCSS側）
  splitTargets.forEach(function (el) {
    if (!el.dataset.reveal) el.dataset.reveal = 'none';
  });

  // セクションラベルもリビール対象に
  document.querySelectorAll('.sec-label').forEach(function (el) {
    if (!el.dataset.reveal) el.dataset.reveal = 'none';
  });

  const revealTargets = document.querySelectorAll('[data-reveal]');

  if (!reduceMotion && revealTargets.length) {
    // 親ごとにスタガー遅延を割り当て
    const groups = new Map();
    revealTargets.forEach(function (el) {
      const parent = el.parentElement;
      const idx = groups.get(parent) || 0;
      groups.set(parent, idx + 1);
      el.style.setProperty('--d', (idx * 0.1) + 's');
      el.classList.add('rv');
    });

    const rvObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('rv-in');
          rvObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    revealTargets.forEach(function (el) { rvObserver.observe(el); });
  } else {
    // reduced-motion: 全て即表示
    revealTargets.forEach(function (el) { el.classList.add('rv-in'); });
  }

  /* ------------------------------------------
     価格カウントアップ（¥0 → ¥1,980）
  ------------------------------------------ */
  const priceEl = document.querySelector('.pricing-amount');
  if (priceEl && !reduceMotion) {
    const yen = priceEl.querySelector('.pricing-yen');
    const finalValue = 1980;
    let counted = false;

    const countObserver = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting || counted) return;
      counted = true;
      countObserver.disconnect();

      const duration = 1200;
      const start = performance.now();

      function frame(now) {
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
        const val = Math.round(finalValue * eased);
        priceEl.innerHTML = '';
        if (yen) priceEl.appendChild(yen);
        priceEl.appendChild(document.createTextNode(val.toLocaleString('ja-JP')));
        if (p < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }, { threshold: 0.6 });

    countObserver.observe(priceEl);
  }

  /* ------------------------------------------
     スクロールプログレスバー & パララックス
     （rAFでまとめて処理）
  ------------------------------------------ */
  const progressBar = document.querySelector('.scroll-progress');
  const heroContent = document.querySelector('.hero-content');
  const heroSection = document.querySelector('.hero');
  const parallaxBgs = document.querySelectorAll('.pain, .concept');

  let ticking = false;
  function onScrollFX() {
    const y = window.scrollY;
    const docH = document.documentElement.scrollHeight - window.innerHeight;

    // プログレスバー
    if (progressBar && docH > 0) {
      progressBar.style.transform = 'scaleX(' + (y / docH) + ')';
    }

    if (!reduceMotion) {
      // ヒーロー文字：スクロールで奥へ沈む
      if (heroContent && heroSection && y < window.innerHeight) {
        const r = y / window.innerHeight;
        heroContent.style.transform = 'translateY(' + (y * 0.28) + 'px)';
        heroContent.style.opacity = String(Math.max(1 - r * 1.4, 0));
      }

      // 背景画像セクション：ゆるやかな視差
      parallaxBgs.forEach(function (sec) {
        const rect = sec.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight) return;
        const offset = (rect.top - window.innerHeight) * -0.06;
        sec.style.backgroundPositionY = 'calc(25% + ' + offset.toFixed(1) + 'px)';
      });
    }

    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(onScrollFX);
    }
  }, { passive: true });
  onScrollFX();

  /* ------------------------------------------
     ヒーロー動画：2本をクロスフェードで交互再生
     （終了1.2秒前に次を再生開始し重ねてフェード）
  ------------------------------------------ */
  const heroVideos = Array.from(document.querySelectorAll('[data-hero-video]'));
  if (heroVideos.length >= 2) {
    let current = 0;
    let switching = false;
    const FADE_LEAD = 1.2; // 秒

    function crossfadeToNext() {
      if (switching) return;
      switching = true;
      const next = (current + 1) % heroVideos.length;
      const outgoing = heroVideos[current];
      const incoming = heroVideos[next];

      incoming.currentTime = 0;
      incoming.play().catch(function () {});
      incoming.classList.add('is-active');
      outgoing.classList.remove('is-active');

      // フェード完了後に旧動画を停止
      setTimeout(function () {
        outgoing.pause();
        current = next;
        switching = false;
      }, 1500);
    }

    heroVideos.forEach(function (v) {
      v.addEventListener('timeupdate', function () {
        if (v !== heroVideos[current] || switching) return;
        if (v.duration && v.currentTime > v.duration - FADE_LEAD) crossfadeToNext();
      });
      // timeupdateの取りこぼし対策（バックグラウンドタブ等）
      v.addEventListener('ended', function () {
        if (v === heroVideos[current]) crossfadeToNext();
      });
    });

    // ヒーローが画面外の間は再生を止めて省電力化
    const heroSec = document.querySelector('.hero');
    if (heroSec) {
      const hvObserver = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) {
          heroVideos[current].play().catch(function () {});
        } else {
          heroVideos.forEach(function (v) { v.pause(); });
        }
      }, { threshold: 0.05 });
      hvObserver.observe(heroSec);
    }
  }

  /* ------------------------------------------
     動画の遅延再生（画面内に入ったら再生・外れたら一時停止）
  ------------------------------------------ */
  const lazyVideos = document.querySelectorAll('video[data-lazy]');
  if (lazyVideos.length) {
    const vObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        const v = entry.target;
        if (entry.isIntersecting) {
          if (v.preload === 'none') v.preload = 'metadata';
          v.play().catch(function () { /* 自動再生ブロック時は poster を表示 */ });
        } else {
          v.pause();
        }
      });
    }, { threshold: 0.25 });
    lazyVideos.forEach(function (v) { vObserver.observe(v); });
  }

  /* ------------------------------------------
     ナビ：スクロール後に背景を強調（navがあるページのみ）
  ------------------------------------------ */
  const nav = document.querySelector('.nav');
  if (nav) {
    window.addEventListener('scroll', function () {
      nav.style.boxShadow = window.scrollY > 60 ? '0 1px 12px rgba(0,0,0,.08)' : 'none';
    }, { passive: true });
  }

  /* ------------------------------------------
     CTAボタン：スムーズスクロール（reduce設定時は即時）
  ------------------------------------------ */
  document.querySelectorAll('[data-scroll]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const target = document.querySelector(this.dataset.scroll);
      if (target) target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  });

  /* ------------------------------------------
     下部固定CTA：ヒーローを過ぎたら表示、
     料金セクションが見えている間は非表示
  ------------------------------------------ */
  const bottomCta = document.getElementById('bottom-cta');
  const hero      = document.querySelector('.hero');
  const pricing   = document.querySelector('.pricing');

  if (bottomCta && hero) {
    let pastHero = false;
    let pricingVisible = false;

    function updateBottomCta() {
      const show = pastHero && !pricingVisible;
      bottomCta.classList.toggle('show', show);
      bottomCta.setAttribute('aria-hidden', show ? 'false' : 'true');
    }

    const heroObserver = new IntersectionObserver(function (entries) {
      pastHero = !entries[0].isIntersecting;
      updateBottomCta();
    }, { threshold: 0.1 });
    heroObserver.observe(hero);

    if (pricing) {
      const pricingObserver = new IntersectionObserver(function (entries) {
        pricingVisible = entries[0].isIntersecting;
        updateBottomCta();
      }, { threshold: 0.15 });
      pricingObserver.observe(pricing);
    }
  }

});
