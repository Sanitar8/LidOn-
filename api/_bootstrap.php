<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

if (session_status() !== PHP_SESSION_ACTIVE) {
  session_start([
    'cookie_httponly' => true,
    'cookie_samesite' => 'Lax',
    'use_strict_mode' => true,
  ]);
}

$envPath = __DIR__ . '/.env.php';
if (!file_exists($envPath)) {
  http_response_code(500);
  echo json_encode(['ok' => false, 'error' => 'Missing /api/.env.php']);
  exit;
}
$CONFIG = require $envPath;

require_once __DIR__ . '/_helpers.php';
require_once __DIR__ . '/_db.php';
require_once __DIR__ . '/_mail.php';
