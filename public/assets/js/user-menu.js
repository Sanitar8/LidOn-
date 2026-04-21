(function () {
  'use strict';

  function $(id) {
    return document.getElementById(id);
  }

  var userMenu = $('userMenu');
  var userMenuBtn = $('userMenuBtn');
  var userMenuDrop = $('userMenuDrop');

  var userProfileBtn = $('userProfileBtn');
  var userStatusDocsBtn = $('userStatusDocsBtn');
  var userChatsBtn = $('userChatsBtn');
  var userSupportBtn = $('userSupportBtn');
  var userLogoutBtn = $('userLogoutBtn');
  var userDeleteBtn = $('userDeleteBtn');

  if (!userMenu || !userMenuBtn || !userMenuDrop) return;

  function closeUserMenu() {
    userMenuDrop.style.display = 'none';
    userMenuBtn.setAttribute('aria-expanded', 'false');
  }

  function openUserMenu() {
    userMenuDrop.style.display = 'block';
    userMenuBtn.setAttribute('aria-expanded', 'true');
  }

  function toggleUserMenu() {
    var isOpen = userMenuDrop.style.display === 'block';
    if (isOpen) closeUserMenu();
    else openUserMenu();
  }

  userMenuBtn.addEventListener('click', function () {
    toggleUserMenu();
  });

  document.addEventListener('click', function (e) {
    if (userMenuDrop.style.display !== 'block') return;
    if (userMenu.contains(e.target)) return;
    closeUserMenu();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closeUserMenu();
    }
  });

  if (userProfileBtn) {
    userProfileBtn.addEventListener('click', function () {
      closeUserMenu();
      location.href = '/profile.html';
    });
  }

  if (userStatusDocsBtn) {
    userStatusDocsBtn.addEventListener('click', function () {
      closeUserMenu();
      location.href = '/documents.html';
    });
  }

  if (userChatsBtn) {
    userChatsBtn.addEventListener('click', function () {
      closeUserMenu();

      var colleaguesBtn = $('btn-hero-colleagues');
      if (colleaguesBtn) {
        colleaguesBtn.click();
        return;
      }

      alert('Раздел "Мои чаты" пока недоступен.');
    });
  }

  if (userSupportBtn) {
    userSupportBtn.addEventListener('click', function () {
      closeUserMenu();
      location.href = '/legal.html';
    });
  }

  // ✅ ИСПРАВЛЕНО ЗДЕСЬ
  if (userLogoutBtn) {
    userLogoutBtn.addEventListener('click', async function () {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'same-origin'
        });
      } catch (_) {}

      closeUserMenu();
      location.reload();
    });
  }

  if (userDeleteBtn) {
    userDeleteBtn.addEventListener('click', function () {
      closeUserMenu();

      var ok = window.confirm(
        'Вы действительно хотите удалить аккаунт?\n\nЭто действие пока не реализовано полностью и позже потребует отдельного подтверждения.'
      );

      if (!ok) return;

      alert('Функция удаления аккаунта будет подключена следующим шагом.');
    });
  }

  window.userMenuApi = {
    close: closeUserMenu,
    open: openUserMenu,
    toggle: toggleUserMenu
  };
})();