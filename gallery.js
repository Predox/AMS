(function () {
  const EXTENSIONS = ['.webp', '.jpg', '.jpeg', '.png'];
  const MAX_PICS = 50;

  const q  = (sel, el=document) => el.querySelector(sel);
  const qa = (sel, el=document) => Array.from(el.querySelectorAll(sel));

  function probe(url) {
    return new Promise((resolve) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => resolve(url);
      img.onerror = () => resolve(null);
      img.src = url; // aproveita cache
    });
  }

  // Tenta gerar par (low, high) para um índice i
  async function findOnePair(folder, i) {
    const base = `imgs/${folder}/`;
    const lowCandidates = [
      `${base}${i}-sm`,     // 1-sm
      `${base}${i}_sm`,     // 1_sm
      `${base}sm/${i}`,     // sm/1
      `${base}thumbs/${i}`, // thumbs/1
    ];
    const hiCandidates = [
      `${base}${i}`         // 1 (sem sufixo)
    ];

    let low = null, hi = null;

    // baixa qualidade
    for (const cand of lowCandidates) {
      for (const ext of EXTENSIONS) {
        const ok = await probe(cand + ext); // eslint-disable-line no-await-in-loop
        if (ok) { low = ok; break; }
      }
      if (low) break;
    }

    // alta qualidade
    for (const cand of hiCandidates) {
      for (const ext of EXTENSIONS) {
        const ok = await probe(cand + ext); // eslint-disable-line no-await-in-loop
        if (ok) { hi = ok; break; }
      }
      if (hi) break;
    }

    // fallback: se não achou low, mas achou hi, usa hi nas duas
    if (!low && hi) low = hi;

    // se nada encontrado, retorna null
    if (!low) return null;

    return { low, hi }; // hi pode ser null (só low existente)
  }

  // Primeira imagem (par low/hi) do índice 1
  async function findFirstPair(folder) {
    return findOnePair(folder, 1);
  }

  // Descobre até MAX_PICS pares (low, hi)
  async function discoverAllPairs(folder, countHint) {
    const found = [];
    const limit = Math.min(MAX_PICS, Math.max(1, countHint || MAX_PICS));
    for (let i = 1; i <= limit; i++) {
      // eslint-disable-next-line no-await-in-loop
      const pair = await findOnePair(folder, i);
      if (!pair) break;     // parou no primeiro índice inexistente
      found.push(pair);
    }
    return found;
  }

  function wireMiniGallery(cardEl, pairs) {
    // pairs: [{low, hi}, ...]

    const wrap = q('.app-card-gallery', cardEl) || cardEl; // fallback
    const img  = q('img', wrap) || document.createElement('img');
    if (!img.parentElement) wrap.appendChild(img);

    const nav = q('.app-card-gallery__nav', wrap) || document.createElement('div');
    if (!nav.parentElement) {
      nav.className = 'app-card-gallery__nav';
      nav.innerHTML = `
        <button class="app-card-gallery__btn" data-dir="-1" aria-label="Voltar"><i class="fas fa-chevron-left"></i></button>
        <button class="app-card-gallery__btn" data-dir="1" aria-label="Avançar"><i class="fas fa-chevron-right"></i></button>
      `;
      wrap.appendChild(nav);
    }

    const cta = q('.app-card-gallery__cta', wrap) || document.createElement('div');
    if (!cta.parentElement) {
      cta.className = 'app-card-gallery__cta';
      cta.innerHTML = `<button class="btn-see-more"><i class="fa-solid fa-maximize"></i> Ver mais</button>`;
      wrap.appendChild(cta);
    }

    // anti “clarão” + perf
    wrap.style.backgroundColor = wrap.style.backgroundColor || '#000';
    img.style.transition  = img.style.transition  || 'opacity 420ms ease';
    img.style.opacity     = '1';
    img.loading           = 'eager';  // 1ª imagem tem prioridade
    img.fetchPriority     = 'high';

    let idx = 0;
    let showingHi = false;

    function setSrcSmooth(url, { immediate=false } = {}) {
      if (immediate) { img.src = url; return; }
      img.style.opacity = '0.45';
      setTimeout(() => {
        img.src = url;
        img.onload = () => { img.style.opacity = '1'; };
      }, 120);
    }

    async function upgradeToHiIfAvailable(i) {
      const pair = pairs[i];
      if (!pair || !pair.hi || showingHi) return;
      // Pré-carrega a alta e troca suave
      const ok = await probe(pair.hi);
      if (ok) {
        showingHi = true;
        setSrcSmooth(pair.hi);
      }
    }

    function show(i, opts = {}) {
      if (!pairs.length) return;
      idx = (i + pairs.length) % pairs.length;
      const pair = pairs[idx];

      showingHi = false;
      setSrcSmooth(pair.low, opts);
      // em background, tenta trocar para a alta
      upgradeToHiIfAvailable(idx);
    }

    // Primeira imagem imediata (low), e tenta alta
    show(0, { immediate: true });
    upgradeToHiIfAvailable(0);

    wrap.addEventListener('click', (e) => {
      const t = e.target;
      if (t.closest('.app-card-gallery__btn')) {
        const dir = parseInt(t.closest('.app-card-gallery__btn').dataset.dir, 10);
        show(idx + dir);
      } else if (t.closest('.btn-see-more') || t === img) {
        // Lightbox abre com hi se existir, senão low
        openLightbox(pairs, idx);
      }
    });

    wrap.tabIndex = 0;
    wrap.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') show(idx + 1);
      if (e.key === 'ArrowLeft')  show(idx - 1);
      if (e.key === 'Enter' || e.key === ' ') openLightbox(pairs, idx);
    });

    return {
      replacePairs(newPairs) {
        pairs.splice(0, pairs.length, ...newPairs);
        idx = Math.min(idx, pairs.length - 1);
        showingHi = false;
        show(idx, { immediate: true });
        upgradeToHiIfAvailable(idx);
      },
    };
  }

  // Lightbox — usa HI quando existir
  let lightboxEl = null;
  function ensureLightbox() {
    if (lightboxEl) return lightboxEl;
    const tpl = document.createElement('div');
    tpl.className = 'app-lightbox';
    tpl.innerHTML = `
      <div class="app-lightbox__backdrop" data-close="1"></div>
      <div class="app-lightbox__stage" data-close="1">
        <div class="app-lightbox__frame" data-close="0">
          <img class="app-lightbox__img" alt="" style="transition:opacity 360ms ease; background:#000;">
          <div class="app-lightbox__nav">
            <button class="app-lightbox__btn" data-dir="-1" aria-label="Imagem anterior"><i class="fas fa-chevron-left"></i></button>
            <button class="app-lightbox__btn" data-dir="1" aria-label="Próxima imagem"><i class="fas fa-chevron-right"></i></button>
          </div>
          <div class="app-lightbox__pager">1/1</div>
        </div>
      </div>
    `;
    document.body.appendChild(tpl);
    lightboxEl = tpl;

    tpl.addEventListener('click', (e) => {
      if (e.target.dataset.close === '1') closeLightbox();
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && lightboxEl.classList.contains('is-open')) closeLightbox();
    });
    return lightboxEl;
  }

  function openLightbox(pairs, startIdx = 0) {
    const lb = ensureLightbox();
    const imgEl = q('.app-lightbox__img', lb);
    const pager = q('.app-lightbox__pager', lb);
    let idx = startIdx;

    async function show(i) {
      if (!pairs.length) return;
      idx = (i + pairs.length) % pairs.length;
      const pair = pairs[idx];
      const prefer = pair.hi || pair.low;

      imgEl.style.opacity = '0.45';
      setTimeout(async () => {
        // tenta garantir a HI antes de pintar (se existir)
        const chosen = pair.hi ? (await probe(pair.hi)) || pair.low : pair.low;
        imgEl.src = chosen;
        imgEl.onload = () => { imgEl.style.opacity = '1'; };
        pager.textContent = `${idx + 1}/${pairs.length}`;
      }, 100);
    }

    show(idx);
    lb.classList.add('is-open');

    qa('.app-lightbox__btn', lb).forEach((btn) => {
      btn.onclick = () => show(idx + parseInt(btn.dataset.dir, 10));
    });

    function onKey(e) {
      if (e.key === 'ArrowRight') show(idx + 1);
      if (e.key === 'ArrowLeft')  show(idx - 1);
    }
    window.addEventListener('keydown', onKey, { passive: true });
    lb._onKey = onKey;
  }

  function closeLightbox() {
    if (!lightboxEl) return;
    lightboxEl.classList.remove('is-open');
    if (lightboxEl._onKey) window.removeEventListener('keydown', lightboxEl._onKey);
  }

  // --------- Opção A: hidratar TODOS os cards quando a seção entrar ---------
  function initCardProgressive(card) {
    const folder = card.dataset.gallery;
    if (!folder) return;
    const countHint = parseInt(card.dataset.galleryCount || '0', 10) || null;

    (async () => {
      // 1) Primeira imagem já (par low/hi do índice 1)
      const firstPair = await findFirstPair(folder);
      if (!firstPair) return;

      const pairs = [firstPair];
      const api = wireMiniGallery(card, pairs);

      // 2) Descobre o resto em paralelo e atualiza
      const all = await discoverAllPairs(folder, countHint);
      if (all && all.length) api.replacePairs(all);
    })();
  }

  function hydrateAllInSection() {
    const cards = document.querySelectorAll('.app-gallery-card');
    cards.forEach(initCardProgressive);
  }

  document.addEventListener('DOMContentLoaded', () => {
    const nav = document.querySelector('.nav-sticky');
    if (nav) nav.style.zIndex = Math.max(2000, parseInt(getComputedStyle(nav).zIndex || '2000', 10));

    const section = document.querySelector('#aplicacoes');
    if (!section) return;

    // Observa a seção; quando entrar (ou estiver perto), hidrata todos os cards juntos
    const io = new IntersectionObserver((entries, obs) => {
      if (entries.some(e => e.isIntersecting || e.intersectionRatio > 0)) {
        hydrateAllInSection();
        obs.unobserve(section);
      }
    }, { root: null, rootMargin: '600px 0px', threshold: 0.05 });

    io.observe(section);
  });
})();
