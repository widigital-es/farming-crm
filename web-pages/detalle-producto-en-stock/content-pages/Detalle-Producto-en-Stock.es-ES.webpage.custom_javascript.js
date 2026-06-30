(function () {
  // ---- entity set + nav property names (confirmed against farming-dev metadata) ----
  var SET_OPP = 'wi_oportunidadfarmings';            // wi_oportunidadfarming
  var SET_STOCK = 'wi_stocks';                        // wi_stock

  // Fase choice on the opportunity. "Solicitar stock" uses Solicitud de pedido = 2 (mirrors Resumen).
  var FASE_PEDIDO = 2;
  // wi_stock state when sold: statecode Inactivo = 1, statuscode Inactivo = 2.
  var STOCK_INACTIVO_STATE = 1;
  var STOCK_INACTIVO_STATUS = 2;

  // Liquid-stamped values are read from the #dpSolicitar button's data-* attributes
  // (set in dpInit), so they work for portal users — inline page-copy <script> does not run.
  var cuentaId = '';
  var contactoId = '';
  var stockId = '';
  var stockPrecioRaw = '';

  function fmtEur(v) {
    var n = parseFloat(v);
    if (isNaN(n)) n = 0;
    var parts = n.toFixed(2).split('.');
    var intp = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (parts[1] === '00' ? intp : intp + ',' + parts[1]) + ' €';
  }

  function showStatus(msg, kind) {
    var el = document.getElementById('dpStatus');
    if (!el) return;
    el.style.display = 'block';
    el.className = 'dp-status ' + (kind || '');
    el.textContent = msg;
  }

  // Portal request-verification token (same approach as Resumen).
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

  function apiCreate(set, payload, token) {
    return fetch('/_api/' + set, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json', 'Accept': 'application/json',
        'OData-MaxVersion': '4.0', 'OData-Version': '4.0',
        'Prefer': 'return=representation', '__RequestVerificationToken': token || ''
      },
      body: JSON.stringify(payload)
    }).then(function (res) {
      return res.text().then(function (txt) {
        if (!res.ok) throw new Error('HTTP ' + res.status + ' en ' + set + ': ' + txt);
        var id = null, loc = res.headers.get('OData-EntityId') || res.headers.get('Location');
        if (loc) { var m = loc.match(/\(([^)]+)\)/); if (m) id = m[1]; }
        return { data: txt ? JSON.parse(txt) : {}, id: id };
      });
    });
  }

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

  // ---- confirmation modal helpers ----
  var lastFocused = null;

  function openModal() {
    var overlay = document.getElementById('dpModal');
    if (!overlay) { runCreate(); return; } // fallback if markup missing
    lastFocused = document.activeElement;
    overlay.classList.remove('dp-hidden');
    overlay.setAttribute('aria-hidden', 'false');
    document.addEventListener('keydown', onModalKeydown);
    var card = overlay.querySelector('.dp-modal');
    if (card) card.focus();
  }

  function closeModal() {
    var overlay = document.getElementById('dpModal');
    if (!overlay) return;
    overlay.classList.add('dp-hidden');
    overlay.setAttribute('aria-hidden', 'true');
    document.removeEventListener('keydown', onModalKeydown);
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  }

  function onModalKeydown(e) {
    if (e.key === 'Escape' || e.keyCode === 27) { closeModal(); }
  }

  // Opens the custom confirmation modal instead of the native confirm().
  function solicitarStock() {
    if (!stockId) { showStatus('No se ha podido identificar el producto en stock.', 'err'); return; }
    openModal();
  }

  // Creates a SINGLE wi_oportunidadfarming for this stock product, then marks the
  // wi_stock record sold (statecode Inactivo). No wi_solicituddepedidodestock is
  // created any more — the opportunity carries wi_productostock + wi_precio.
  function runCreate() {
    closeModal();
    if (!stockId) { showStatus('No se ha podido identificar el producto en stock.', 'err'); return; }

    var btn = document.getElementById('dpSolicitar');
    if (btn) btn.disabled = true;
    showStatus('Creando pedido...');

    var precio = parseFloat(String(stockPrecioRaw).replace(',', '.'));
    if (isNaN(precio)) precio = null;

    getToken().then(function (token) {
      // 1) Opportunity — same cuenta/contacto stamping + fase as Resumen's "Solicitar Pedido".
      //    Linked to this stock product via wi_ProductoStock, and stamped with its price.
      var oppPayload = {
        'wi_fase': FASE_PEDIDO,
        'wi_ProductoStock@odata.bind': '/' + SET_STOCK + '(' + stockId + ')'
      };
      if (precio != null) oppPayload.wi_precio = precio;
      if (cuentaId) oppPayload['wi_Cuenta@odata.bind'] = '/accounts(' + cuentaId + ')';
      if (contactoId) oppPayload['wi_Contacto@odata.bind'] = '/contacts(' + contactoId + ')';

      return apiCreate(SET_OPP, oppPayload, token).then(function () {
        // 2) Mark the stock record as sold (Inactivo) so it shows the VENDIDO stamp
        //    and can no longer be requested.
        showStatus('Pedido creado. Actualizando el stock...');
        return apiPatch(SET_STOCK, stockId, {
          'statecode': STOCK_INACTIVO_STATE,
          'statuscode': STOCK_INACTIVO_STATUS
        }, token);
      });
    }).then(function () {
      showStatus('Pedido creado correctamente. Redirigiendo...', 'ok');
      setTimeout(function () { location.href = '/Oportunidades'; }, 1200);
    }).catch(function (err) {
      showStatus('No se ha podido completar la solicitud: ' + err.message, 'err');
      if (btn) btn.disabled = false;
    });
  }

  function dpInit() {
    // format price (empty => 0 €), same as the stock list
    document.querySelectorAll('.dp-precio').forEach(function (el) {
      el.textContent = fmtEur(el.getAttribute('data-v'));
    });
    var btn = document.getElementById('dpSolicitar');
    if (btn) {
      // Read the Liquid-stamped values from the button's data-* attributes.
      cuentaId = btn.getAttribute('data-cuenta') || '';
      contactoId = btn.getAttribute('data-contacto') || '';
      stockId = btn.getAttribute('data-stock-id') || '';
      stockPrecioRaw = btn.getAttribute('data-precio') || '';
      // A sold record renders a disabled button with no data-stock-id; only wire
      // the request flow when this is an available product.
      if (stockId) btn.addEventListener('click', solicitarStock);
    }

    // Wire the custom confirmation modal.
    var confirmBtn = document.getElementById('dpModalConfirm');
    if (confirmBtn) confirmBtn.addEventListener('click', runCreate);
    var cancelBtn = document.getElementById('dpModalCancel');
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    var overlay = document.getElementById('dpModal');
    if (overlay) {
      // Backdrop click (outside the card) cancels.
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) closeModal();
      });
    }
  }

  if (document.readyState !== 'loading') { dpInit(); }
  else { document.addEventListener('DOMContentLoaded', dpInit); }
})();
