<?php
declare(strict_types=1);
require_once __DIR__ . '/../_bootstrap.php';

rate_limit('register', 10, 60);
require_post();

$pdo = db($CONFIG);
$data = body_json();

$last_name   = trim((string)($data['last_name'] ?? ''));
$first_name  = trim((string)($data['first_name'] ?? ''));
$middle_name = trim((string)($data['middle_name'] ?? ''));
$city_id     = (int)($data['city_id'] ?? 0);

$primary_prof = (int)($data['primary_profession_id'] ?? 0);
$extra_profs  = $data['extra_profession_ids'] ?? [];

$email    = trim((string)($data['email'] ?? ''));
$password = (string)($data['password'] ?? '');

if ($last_name === '') json_err('Укажите фамилию');
if ($first_name === '') json_err('Укажите имя');
if ($middle_name === '') json_err('Укажите отчество');
if ($city_id <= 0) json_err('Выберите город из списка');

if ($primary_prof <= 0) json_err('Выберите основную профессию');

if (!is_array($extra_profs)) json_err('Некорректные дополнительные профессии');
$extra_profs = array_unique(array_map('intval', $extra_profs));
if (count($extra_profs) > 2) json_err('Можно выбрать не более 2 дополнительных профессий');
if (in_array($primary_prof, $extra_profs, true)) json_err('Основная профессия не может повторяться');

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) json_err('Некорректный email');
if (mb_strlen($password) < 8) json_err('Пароль минимум 8 символов');

// email
$stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
$stmt->execute([$email]);
if ($stmt->fetch()) json_err('Этот email уже зарегистрирован');

// город
$stmt = $pdo->prepare('SELECT id FROM cities WHERE id = ?');
$stmt->execute([$city_id]);
if (!$stmt->fetch()) json_err('Город не найден');

// профессии
$checkProf = $pdo->prepare('SELECT id FROM professions WHERE id = ? AND is_active = 1');
$checkProf->execute([$primary_prof]);
if (!$checkProf->fetch()) json_err('Основная профессия недоступна');

foreach ($extra_profs as $pid) {
  $checkProf->execute([$pid]);
  if (!$checkProf->fetch()) json_err('Одна из доп. профессий недоступна');
}

$hash = password_hash($password, PASSWORD_BCRYPT);

$pdo->beginTransaction();
try {
  $stmt = $pdo->prepare("
    INSERT INTO users (email,last_name,first_name,middle_name,city_id,password_hash,is_verified)
    VALUES (?,?,?,?,?,?,0)
  ");
  $stmt->execute([$email,$last_name,$first_name,$middle_name,$city_id,$hash]);
  $userId = (int)$pdo->lastInsertId();

  // профессии
  $stmt = $pdo->prepare("
    INSERT INTO user_professions (user_id, profession_id, is_primary)
    VALUES (?, ?, ?)
  ");
  $stmt->execute([$userId, $primary_prof, 1]);
  foreach ($extra_profs as $pid) {
    $stmt->execute([$userId, $pid, 0]);
  }

  // email verify (FIX: не используем плейсхолдер внутри INTERVAL, считаем expires_at в PHP)
  $token = base64url_encode(random_bytes(32));
  $tokenHash = sha256($token);

  $ttl = (int)($CONFIG['app']['verify_ttl'] ?? 3600);
  $expires = (new DateTimeImmutable())->modify("+{$ttl} seconds")->format('Y-m-d H:i:s');

  $pdo->prepare("
    INSERT INTO auth_tokens (user_id, token_hash, type, expires_at)
    VALUES (?, ?, 'verify', ?)
  ")->execute([
    $userId,
    $tokenHash,
    $expires
  ]);

  $verifyUrl = rtrim($CONFIG['app']['base_url'], '/') . '/api/auth/verify.php?token=' . urlencode($token);
  send_mail(
    $CONFIG,
    $email,
    trim("$first_name $middle_name"),
    'Подтверждение email — LIDON',
    "<p>Подтвердите email LIDON: <a href='$verifyUrl'>$verifyUrl</a></p>"
  );

  $pdo->commit();
} catch (Throwable $e) {
  $pdo->rollBack();
  json_err('Ошибка регистрации', 500);
}

json_ok(['message' => 'Проверьте почту и подтвердите email.']);