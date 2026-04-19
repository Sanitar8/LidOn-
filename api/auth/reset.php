<?php
declare(strict_types=1);
require_once __DIR__ . '/../_bootstrap.php';

rate_limit('reset', 10, 60);
require_post();

$pdo = db($CONFIG);
$data = body_json();

$token = trim((string)($data['token'] ?? ''));
$newPassword = (string)($data['password'] ?? '');

if ($token === '') json_err('Missing token');
if (mb_strlen($newPassword) < 8) json_err('Пароль минимум 8 символов');

$tokenHash = sha256($token);

$stmt = $pdo->prepare("
  SELECT id, user_id
  FROM auth_tokens
  WHERE token_hash = ?
    AND type = 'reset'
    AND used_at IS NULL
    AND expires_at > NOW()
  LIMIT 1
");
$stmt->execute([$tokenHash]);
$row = $stmt->fetch();
if (!$row) json_err('Token invalid or expired', 400);

$hash = password_hash($newPassword, PASSWORD_BCRYPT);

$pdo->beginTransaction();
try {
  $pdo->prepare("UPDATE users SET password_hash = ? WHERE id = ?")->execute([$hash, (int)$row['user_id']]);
  $pdo->prepare("UPDATE auth_tokens SET used_at = NOW() WHERE id = ?")->execute([(int)$row['id']]);
  $pdo->commit();
} catch (Throwable $e) {
  $pdo->rollBack();
  json_err('Reset failed', 500);
}

json_ok(['message' => 'Пароль обновлён. Теперь можно войти.']);
