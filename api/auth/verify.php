<?php
declare(strict_types=1);
require_once __DIR__ . '/../_bootstrap.php';

rate_limit('verify', 30, 60);
require_get();

$pdo = db($CONFIG);
$token = trim((string)($_GET['token'] ?? ''));
if ($token === '') json_err('Missing token');

$tokenHash = sha256($token);

$stmt = $pdo->prepare("
  SELECT t.id AS token_id, t.user_id
  FROM auth_tokens t
  WHERE t.token_hash = ?
    AND t.type = 'verify'
    AND t.used_at IS NULL
    AND t.expires_at > NOW()
  LIMIT 1
");
$stmt->execute([$tokenHash]);
$row = $stmt->fetch();
if (!$row) json_err('Token invalid or expired', 400);

$pdo->beginTransaction();
try {
  $pdo->prepare("UPDATE users SET is_verified = 1 WHERE id = ?")
      ->execute([(int)$row['user_id']]);

  $pdo->prepare("UPDATE auth_tokens SET used_at = NOW() WHERE id = ?")
      ->execute([(int)$row['token_id']]);

  $pdo->commit();
} catch (Throwable $e) {
  $pdo->rollBack();
  json_err('Verify failed', 500);
}

// ✅ РЕДИРЕКТ ВМЕСТО JSON
header('Location: /index.html?verified=1');
exit;