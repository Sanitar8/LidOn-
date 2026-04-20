/**
 * cooperation.js
 *
 * 1) Виджет на главной:
 *    - открытие/закрытие блока #cooperation-widget по кнопке #btn-hero-cooperation-chat
 *
 * 2) Чат внутри /cooperation.html:
 *    - добавляет сообщения пользователя
 *    - вложения (фото/файл): превью + отображение в сообщении (без отправки на сервер)
 */

(function () {
  'use strict';

  /* ==========================
     ВИДЖЕТ НА ГЛАВНОЙ
     ========================== */
  function initWidget() {
    var openBtn = document.getElementById('btn-hero-cooperation-chat');
    var widget = document.getElementById('cooperation-widget');
    var closeBtn = document.getElementById('cooperation-widget-close');

    if (!openBtn || !widget || !closeBtn) return;

    function open() {
      widget.classList.add('cooperation-widget--open');
      widget.setAttribute('aria-hidden', 'false');
    }

    function close() {
      widget.classList.remove('cooperation-widget--open');
      widget.setAttribute('aria-hidden', 'true');
    }

    openBtn.addEventListener('click', function () {
      if (widget.classList.contains('cooperation-widget--open')) close();
      else open();
    });

    closeBtn.addEventListener('click', close);

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && widget.classList.contains('cooperation-widget--open')) close();
    });
  }

  /* ==========================
     ЧАТ ВНУТРИ IFRAME
     ========================== */
  function initChat() {
    var msgBox = document.getElementById('coopMessages');
    var input = document.getElementById('coopInput');
    var sendBtn = document.getElementById('coopSend');

    var clipBtn = document.getElementById('coopClip');
    var fileInput = document.getElementById('coopFile');

    var attach = document.getElementById('coopAttach');
    var attachPreview = document.getElementById('coopAttachPreview');
    var attachName = document.getElementById('coopAttachName');
    var attachHint = document.getElementById('coopAttachHint');
    var attachRemove = document.getElementById('coopAttachRemove');

    if (!msgBox || !input || !sendBtn) return;

    var pendingFile = null;

    function formatTime(ts) {
      var d = new Date(ts);
      var h = String(d.getHours()).padStart(2, '0');
      var m = String(d.getMinutes()).padStart(2, '0');
      return h + ':' + m;
    }

    function escHTML(s) {
      return String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function showAttach(file) {
      if (!attach || !attachPreview || !attachName) return;

      pendingFile = file || null;

      if (!pendingFile) {
        attach.style.display = 'none';
        attachPreview.innerHTML = '';
        attachName.textContent = '';
        if (attachHint) attachHint.textContent = '';
        return;
      }

      attach.style.display = 'flex';
      attachName.textContent = pendingFile.name || 'Файл';
      if (attachHint) {
        attachHint.textContent = pendingFile.type && pendingFile.type.indexOf('image/') === 0
          ? 'Фото будет показано в сообщении (без загрузки на сервер).'
          : 'Файл будет показан как вложение (без загрузки на сервер).';
      }

      // preview
      if (pendingFile.type && pendingFile.type.indexOf('image/') === 0) {
        var url = URL.createObjectURL(pendingFile);
        attachPreview.innerHTML = '<img src="' + url + '" alt="">';
        // освободим URL позже (после отправки или удаления)
        attachPreview.querySelector('img').addEventListener('load', function () {
          // оставляем URL до очистки pendingFile, чтобы картинка не пропала
        });
      } else {
        attachPreview.innerHTML = '<div class="coop-attach__fileicon" aria-hidden="true">📄</div>';
      }
    }

    function clearFileInput() {
      if (fileInput) fileInput.value = '';
    }

    function addMessage(text, type, file) {
      var trimmed = (text || '').trim();

      // позволяем отправку только файла без текста
      if (!trimmed && !file) return;

      var row = document.createElement('div');
      row.className = 'coop-row ' + (type === 'lidon' ? 'coop-row--lidon' : 'coop-row--user');

      var avatar = document.createElement('div');
      avatar.className = 'coop-avatar ' + (type === 'lidon' ? 'coop-avatar--lidon' : 'coop-avatar--user');
      avatar.textContent = (type === 'lidon') ? 'L' : 'U';
      avatar.setAttribute('aria-hidden', 'true');

      var bubble = document.createElement('div');
      bubble.className = 'coop-bubble ' + (type === 'lidon' ? 'coop-bubble--lidon' : 'coop-bubble--user');

      var textDiv = document.createElement('div');
      textDiv.className = 'coop-bubble__text';
      textDiv.textContent = trimmed;

      var metaDiv = document.createElement('div');
      metaDiv.className = 'coop-bubble__meta';
      metaDiv.textContent = type === 'lidon' ? ('LIDON • ' + formatTime(Date.now())) : formatTime(Date.now());

      bubble.appendChild(textDiv);

      // attachment inside bubble
      if (file) {
        var att = document.createElement('div');
        att.className = 'coop-attachment';

        if (file.type && file.type.indexOf('image/') === 0) {
          var imgUrl = URL.createObjectURL(file);
          att.innerHTML = '<img class="coop-attachment__img" src="' + imgUrl + '" alt="Вложение">';
        } else {
          att.innerHTML =
            '<div class="coop-attachment__file">' +
              '<span aria-hidden="true">📎</span>' +
              '<span>' + escHTML(file.name || 'Файл') + '</span>' +
            '</div>';
        }

        bubble.appendChild(att);
      }

      bubble.appendChild(metaDiv);

      if (type === 'lidon') {
        row.appendChild(avatar);
        row.appendChild(bubble);
      } else {
        row.appendChild(bubble);
        row.appendChild(avatar);
      }

      msgBox.appendChild(row);
      msgBox.scrollTop = msgBox.scrollHeight;
    }

    function send() {
      var text = input.value || '';
      var file = pendingFile;

      if (!text.trim() && !file) return;

      addMessage(text, 'user', file);

      input.value = '';
      input.focus();

      // очистим pendingFile + UI
      if (file && file.type && file.type.indexOf('image/') === 0) {
        // URL-ы в сообщениях сами “живут”, но можно не освобождать — это демо без сервера
      }
      pendingFile = null;
      showAttach(null);
      clearFileInput();
    }

    // send events
    sendBtn.addEventListener('click', send);

    input.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        send();
      }
    });

    // clip/file events
    if (clipBtn && fileInput) {
      clipBtn.addEventListener('click', function () { fileInput.click(); });

      fileInput.addEventListener('change', function () {
        var f = (fileInput.files && fileInput.files[0]) ? fileInput.files[0] : null;
        if (!f) return;
        showAttach(f);
      });
    }

    if (attachRemove) {
      attachRemove.addEventListener('click', function () {
        pendingFile = null;
        showAttach(null);
        clearFileInput();
        input.focus();
      });
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    initWidget();
    initChat();
  });
})();