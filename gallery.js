(function () {
  // Prioriza formatos leves primeiro
  const EXTENSIONS = ['.webp', '.jpg', '.jpeg', '.png'];
  const MAX_PICS = 50;

  // ---- Helpers -------------------------------------------------------------

  // Carrega uma imagem e resolve com a URL se ok, senão null
  function probe(url) {
    return new Promise((resolve) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => resolve(url);
      img.onerror = () => resolve(null);
      img.src = url; // sem cache-busting (melhor cache)
    });
  }

  // Acha rapidamente a PRIMEIRA imagem existente (1.webp -> 1.jpg -> ...)
  async function findFirstImage(folder) {
    for (const ext of EXTENSIONS) {
      const url = `imgs/${folder}/1${ext}`;
      const ok = await probe(url);
      if (ok) return ok;
    }
    return null;
  }

  // Descobre TODAS as imagens (1..N) em paralelo leve, parando no primeiro "buraco"
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
      else break; // para no primeiro gap
    }
    return found;
  }

  // ---- Mini-galeria (preview no card) -------------------------------------

  function createMiniGallery(cardEl, images) {
    const wrap = document.createElement('div');
    wrap.className = 'app-card-gallery';
    wrap.style.backgroundColor = '#000'; // evita clarão no fade

    const img = document.createElement('img');
    img.alt = '';
    img.decoding = 'async';
    img.loading = 'lazy';
    img.style.transition = 'opacity 420ms ease';
    img.style.opacity = '1';
    wrap.appendChild(img);

    const nav = document.createElement('div');
    nav.className = 'app-card-gallery__nav';
    nav.innerHTML = `
      <button class="app-card-gallery__btn" data-dir="-1" aria-label="Voltar"><i class="fas fa-chevron-left"></i></button>
      <button class="app-card-gallery__btn" data-dir="1" aria-label="Avançar"><i class="fas fa-chevron-right"></i></button>
    `;
    wrap.appendChild(nav);

    const cta = document.createElement('div');
    cta.className = 'app-card-gallery__cta';
    cta.innerHTML = `<button class="btn-see-more"><i class="fa-solid fa-maximize"></i> Ver mais</button>`;
    wrap.appendChild(cta);

    let idx = 0;

    function show(i, opts = {}) {
      if (!images.length) return;
      idx = (i + images.length) % images.length;
      const newSrc = images[idx];

      if (opts.immediate) {
        img.src = newSrc;
        return;
      }

      // Fade suave sem ir a 0 (evita “clarão”)
      img.style.opacity = '0.45';
      setTimeout(() => {
        img.src = newSrc;
        img.onload = () => {
          img.style.opacity = '1';
        };
      }, 140);
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

    // Acessibilidade: teclado
    wrap.tabIndex = 0;
    wrap.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') show(idx + 1);
      if (e.key === 'ArrowLeft') show(idx - 1);
      if (e.key === 'Enter' || e.key === ' ') openLightbox(images, idx);
    });

    // Coloca o preview dentro do card de preview (grid independente)
    cardEl.innerHTML = '';
    cardEl.appendChild(wrap);

    // Retorna uma API simples para atualizar a lista quando descobrirmos o resto
    return {
      replaceImages(newList) {
        images.splice(0, images.length, ...newList);
        // mantém a imagem atual se ainda existir; caso contrário, reseta
        idx = Math.min(idx, images.length - 1);
        show(idx, { immediate: true });
      },
    };
  }

  // ---- Lightbox (maximizado) ----------------------------------------------

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
    const imgEl = lb.querySelector('.app-lightbox__img');
    const pager = lb.querySelector('.app-lightbox__pager');
    let idx = startIdx;

    function show(i) {
      if (!images.length) return;
      idx = (i + images.length) % images.length;
      const src = images[idx];
      imgEl.style.opacity = '0.45';
      setTimeout(() => {
        imgEl.src = src;
        imgEl.onload = () => {
          imgEl.style.opacity = '1';
        };
        pager.textContent = `${idx + 1}/${images.length}`;
      }, 100);
    }

    show(idx);
    lb.classList.add('is-open');

    lb.querySelectorAll('.app-lightbox__btn').forEach((btn) => {
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

  // ---- Inicialização progressiva por card ---------------------------------

  function initCardProgressive(card) {
    const folder = card.dataset.gallery;
    if (!folder) return;

    const countHint = parseInt(card.dataset.galleryCount || '0', 10) || null;

    // 1) Mostra a PRIMEIRA imagem já
    (async () => {
      const first = await findFirstImage(folder);
      if (!first) return;

      const images = [first];
      const api = createMiniGallery(card, images);

      // 2) Em paralelo, descobre todas e atualiza a galeria sem piscar
      const all = await discoverAll(folder, countHint);
      if (all && all.length > 0) {
        api.replaceImages(all);
      }
    })();
  }

  // Usa IntersectionObserver para só iniciar quando o card estiver perto da viewport
  function lazyObserve(card) {
    const io = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((e) => {
          if (e.isIntersecting || e.intersectionRatio > 0) {
            initCardProgressive(card);
            obs.unobserve(card);
          }
        });
      },
      { root: null, rootMargin: '200px 0px', threshold: 0.01 }
    );
    io.observe(card);
  }

  document.addEventListener('DOMContentLoaded', () => {
    const nav = document.querySelector('.nav-sticky');
    if (nav) nav.style.zIndex = Math.max(2000, parseInt(getComputedStyle(nav).zIndex || '2000', 10));

    // Cards de preview independentes (segundo grid)
    const cards = document.querySelectorAll('.app-gallery-card');
    cards.forEach(lazyObserve);
  });
})();
