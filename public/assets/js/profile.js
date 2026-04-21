(function () {
  'use strict';

  function $(id) {
    return document.getElementById(id);
  }

  var msg = $('profileMsg');
  var editBtn = $('profileEditBtn');

  function setText(id, value) {
    var el = $(id);
    if (!el) return;
    el.textContent = value && String(value).trim() ? String(value).trim() : '—';
  }

  function setMsg(text, type) {
    if (!msg) return;
    msg.textContent = text || '';
    msg.classList.remove('error', 'ok');
    if (type) msg.classList.add(type);
  }

  function formatProfession(prof) {
    if (!prof || !prof.name) return '—';
    if (prof.category) return prof.name + ' — ' + prof.category;
    return prof.name;
  }

  function fillProfile(user) {
    setText('profileLastName', user.last_name);
    setText('profileFirstName', user.first_name);
    setText('profileMiddleName', user.middle_name);
    setText('profileEmail', user.email);

    setText('profileCity', user.city_name || user.city || '—');
    setText('profilePrimaryProfession', formatProfession(user.primary_profession));

    var extras = Array.isArray(user.extra_professions) ? user.extra_professions : [];
    setText('profileExtraProfession1', extras[0] ? formatProfession(extras[0]) : '—');
    setText('profileExtraProfession2', extras[1] ? formatProfession(extras[1]) : '—');
  }

  async function loadProfile() {
    setMsg('');

    try {
      var res = await fetch('/api/auth/me', {
        credentials: 'same-origin'
      });

      var data = await res.json().catch(function () {
        return { ok: false, user: null };
      });

      if (!res.ok || !data || data.ok === false || !data.user) {
        throw new Error('Не удалось загрузить профиль');
      }

      fillProfile(data.user);
    } catch (err) {
      setMsg(err.message || 'Ошибка загрузки профиля', 'error');
    }
  }

  if (editBtn) {
    editBtn.addEventListener('click', function () {
      setMsg('Редактирование профиля подключим следующим шагом.', 'ok');
    });
  }

  document.addEventListener('DOMContentLoaded', loadProfile);
})();