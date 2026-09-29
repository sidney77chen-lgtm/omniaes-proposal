/* OMNIAES — 首頁原型互動 */
(function () {
  const nav = document.getElementById('nav');
  const kv = document.getElementById('kv');

  // Header logo：點擊後整頁重新載入並回到最上方
  // 先捲回頂端再載入，瀏覽器記住的捲動位置就是 0；網址去掉 #錨點，避免載入後又跳到 #learn 之類的位置
  document.querySelector('.nav__brand').addEventListener('click', (e) => {
    e.preventDefault();
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    location.replace(location.pathname + location.search);
  });

  // Nav：離開 KV 頂端後加上深色玻璃底
  const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 40);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // KV 進場：等照片載好再開始漸亮，避免暗幕褪到一半照片才出現（最多等 1.5s）
  const photo = kv.querySelector('.kv__photo');
  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    requestAnimationFrame(() => requestAnimationFrame(() => kv.classList.add('is-in')));
  };
  if (photo.complete) start();
  else {
    photo.addEventListener('load', start, { once: true });
    photo.addEventListener('error', start, { once: true });
    setTimeout(start, 1500);
  }

  const hasIO = 'IntersectionObserver' in window;

  // 醫美小學堂：捲動進場，只播一次
  const learnTargets = document.querySelectorAll('.learn .reveal');
  if (hasIO) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.2 });
    learnTargets.forEach((t) => io.observe(t));
  } else {
    learnTargets.forEach((t) => t.classList.add('is-in'));
  }

  // Section2（上帝視角 AI）：每次進入都重跑進場動畫
  // 各元素進入畫面時淡入；整個 section 完全離開畫面後，瞬間重設回起始狀態（不倒放），下次進來再跑一次
  const ai = document.getElementById('ai');
  const aiTargets = ai.querySelectorAll('.reveal');

  // 引導文字：逐字打出（70ms／字、換行停 500ms，卡片淡入後才開始）
  const tw = ai.querySelector('.typewriter');
  const out = tw.querySelector('.typewriter__out');
  const full = tw.querySelector('.typewriter__ghost').textContent;
  const reduceTw = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let twTimer = null;
  let twDone = false;
  const typeStart = () => {
    if (twDone || twTimer) return;
    if (reduceTw) { out.textContent = full; twDone = true; return; }
    let i = 0;
    const tick = () => {
      i++;
      out.textContent = full.slice(0, i);
      if (i < full.length) twTimer = setTimeout(tick, full[i - 1] === '\n' ? 500 : 70);
      else { twDone = true; twTimer = setTimeout(() => { tw.classList.remove('is-typing'); twTimer = null; }, 1200); }
    };
    twTimer = setTimeout(() => { tw.classList.add('is-typing'); tick(); }, 700);
  };
  const typeReset = () => {
    clearTimeout(twTimer);
    twTimer = null;
    twDone = false;
    out.textContent = '';
    tw.classList.remove('is-typing');
  };

  const aiReset = () => {
    ai.classList.add('no-anim');
    aiTargets.forEach((t) => t.classList.remove('is-in'));
    typeReset();
    void ai.offsetWidth;
    ai.classList.remove('no-anim');
  };

  if (hasIO) {
    const aiIo = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('is-in'); });
    }, { threshold: 0.2 });
    aiTargets.forEach((t) => aiIo.observe(t));

    const twIo = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) typeStart();
    }, { threshold: 0.6 });
    twIo.observe(tw);

    // rootMargin 內縮 2px：KV 高度等於一個螢幕高時，停在頂端 section2 上緣剛好貼齊螢幕底線，
    // 瀏覽器會把「貼邊」算成仍在畫面內，永遠不會重設
    const leaveIo = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) aiReset();
    }, { threshold: 0, rootMargin: '-2px 0px -2px 0px' });
    leaveIo.observe(ai);
  } else {
    aiTargets.forEach((t) => t.classList.add('is-in'));
    out.textContent = full;
  }

  // AI 問答：標籤帶入輸入框。原型不產生 AI 回覆，避免 demo 看起來像在給醫療建議
  const form = document.getElementById('ai-form');
  const input = document.getElementById('ai-input');
  const note = document.getElementById('ai-note');
  const chips = form.querySelectorAll('.ai__chip');

  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      chips.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
      input.value = chip.textContent.trim();
      note.textContent = '';
      input.focus();
    });
  });

  input.addEventListener('input', () => {
    chips.forEach((c) => c.setAttribute('aria-pressed', String(c.textContent.trim() === input.value.trim())));
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    note.textContent = input.value.trim()
      ? '設計原型：AI 回覆功能尚未串接。'
      : '請先輸入或選擇一個你在意的部位或問題。';
  });
  /* ==========================================================
     流動線條動態（.ai-orb__canvas）
     原樣移植自 tsi/lite 的 js/main.js 第 9 節：透明底、白色粒子連線＋流動緞帶，
     純 canvas 2D + requestAnimationFrame，沒有外部依賴。
     ========================================================== */
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var orbCanvas = document.querySelector('.ai-orb__canvas');

  if (orbCanvas) {
    var octx = orbCanvas.getContext('2d');
    var oW = 0, oH = 0, oDpr = 1, oTime = 0;
    var oParticles = [];
    var oRibbons = [];

    function orbRand(min, max) { return min + Math.random() * (max - min); }
    function orbWhite(a) { return 'rgba(255,255,255,' + a + ')'; }

    function buildOrbParticles() {
      oParticles.length = 0;
      var count = Math.min(60, Math.floor((oW * oH) / 900));
      for (var i = 0; i < count; i++) {
        oParticles.push({
          angle: Math.random() * Math.PI * 2,
          radius: orbRand(10, Math.min(oW, oH) * 0.46),
          size: orbRand(0.8, 2.2),
          phase: orbRand(0, Math.PI * 2),
          speed: orbRand(0.3, 1.2),
          x: 0, y: 0
        });
      }
    }

    function buildOrbRibbons() {
      oRibbons.length = 0;
      var count = 6;
      for (var i = 0; i < count; i++) {
        oRibbons.push({
          seed: Math.random(),
          angle: (i / count) * Math.PI * 2,
          radius: orbRand(30, Math.min(oW, oH) * 0.48),
          speed: orbRand(0.0006, 0.0016),
          width: orbRand(0.8, 1.8),
          alpha: orbRand(0.14, 0.3)
        });
      }
    }

    function orbResize() {
      var rect = orbCanvas.getBoundingClientRect();
      oDpr = Math.min(window.devicePixelRatio || 1, 2);
      oW = rect.width;
      oH = rect.height;
      orbCanvas.width = Math.floor(oW * oDpr);
      orbCanvas.height = Math.floor(oH * oDpr);
      octx.setTransform(oDpr, 0, 0, oDpr, 0, 0);
      buildOrbParticles();
      buildOrbRibbons();
    }

    function drawOrbRibbons() {
      var cx = oW / 2, cy = oH / 2;
      octx.save();
      octx.lineCap = 'round';
      oRibbons.forEach(function (r) {
        var phase = oTime * r.speed + r.seed * 10;
        octx.beginPath();
        for (var i = 0; i < 40; i++) {
          var k = i / 39;
          var a = r.angle + k * Math.PI * 1.6 + phase;
          var radius = r.radius + Math.sin(k * Math.PI * 4 + phase) * (oW * 0.08);
          var x = cx + Math.cos(a) * radius * (0.25 + k * 0.75);
          var y = cy + (k - 0.5) * oH * 0.7 + Math.sin(a * 2) * (oH * 0.05);
          if (i === 0) octx.moveTo(x, y); else octx.lineTo(x, y);
        }
        var grad = octx.createLinearGradient(0, cy - oH * 0.4, 0, cy + oH * 0.4);
        grad.addColorStop(0, orbWhite(0));
        grad.addColorStop(0.5, orbWhite(r.alpha));
        grad.addColorStop(1, orbWhite(0));
        octx.strokeStyle = grad;
        octx.lineWidth = r.width;
        octx.shadowColor = orbWhite(1);
        octx.shadowBlur = 8;
        octx.stroke();
      });
      octx.restore();
    }

    function drawOrbParticles() {
      var cx = oW / 2, cy = oH / 2;
      oParticles.forEach(function (p) {
        var t = oTime * 0.001 * p.speed;
        p.x = cx + Math.cos(p.angle + t) * p.radius;
        p.y = cy + Math.sin(p.angle + t) * p.radius * 0.85;
      });

      octx.save();
      octx.lineWidth = 1;
      var maxDist = oW * 0.18;
      for (var i = 0; i < oParticles.length; i++) {
        for (var j = i + 1; j < oParticles.length; j++) {
          var a = oParticles[i], b = oParticles[j];
          var dx = a.x - b.x, dy = a.y - b.y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < maxDist) {
            octx.beginPath();
            octx.moveTo(a.x, a.y);
            octx.lineTo(b.x, b.y);
            octx.strokeStyle = orbWhite((1 - dist / maxDist) * 0.18);
            octx.stroke();
          }
        }
      }

      oParticles.forEach(function (p) {
        var pulse = 0.7 + Math.sin(oTime * 0.004 * p.speed + p.phase) * 0.3;
        octx.beginPath();
        octx.arc(p.x, p.y, p.size * pulse, 0, Math.PI * 2);
        octx.shadowColor = orbWhite(1);
        octx.shadowBlur = 6;
        octx.fillStyle = orbWhite(0.75);
        octx.fill();
      });
      octx.restore();
    }

    function orbFrame(t) {
      oTime = t;
      octx.clearRect(0, 0, oW, oH);
      drawOrbRibbons();
      drawOrbParticles();
      if (!reduce) requestAnimationFrame(orbFrame);
    }

    orbResize();
    window.addEventListener('resize', orbResize, { passive: true });
    if (reduce) {
      orbFrame(0);
    } else {
      requestAnimationFrame(orbFrame);
    }
  }
})();
