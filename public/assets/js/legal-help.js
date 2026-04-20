/**
 * legal-help.js
 *
 * 1) Управляет виджетом на главной странице:
 *    - открытие/закрытие блока #legal-help-widget по кнопке #btn-hero-legal-chat
 *
 * 2) Управляет чатом внутри /legal-help.html:
 *    - добавляет сообщения пользователя (без автоответов)
 *    - отображает простые аватарки U / L
 *    - ✅ добавлено: выбор файла/фото, превью (только фронт, без загрузки)
 */

(function () {
  'use strict';

  /* ==========================
     ВИДЖЕТ НА ГЛАВНОЙ
     ========================== */

  function initWidget() {
    var openBtn = document.getElementById('btn-hero-legal-chat');
    var widget = document.getElementById('legal-help-widget');
    var closeBtn = document.getElementById('legal-help-widget-close');

    if (!openBtn || !widget || !closeBtn) {
      return; // значит, мы не на главной
    }

    function open() {
      widget.classList.add('legal-help-widget--open');
      widget.setAttribute('aria-hidden', 'false');
    }

    function close() {
      widget.classList.remove('legal-help-widget--open');
      widget.setAttribute('aria-hidden', 'true');
    }

    openBtn.addEventListener('click', function () {
      if (widget.classList.contains('legal-help-widget--open')) close();
      else open();
    });

    closeBtn.addEventListener('click', close);

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && widget.classList.contains('legal-help-widget--open')) {
        close();
      }
    });
  }

  /* ==========================
     ЧАТ ВНУТРИ IFRAME
     ========================== */

  function initChat() {
    var msgBox = document.getElementById('chatMessages');
    var input = document.getElementById('chatInput');
    var sendBtn = document.getElementById('chatSend');

    // ✅ attachment UI
    var clipBtn = document.getElementById('chatClip');
    var fileInput = document.getElementById('chatFile');
    var attachBar = document.getElementById('chatAttach');
    var attachPreview = document.getElementById('chatAttachPreview');
    var attachName = document.getElementById('chatAttachName');
    var attachRemove = document.getElementById('chatAttachRemove');

    if (!msgBox || !input || !sendBtn) return;

    var selectedFile = null;
    var previewUrl = null;

    function formatTime(ts) {
      var d = new Date(ts);
      var h = String(d.getHours()).padStart(2, '0');
      var m = String(d.getMinutes()).padStart(2, '0');
      return h + ':' + m;
    }

    function cleanupPreviewUrl() {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        previewUrl = null;
      }
    }

    function clearAttachment() {
      selectedFile = null;
      cleanupPreviewUrl();
      if (fileInput) fileInput.value = '';
      if (attachBar) attachBar.style.display = 'none';
      if (attachPreview) attachPreview.innerHTML = '';
      if (attachName) attachName.textContent = '';
    }

    function showAttachment(file) {
      if (!attachBar || !attachPreview || !attachName) return;

      attachName.textContent = file.name || 'Файл';

      // картинка → превью, иначе иконка
      if (file.type && file.type.indexOf('image/') === 0) {
        cleanupPreviewUrl();
        previewUrl = URL.createObjectURL(file);
        attachPreview.innerHTML = '<img alt="Вложение" src="' + previewUrl + '">';
      } else {
        attachPreview.innerHTML = '<div class="chat-attach__fileicon">📄</div>';
      }

      attachBar.style.display = 'flex';
    }

    function addMessage(text, type, file) {
      var trimmed = (text || '').trim();
      if (!trimmed && !file) return;

      var row = document.createElement('div');
      row.className = 'chat-row ' + (type === 'lawyer' ? 'chat-row--lawyer' : 'chat-row--user');

      var avatar = document.createElement('div');
      avatar.className = 'chat-avatar ' + (type === 'lawyer' ? 'chat-avatar--lawyer' : 'chat-avatar--user');
      avatar.textContent = type === 'lawyer' ? 'L' : 'U';
      avatar.setAttribute('aria-hidden', 'true');

      var bubble = document.createElement('div');
      bubble.className = 'chat-bubble ' + (type === 'lawyer' ? 'chat-bubble--lawyer' : 'chat-bubble--user');

      if (trimmed) {
        var textDiv = document.createElement('div');
        textDiv.className = 'chat-bubble__text';
        textDiv.textContent = trimmed;
        bubble.appendChild(textDiv);
      }

      // ✅ вложение внутри сообщения
      if (file) {
        var wrap = document.createElement('div');
        wrap.className = 'chat-attachment';

        if (file.type && file.type.indexOf('image/') === 0) {
          var imgUrl = URL.createObjectURL(file);
          var img = document.createElement('img');
          img.className = 'chat-attachment__img';
          img.src = imgUrl;
          img.alt = 'Изображение (предпросмотр)';

          img.onload = function () { URL.revokeObjectURL(imgUrl); };
          wrap.appendChild(img);
        } else {
          var pill = document.createElement('div');
          pill.className = 'chat-attachment__file';
          pill.innerHTML = '<span aria-hidden="true">📎</span><span>' + (file.name || 'Файл') + '</span>';
          wrap.appendChild(pill);
        }

        bubble.appendChild(wrap);
      }

      var metaDiv = document.createElement('div');
      metaDiv.className = 'chat-bubble__meta';
      metaDiv.textContent = formatTime(Date.now());

      bubble.appendChild(metaDiv);

      if (type === 'lawyer') {
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
      if (!text.trim() && !selectedFile) return;

      addMessage(text, 'user', selectedFile);

      input.value = '';
      clearAttachment();
    }

    // ✅ открыть выбор файла
    if (clipBtn && fileInput) {
      clipBtn.addEventListener('click', function () {
        fileInput.click();
      });

      fileInput.addEventListener('change', function () {
        var files = fileInput.files;
        if (!files || !files.length) return;

        // один файл
        var f = files[0];

        // UI-лимит (например 8 MB)
        var max = 8 * 1024 * 1024;
        if (f.size > max) {
          alert('Файл слишком большой. Максимум 8 МБ. Сейчас: ' + Math.round(f.size / 1024 / 1024) + ' МБ.');
          clearAttachment();
          return;
        }

        selectedFile = f;
        showAttachment(selectedFile);
        input.focus();
      });
    }

    // ✅ удалить вложение
    if (attachRemove) {
      attachRemove.addEventListener('click', function () {
        clearAttachment();
        input.focus();
      });
    }

    sendBtn.addEventListener('click', send);

    input.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        send();
      }
    });

    // ✅ освобождаем blob url при закрытии/уходе со страницы
    window.addEventListener('beforeunload', function () {
      cleanupPreviewUrl();
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initWidget();
    initChat();
  });
})();
