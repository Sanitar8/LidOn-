(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  var btnLogin = $('btn-login');
  var modal = $('auth-modal');

  var authPop = $('authPop');
  var authPopOk = $('authPopOk');
  var authPopText = $('authPopText');
  var authPopTitle = $('authPopTitle');
  var authPopIcon = $('authPopIcon');
  var authPopHint = $('authPopHint');
  var authPopTimer = null;

  var userMenu = $('userMenu');
  var userMenuName = $('userMenuName');

  if (!btnLogin || !modal) return;

  var cityInput = $('authRegCity');
  var cityIdInput = $('authRegCityId');
  var citySuggest = $('authCitySuggest');
  var cityTimer = null;

  var primaryCat = $('authPrimaryCategory');
  var primaryProf = $('authPrimaryProfession');
  var extraCat1 = $('authExtraCat1');
  var extraProf1 = $('authExtraProf1');
  var extraCat2 = $('authExtraCat2');
  var extraProf2 = $('authExtraProf2');

  var profLoaded = false;
  var catItems = [];
  var profByCat = {};

  function openModal() {
    modal.classList.add('modal-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-lock');

    var activePane = modal.querySelector('.auth-pane-active');
    if (activePane && activePane.getAttribute('data-pane') === 'register') {
      loadProfessionsOnce();
    }
  }

  function closeModal() {
    modal.classList.remove('modal-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-lock');
  }

  function setMsg(el, text, type) {
    if (!el) return;
    el.textContent = text || '';
    el.classList.remove('error', 'ok');
    if (type) el.classList.add(type);
  }

  function clearMsgs() {
    setMsg($('authLoginMsg'), '');
    setMsg($('authRegMsg'), '');
    setMsg($('authForgotMsg'), '');
  }

  function hidePopup() {
    if (!authPop) return;
    authPop.classList.remove('is-open', 'is-error');
    authPop.setAttribute('aria-hidden', 'true');
    if (authPopTimer) {
      clearTimeout(authPopTimer);
      authPopTimer = null;
    }
  }

  function showPopup(opts) {
    if (!authPop) return;

    var text = (opts && opts.text) ? String(opts.text) : '';
    var title = (opts && opts.title) ? String(opts.title) : 'Готово';
    var type = (opts && opts.type) ? String(opts.type) : 'ok';
    var hint = (opts && typeof opts.hint !== 'undefined')
      ? String(opts.hint)
      : 'Если письма нет — проверьте «Спам» или «Промоакции».';
    var timeout = (opts && opts.timeout) ? parseInt(opts.timeout, 10) : 7000;

    if (authPopText) authPopText.textContent = text;
    if (authPopTitle) authPopTitle.textContent = title;

    if (authPopHint) {
      authPopHint.textContent = hint;
      authPopHint.style.display = hint ? 'block' : 'none';
    }

    if (authPopIcon) authPopIcon.textContent = (type === 'error') ? '!' : '✓';

    authPop.classList.toggle('is-error', type === 'error');
    authPop.classList.add('is-open');
    authPop.setAttribute('aria-hidden', 'false');

    if (authPopTimer) clearTimeout(authPopTimer);
    authPopTimer = setTimeout(hidePopup, isNaN(timeout) ? 7000 : timeout);
  }

  if (authPop) {
    authPop.addEventListener('click', function (e) {
      if (e.target === authPop) hidePopup();
    });
  }

  if (authPopOk) {
    authPopOk.addEventListener('click', hidePopup);
  }

  function switchTab(name) {
    qsa('.auth-tab', modal).forEach(function (b) {
      b.classList.toggle('auth-tab-active', b.getAttribute('data-tab') === name);
    });

    qsa('.auth-pane', modal).forEach(function (p) {
      p.classList.toggle('auth-pane-active', p.getAttribute('data-pane') === name);
    });

    if (name === 'register') loadProfessionsOnce();
  }

  qsa('.auth-tab', modal).forEach(function (b) {
    b.addEventListener('click', function () {
      clearMsgs();
      switchTab(b.getAttribute('data-tab'));
    });
  });

  ['authCloseBtn1', 'authCloseBtn2', 'authCloseBtn3'].forEach(function (id) {
    var el = $(id);
    if (el) el.addEventListener('click', closeModal);
  });

  modal.addEventListener('click', function (e) {
    if (e.target === modal) closeModal();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (authPop && authPop.classList.contains('is-open')) {
        hidePopup();
        return;
      }

      if (modal.classList.contains('modal-open')) {
        closeModal();
      }

      hideCitySuggest();
    }
  });

  async function api(url, payload) {
    var res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(payload || {})
    });

    var data = await res.json().catch(function () {
      return { ok: false, error: 'Bad JSON' };
    });

    if (!res.ok || !data.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  async function refreshAuthState() {
    var res = await fetch('/api/auth/me.php', { credentials: 'same-origin' });
    var data = await res.json().catch(function () { return { ok: true, user: null }; });

    if (data && data.user) {
      btnLogin.style.display = 'none';
      if (userMenu) userMenu.style.display = 'inline-block';

      var first = (data.user.first_name || '').trim();
      var middle = (data.user.middle_name || '').trim();
      var label = (first + ' ' + middle).trim() || 'Профиль';

      if (userMenuName) userMenuName.textContent = label;

      btnLogin.dataset.state = 'logged';
    } else {
      btnLogin.style.display = 'inline-flex';
      if (userMenu) userMenu.style.display = 'none';

      btnLogin.textContent = 'Войти';
      btnLogin.dataset.state = 'guest';
    }
  }

  function hideCitySuggest() {
    if (!citySuggest) return;
    citySuggest.style.display = 'none';
    citySuggest.innerHTML = '';
  }

  function renderCitySuggest(items) {
    if (!citySuggest) return;

    if (!items || !items.length) {
      citySuggest.innerHTML = '<div class="auth-suggest__muted">Ничего не найдено</div>';
      citySuggest.style.display = 'block';
      return;
    }

    citySuggest.innerHTML = items.map(function (it) {
      return '<div class="auth-suggest__item" data-id="' + it.id + '">' + (it.label || '') + '</div>';
    }).join('');

    citySuggest.style.display = 'block';
  }

  async function fetchCities(q) {
    var res = await fetch('/api/geo/cities.php?q=' + encodeURIComponent(q), { credentials: 'same-origin' });
    var data = await res.json().catch(function () { return { ok: true, items: [] }; });
    return (data && data.items) ? data.items : [];
  }

  function bindCityAutocomplete() {
    if (!cityInput || !cityIdInput || !citySuggest) return;

    cityInput.addEventListener('input', function () {
      cityIdInput.value = '';

      var q = (cityInput.value || '').trim();
      if (q.length < 2) {
        hideCitySuggest();
        return;
      }

      if (cityTimer) clearTimeout(cityTimer);
      cityTimer = setTimeout(async function () {
        try {
          renderCitySuggest(await fetchCities(q));
        } catch (_) {
          hideCitySuggest();
        }
      }, 200);
    });

    citySuggest.addEventListener('click', function (e) {
      var el = e.target;
      if (!el || !el.classList.contains('auth-suggest__item')) return;

      cityInput.value = (el.textContent || '').trim();
      cityIdInput.value = el.getAttribute('data-id') || '';
      hideCitySuggest();
    });

    document.addEventListener('click', function (e) {
      if (!citySuggest || citySuggest.style.display !== 'block') return;
      if (e.target === cityInput || citySuggest.contains(e.target)) return;
      hideCitySuggest();
    });
  }

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function setOptions(sel, html) {
    if (sel) sel.innerHTML = html;
  }

  function disableProfSelect(sel, placeholder) {
    if (!sel) return;
    sel.disabled = true;
    setOptions(sel, '<option value="">' + esc(placeholder) + '</option>');
    sel.value = '';
  }

  function enableProfSelect(sel) {
    if (!sel) return;
    sel.disabled = false;
  }

  function buildMaps(items) {
    var catMap = {};
    profByCat = {};

    items.forEach(function (p) {
      var cid = parseInt(p.category_id || 0, 10) || 0;
      var cname = (p.category || '').trim() || 'Без категории';

      catMap[cid] = cname;
      if (!profByCat[cid]) profByCat[cid] = [];
      profByCat[cid].push({
        id: parseInt(p.id, 10),
        name: (p.name || '').trim()
      });
    });

    catItems = Object.keys(catMap).map(function (k) {
      return { id: parseInt(k, 10), name: catMap[k] };
    }).sort(function (a, b) {
      return a.name.localeCompare(b.name, 'ru');
    });

    Object.keys(profByCat).forEach(function (cid) {
      profByCat[cid].sort(function (a, b) {
        return a.name.localeCompare(b.name, 'ru');
      });
    });
  }

  function fillCategorySelect(sel, required) {
    if (!sel) return;

    var head = required
      ? '<option value="">Выберите категорию</option>'
      : '<option value="">Не выбрано</option>';

    sel.innerHTML = head + catItems.map(function (c) {
      return '<option value="' + c.id + '">' + esc(c.name) + '</option>';
    }).join('');

    sel.value = '';
  }

  function fillProfessionSelect(sel, cid, required) {
    if (!sel) return;

    var list = profByCat[cid] || [];
    var head = required
      ? '<option value="">Выберите профессию</option>'
      : '<option value="">Не выбрано</option>';

    sel.innerHTML = head + list.map(function (p) {
      return '<option value="' + p.id + '">' + esc(p.name) + '</option>';
    }).join('');

    sel.value = '';
  }

  function selectedIds() {
    var out = [];

    [primaryProf, extraProf1, extraProf2].forEach(function (sel) {
      if (!sel) return;
      var v = parseInt(sel.value || '0', 10);
      if (v) out.push(v);
    });

    return out;
  }

  function preventDuplicates() {
    var ids = selectedIds();

    [primaryProf, extraProf1, extraProf2].forEach(function (sel) {
      if (!sel) return;

      var current = parseInt(sel.value || '0', 10);

      Array.prototype.slice.call(sel.options).forEach(function (opt) {
        var v = parseInt(opt.value || '0', 10);
        if (!v) return;
        opt.disabled = (v !== current && ids.indexOf(v) !== -1);
      });
    });
  }

  function bindProfEvents() {
    if (primaryCat) {
      primaryCat.addEventListener('change', function () {
        var cid = parseInt(primaryCat.value || '0', 10) || 0;

        if (!cid) {
          disableProfSelect(primaryProf, 'Сначала выберите категорию');
          preventDuplicates();
          return;
        }

        enableProfSelect(primaryProf);
        fillProfessionSelect(primaryProf, cid, true);
        preventDuplicates();
      });
    }

    if (extraCat1) {
      extraCat1.addEventListener('change', function () {
        var cid = parseInt(extraCat1.value || '0', 10) || 0;

        if (!cid) {
          disableProfSelect(extraProf1, 'Сначала выберите категорию');
          preventDuplicates();
          return;
        }

        enableProfSelect(extraProf1);
        fillProfessionSelect(extraProf1, cid, false);
        preventDuplicates();
      });
    }

    if (extraCat2) {
      extraCat2.addEventListener('change', function () {
        var cid = parseInt(extraCat2.value || '0', 10) || 0;

        if (!cid) {
          disableProfSelect(extraProf2, 'Сначала выберите категорию');
          preventDuplicates();
          return;
        }

        enableProfSelect(extraProf2);
        fillProfessionSelect(extraProf2, cid, false);
        preventDuplicates();
      });
    }

    [primaryProf, extraProf1, extraProf2].forEach(function (sel) {
      if (!sel) return;
      sel.addEventListener('change', preventDuplicates);
    });
  }

  async function loadProfessionsOnce() {
    if (profLoaded) return;
    if (!primaryCat || !primaryProf) return;

    setOptions(primaryCat, '<option value="">Загрузка категорий...</option>');
    disableProfSelect(primaryProf, 'Сначала выберите категорию');

    if (extraCat1) setOptions(extraCat1, '<option value="">Загрузка...</option>');
    if (extraCat2) setOptions(extraCat2, '<option value="">Загрузка...</option>');

    disableProfSelect(extraProf1, 'Сначала выберите категорию');
    disableProfSelect(extraProf2, 'Сначала выберите категорию');

    try {
      var res = await fetch('/api/prof/professions.php', { credentials: 'same-origin' });
      var data = await res.json().catch(function () { return { ok: true, items: [] }; });
      var items = (data && data.items) ? data.items : [];

      buildMaps(items);

      fillCategorySelect(primaryCat, true);
      fillCategorySelect(extraCat1, false);
      fillCategorySelect(extraCat2, false);

      disableProfSelect(primaryProf, 'Сначала выберите категорию');
      disableProfSelect(extraProf1, 'Сначала выберите категорию');
      disableProfSelect(extraProf2, 'Сначала выберите категорию');

      bindProfEvents();
      profLoaded = true;
    } catch (e) {
      setOptions(primaryCat, '<option value="">Ошибка загрузки</option>');
      setOptions(extraCat1, '<option value="">Ошибка загрузки</option>');
      setOptions(extraCat2, '<option value="">Ошибка загрузки</option>');

      disableProfSelect(primaryProf, 'Ошибка загрузки');
      disableProfSelect(extraProf1, 'Ошибка загрузки');
      disableProfSelect(extraProf2, 'Ошибка загрузки');

      profLoaded = true;
    }
  }

  btnLogin.addEventListener('click', function (e) {
    e.preventDefault();
    clearMsgs();
    openModal();
    switchTab('login');
  });

  $('authRegBtn') && $('authRegBtn').addEventListener('click', async function () {
    setMsg($('authRegMsg'), '');

    try {
      var last_name = ($('authRegLastName').value || '').trim();
      var first_name = ($('authRegFirstName').value || '').trim();
      var middle_name = ($('authRegMiddleName').value || '').trim();

      var email = ($('authRegEmail').value || '').trim();
      var password = $('authRegPass').value || '';

      var city_id = parseInt((cityIdInput && cityIdInput.value) ? cityIdInput.value : '0', 10);
      if (!city_id) throw new Error('Выберите город из списка');

      var primary_profession_id = parseInt((primaryProf && primaryProf.value) ? primaryProf.value : '0', 10);
      if (!primary_profession_id) throw new Error('Выберите основную профессию');

      var extras = [];
      [extraProf1, extraProf2].forEach(function (sel) {
        var v = parseInt((sel && sel.value) ? sel.value : '0', 10);
        if (v) extras.push(v);
      });

      if (extras.indexOf(primary_profession_id) !== -1) throw new Error('Основная профессия не может повторяться');
      if (extras.length === 2 && extras[0] === extras[1]) throw new Error('Доп. профессии не должны совпадать');

      var data = await api('/api/auth/register.php', {
        last_name: last_name,
        first_name: first_name,
        middle_name: middle_name,
        city_id: city_id,
        email: email,
        password: password,
        primary_profession_id: primary_profession_id,
        extra_profession_ids: extras
      });

      setMsg($('authRegMsg'), data.message || 'Проверьте почту и подтвердите email.', 'ok');

      showPopup({
        title: 'Почта отправлена',
        text: data.message || 'Проверьте почту и подтвердите email.',
        type: 'ok',
        hint: 'Откройте письмо и нажмите кнопку подтверждения. Если письма нет — проверьте «Спам» или «Промоакции».',
        timeout: 9000
      });

      $('authRegLastName').value = '';
      $('authRegFirstName').value = '';
      $('authRegMiddleName').value = '';

      if (cityInput) cityInput.value = '';
      if (cityIdInput) cityIdInput.value = '';
      hideCitySuggest();

      if (primaryCat) primaryCat.value = '';
      disableProfSelect(primaryProf, 'Сначала выберите категорию');

      if (extraCat1) extraCat1.value = '';
      disableProfSelect(extraProf1, 'Сначала выберите категорию');

      if (extraCat2) extraCat2.value = '';
      disableProfSelect(extraProf2, 'Сначала выберите категорию');

      $('authRegEmail').value = '';
      $('authRegPass').value = '';
    } catch (err) {
      setMsg($('authRegMsg'), err.message, 'error');

      showPopup({
        title: 'Ошибка',
        text: err.message || 'Ошибка регистрации',
        type: 'error',
        hint: '',
        timeout: 7000
      });
    }
  });

  $('authLoginBtn') && $('authLoginBtn').addEventListener('click', async function () {
    setMsg($('authLoginMsg'), '');

    try {
      var email = ($('authLoginEmail').value || '').trim();
      var password = $('authLoginPass').value || '';

      await api('/api/auth/login.php', { email: email, password: password });

      setMsg($('authLoginMsg'), 'Успешный вход.', 'ok');
      await refreshAuthState();

      $('authLoginEmail').value = '';
      $('authLoginPass').value = '';
      closeModal();
    } catch (err) {
      setMsg($('authLoginMsg'), err.message, 'error');

      showPopup({
        title: 'Ошибка входа',
        text: err.message || 'Не удалось войти',
        type: 'error',
        hint: '',
        timeout: 7000
      });
    }
  });

  $('authForgotBtn') && $('authForgotBtn').addEventListener('click', async function () {
    setMsg($('authForgotMsg'), '');

    try {
      var email = ($('authForgotEmail').value || '').trim();
      var data = await api('/api/auth/forgot.php', { email: email });

      setMsg($('authForgotMsg'), data.message || 'Если email есть в системе, мы отправили инструкции.', 'ok');

      showPopup({
        title: 'Письмо отправлено',
        text: data.message || 'Если email есть в системе, мы отправили инструкции.',
        type: 'ok',
        hint: 'Если письма нет — проверьте «Спам» или «Промоакции».',
        timeout: 9000
      });

      $('authForgotEmail').value = '';
    } catch (err) {
      setMsg($('authForgotMsg'), err.message, 'error');

      showPopup({
        title: 'Ошибка',
        text: err.message || 'Не удалось отправить письмо',
        type: 'error',
        hint: '',
        timeout: 7000
      });
    }
  });

  bindCityAutocomplete();
  refreshAuthState();
})();