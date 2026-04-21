<?php
declare(strict_types=1);
require_once __DIR__ . '/../_bootstrap.php';

rate_limit('forgot', 10, 60);
require_post();

$pdo = db($CONFIG);
$data = body_json();

$email = trim((string)($data['email'] ?? ''));
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) json_err('Некорректный email');

// Всегда отвечаем одинаково (не палим существование email)
$stmt = $pdo->prepare("SELECT id, last_name, first_name, middle_name, is_verified FROM users WHERE email = ? LIMIT 1");
$stmt->execute([$email]);
$user = $stmt->fetch();

if ($user && (int)$user['is_verified'] === 1) {
  $token = base64url_encode(random_bytes(32));
  $tokenHash = sha256($token);
  $ttl = (int)$CONFIG['app']['reset_ttl'];
  $expires = (new DateTimeImmutable())->modify("+{$ttl} seconds")->format('Y-m-d H:i:s');

  $pdo->prepare("INSERT INTO auth_tokens (user_id, token_hash, type, expires_at) VALUES (?, ?, 'reset', ?)")
      ->execute([(int)$user['id'], $tokenHash, $expires]);

  $resetUrl = rtrim($CONFIG['app']['base_url'], '/') . '/reset.html?token=' . urlencode($token);

  $full_name = trim(
    (string)$user['last_name'] . ' ' .
    (string)$user['first_name'] . ' ' .
    (string)$user['middle_name']
  );

  $subject = 'Восстановление пароля — LIDON';
  $html = '
    <p>Здравствуйте, ' . htmlspecialchars($full_name, ENT_QUOTES, 'UTF-8') . '!</p>
    <p>Чтобы установить новый пароль LIDON, перейдите по ссылке:</p>
    <p><a href="' . htmlspecialchars($resetUrl, ENT_QUOTES, 'UTF-8') . '">' . htmlspecialchars($resetUrl, ENT_QUOTES, 'UTF-8') . '</a></p>
    <p>Если вы не запрашивали восстановление — просто игнорируйте это письмо.</p>
  ';
  try {
    send_mail($CONFIG, $email, $full_name, $subject, $html);
  } catch (Throwable $e) {
    // не раскрываем детали
  }
}

json_ok(['message' => 'Если email зарегистрирован, мы отправили инструкции.']);