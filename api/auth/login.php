<?php
declare(strict_types=1);
require_once __DIR__ . '/../_bootstrap.php';

rate_limit('login', 20, 60);
require_post();

$pdo = db($CONFIG);
$data = body_json();

$email = trim((string)($data['email'] ?? ''));
$password = (string)($data['password'] ?? '');

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) json_err('Некорректный email');
if ($password === '') json_err('Введите пароль');

$stmt = $pdo->prepare("
  SELECT id, last_name, first_name, middle_name, password_hash, is_verified
  FROM users
  WHERE email = ?
  LIMIT 1
");
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user) json_err('Неверный email или пароль', 401);
if (!(int)$user['is_verified']) json_err('Подтвердите email перед входом', 403);
if (!password_verify($password, (string)$user['password_hash'])) json_err('Неверный email или пароль', 401);

session_regenerate_id(true);
$_SESSION['user_id'] = (int)$user['id'];

$pdo->prepare("UPDATE users SET last_login_at = NOW() WHERE id = ?")->execute([(int)$user['id']]);

json_ok([
  'user' => [
    'id' => (int)$user['id'],
    'last_name' => (string)$user['last_name'],
    'first_name' => (string)$user['first_name'],
    'middle_name' => (string)$user['middle_name'],
    'email' => $email
  ]
]);
