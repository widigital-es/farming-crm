(function () {
  // Spanish euro formatting: thousands '.', decimals ',', trailing ' €'.
  function fmtEur(v) {
    var n = parseFloat(String(v).replace(',', '.'));
    if (isNaN(n)) n = 0;
    var parts = n.toFixed(2).split('.');
    var intp = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (parts[1] === '00' ? intp : intp + ',' + parts[1]) + ' €';
  }

  // Map the "Nivel N | label" prefixes (as written by the configurator) to a
  // friendly step label shown above each config line.
  function stepLabel(raw) {
    if (!raw) return 'Configuración';
    var head = raw.split('|')[0].trim().toLowerCase();
    if (head.indexOf('nivel 1') === 0 || head === 'n1') return 'Nivel 1';
    if (head.indexOf('nivel 2') === 0 || head === 'n2') return 'Nivel 2';
    if (head.indexOf('nivel 3') === 0 || head === 'n3') return 'Nivel 3';
    if (head.indexOf('nivel 4') === 0 || head === 'n4') return 'Nivel 4';
    if (head.indexOf('opcional') === 0) return 'Opcional';
    return raw.split('|')[0].trim() || 'Configuración';
  }

  function lineName(raw) {
    if (!raw) return '—';
    var i = raw.indexOf('|');
    var name = (i > -1) ? raw.substring(i + 1).trim() : raw.trim();
    return name || '—';
  }

  function init() {
    // Format every price token rendered with a raw data-v value.
    document.querySelectorAll('.do-precio').forEach(function (el) {
      el.textContent = fmtEur(el.getAttribute('data-v'));
    });

    // Split the raw "Nivel N | label" config lines into step + name.
    document.querySelectorAll('#doCfgLines .do-cfg-line[data-nivel]').forEach(function (line) {
      var raw = line.getAttribute('data-nivel') || '';
      var stepEl = line.querySelector('.do-cfg-step-raw');
      var nameEl = line.querySelector('.do-cfg-name-raw');
      if (stepEl) stepEl.textContent = stepLabel(raw);
      if (nameEl) nameEl.textContent = lineName(raw);
    });
  }

  if (document.readyState !== 'loading') { init(); }
  else { document.addEventListener('DOMContentLoaded', init); }
})();
