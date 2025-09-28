/* ============ Scroll Reveal (IntersectionObserver) ============ */
(function() {
  const candidates = document.querySelectorAll('.card, [data-reveal], .reveal');
  candidates.forEach((el, idx) => {
    // Ensure the base class is present
    el.classList.add('reveal');
    // Optional: auto stagger by index if no explicit delay set
    if (!el.hasAttribute('data-reveal-delay')) {
      el.setAttribute('data-reveal-delay', (idx % 6) * 80); // 0..400ms
    }
  });

  const io = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          const el = entry.target;
          if (entry.isIntersecting) {
            const delay = parseInt(el.getAttribute('data-reveal-delay') || '0', 10);
            // Add with a tiny timeout to allow transition to apply
            setTimeout(() => {
              el.classList.add('is-visible');
            }, Math.max(0, delay));
            observer.unobserve(el); // reveal once
          }
        });
      }, {
        root: null,
        rootMargin: '0px 0px -5% 0px', // reveal just before fully in view
        threshold: 0.15
      })
    : null;

  // Observe all candidates (or fallback to immediate)
  document.querySelectorAll('.reveal').forEach(el => {
    if (io) {
      io.observe(el);
    } else {
      // Fallback for very old browsers
      el.classList.add('is-visible');
    }
  });
})();
