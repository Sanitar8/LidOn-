<?php
declare(strict_types=1);

function json_ok(array $data = []): void {
  echo json_encode(array_merge(['ok' => true], $data), JSON_UNESCAPED_UNICODE);
  exit;
}

function json_err(string $msg, int $code = 400, array $extra = []): void {
  http_response_code($code);
  echo json_encode(array_merge(['ok' => false, 'error' => $msg], $extra), JSON_UNESCAPED_UNICODE);
  exit;
}

function require_post(): void {
  if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    json_err('Method not allowed', 405);
  }
}

function require_get(): void {
  if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    json_err('Method not allowed', 405);
  }
}

function body_json(): array {
  $raw = file_get_contents('php://input');
  $data = json_decode($raw ?: '[]', true);
  return is_array($data) ? $data : [];
}

function base64url_encode(string $bin): string {
  return rtrim(strtr(base64_encode($bin), '+/', '-_'), '=');
}

function sha256(string $s): string {
  return hash('sha256', $s);
}

// очень простой rate-limit: N запросов в окно T секунд на IP+endpoint
function rate_limit(string $key, int $limit = 20, int $windowSeconds = 60): void {
  $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
  $name = 'lidon_rl_' . sha256($ip . '|' . $key);
  $file = sys_get_temp_dir() . '/' . $name . '.json';
  $now = time();

  $state = ['start' => $now, 'count' => 0];
  if (file_exists($file)) {
    $json = file_get_contents($file);
    $parsed = json_decode($json ?: '', true);
    if (is_array($parsed) && isset($parsed['start'], $parsed['count'])) {
      $state = $parsed;
    }
  }

  if (($now - (int)$state['start']) > $windowSeconds) {
    $state = ['start' => $now, 'count' => 0];
  }

  $state['count'] = (int)$state['count'] + 1;
  file_put_contents($file, json_encode($state));

  if ($state['count'] > $limit) {
    json_err('Too many requests. Try later.', 429);
  }
}