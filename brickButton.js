// ==================== Setup / Elementos ====================
(function () {
  const btn  = document.querySelector('.btn-wall');
  const grid = document.querySelector('.btn-wall__grid');
  if (!btn || !grid) return;

  // ==================== Utilitários ====================
  const cssNum = (prop) =>
    parseFloat(getComputedStyle(document.documentElement).getPropertyValue(prop)) || 0;

  // ==================== Construção da Parede ====================
  function buildBricks() {
    const root     = document.documentElement;
    const ratio    = cssNum('--ratio');
    const joint    = cssNum('--joint');
    const interval = cssNum('--interval') || 45;

    const { width: bw, height: bh } = btn.getBoundingClientRect();
    const brickH0 = cssNum('--brick-h') || 10;

    let rows = Math.max(4, Math.round((bh + joint) / (brickH0 + joint)));
    const brickH = (bh - (rows - 1) * joint) / rows;

    const brickW = brickH * ratio;
    let cols = Math.max(6, Math.round((bw + joint) / (brickW + joint)));

    if (window.matchMedia('(max-width: 580px)').matches) {
      rows = Math.max(rows, 5);
      cols = Math.max(cols, 10);
    }

    root.style.setProperty('--rows', rows);
    root.style.setProperty('--cols', cols);
    root.style.setProperty('--brick-h', `${brickH}px`);

    grid.innerHTML = '';

    const gridCols = cols * 2;
    const seq = [];

    for (let r = rows - 1; r >= 0; r--) {
      const rowIndexFromBottom = (rows - 1 - r);
      const oddRow = rowIndexFromBottom % 2 === 1;

      if (oddRow) {
        const line = [];
        line.push({ r, c: 1, span: 1 });
        for (let c = 2; c <= gridCols - 2; c += 2) line.push({ r, c, span: 2 });
        line.push({ r, c: gridCols, span: 1 });
        line.reverse();
        seq.push(...line);
      } else {
        for (let c = 0; c <= gridCols - 2; c += 2) seq.push({ r, c: c + 1, span: 2 });
      }
    }

    seq.forEach((b, i) => {
      const el = document.createElement('span');
      el.className = 'brick';
      el.style.gridRow = `${b.r + 1} / span 1`;
      el.style.gridColumn = `${b.c} / span ${b.span}`;
      el.style.setProperty('--delay',         `${i * interval}ms`);
      el.style.setProperty('--reverse-delay', `${(seq.length - 1 - i) * interval}ms`);
      grid.appendChild(el);
    });
  }

  // ==================== Eventos ====================
  btn.addEventListener('mouseenter', () => btn.classList.add('armed'));

  let t;
  const rebuild = () => { clearTimeout(t); t = setTimeout(buildBricks, 120); };

  window.addEventListener('resize', rebuild);
  const mq = window.matchMedia('(max-width: 580px)');
  mq.addEventListener ? mq.addEventListener('change', rebuild) : mq.addListener(rebuild);

  // ==================== Inicialização ====================
  buildBricks();
})();
