(function () {
  function fmtEur(v) {
    var n = parseFloat(v);
    if (isNaN(n)) n = 0;
    var parts = n.toFixed(2).split('.');
    var intp = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (parts[1] === '00' ? intp : intp + ',' + parts[1]) + ' €';
  }

  function cards() { return Array.prototype.slice.call(document.querySelectorAll('#ppList .pp-card')); }

  window.ppFilter = function () {
    var sel = document.getElementById('ppEstado');
    var estado = sel ? sel.value : '';
    var input = document.getElementById('ppSearch');
    var q = (input ? input.value : '').toLowerCase().trim();
    var visible = 0;
    cards().forEach(function (c) {
      var matchEstado = !estado || (c.getAttribute('data-estado') || '') === estado;
      var matchSearch = !q || (c.getAttribute('data-search') || '').toLowerCase().indexOf(q) > -1;
      var show = matchEstado && matchSearch;
      c.style.display = show ? '' : 'none';
      if (show) visible++;
    });
    var empty = document.getElementById('ppEmpty');
    if (empty) empty.style.display = (visible === 0) ? 'block' : 'none';
  };

  // Build a custom dropdown (matches the "Gestión Comercial" header menu).
  // The chosen estado is kept on the hidden #ppEstado input so ppFilter() is
  // unchanged. Options are the distinct estados from the cards + the default.
  var DEFAULT_LABEL = 'Filtrar por Estado';

  function buildFilter() {
    var wrap = document.getElementById('ppFilterWrap');
    var trigger = document.getElementById('ppFilterTrigger');
    var menu = document.getElementById('ppFilterMenu');
    var hidden = document.getElementById('ppEstado');
    var label = document.getElementById('ppFilterLabel');
    if (!wrap || !trigger || !menu || !hidden || !label) return;

    var seen = {};
    cards().forEach(function (c) {
      var e = (c.getAttribute('data-estado') || '').trim();
      if (e) { seen[e] = true; }
    });
    var values = [''].concat(Object.keys(seen).sort());

    menu.innerHTML = '';
    values.forEach(function (v) {
      var opt = document.createElement('button');
      opt.type = 'button';
      opt.className = 'pp-filter-opt';
      opt.setAttribute('role', 'option');
      opt.setAttribute('data-value', v);
      opt.textContent = v === '' ? DEFAULT_LABEL : v;
      if (v === hidden.value) opt.classList.add('active');
      opt.addEventListener('click', function () {
        hidden.value = v;
        label.textContent = v === '' ? DEFAULT_LABEL : v;
        Array.prototype.forEach.call(menu.children, function (ch) { ch.classList.remove('active'); });
        opt.classList.add('active');
        closeMenu();
        window.ppFilter();
      });
      menu.appendChild(opt);
    });

    function openMenu() { wrap.classList.add('open'); trigger.setAttribute('aria-expanded', 'true'); }
    function closeMenu() { wrap.classList.remove('open'); trigger.setAttribute('aria-expanded', 'false'); }

    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      if (wrap.classList.contains('open')) closeMenu(); else openMenu();
    });
    menu.addEventListener('click', function (e) { e.stopPropagation(); });
    document.addEventListener('click', function () { closeMenu(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
  }

  // ---- Solicitudes de stock tab: simple text search over its own card list ----
  function solCards() { return Array.prototype.slice.call(document.querySelectorAll('#solList .pp-card')); }

  window.solFilter = function () {
    var input = document.getElementById('solSearch');
    var q = (input ? input.value : '').toLowerCase().trim();
    var visible = 0;
    solCards().forEach(function (c) {
      var show = !q || (c.getAttribute('data-search') || '').toLowerCase().indexOf(q) > -1;
      c.style.display = show ? '' : 'none';
      if (show) visible++;
    });
    var empty = document.getElementById('solEmpty');
    if (empty) empty.style.display = (visible === 0) ? 'block' : 'none';
  };

  // ---- client-side tab switching (show/hide panels, no reload) ----
  function buildTabs() {
    var tabs = Array.prototype.slice.call(document.querySelectorAll('.pp-tab'));
    if (!tabs.length) return;
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t) {
          var active = (t === tab);
          t.classList.toggle('active', active);
          t.setAttribute('aria-selected', active ? 'true' : 'false');
          var panel = document.getElementById(t.getAttribute('data-panel'));
          if (panel) panel.hidden = !active;
        });
      });
    });
  }

  function ppInit() {
    if (!document.getElementById('ppList') && !document.getElementById('solList')) return;
    // format prices (empty => 0 €) across both lists
    document.querySelectorAll('.pp-precio').forEach(function (el) { el.textContent = fmtEur(el.getAttribute('data-v')); });
    buildFilter();
    buildTabs();
  }

  if (document.readyState !== 'loading') { ppInit(); }
  else { document.addEventListener('DOMContentLoaded', ppInit); }
})();
