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

  // ---- "Eliminar Borrador" → mark opportunity as "Rechazado cliente" ----
  // wi_fase option-set value for "Rechazado cliente" (confirmed via modelbuilder
  // on wi_oportunidadfarming). This is a STATUS CHANGE (PATCH), never a delete.
  var SET_OPP = 'wi_oportunidadfarmings';
  var FASE_RECHAZADO_CLIENTE = 6;
  var oppId = '';
  var lastFocused = null;

  // Portal request-verification token (same approach as Resumen / stock page).
  function getToken() {
    return new Promise(function (resolve) {
      if (window.shell && typeof shell.getTokenDeferred === 'function') {
        shell.getTokenDeferred().done(function (t) { resolve(t); }).fail(function () { resolve(null); });
      } else {
        var input = document.querySelector("[name='__RequestVerificationToken']");
        resolve(input ? input.value : null);
      }
    });
  }

  // Mirrors Resumen's apiPatch headers exactly.
  function apiPatch(set, id, payload, token) {
    return fetch('/_api/' + set + '(' + id + ')', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json', 'Accept': 'application/json',
        'OData-MaxVersion': '4.0', 'OData-Version': '4.0',
        '__RequestVerificationToken': token || ''
      },
      body: JSON.stringify(payload)
    }).then(function (res) {
      return res.text().then(function (txt) {
        if (!res.ok) throw new Error('HTTP ' + res.status + ' (PATCH) en ' + set + ': ' + txt);
        return txt ? JSON.parse(txt) : {};
      });
    });
  }

  function showModalStatus(msg, kind) {
    var el = document.getElementById('doModalStatus');
    if (!el) return;
    el.style.display = 'block';
    el.className = 'do-modal-status ' + (kind || '');
    el.textContent = msg;
  }

  function openModal() {
    var overlay = document.getElementById('doModal');
    if (!overlay) return;
    lastFocused = document.activeElement;
    overlay.classList.remove('do-hidden');
    overlay.setAttribute('aria-hidden', 'false');
    document.addEventListener('keydown', onModalKeydown);
    var card = overlay.querySelector('.do-modal');
    if (card) card.focus();
  }

  function closeModal() {
    var overlay = document.getElementById('doModal');
    if (!overlay) return;
    overlay.classList.add('do-hidden');
    overlay.setAttribute('aria-hidden', 'true');
    document.removeEventListener('keydown', onModalKeydown);
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  }

  function onModalKeydown(e) {
    if (e.key === 'Escape' || e.keyCode === 27) { closeModal(); }
  }

  // "Sí": PATCH wi_fase = Rechazado cliente, then reload so the new estado shows
  // and the conditional buttons (Editar / Eliminar Borrador) disappear.
  function confirmEliminar() {
    if (!oppId) { showModalStatus('No se ha podido identificar la oportunidad.', 'err'); return; }
    var siBtn = document.getElementById('doModalSi');
    var noBtn = document.getElementById('doModalNo');
    if (siBtn) siBtn.disabled = true;
    if (noBtn) noBtn.disabled = true;
    showModalStatus('Actualizando estado...');

    getToken().then(function (token) {
      return apiPatch(SET_OPP, oppId, { 'wi_fase': FASE_RECHAZADO_CLIENTE }, token);
    }).then(function () {
      showModalStatus('Estado actualizado. Recargando...');
      location.reload();
    }).catch(function (err) {
      showModalStatus('No se ha podido actualizar el estado: ' + err.message, 'err');
      if (siBtn) siBtn.disabled = false;
      if (noBtn) noBtn.disabled = false;
    });
  }

  function initEliminar() {
    var btn = document.getElementById('doEliminar');
    if (!btn) return; // not a Borrador → button not rendered
    oppId = btn.getAttribute('data-opp-id') || '';
    btn.addEventListener('click', openModal);

    var siBtn = document.getElementById('doModalSi');
    if (siBtn) siBtn.addEventListener('click', confirmEliminar);
    var noBtn = document.getElementById('doModalNo');
    if (noBtn) noBtn.addEventListener('click', closeModal);
    var overlay = document.getElementById('doModal');
    if (overlay) {
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) closeModal();
      });
    }
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

    initEliminar();
  }

  if (document.readyState !== 'loading') { init(); }
  else { document.addEventListener('DOMContentLoaded', init); }
})();
