(function () {
  function fmtEur(v) {
    var n = parseFloat(v);
    if (isNaN(n)) n = 0;
    var parts = n.toFixed(2).split('.');
    var intp = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (parts[1] === '00' ? intp : intp + ',' + parts[1]) + ' €';
  }

  function cards() { return Array.prototype.slice.call(document.querySelectorAll('#stkGrid .stk-card')); }

  window.stkFilter = function () {
    var input = document.getElementById('stkSearch');
    var q = (input ? input.value : '').toLowerCase().trim();
    var checked = Array.prototype.slice.call(document.querySelectorAll('#stkFabFilters input:checked')).map(function (c) { return c.value; });
    var visible = 0;
    cards().forEach(function (card) {
      var matchesSearch = !q || (card.getAttribute('data-search') || '').toLowerCase().indexOf(q) > -1;
      var matchesFab = checked.length === 0 || checked.indexOf(card.getAttribute('data-fab') || '') > -1;
      var show = matchesSearch && matchesFab;
      card.style.display = show ? '' : 'none';
      if (show) visible++;
    });
    var empty = document.getElementById('stkEmpty');
    if (empty) empty.style.display = (visible === 0) ? 'block' : 'none';
  };

  function stkInit() {
    if (!document.getElementById('stkGrid')) return;
    // format prices (empty => 0 €)
    document.querySelectorAll('.stk-precio').forEach(function (el) { el.textContent = fmtEur(el.getAttribute('data-v')); });
    // build Fabricante filter from the rendered cards
    var fabs = {};
    cards().forEach(function (c) { var f = (c.getAttribute('data-fab') || '').trim(); if (f) fabs[f] = true; });
    var box = document.getElementById('stkFabFilters');
    if (!box) return;
    var keys = Object.keys(fabs).sort();
    if (!keys.length) { box.innerHTML = '<span style="color:#9aa3b2;font-size:0.85rem;">—</span>'; return; }
    keys.forEach(function (f) {
      var lbl = document.createElement('label');
      var safe = f.replace(/"/g, '&quot;');
      lbl.innerHTML = '<input type="checkbox" value="' + safe + '" onchange="stkFilter()"> ' + f;
      box.appendChild(lbl);
    });
  }

  if (document.readyState !== 'loading') { stkInit(); }
  else { document.addEventListener('DOMContentLoaded', stkInit); }
})();
