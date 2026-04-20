(function () {
  'use strict';

  var MODAL_URL = '/colleagues-modal.html';
  var API_MY_CHATS = '/api/colleagues/my-chats.php';

  function $(id) { return document.getElementById(id); }

  function lockBody(lock) {
    document.body.classList.toggle('modal-lock', !!lock);
  }

  function formatTime(ts) {
    var d = new Date(ts);
    var h = String(d.getHours()).padStart(2, '0');
    var m = String(d.getMinutes()).padStart(2, '0');
    return h + ':' + m;
  }

  function safeText(s) {
    return (s == null) ? '' : String(s);
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function normalizeTgUrl(url) {
    var u = (url || '').trim();
    if (!u) return '';
    // разрешим "t.me/xxx" без протокола
    if (!/^https?:\/\//i.test(u)) u = 'https://' + u.replace(/^\/+/, '');
    return u;
  }

  async function loadModalHtmlOnce() {
    if ($('colxModal')) return true;

    try {
      var res = await fetch(MODAL_URL, { credentials: 'same-origin' });
      if (!res.ok) throw new Error('Failed to load modal html');
      var html = await res.text();

      var wrap = document.createElement('div');
      wrap.innerHTML = html;

      while (wrap.firstChild) document.body.appendChild(wrap.firstChild);
      return !!$('colxModal');
    } catch (e) {
      return false;
    }
  }

  function createRow(type, text, fileInfo) {
    var row = document.createElement('div');
    row.className = 'colxRow ' + (type === 'lidon' ? 'colxRow--lidon' : 'colxRow--user');

    var avatar = document.createElement('div');
    avatar.className = 'colxAvatar ' + (type === 'lidon' ? 'colxAvatar--lidon' : 'colxAvatar--user');
    avatar.textContent = (type === 'lidon') ? 'L' : 'U';
    avatar.setAttribute('aria-hidden', 'true');

    var bubble = document.createElement('div');
    bubble.className = 'colxBubble ' + (type === 'user' ? 'colxBubble--user' : 'colxBubble--lidon');

    var textDiv = document.createElement('div');
    textDiv.className = 'colxText';
    textDiv.textContent = safeText(text || '');
    bubble.appendChild(textDiv);

    if (fileInfo && fileInfo.name) {
      if (fileInfo.isImage && fileInfo.url) {
        var img = document.createElement('img');
        img.className = 'colxImgPreview';
        img.src = fileInfo.url;
        img.alt = fileInfo.name;
        bubble.appendChild(img);
      } else {
        var chip = document.createElement('div');
        chip.className = 'colxFileChip';
        chip.textContent = 'Файл: ' + fileInfo.name;
        bubble.appendChild(chip);
      }
    }

    var meta = document.createElement('div');
    meta.className = 'colxMeta';
    meta.textContent = (type === 'lidon') ? ('LIDON • ' + formatTime(Date.now())) : formatTime(Date.now());
    bubble.appendChild(meta);

    if (type === 'lidon') {
      row.appendChild(avatar);
      row.appendChild(bubble);
    } else {
      row.appendChild(bubble);
      row.appendChild(avatar);
    }
    return row;
  }

  async function fetchMyChats() {
    var res = await fetch(API_MY_CHATS, { credentials: 'same-origin' });
    var data = await res.json().catch(function () { return { ok: false, items: [] }; });
    if (!data || data.ok === false) return [];
    return Array.isArray(data.items) ? data.items : [];
  }

  function initColleaguesModal() {
    var openBtn = $('btn-hero-colleagues');
    if (!openBtn) return;

    var state = {
      activeTab: null,
      chats: {},          // tabKey -> { title, sub, items:[] }
      tabOrder: [],       // [tabKey, ...]
      pendingFile: null,
      hydrated: false
    };

    function renderChat() {
      var msgs = $('colxMessages');
      var title = $('colxChatTitle');
      var sub = $('colxChatSub');

      var key = state.activeTab;
      var chat = key ? state.chats[key] : null;

      if (title) title.textContent = chat ? chat.title : 'Чат';
      if (sub) sub.textContent = chat ? chat.sub : '—';

      if (!msgs) return;
      msgs.innerHTML = '';

      if (!chat) {
        msgs.appendChild(createRow('lidon', 'Выберите чат сверху.', null));
        return;
      }

      if (chat.items.length === 0) {
        msgs.appendChild(createRow('lidon', 'Здравствуйте! Напишите сообщение — оно отобразится в ленте (пока демо).', null));
      } else {
        chat.items.forEach(function (it) {
          msgs.appendChild(createRow(it.type, it.text, it.file || null));
        });
      }

      msgs.scrollTop = msgs.scrollHeight;
    }

    function setTab(tabKey) {
      state.activeTab = tabKey;

      var tabsWrap = $('colxTabs');
      if (tabsWrap) {
        Array.prototype.slice.call(tabsWrap.querySelectorAll('[data-colx-tab]')).forEach(function (btn) {
          btn.classList.toggle('colx__tab--active', btn.getAttribute('data-colx-tab') === tabKey);
        });
      }

      state.pendingFile = null;
      var fileInput = $('colxFile');
      if (fileInput) fileInput.value = '';

      renderChat();
    }

    function buildUiFromItems(items) {
      // items: [{profession_id, profession_name, category_name, is_primary, tg_title, tg_url}]
      // 1) TG cards
      var tgGrid = $('colxTgGrid');
      if (tgGrid) {
        if (!items.length) {
          tgGrid.innerHTML =
            '<div class="colx__tgCard" style="grid-column: 1 / -1;">' +
              '<div class="colx__tgBody">' +
                '<div class="colx__tgName">Нет профессий</div>' +
                '<div class="colx__tgHint">Чтобы появились чаты по профессиям — выберите профессии в профиле/регистрации.</div>' +
              '</div>' +
            '</div>';
        } else {
          tgGrid.innerHTML = items.slice(0, 3).map(function (it) {
            var title = it.tg_title || ('TG чат: ' + (it.profession_name || 'Профессия'));
            var url = normalizeTgUrl(it.tg_url);
            var label = it.tg_url ? it.tg_url.replace(/^https?:\/\//i, '') : 'Ссылка будет добавлена';
            var hint = it.category_name ? ('Категория: ' + it.category_name) : 'Чат по вашей профессии';

            return (
              '<div class="colx__tgCard">' +
                '<div class="colx__tgQr" aria-hidden="true">QR</div>' +
                '<div class="colx__tgBody">' +
                  '<div class="colx__tgName">' + escapeHtml(title) + '</div>' +
                  (url
                    ? '<a class="colx__tgLink" href="' + escapeHtml(url) + '" target="_blank" rel="noopener">' + escapeHtml(label) + '</a>'
                    : '<span class="colx__tgLink" style="opacity:.75;">' + escapeHtml(label) + '</span>'
                  ) +
                  '<div class="colx__tgHint">' + escapeHtml(hint) + '</div>' +
                '</div>' +
              '</div>'
            );
          }).join('');
        }
      }

      // 2) Tabs (кнопки чатов) — строго по профессиям
      var tabs = $('colxTabs');
      state.chats = {};
      state.tabOrder = [];

      if (tabs) {
        if (!items.length) {
          tabs.innerHTML = '<button type="button" class="colx__tab colx__tab--active" data-colx-tab="chat1">Чат</button>';
          state.chats.chat1 = { title: 'Чат', sub: '—', items: [] };
          state.tabOrder = ['chat1'];
        } else {
          var html = [];
          items.slice(0, 3).forEach(function (it, idx) {
            var key = 'chat' + (idx + 1);
            var t = it.profession_name || ('Чат ' + (idx + 1));
            var s = it.category_name || '—';

            state.chats[key] = { title: t, sub: s, items: [] };
            state.tabOrder.push(key);

            html.push(
              '<button type="button" class="colx__tab' + (idx === 0 ? ' colx__tab--active' : '') + '" data-colx-tab="' + key + '">' +
                escapeHtml(t) +
              '</button>'
            );
          });
          tabs.innerHTML = html.join('');
        }
      }

      // 3) bind tabs clicks
      if (tabs) {
        Array.prototype.slice.call(tabs.querySelectorAll('[data-colx-tab]')).forEach(function (btn) {
          btn.addEventListener('click', function () {
            setTab(btn.getAttribute('data-colx-tab'));
          });
        });
      }

      // activate first tab
      state.activeTab = state.tabOrder[0] || 'chat1';
      renderChat();
    }

    function open() {
      var modal = $('colxModal');
      if (!modal) return;

      modal.classList.add('colx--open');
      modal.setAttribute('aria-hidden', 'false');
      lockBody(true);

      var input = $('colxInput');
      if (input) setTimeout(function () { input.focus(); }, 0);
    }

    function close() {
      var modal = $('colxModal');
      if (!modal) return;

      modal.classList.remove('colx--open');
      modal.setAttribute('aria-hidden', 'true');
      lockBody(false);
    }

    function sendMessage() {
      var input = $('colxInput');
      if (!input) return;

      var text = (input.value || '').trim();
      var file = state.pendingFile;

      if (!text && !file) return;

      var key = state.activeTab;
      if (!state.chats[key]) return;

      state.chats[key].items.push({
        type: 'user',
        text: text || (file ? 'Отправлен файл' : ''),
        file: file || null
      });

      input.value = '';
      state.pendingFile = null;

      var fileInput = $('colxFile');
      if (fileInput) fileInput.value = '';

      renderChat();
      input.focus();
    }

    openBtn.addEventListener('click', async function () {
      var ok = await loadModalHtmlOnce();
      if (!ok) return;

      var modal = $('colxModal');
      if (!modal) return;

      if (modal.dataset.bound !== '1') {
        modal.dataset.bound = '1';

        var closeBtn = $('colxClose');
        if (closeBtn) closeBtn.addEventListener('click', close);

        modal.addEventListener('click', function (e) {
          if (e.target && e.target.getAttribute && e.target.getAttribute('data-colx-close') === '1') close();
        });

        document.addEventListener('keydown', function (e) {
          var m = $('colxModal');
          if (!m) return;
          if (e.key === 'Escape' && m.classList.contains('colx--open')) close();
        });

        var attachBtn = $('colxAttach');
        var fileInput = $('colxFile');

        if (attachBtn && fileInput) {
          attachBtn.addEventListener('click', function () { fileInput.click(); });

          fileInput.addEventListener('change', function () {
            var f = fileInput.files && fileInput.files[0];
            if (!f) return;

            var isImage = /^image\//i.test(f.type);
            var url = null;

            if (isImage) {
              try { url = URL.createObjectURL(f); } catch (_) { url = null; }
            }

            state.pendingFile = {
              name: f.name,
              type: f.type || '',
              isImage: isImage,
              url: url
            };
          });
        }

        var sendBtn = $('colxSend');
        var input = $('colxInput');

        if (sendBtn) sendBtn.addEventListener('click', sendMessage);

        if (input) {
          input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          });
        }
      }

      // Подгружаем чаты 1 раз (или можно каждый раз — но лучше 1 раз для демо)
      if (!state.hydrated) {
        state.hydrated = true;
        var items = await fetchMyChats();
        buildUiFromItems(items);
      } else {
        renderChat();
      }

      open();
    });
  }

  document.addEventListener('DOMContentLoaded', initColleaguesModal);
})();