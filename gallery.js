(function() {
  const MAX_PICS = 30; // segurança
  const EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

  function tryLoad(url) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(url);
      img.onerror = () => resolve(null);
      img.src = url + (url.includes('?') ? '&' : '?') + 'v=' + Date.now();
    });
  }

  async function discoverImages(folder) {
    const found = [];
    let misses = 0;
    for (let i = 1; i <= MAX_PICS; i++) {
      let ok = null;
      for (const ext of EXTENSIONS) {
        const url = `imgs/${folder}/${i}${ext}`;
        /* eslint-disable no-await-in-loop */
        const hit = await tryLoad(url);
        if (hit) { ok = hit; break; }
      }
      if (ok) {
        found.push(ok);
        misses = 0;
      } else {
        misses++;
        if (misses >= 3 && i > 2) break;
      }
    }
    return found;
  }

  function createMiniGallery(cardEl, images) {
    const wrap = document.createElement('div');
    wrap.className = 'app-card-gallery';
  
    const img = document.createElement('img');
    img.alt = ''; img.decoding = 'async'; img.loading = 'lazy';
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
    function show(i) {
      idx = (i + images.length) % images.length;
      const newSrc = images[idx];
    
      // se já está na mesma imagem, não faz nada
      if (img.src.endsWith(newSrc)) return;
    
      // fade out
      img.classList.add("fade-out");
    
      // depois de 300ms troca a imagem e volta o fade in
      setTimeout(() => {
        img.src = newSrc;
        img.onload = () => img.classList.remove("fade-out");
      }, 150);
    }
    show(0);
  
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
      if (e.key === 'ArrowLeft')  show(idx - 1);
      if (e.key === 'Enter' || e.key === ' ') openLightbox(images, idx);
    });
  
    // 👉 agora o preview é um card independente
    cardEl.innerHTML = '';
    cardEl.appendChild(wrap);
  }
  

  let lightboxEl = null;
  function ensureLightbox() {
    if (lightboxEl) return lightboxEl;
    const tpl = document.createElement('div');
    tpl.className = 'app-lightbox';
    tpl.innerHTML = `
      <div class="app-lightbox__backdrop" data-close="1"></div>
      <div class="app-lightbox__stage" data-close="1">
        <div class="app-lightbox__frame" data-close="0">
          <img class="app-lightbox__img" alt="">
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

  function openLightbox(images, startIdx=0) {
    const lb = ensureLightbox();
    const imgEl = lb.querySelector('.app-lightbox__img');
    const pager = lb.querySelector('.app-lightbox__pager');
    let idx = startIdx;

    function show(i) {
      idx = (i + images.length) % images.length;
      imgEl.src = images[idx];
      pager.textContent = `${idx+1}/${images.length}`;
    }
    show(idx);

    lb.classList.add('is-open');

    lb.querySelectorAll('.app-lightbox__btn').forEach(btn => {
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

  document.addEventListener('DOMContentLoaded', async () => {
    const nav = document.querySelector('.nav-sticky');
    if (nav) nav.style.zIndex = Math.max(2000, parseInt(getComputedStyle(nav).zIndex||'2000',10));

    const cards = document.querySelectorAll('.app-gallery-card');
    for (const card of cards) {
      const folder = card.dataset.gallery || null;
      if (!folder) continue;
      const images = await discoverImages(folder);
      if (images.length === 0) continue;
      createMiniGallery(card, images);
    }
  });
})();
