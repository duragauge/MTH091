// head-common.js  (root)  v2
(function () {
  const add = (el) => document.head.appendChild(el);

  // --- Stylesheets (root-relative) ---
  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = 'stylesheet.css';
  add(css);

  const print = document.createElement('link');
  print.rel = 'stylesheet';
  print.href = 'print.css';
  print.media = 'print';
  add(print);

  // --- MathJax v4 config (define BEFORE loading the script) ---
  window.MathJax = {
    tex: {
      inlineMath: [['$','$'], ['\\(','\\)']],
      displayMath: [['\\[','\\]'], ['$$','$$']],
      packages: {'[+]': ['html','ams']},
      macros: {
        hint:  ['\\class{hint}{#1}', 1],
        thint: ['\\class{hint}{\\text{#1}}', 1]
      }
    },
    loader: { load: ['[tex]/html','[tex]/ams'] }
  };

  const mj = document.createElement('script');
  mj.id = 'MathJax-script';
  mj.async = true;
  mj.src = 'https://cdn.jsdelivr.net/npm/mathjax@4/tex-chtml.js';
  add(mj);
})();

// --- Inject shared header into #site-header, then wire up dropdown ---
document.addEventListener('DOMContentLoaded', () => {
  const SLOT_ID = 'site-header';

  const ensureSlot = () => {
    let slot = document.getElementById(SLOT_ID);
    if (!slot) {
      slot = document.createElement('div');
      slot.id = SLOT_ID;
      document.body.prepend(slot);
    }
    return slot;
  };

  // Inline fallback used when fetch fails (e.g., file://)
  const HEADER_FALLBACK = `
<header class="main-header">
  <div class="title"><a href="./">MTH091 Algebraic Literacy</a></div>
  <nav class="navigation">
    <button class="dropbtn" id="dropdown-button" aria-haspopup="true" aria-expanded="false" aria-controls="dropdown-content">
      Content
    </button>
    <div class="dropdown-content" id="dropdown-content" role="menu">
      Chapter 1 Real Numbers
      <ul>
        <li><a href="1.1.html">1.1 Subsets of Real Numbers</a></li>
        <li><a href="1.2.html">1.2 Working with Integers</a></li>
        <li><a href="1.3.html">1.3 Working with Fractions</a></li>
      </ul>
      Chapter 2 Algebraic Expressions
      <ul>
        <li><a href="2.1.html">2.1 The Language of Algebra</a></li>
        <li><a href="2.2.html">2.2 Using Algebraic Expressions</a></li>
        <li><a href="2.3.html">2.3 Exponents</a></li>
        <li><a href="2.4.html">2.4 Negative Exponents</a></li>
        <li><a href="2.5.html">2.5 The Distributive Property</a></li>
        <li><a href="2.6.html">2.6 Factoring</a></li>
      </ul>
      Chapter 3 Elementary Equations
      <ul>
        <li><a href="3.1.html">3.1 One-Step Equations</a></li>
        <li><a href="3.2.html">3.2 Solving Multi-Step Equations by Inverse Operations</a></li>
        <li><a href="3.3.html">3.3 Solving Literal Equations and Formulas</a></li>
      </ul>
      Chapter 4 Intermediate Equations
      <ul>
        <li><a href="4.1.html">4.1 Solving through Simplification</a></li>
        <li><a href="4.2.html">4.2 Solving by Factoring</a></li>
        <li><a href="4.3.html">4.3 The Quadratic Formula</a></li>
        <li><a href="4.4.html">4.4 Beyond the Basics</a></li>
      </ul>
      Chapter 5 Graphing
      <ul>
        <li><a href="5.1.html">5.1 The Cartesian Coordinate System</a></li>
        <li><a href="5.2.html">5.2 Understanding Slope</a></li>
        <li><a href="5.3.html">5.3 Graphing Linear Equations</a></li>
        <li><a href="5.4.html">5.4 Graphing Quadratic Equations</a></li>
        <li><a href="5.5.html">5.5 Graphing Equations with Technology</a></li>
      </ul>
      <ul>
        <li><a href="glossary.html">Glossary of Terms</a></li>
      </ul>
    </div>
  </nav>
</header>
`;

  const wireDropdown = () => {
    const btn  = document.getElementById('dropdown-button');
    const menu = document.getElementById('dropdown-content');
    if (!btn || !menu) return;

    const open  = () => { menu.classList.add('show');  btn.setAttribute('aria-expanded','true'); };
    const close = () => { menu.classList.remove('show'); btn.setAttribute('aria-expanded','false'); };

    btn.addEventListener('click', (e) => {
      menu.classList.contains('show') ? close() : open();
      e.stopPropagation();
    });
    document.addEventListener('click', (e) => {
      if (!menu.contains(e.target) && !btn.contains(e.target)) close();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  };

  const inject = (html) => {
    const slot = ensureSlot();
    slot.outerHTML = html;
    wireDropdown();
  };

  const getHeader = () => {
    if (location.protocol === 'file:') return Promise.resolve(HEADER_FALLBACK);
    return fetch('header.html').then(r => r.ok ? r.text() : HEADER_FALLBACK)
                               .catch(() => HEADER_FALLBACK);
  };

  getHeader().then(inject);
});

// --- H2 permalinks ---
document.addEventListener('DOMContentLoaded', () => {
  if (window.__PERMALINKS_READY) return;
  window.__PERMALINKS_READY = true;

  const used = new Set();
  const slugify = (s) =>
    s.toLowerCase()
     .replace(/[\s\u00A0]+/g, '-')
     .replace(/[^a-z0-9\-]/g, '')
     .replace(/-+/g, '-')
     .replace(/^-|-$/g, '') || 'section';

  const uniqueId = (base) => {
    let id = base, n = 2;
    while (used.has(id) || document.getElementById(id)) id = `${base}-${n++}`;
    used.add(id);
    return id;
  };

  document.querySelectorAll('.main-content h2').forEach(h => {
    let id = h.getAttribute('id') || h.getAttribute('data-id');
    if (!id) id = uniqueId(slugify(h.textContent));
    else if (!used.has(id)) used.add(id);
    h.id = id;

    if (h.querySelector('.heading-anchor')) return;
    const a = document.createElement('a');
    a.className = 'heading-anchor';
    a.href = `#${id}`;
    a.setAttribute('aria-label', `Permalink to “${h.textContent.trim()}”`);
    a.textContent = '🔗';
    h.appendChild(a);
  });
});
