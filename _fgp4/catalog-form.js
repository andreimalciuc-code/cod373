/* ═══════════════════════════════════════════════════════════════════════════
   Cod373 — FORMULARUL CANONIC DE CATALOG (Material / Serviciu)   [Lot UX2]

   DE CE EXISTĂ ACEST FIȘIER
     Până în UX2 existau TREI implementări paralele ale aceluiași formular:
       1. `app.html`      → `openForm`/`saveRecord` (modulele Materiale/Servicii)
       2. `deviz.html`    → `quickAddService`/`saveQuickService`
       3. `factura.html`  → `quickAddService`/`saveQuickService`
     Ele divergeau deja: `deviz` accepta un `preset` și precompleta categoria și
     afișa un text-ajutor pentru poză; `factura` nu avea niciunul dintre cele trei.
     Aceeași entitate economică se crea din trei formulare diferite.

   BUGUL CENTRAL PE CARE ÎL REPARĂ
     Utilizatorul adăuga o fotografie pe poziția din Ofertă/Factură, apăsa
     „Salvează în catalog", iar în formularul care se deschidea NU vedea nicio
     imagine — doar un câmp de fișier gol. Fotografia era de fapt reținută
     (`window._qaKeepPhoto`) și chiar se salva, dar utilizatorul nu avea cum să
     știe: din perspectiva lui, poza dispăruse. Aici imaginea preluată se AFIȘEAZĂ.

   SUPERSET, NU SUBSET  (regula lotului)
     Prima versiune a acestui fișier a fost formularul REDUS din Deviz/Factură,
     mutat într-un fișier separat. Conectat aşa la `app.html`, ar fi ȘTERS din
     interfață prețurile pe furnizori/magazine (Material) și rețeta de materiale
     (Serviciu) — colecții-copil reale, salvate prin `material_prices_set` și
     `service_recipe_set`. Formularul canonic e acum superset:
       · câmpurile canonice sunt IDENTICE în toate cele trei gazde;
       · colecțiile-copil intră prin `extras`, randate de gazda care le are.
     Comasăm formularul, nu domeniul: o gazdă care nu are Furnizori în context
     nu capătă un editor de prețuri pe furnizori, dar nici nu-l pierde cea care îl are.

   PROPRIETATEA FOTOGRAFIEI  (vezi `adopt` mai jos)
     Poza de pe poziția documentului trăiește la `<tenant>/lines/<ts>_<nume>` și
     aparține DOCUMENTULUI. Catalogul nu o împrumută: la salvare cere gazdei o
     COPIE catalog-owned. Un obiect în plus e mai ieftin decât un catalog care
     poate pierde imagini când cineva curăță `lines/`.

   CE NU FACE (deliberat)
     Nu reimplementează contractul server. Crearea și actualizarea rămân la gazdă
     (`catalogCreate`/`catalogUpdate`), care au deja: `withPriceContract` (D35),
     `request_id` + reîncercare doar pe erori de rețea, garda de dublu-clic și
     maparea erorilor. Acel cod a trecut prin trei loturi; formularul nu-l dublează.

   CONTRACTUL CU GAZDA
     Fiecare aplicație (app/deviz/factura) își păstrează propriile helpere și le
     pasează încoace. Formularul NU presupune existența lui `esc`, `mediaUrl`,
     `openImg` sau `catalogPhotoUp` — nu există în toate trei.

   PREȚUL
     Tot ce iese de aici e NET (D34). Câmpul „cu TVA" e strict o comoditate de
     introducere; adevărul stocat e cel fără TVA, exact ca în `price2` din app.html.
   ═══════════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var VERSION = 'ux2-3';

  /* ── ajutoare proprii: fișierul nu se poate baza pe globalele gazdei ── */
  function esc(s) {
    return (s == null ? '' : String(s)).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function t(s) { try { return (global.C373t && global.C373t(s)) || s; } catch (e) { return s; } }
  function r2(n) { return Math.round((+n || 0) * 100) / 100; }
  function gross(net, vat) { return r2((+net || 0) * (1 + (+vat || 0) / 100)); }
  function net(grossV, vat) { return r2((+grossV || 0) / (1 + (+vat || 0) / 100)); }
  function el(id) { return document.getElementById(id); }

  /* Unitățile implicite — aceeași listă ca în editoare, ca formularul să arate
     identic indiferent din ce aplicație e deschis. */
  var BASE_UNITS = ['buc','set','m','ml','m2','m3','kg','t','l','pachet','rolă','sac',
                    'placă','foaie','găleată','tub','oră','zi','punct'];

  var ST = null;   // starea formularului deschis (unul singur la un moment dat)

  function kindIcon(k) { return k === 'material' ? '📦' : '🧰'; }

  /* Perechea net/brut, în ordinea cerută de preferința firmei. Adevărul stocat e
     MEREU netul: `id` fără sufix e câmpul net, exact ca `f-<key>` din app.html. */
  /* `group` intră în `aria-label`: eticheta vizibilă de deasupra spune „Preț client",
     iar sub-eticheta doar „cu TVA". Citite separat, cele două câmpuri ar suna identic
     pentru un cititor de ecran, așa că fiecare primește numele complet. */
  function pricePair(id, netV, vatV, preferGross, group) {
    var g = group ? t(group) + ' — ' : '';
    var netBox = '<div><div class="c373f-sub" aria-hidden="true">' + esc(t('fără TVA')) +
      (preferGross ? ' <span class="c373f-tag">' + esc(t('se salvează')) + '</span>' : '') + '</div>' +
      '<input id="' + id + '" type="number" step="any" aria-label="' + esc(g + t('fără TVA')) +
      '" value="' + esc(netV === '' ? '' : netV) + '"/></div>';
    var grossBox = '<div><div class="c373f-sub" aria-hidden="true">' + esc(t('cu TVA')) + '</div>' +
      '<input id="' + id + '-gross" type="number" step="any" aria-label="' + esc(g + t('cu TVA')) +
      '" value="' + esc(netV === '' ? '' : gross(netV, vatV)) + '"/></div>';
    return '<div class="c373f-r2">' + (preferGross ? grossBox + netBox : netBox + grossBox) + '</div>';
  }

  function hint(txt) { return '<div class="c373f-hint">' + esc(t(txt)) + '</div>'; }

  /* ════════════════════════════════════════════════════════════════════════
     DESCHIDEREA
     opts:
       kind, mode('create'|'edit'), id, draft{...}, units[], categories[],
       vatDefault, preferGross, title, saveLabel, mount, extras[{html,mount}],
       signUrl(path)->Promise<url>, upload(file)->Promise<path>,
       adopt(path)->Promise<path>, removeUpload(path)->Promise,
       compress(file)->Promise<File>, nextSku(kind)->Promise<string>,
       openImg(path), aiDescribe(textareaEl, kind),
       draftStore{get(kind),save(kind,obj),clear(kind)},
       create(kind,payload)->Promise<{row,sku}>, update(kind,id,payload)->Promise,
       errMsg(err)->string, onSaved(item,ctx), onCancel(), ctx
     ════════════════════════════════════════════════════════════════════════ */
  function open(opts) {
    opts = opts || {};
    var d = opts.draft || {};
    var kind = opts.kind || d.kind || 'service';
    var mode = opts.mode || 'create';

    /* Schița nesalvată se aplică DOAR la creare și doar dacă nu venim cu valori
       preluate de pe o poziție de document (acelea sunt mai proaspete). */
    var restored = null;
    if (mode === 'create' && opts.draftStore && !d.name && !d.photo_url) {
      try { restored = opts.draftStore.get(kind) || null; } catch (e) { restored = null; }
      if (restored) {
        kind = restored.kind || kind;
        d = Object.assign({}, restored, d);
      }
    }

    var vat = (d.vat_rate != null && d.vat_rate !== '' ? +d.vat_rate
              : (opts.vatDefault != null ? +opts.vatDefault : 20));
    var preferGross = !!opts.preferGross;

    ST = {
      opts: opts, kind: kind, mode: mode, id: opts.id || d.id || null,
      /* Imaginea are TREI stări posibile, deliberat separate:
           photoPath  — obiect deja în Storage. Dacă vine de pe poziția unui
                        document (`photoBorrowed`), la salvare se face o COPIE
                        catalog-owned; dacă e poza elementului editat, rămâne.
           photoFile  — fișier ales ACUM, ținut ca File până la salvare. Nu urcăm
                        nimic doar ca să putem deschide formularul.
           photoCleared — utilizatorul a apăsat explicit „Elimină poza".         */
      photoPath: d.photo_url || null,
      photoBorrowed: !!(d.photo_url && d.photo_borrowed),
      photoFile: d.photoFile || null,
      photoCleared: false,
      busy: false, restored: !!restored,
      /* Colecțiile-copil: starea trăiește AICI, nu în gazdă. Rândurile venite din
         gazdă se clonează, ca Anulare să nu lase modificări în starea ei. */
      children: opts.children ? JSON.parse(JSON.stringify(opts.children)) : null,
      /* Elementul din care s-a deschis formularul, ca focusul să se întoarcă acolo
         la închidere. Fără asta, cine navighează din tastatură ajunge la începutul
         paginii după fiecare Anulează. */
      opener: (document.activeElement && document.activeElement !== document.body)
                ? document.activeElement : null,
      mount: opts.mount || 'modal-mount'
    };

    var units = Array.from(new Set(BASE_UNITS.concat(opts.units || [])));
    var cats = (opts.categories || []).filter(Boolean);
    var isMat = kind === 'material';
    var netV = (d.price != null && d.price !== '' ? +d.price : '');
    var costV = (d.cost_price != null && d.cost_price !== '' ? +d.cost_price : '');

    var title = opts.title ? t(opts.title)
      : (mode === 'edit'
          ? (isMat ? t('Editează materialul') : t('Editează serviciul'))
          : (isMat ? t('Material nou') : t('Serviciu nou')));
    var saveLabel = t(opts.saveLabel || (mode === 'edit' ? 'Salvează' : 'Salvează în catalog'));

    var html =
      '<div class="c373f-ov" id="c373f-ov" role="dialog" aria-modal="true" aria-labelledby="c373f-title">' +
      '<div class="c373f-modal">' +
        '<div class="c373f-head"><h3 id="c373f-title">' + kindIcon(kind) + ' ' + esc(title) + '</h3>' +
          '<button type="button" class="c373f-x" id="c373f-close" aria-label="' + esc(t('Închide')) + '">×</button></div>' +
        '<div class="c373f-body">' +
          '<div id="c373f-draft"></div>' +
          '<div id="c373f-msg" class="c373f-msg" role="alert" aria-live="assertive"></div>' +

          /* 1. TIPUL — doar la creare; la editare nu se schimbă tabela unui rând. */
          (mode === 'create'
            ? '<div class="c373f-f"><label for="c373f-kind">' + esc(t('Tip')) + '</label>' +
              '<select id="c373f-kind">' +
                '<option value="service"' + (kind === 'service' ? ' selected' : '') + '>🧰 ' + esc(t('Serviciu / manoperă')) + '</option>' +
                '<option value="material"' + (kind === 'material' ? ' selected' : '') + '>📦 ' + esc(t('Material')) + '</option>' +
              '</select></div>'
            : '') +

          /* 2. DENUMIREA */
          '<div class="c373f-f"><label for="c373f-name">' + esc(t('Denumire')) + ' <span class="c373f-req">*</span></label>' +
            '<input id="c373f-name" required aria-required="true" value="' + esc(d.name || '') + '"/></div>' +

          /* 3. UNITATE | TVA */
          '<div class="c373f-r2">' +
            '<div class="c373f-f"><label for="c373f-unit">' + esc(t('Unitate de măsură')) + '</label>' +
              '<input id="c373f-unit" list="c373f-units" value="' + esc(d.unit || (isMat ? 'buc' : 'm2')) + '"/>' +
              '<datalist id="c373f-units">' + units.map(function (u) { return '<option value="' + esc(u) + '"></option>'; }).join('') + '</datalist></div>' +
            '<div class="c373f-f"><label for="c373f-vat">' + esc(t('TVA (%)')) + '</label>' +
              '<input id="c373f-vat" type="number" step="any" value="' + esc(vat) + '"/></div>' +
          '</div>' +

          /* 4. PREȚUL CLIENT */
          '<div class="c373f-f"><label for="c373f-price">' + esc(t('Preț client')) + '</label>' +
            pricePair('c373f-price', netV, vat, preferGross, 'Preț client') +
            hint(preferGross
              ? 'Scrii prețul cu TVA; în catalog se păstrează valoarea fără TVA.'
              : 'În catalog se păstrează valoarea fără TVA.') +
            hint('Prețul cu care vinzi clientului. Apare implicit în oferte/facturi.') + '</div>' +

          /* 5. PREȚUL DE COST — doar serviciu, tot pereche net/brut ca în app.html */
          '<div class="c373f-f" id="c373f-cost-wrap"' + (isMat ? ' hidden' : '') + '>' +
            '<label for="c373f-cost">' + esc(t('Preț cost / intern (opțional)')) + '</label>' +
            pricePair('c373f-cost', costV, vat, preferGross, 'Preț cost / intern (opțional)') +
            hint('Costul tău real (manoperă/subcontractant) — pentru calculul marjei.') + '</div>' +

          /* 6. CATEGORIA */
          '<div class="c373f-f"><label for="c373f-category">' + esc(t('Categorie')) + '</label>' +
            '<input id="c373f-category" list="c373f-cats" value="' + esc(d.category || '') + '"/>' +
            '<datalist id="c373f-cats">' + cats.map(function (c) { return '<option value="' + esc(c) + '"></option>'; }).join('') + '</datalist></div>' +

          /* 7. DESCRIEREA (+ AI, dacă gazda îl oferă) */
          '<div class="c373f-f"><label for="c373f-desc">' + esc(t('Descriere')) + '</label>' +
            '<textarea id="c373f-desc" rows="2">' + esc(d.description || '') + '</textarea>' +
            (typeof opts.aiDescribe === 'function'
              ? '<button type="button" class="c373f-btn c373f-ai" id="c373f-ai">✨ ' + esc(t('Scrie cu AI')) + '</button>' : '') +
            hint('Pe scurt: la ce se folosește, calitate/specificații, de ce a fost ales. Apare în nomenclator și pe oferte.') + '</div>' +

          /* 8. IMAGINEA — zona care lipsea. Preview + înlocuire + eliminare. */
          '<div class="c373f-f"><label>' + esc(t('Poză (opțional)')) + '</label>' +
            '<div id="c373f-photo-wrap"></div>' +
            '<input id="c373f-photo-input" type="file" accept="image/*" hidden/>' +
          '</div>' +

          /* 9. CODUL INTERN — vizibil în TOATE gazdele; la creare vine de la server. */
          '<div class="c373f-f"><label for="c373f-sku">' + esc(t('Cod intern (SKU)')) + '</label>' +
            '<input id="c373f-sku" value="' + esc(d.sku || '') + '"/>' +
            hint(mode === 'create'
              ? 'Propus automat de server. Îl poți schimba; codurile duplicate sunt refuzate.'
              : 'Trebuie să rămână unic în firmă.') + '</div>' +

          /* 10. COLECȚIILE-COPIL CANONICE — prețuri pe furnizori/magazine (Material)
                 și rețeta de materiale (Serviciu). Implementate AICI, o singură dată,
                 ca să fie identice în toate gazdele: gazda dă doar datele și RPC-ul. */
          '<div id="c373f-children"></div>' +

          /* Slot liber pentru secțiuni specifice unei gazde (azi: niciuna). */
          '<div id="c373f-extras"></div>' +

        '</div>' +
        '<div class="c373f-foot">' +
          '<button type="button" class="c373f-btn" id="c373f-cancel">' + esc(t('Anulează')) + '</button>' +
          '<button type="button" class="c373f-btn c373f-primary" id="c373f-save">' + esc(saveLabel) + '</button>' +
        '</div>' +
      '</div></div>';

    var mount = el(ST.mount);
    if (!mount) { mount = document.createElement('div'); mount.id = ST.mount; document.body.appendChild(mount); }
    mount.innerHTML = html;

    injectCss();
    renderChildren();
    renderExtras();
    bind();
    renderPhoto();
    renderDraftBanner();
    proposeSku();
    setTimeout(function () { var n = el('c373f-name'); if (n) { n.focus(); n.select(); } }, 50);
  }

  /* ════════════════════════════════════════════════════════════════════════
     COLECȚIILE-COPIL CANONICE

     Prețurile pe furnizori/magazine (Material) și rețeta de materiale (Serviciu)
     sunt parte din entitate, nu din gazdă: cine creează un Material dintr-o Factură
     trebuie să-l poată descrie la fel de complet ca din modulul Materiale.

     Erau implementate DOAR în `app.html` (`renderSrc`/`renderRecipe`). Mutate aici,
     există o singură dată — paritatea între gazde e garantată prin construcție, nu
     verificată prin comparație. Gazda furnizează exclusiv datele și RPC-ul de salvare:
       opts.children = {
         suppliers:{ options:[{id,name}], rows:[{ref_id,price}] },
         stores:   { options:[{id,name}], rows:[{ref_id,price}] },
         recipe:   { materials:[{id,name,unit,last_price}], rows:[{...}] }
       }
       opts.saveChildren(kind, id, data) -> Promise
     ════════════════════════════════════════════════════════════════════════ */
  /* Textele sunt propoziții ÎNTREGI, nu bucăți concatenate: în RU/DE acordul și
     ordinea cuvintelor nu urmează româna, iar „Niciun" + substantiv ar da agramatical. */
  var SRC_META = {
    suppliers: { icon: '🏭', title: 'Prețuri pe furnizori', col: 'Furnizor',
                 add: 'adaugă furnizor', pick: '— alege furnizor —', empty: 'Niciun furnizor încă.',
                 hint: 'Alegi furnizorul din baza Furnizori și pui prețul lui. Cumperi de unde e mai avantajos.' },
    stores:    { icon: '🏪', title: 'Prețuri pe magazine', col: 'Magazin',
                 add: 'adaugă magazin', pick: '— alege magazin —', empty: 'Niciun magazin încă.',
                 hint: 'Alegi magazinul din baza Magazine și pui prețul lui. Util pentru comparație — cumperi de unde e mai ieftin.' }
  };

  function childState() { return (ST && ST.children) || null; }

  function renderChildren() {
    var host = el('c373f-children'); if (!host || !ST) return;
    var C = ST.children, kind = currentKind();
    if (!C) { host.innerHTML = ''; return; }
    var html = '';
    if (kind === 'material') {
      ['suppliers', 'stores'].forEach(function (sk) {
        if (!C[sk]) return;
        var m = SRC_META[sk];
        html += '<div class="c373f-f" data-src="' + sk + '">' +
          '<label>' + m.icon + ' ' + esc(t(m.title)) + '</label>' +
          '<div class="c373f-rows" id="c373f-' + sk + '-rows"></div>' +
          '<button type="button" class="c373f-btn c373f-add" data-add="' + sk + '">＋ ' +
            esc(t(m.add)) + '</button>' +
          hint(m.hint) + '</div>';
      });
    } else if (C.recipe) {
      html += '<div class="c373f-f">' +
        '<label>🧪 ' + esc(t('Rețetă — materiale folosite (consum la 1 unitate de serviciu)')) + '</label>' +
        '<datalist id="c373f-recipe-mats">' +
          (C.recipe.materials || []).map(function (m) { return '<option value="' + esc(m.name) + '"></option>'; }).join('') +
        '</datalist>' +
        '<div class="c373f-rows" id="c373f-recipe-rows"></div>' +
        '<button type="button" class="c373f-btn c373f-add" data-add="recipe">＋ ' + esc(t('adaugă material')) + '</button>' +
        hint('Consum × volumul măsurat (la previzualizare șantier) = cantitatea de material. Prețul se ia automat din Materiale.') +
        '</div>';
    }
    host.innerHTML = html;
    Array.prototype.forEach.call(host.querySelectorAll('[data-add]'), function (b) {
      b.onclick = function () { addChildRow(this.getAttribute('data-add')); };
    });
    if (kind === 'material') { renderSrcRows('suppliers'); renderSrcRows('stores'); }
    else renderRecipeRows();
  }

  function addChildRow(which) {
    var C = ST.children; if (!C || !C[which]) return;
    C[which].rows = C[which].rows || [];
    if (which === 'recipe') {
      C.recipe.rows.push({ material_id: null, material_name: '', unit: '', qty_per_unit: 0, waste_pct: 0, _price: 0 });
      renderRecipeRows();
    } else {
      C[which].rows.push({ ref_id: '', price: '' });
      renderSrcRows(which);
    }
  }

  function renderSrcRows(sk) {
    var C = ST.children; if (!C || !C[sk]) return;
    var box = el('c373f-' + sk + '-rows'); if (!box) return;
    var m = SRC_META[sk], rows = C[sk].rows || [], opts = C[sk].options || [];
    if (!rows.length) { box.innerHTML = '<div class="c373f-empty">' + esc(t(m.empty)) + '</div>'; return; }
    box.innerHTML = '<table class="c373f-tbl"><thead><tr>' +
      '<th>' + esc(t(m.col)) + '</th>' +
      '<th>' + esc(t('Preț (fără TVA)')) + '</th><th></th></tr></thead><tbody>' +
      rows.map(function (r, i) {
        return '<tr><td><select data-k="ref_id" data-i="' + i + '" aria-label="' + esc(t(m.col)) + '">' +
          '<option value="">' + esc(t(m.pick)) + '</option>' +
          opts.map(function (o) {
            return '<option value="' + esc(o.id) + '"' + (String(r.ref_id) === String(o.id) ? ' selected' : '') + '>' + esc(o.name) + '</option>';
          }).join('') + '</select></td>' +
          '<td><input type="number" step="any" data-k="price" data-i="' + i + '" aria-label="' +
            esc(t('Preț (fără TVA)')) + '" value="' + esc(r.price == null ? '' : r.price) + '"/></td>' +
          '<td><button type="button" class="c373f-del" data-del="' + i + '" aria-label="' + esc(t('Șterge')) + '">×</button></td></tr>';
      }).join('') + '</tbody></table>';
    bindRowBox(box, function (i, k, v) { C[sk].rows[i][k] = v; },
                    function (i) { C[sk].rows.splice(i, 1); renderSrcRows(sk); });
  }

  function renderRecipeRows() {
    var C = ST.children; if (!C || !C.recipe) return;
    var box = el('c373f-recipe-rows'); if (!box) return;
    var rows = C.recipe.rows || [];
    if (!rows.length) { box.innerHTML = '<div class="c373f-empty">' + esc(t('Niciun material încă.')) + '</div>'; return; }
    box.innerHTML = '<table class="c373f-tbl"><thead><tr>' +
      '<th>' + esc(t('Material')) + '</th><th>' + esc(t('UM')) + '</th>' +
      '<th>' + esc(t('Consum/UM')) + '</th><th>' + esc(t('Pierdere %')) + '</th><th></th></tr></thead><tbody>' +
      rows.map(function (r, i) {
        return '<tr>' +
          '<td><input list="c373f-recipe-mats" autocomplete="off" data-k="material_name" data-i="' + i + '" aria-label="' +
            esc(t('Material')) + '" value="' + esc(r.material_name || '') + '"/></td>' +
          '<td><input data-k="unit" data-i="' + i + '" aria-label="' + esc(t('UM')) + '" value="' + esc(r.unit || '') + '" style="width:70px"/></td>' +
          '<td><input type="number" step="any" data-k="qty_per_unit" data-i="' + i + '" aria-label="' +
            esc(t('Consum/UM')) + '" value="' + esc(r.qty_per_unit) + '" style="width:90px"/></td>' +
          '<td><input type="number" step="any" data-k="waste_pct" data-i="' + i + '" aria-label="' +
            esc(t('Pierdere %')) + '" value="' + esc(r.waste_pct) + '" style="width:80px"/></td>' +
          '<td><button type="button" class="c373f-del" data-del="' + i + '" aria-label="' + esc(t('Șterge')) + '">×</button></td></tr>';
      }).join('') + '</tbody></table>';
    bindRowBox(box, function (i, k, v) {
      var r = C.recipe.rows[i]; r[k] = v;
      if (k === 'material_name') {                        // legarea la material, ca în app.html
        var mm = (C.recipe.materials || []).filter(function (x) { return x.name === v; })[0];
        if (mm) { r.material_id = mm.id; r.unit = mm.unit || r.unit; r._price = +mm.last_price || 0; renderRecipeRows(); }
        else { r.material_id = null; r._price = 0; }
      }
    }, function (i) { C.recipe.rows.splice(i, 1); renderRecipeRows(); });
  }

  function bindRowBox(box, onEdit, onDel) {
    Array.prototype.forEach.call(box.querySelectorAll('[data-k]'), function (inp) {
      var h = function () { onEdit(+this.getAttribute('data-i'), this.getAttribute('data-k'), this.value); };
      if (inp.tagName === 'SELECT') inp.onchange = h; else inp.oninput = h;
    });
    Array.prototype.forEach.call(box.querySelectorAll('[data-del]'), function (b) {
      b.onclick = function () { onDel(+this.getAttribute('data-del')); };
    });
  }

  /* Ce se trimite gazdei la salvare — filtrat exact ca în `saveRecord` de dinainte. */
  function childrenPayload(kind) {
    var C = ST.children; if (!C) return null;
    if (kind === 'material') {
      var pick = function (sk) {
        return ((C[sk] && C[sk].rows) || []).filter(function (r) { return r.ref_id; })
          .map(function (r) { return { ref_id: r.ref_id, price: (r.price === '' || r.price == null) ? null : +r.price }; });
      };
      return { suppliers: pick('suppliers'), stores: pick('stores') };
    }
    return { recipe: ((C.recipe && C.recipe.rows) || [])
      .filter(function (r) { return (r.material_name || '').trim(); })
      .map(function (r) {
        return { material_id: r.material_id || null, material_name: r.material_name || null,
                 unit: r.unit || null, qty_per_unit: +r.qty_per_unit || 0, waste_pct: +r.waste_pct || 0 };
      }) };
  }

  function currentKind() { return (el('c373f-kind') && el('c373f-kind').value) || (ST && ST.kind); }

  /* ── slot liber pentru secțiuni proprii unei gazde ── */
  function renderExtras() {
    var host = el('c373f-extras'); if (!host || !ST) return;
    var ex = ST.opts.extras || [];
    if (!ex.length) return;
    host.innerHTML = ex.map(function (s) { return s.html || ''; }).join('');
    ex.forEach(function (s) { if (typeof s.mount === 'function') { try { s.mount(); } catch (e) {} } });
  }

  function renderDraftBanner() {
    if (!ST || !ST.restored) return;
    var b = el('c373f-draft'); if (!b) return;
    b.innerHTML = '<div class="c373f-draft">' +
      '<span>↩️ ' + esc(t('Ai un formular neterminat de data trecută — l-am completat înapoi.')) + '</span>' +
      '<button type="button" class="c373f-btn" id="c373f-draft-x">🗑 ' + esc(t('Renunță')) + '</button></div>';
    el('c373f-draft-x').onclick = function () {
      try { ST.opts.draftStore.clear(ST.kind); } catch (e) {}
      ['c373f-name','c373f-unit','c373f-category','c373f-desc','c373f-sku','c373f-price','c373f-price-gross','c373f-cost','c373f-cost-gross']
        .forEach(function (i) { var n = el(i); if (n) n.value = ''; });
      b.innerHTML = ''; ST.restored = false;
      var n = el('c373f-name'); if (n) n.focus();
    };
  }

  /* Codul propus vine de la server: pornește de la MAXIMUL real și sare peste
     codurile ocupate (KNOWN_BUGS #33). Rămâne o propunere — utilizatorul îl poate
     schimba, iar serverul refuză duplicatele oricum. */
  function proposeSku() {
    if (!ST || ST.mode !== 'create' || typeof ST.opts.nextSku !== 'function') return;
    var s = el('c373f-sku'); if (!s || s.value) return;
    var forKind = ST.kind;
    ST.opts.nextSku(forKind).then(function (code) {
      var n = el('c373f-sku');
      if (n && !n.value && !n.dataset.touched && ST && ST.kind === forKind && code) n.value = code;
    }).catch(function () {});
  }

  /* ── zona de imagine, redesenată ori de câte ori starea imaginii se schimbă ── */
  function renderPhoto() {
    var w = el('c373f-photo-wrap'); if (!w || !ST) return;
    var has = !!(ST.photoFile || (ST.photoPath && !ST.photoCleared));
    if (!has) {
      w.innerHTML = '<button type="button" class="c373f-btn c373f-photo-add" id="c373f-photo-pick">🖼 ' +
        esc(t('Alege o fotografie')) + '</button>';
      el('c373f-photo-pick').onclick = function () { el('c373f-photo-input').click(); };
      return;
    }
    w.innerHTML =
      '<div class="c373f-photo">' +
        '<img id="c373f-photo-img" alt="' + esc(t('Previzualizarea fotografiei')) + '"/>' +
        '<div class="c373f-photo-act">' +
          '<button type="button" class="c373f-btn" id="c373f-photo-rep">' + esc(t('Înlocuiește poza')) + '</button>' +
          '<button type="button" class="c373f-btn c373f-danger" id="c373f-photo-del">' + esc(t('Elimină poza')) + '</button>' +
        '</div>' +
        '<div class="c373f-hint" id="c373f-photo-src"></div>' +
      '</div>';
    el('c373f-photo-rep').onclick = function () { el('c373f-photo-input').click(); };
    el('c373f-photo-del').onclick = function () {
      /* Eliminarea DEZLEAGĂ referința; nu șterge obiectul din Storage. Obiectul
         poate fi încă al documentului (poză împrumutată) sau al unei versiuni
         anterioare a elementului — nu e al acestui formular ca să-l distrugă. */
      ST.photoFile = null; ST.photoCleared = true; renderPhoto();
    };
    var img = el('c373f-photo-img'), src = el('c373f-photo-src');
    if (ST.photoFile) {
      img.src = URL.createObjectURL(ST.photoFile);
      src.textContent = t('Fotografie nouă, încă neîncărcată. Se salvează odată cu elementul.');
    } else {
      src.textContent = ST.photoBorrowed
        ? t('Fotografia preluată din document. Catalogul primește propria copie la salvare.')
        : t('Fotografia actuală. Se păstrează dacă nu o înlocuiești.');
      if (typeof ST.opts.openImg === 'function') {
        img.style.cursor = 'zoom-in';
        img.onclick = function () { try { ST.opts.openImg(ST.photoPath); } catch (e) {} };
      }
      var f = ST.opts.signUrl;
      if (typeof f === 'function') {
        f(ST.photoPath).then(function (u) { if (u && el('c373f-photo-img')) el('c373f-photo-img').src = u; })
                       .catch(function () {});
      }
    }
  }

  function bind() {
    var ov = el('c373f-ov');
    ov.addEventListener('mousedown', function (e) { if (e.target === ov) cancel(); });
    el('c373f-close').onclick = cancel;
    el('c373f-cancel').onclick = cancel;
    el('c373f-save').onclick = save;

    el('c373f-photo-input').onchange = function () {
      var f = this.files && this.files[0];
      if (!f) return;
      ST.photoFile = f; ST.photoCleared = false;
      this.value = '';            // ca aceeași imagine să poată fi realeasă după eliminare
      renderPhoto();
    };

    /* net ↔ brut: un singur adevăr (netul). Rescriem doar câmpul pe care NU-l tastezi. */
    var v = el('c373f-vat');
    function syncPair(id) {
      var p = el(id), g = el(id + '-gross'); if (!p || !g) return;
      p.oninput = function () { g.value = (p.value === '' ? '' : gross(p.value, v.value)); };
      g.oninput = function () { p.value = (g.value === '' ? '' : net(g.value, v.value)); };
    }
    syncPair('c373f-price'); syncPair('c373f-cost');
    v.oninput = function () {
      ['c373f-price','c373f-cost'].forEach(function (id) {
        var p = el(id), g = el(id + '-gross');
        if (p && g) g.value = (p.value === '' ? '' : gross(p.value, v.value));
      });
      draftSave();
    };

    var k = el('c373f-kind');
    if (k) k.onchange = function () {
      /* Gazda poate avea nevoie să REDESCHIDĂ formularul pe alt context când se
         schimbă tipul: în `app.html`, Materialul aduce prețurile pe furnizori, iar
         Serviciul rețeta de materiale — sunt colecții-copil diferite, cu RPC-uri
         diferite. Fără asta, un Material comutat pe Serviciu ar trimite prețurile
         de furnizor cu un id de serviciu. Editoarele nu au colecții-copil, deci nu
         pasează hook-ul și comută pe loc, ca înainte. */
      if (typeof ST.opts.onKindChange === 'function') {
        var carry = {
          kind: this.value,
          name: (el('c373f-name') || {}).value || '',
          unit: (el('c373f-unit') && el('c373f-unit').dataset.touched) ? el('c373f-unit').value : '',
          category: (el('c373f-category') || {}).value || '',
          description: (el('c373f-desc') || {}).value || '',
          vat_rate: (el('c373f-vat') || {}).value || '',
          price: (el('c373f-price') || {}).value || '',
          cost_price: (el('c373f-cost') || {}).value || '',
          photo_url: ST.photoCleared ? null : ST.photoPath,
          photo_borrowed: ST.photoBorrowed,
          photoFile: ST.photoFile
        };
        var h = ST.opts.onKindChange;
        close();
        try { h(carry); } catch (e) {}
        return;
      }
      ST.kind = this.value;
      var cw = el('c373f-cost-wrap'); if (cw) cw.hidden = (ST.kind === 'material');
      var u = el('c373f-unit'); if (u && !u.dataset.touched) u.value = (ST.kind === 'material' ? 'buc' : 'm2');
      var s = el('c373f-save');
      if (s && !ST.opts.saveLabel) s.textContent = t('Salvează în catalog');
      var ttl = el('c373f-title');
      if (ttl && !ST.opts.title) ttl.textContent = kindIcon(ST.kind) + ' ' +
        (ST.kind === 'material' ? t('Material nou') : t('Serviciu nou'));
      var sk = el('c373f-sku');                 // codul are alt prefix pe alt tip
      if (sk && !sk.dataset.touched) { sk.value = ''; proposeSku(); }
      renderChildren();     // Material ⇒ furnizori/magazine · Serviciu ⇒ rețetă
      draftSave();
    };
    var u = el('c373f-unit'); if (u) u.oninput = function () { this.dataset.touched = 1; };
    var sk = el('c373f-sku'); if (sk) sk.oninput = function () { this.dataset.touched = 1; };

    var ai = el('c373f-ai');
    if (ai) ai.onclick = function () { try { ST.opts.aiDescribe(el('c373f-desc'), ST.kind, this); } catch (e) {} };

    /* schița se salvează debounce, exact ca la formularul generic */
    var body = document.querySelector('.c373f-body');
    if (body) body.addEventListener('input', function () {
      clearTimeout(ST._dt); ST._dt = setTimeout(draftSave, 500);
    });

    ST._esc = function (e) { if (e.key === 'Escape') { e.stopPropagation(); cancel(); } };
    document.addEventListener('keydown', ST._esc, true);
  }

  /* Schița folosește CHEILE DE COLOANĂ, ca formatul să rămână cel din `fdraft`. */
  function draftObj() {
    if (!ST) return null;
    var kindSel = (el('c373f-kind') && el('c373f-kind').value) || ST.kind;
    var o = { kind: kindSel,
      name: (el('c373f-name') || {}).value || '',
      unit: (el('c373f-unit') || {}).value || '',
      category: (el('c373f-category') || {}).value || '',
      description: (el('c373f-desc') || {}).value || '',
      sku: (el('c373f-sku') || {}).value || '',
      vat_rate: (el('c373f-vat') || {}).value || '' };
    var p = (el('c373f-price') || {}).value || '';
    if (kindSel === 'material') o.last_price = p;
    else { o.price = p; o.cost_price = (el('c373f-cost') || {}).value || ''; }
    return o;
  }
  function draftSave() {
    if (!ST || ST.mode !== 'create' || !ST.opts.draftStore) return;
    var o = draftObj(); if (!o) return;
    /* „Are conținut" ignoră valorile pe care le-a pus formularul singur (tip,
       unitate implicită, TVA implicit, cod propus de server) — altfel am salva o
       schiță pentru un formular pe care utilizatorul nici nu l-a atins. */
    var has = ['name','category','description'].some(function (k) { return (o[k] || '').trim(); }) ||
              (+o.price > 0) || (+o.last_price > 0) || (+o.cost_price > 0);
    try { if (has) ST.opts.draftStore.save(o.kind, o); else ST.opts.draftStore.clear(o.kind); } catch (e) {}
  }

  function close() {
    if (ST && ST._esc) document.removeEventListener('keydown', ST._esc, true);
    if (ST) clearTimeout(ST._dt);
    var back = ST && ST.opener;
    var m = ST && el(ST.mount); if (m) m.innerHTML = '';
    ST = null;
    /* întoarcem focusul doar dacă elementul mai e în pagină */
    if (back && document.contains(back)) { try { back.focus(); } catch (e) {} }
  }

  function cancel() {
    /* Anulare = ZERO efecte: niciun element creat, niciun obiect nou în Storage
       (fotografia aleasă aici n-a fost urcată), iar fotografia documentului rămâne
       a documentului — nu o ștergem, nu e a noastră. */
    var cb = ST && ST.opts.onCancel;
    close();
    if (typeof cb === 'function') try { cb(); } catch (e) {}
  }

  function fail(msg, focusId) {
    var m = el('c373f-msg'); if (m) m.textContent = msg;
    var f = focusId && el(focusId); if (f) { try { f.focus(); } catch (e) {} }
    var s = el('c373f-save'); if (s) s.disabled = false;
    if (ST) ST.busy = false;
  }

  /* ════════════════════════════════════════════════════════════════════════
     SALVAREA
     Ordinea contează: pregătim imaginea ÎNAINTE de RPC, iar dacă RPC-ul eșuează
     ștergem exact obiectul creat de noi. Nu atingem fotografia venită din
     document — aceea aparține documentului; catalogul primește o copie.
     ════════════════════════════════════════════════════════════════════════ */
  async function save() {
    if (!ST || ST.busy) return;
    var o = ST.opts;
    var kindSel = (el('c373f-kind') && el('c373f-kind').value) || ST.kind;
    var name = (el('c373f-name').value || '').trim();
    if (!name) return fail(t('Denumirea e obligatorie.'), 'c373f-name');

    var unit = (el('c373f-unit').value || (kindSel === 'material' ? 'buc' : 'm2')).trim();
    var vatRaw = el('c373f-vat').value;
    var vat = vatRaw !== '' ? +vatRaw : 20;
    if (!isFinite(vat) || vat < 0) return fail(t('Cota de TVA nu poate fi negativă.'), 'c373f-vat');
    var priceRaw = el('c373f-price').value;
    var price = priceRaw !== '' ? +priceRaw : 0;
    if (!isFinite(price) || price < 0) return fail(t('Prețul nu poate fi negativ.'), 'c373f-price');
    var costEl = el('c373f-cost');
    var cost = (costEl && costEl.value !== '') ? +costEl.value : null;
    if (cost != null && (!isFinite(cost) || cost < 0)) return fail(t('Prețul nu poate fi negativ.'), 'c373f-cost');
    var cat = ((el('c373f-category') && el('c373f-category').value) || '').trim();
    var desc = ((el('c373f-desc') && el('c373f-desc').value) || '').trim();
    var sku = ((el('c373f-sku') && el('c373f-sku').value) || '').trim();

    ST.busy = true;
    var s = el('c373f-save'); if (s) s.disabled = true;
    var msg = el('c373f-msg'); if (msg) msg.textContent = '';

    var photo = null, mine = null;   // `mine` = obiectul creat de ACEST formular
    try {
      if (ST.photoFile) {
        if (msg) msg.textContent = t('Se încarcă poza…');
        var file = ST.photoFile;
        if (typeof o.compress === 'function') { try { file = await o.compress(file); } catch (e) {} }
        photo = await o.upload(file);
        mine = photo;
        if (msg) msg.textContent = '';
      } else if (ST.photoPath && !ST.photoCleared) {
        if (ST.photoBorrowed && typeof o.adopt === 'function') {
          /* Poza e a documentului. Catalogul își face copia lui, ca ștergerea sau
             înlocuirea pozei din document să nu-i rupă imaginea mai târziu. */
          if (msg) msg.textContent = t('Se pregătește poza…');
          photo = await o.adopt(ST.photoPath);
          if (photo && photo !== ST.photoPath) mine = photo;
          if (msg) msg.textContent = '';
        } else {
          photo = ST.photoPath;              // poza proprie a elementului editat
        }
      } else {
        photo = null;                        // eliminată explicit (dezlegare, nu ștergere)
      }

      var payload = { name: name, unit: unit, category: cat || null,
                      description: desc || null, photo_url: photo, vat_rate: vat };
      if (kindSel === 'material') payload.last_price = price;
      else { payload.price = price; if (cost != null) payload.cost_price = cost; }
      if (sku) payload.sku = sku;

      var res, kids = childrenPayload(kindSel);
      try {
        res = (ST.mode === 'edit')
          ? await o.update(kindSel, ST.id, payload)
          : await o.create(kindSel, payload);
        /* Colecțiile-copil se scriu DUPĂ ce entitatea există, prin RPC-ul gazdei.
           O eroare aici nu declanșează curățarea imaginii: entitatea EXISTĂ deja și
           poza îi aparține. Formularul rămâne deschis cu mesajul erorii. */
        if (kids && typeof o.saveChildren === 'function') {
          var newId = (res && (res.id || (res.row && res.row.id))) || ST.id;
          try { await o.saveChildren(kindSel, newId, kids); }
          catch (ce) { ST._entitySaved = true; throw ce; }
        }
      } catch (err) {
        if (ST._entitySaved) {                 // entitatea a intrat; nu ștergem nimic
          var mc = (typeof o.errMsg === 'function') ? o.errMsg(err) : (err && err.message) || String(err);
          return fail(t('Elementul a fost salvat, dar listele legate nu:') + ' ' + mc, 'c373f-name');
        }
        /* Curățăm DOAR ce am creat noi în acest formular — dar îi dăm gazdei și
           EROAREA. La o eroare de rețea nu se poate ști dacă serverul a procesat
           totuși cererea: acolo ștergerea produce un articol cu imagine ruptă,
           care e mult mai grav decât un obiect orfan. Gazda decide. */
        if (mine && typeof o.removeUpload === 'function') {
          try { await o.removeUpload(mine, err); } catch (_) {}
        }
        throw err;
      }

      if (ST.mode === 'create' && o.draftStore) { try { o.draftStore.clear(kindSel); } catch (e) {} }

      var row = (res && res.row) ? res.row : res;
      var sku2 = (res && res.sku) || (row && row.sku) || null;
      var cb = o.onSaved;
      close();
      if (typeof cb === 'function') cb({ kind: kindSel, row: row, sku: sku2, price: price, vat: vat }, o.ctx);
    } catch (e) {
      var m2 = (typeof o.errMsg === 'function') ? o.errMsg(e) : (e && e.message) || String(e);
      fail(m2, 'c373f-name');
    }
  }

  /* ── CSS injectat o singură dată; folosește variabilele gazdei unde există ── */
  function injectCss() {
    if (document.getElementById('c373f-css')) return;
    var st = document.createElement('style'); st.id = 'c373f-css';
    st.textContent = [
      '.c373f-ov{position:fixed;inset:0;background:rgba(6,12,24,.55);z-index:10000;display:flex;align-items:flex-start;justify-content:center;padding:2vh 1rem;overflow:auto}',
      '.c373f-modal{background:var(--surface,#fff);color:var(--text,#0f1c33);border-radius:14px;width:100%;max-width:560px;box-shadow:0 18px 60px rgba(0,0,0,.3);display:flex;flex-direction:column;max-height:96vh}',
      '.c373f-head{display:flex;align-items:center;gap:.6rem;padding:.9rem 1.1rem;border-bottom:1px solid var(--line,#e6e9f0)}',
      '.c373f-head h3{margin:0;font-size:1.02rem;flex:1;min-width:0}',
      '.c373f-x{background:none;border:none;font-size:1.5rem;line-height:1;cursor:pointer;color:var(--muted,#6b7280);padding:0 .2rem}',
      '.c373f-body{padding:.9rem 1.1rem;overflow:auto;flex:1}',
      '.c373f-foot{display:flex;gap:.5rem;justify-content:flex-end;padding:.8rem 1.1rem;border-top:1px solid var(--line,#e6e9f0);flex-wrap:wrap}',
      '.c373f-f{margin-bottom:.7rem}',
      '.c373f-f>label{display:block;font-size:.8rem;font-weight:600;margin-bottom:.25rem;color:var(--muted,#6b7280)}',
      '.c373f-req{color:var(--red,#e11d48)}',
      '.c373f-f input,.c373f-f select,.c373f-f textarea{width:100%;padding:.55rem .7rem;border:1px solid var(--line,#e6e9f0);border-radius:9px;font:inherit;background:var(--surface,#fff);color:inherit;box-sizing:border-box}',
      '.c373f-r2{display:grid;grid-template-columns:1fr 1fr;gap:.6rem}',
      '.c373f-sub{font-size:.72rem;color:var(--muted,#6b7280);margin-bottom:.15rem}',
      '.c373f-tag{background:var(--bg,#f4f6fb);border-radius:4px;padding:0 .25rem;font-size:.68rem}',
      '.c373f-hint{font-size:.76rem;color:var(--muted,#6b7280);margin-top:.25rem}',
      '.c373f-msg{color:var(--red,#e11d48);font-size:.83rem;min-height:1em;margin-bottom:.4rem}',
      '.c373f-draft{background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;border-radius:9px;padding:.5rem .7rem;font-size:.82rem;margin-bottom:.6rem;display:flex;justify-content:space-between;align-items:center;gap:.5rem}',
      '.c373f-draft .c373f-btn{padding:.2rem .5rem;white-space:nowrap}',
      '.c373f-btn{padding:.55rem .85rem;border:1px solid var(--line,#e6e9f0);border-radius:9px;background:var(--surface,#fff);color:inherit;font:inherit;cursor:pointer}',
      '.c373f-btn:disabled{opacity:.6;cursor:default}',
      '.c373f-primary{background:var(--primary,#2f6bff);border-color:var(--primary,#2f6bff);color:#fff;font-weight:600}',
      '.c373f-danger{color:var(--red,#e11d48)}',
      '.c373f-ai{margin-top:.35rem;font-size:.8rem;padding:.35rem .6rem}',
      '.c373f-photo-add{width:100%}',
      '.c373f-photo img{display:block;width:100%;max-height:260px;min-height:120px;border-radius:9px;border:1px solid var(--line,#e6e9f0);object-fit:contain;background:var(--bg,#f4f6fb)}',
      '.c373f-photo-act{display:flex;gap:.5rem;margin-top:.45rem;flex-wrap:wrap}',
      '.c373f-photo-act .c373f-btn{flex:1;min-width:130px}',
      '#c373f-extras .c373f-f,#c373f-children .c373f-f{margin-top:.9rem;border-top:1px dashed var(--line,#e6e9f0);padding-top:.7rem}',
      '.c373f-rows{overflow-x:auto}',
      '.c373f-tbl{width:100%;border-collapse:collapse;font-size:.82rem}',
      '.c373f-tbl th{text-align:left;font-weight:600;color:var(--muted,#6b7280);padding:.2rem .3rem .35rem;white-space:nowrap}',
      '.c373f-tbl td{padding:.15rem .3rem;vertical-align:middle}',
      '.c373f-tbl input,.c373f-tbl select{width:100%;padding:.35rem .45rem;border:1px solid var(--line,#e6e9f0);border-radius:7px;font:inherit;background:var(--surface,#fff);color:inherit;box-sizing:border-box}',
      '.c373f-tbl select{min-width:130px}',
      '.c373f-del{background:none;border:none;color:var(--red,#e11d48);font-size:1.15rem;line-height:1;cursor:pointer;padding:0 .25rem}',
      '.c373f-empty{color:var(--muted,#6b7280);font-size:.82rem;padding:.25rem 0}',
      '.c373f-add{margin-top:.4rem;font-size:.82rem;padding:.35rem .6rem}',
      '.c373f-ov :focus-visible{outline:2px solid var(--primary,#2f6bff);outline-offset:2px;border-radius:6px}',
      '@media(max-width:560px){.c373f-r2{grid-template-columns:1fr}.c373f-modal{max-width:100%}.c373f-foot .c373f-btn{flex:1}.c373f-photo img{max-height:220px}}'
    ].join('\n');
    document.head.appendChild(st);
  }

  global.CatalogForm = { open: open, close: close, VERSION: VERSION };
})(window);
