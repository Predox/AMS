(function () {
  const EXTENSIONS = ['.webp', '.jpg', '.jpeg', '.png'];
  const MAX_PICS = 50;

  const q = (sel, el=document) => el.querySelector(sel);
  const qa = (sel, el=document) => Array.from(el.querySelectorAll(sel));

  function probe(url) {
    return new Promise((resolve) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => resolve(url);
      img.onerror = () => resolve(null);
      img.src = url; // sem cache-busting para aproveitar cache
    });
  }

  async function findFirstImage(folder) {
    for (const ext of EXTENSIONS) {
      const url = `imgs/${folder}/1${ext}`;
      const ok = await probe(url);
      if (ok) return ok;
    }
    return null;
  }

  async function discoverAll(folder, countHint) {
    const found = [];
    const limit = Math.min(MAX_PICS, Math.max(1, countHint || MAX_PICS));
    for (let i = 1; i <= limit; i++) {
      let ok = null;
      for (const ext of EXTENSIONS) {
        const url = `imgs/${folder}/${i}${ext}`;
        // eslint-disable-next-line no-await-in-loop
        ok = await probe(url);
        if (ok) break;
      }
      if (ok) found.push(ok);
      else break;
    }
    return found;
  }

  function wireMiniGallery(cardEl, images) {
    const wrap = q('.app-card-gallery', cardEl) || cardEl; // fallback
    const img = q('img', wrap) || document.createElement('img');
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

    // anti “clarão”
    wrap.style.backgroundColor = wrap.style.backgroundColor || '#000';
    img.style.transition = img.style.transition || 'opacity 420ms ease';
    img.style.opacity = '1';
    // prioridade para a 1ª imagem (carrega logo)
    img.loading = 'eager';
    img.fetchPriority = 'high';

    let idx = 0;
    function show(i, opts = {}) {
      if (!images.length) return;
      idx = (i + images.length) % images.length;
      const newSrc = images[idx];

      if (opts.immediate) {
        img.src = newSrc;
        return;
      }
      img.style.opacity = '0.45';
      setTimeout(() => {
        img.src = newSrc;
        img.onload = () => { img.style.opacity = '1'; };
      }, 120);
    }

    // Primeira imagem imediata
    show(0, { immediate: true });

    wrap.addEventListener('click', (e) => {
      const t = e.target;
      if (t.closest('.app-card-gallery__btn')) {
        const dir = parseInt(t.closest('.app-card-gallery__btn').dataset.dir, 10);
        show(idx + dir);
      } else if (t.closest('.btn-see-more') || t === img) {
        openLightbox(images, idx);
      }
    });

    wrap.tabIndex = 0;
    wrap.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') show(idx + 1);
      if (e.key === 'ArrowLeft') show(idx - 1);
      if (e.key === 'Enter' || e.key === ' ') openLightbox(images, idx);
    });

    return {
      replaceImages(newList) {
        images.splice(0, images.length, ...newList);
        idx = Math.min(idx, images.length - 1);
        show(idx, { immediate: true });
      },
    };
  }

  // Lightbox (igual ao anterior, suavizado)
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

  function openLightbox(images, startIdx = 0) {
    const lb = ensureLightbox();
    const imgEl = q('.app-lightbox__img', lb);
    const pager = q('.app-lightbox__pager', lb);
    let idx = startIdx;

    function show(i) {
      if (!images.length) return;
      idx = (i + images.length) % images.length;
      const src = images[idx];
      imgEl.style.opacity = '0.45';
      setTimeout(() => {
        imgEl.src = src;
        imgEl.onload = () => { imgEl.style.opacity = '1'; };
        pager.textContent = `${idx + 1}/${images.length}`;
      }, 100);
    }

    show(idx);
    lb.classList.add('is-open');

    qa('.app-lightbox__btn', lb).forEach((btn) => {
      btn.onclick = () => show(idx + parseInt(btn.dataset.dir, 10));
    });

    function onKey(e) {
      if (e.key === 'ArrowRight') show(idx + 1);
      if (e.key === 'ArrowLeft') show(idx - 1);
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
      // 1) Primeira imagem já
      const first = await findFirstImage(folder);
      if (!first) return;

      const images = [first];
      const api = wireMiniGallery(card, images);

      // 2) Descobre o resto em paralelo e atualiza
      const all = await discoverAll(folder, countHint);
      if (all && all.length) api.replaceImages(all);
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
