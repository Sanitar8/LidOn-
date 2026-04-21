<?php
declare(strict_types=1);
require_once __DIR__ . '/../_bootstrap.php';

require_get();

if (empty($_SESSION['user_id'])) {
  json_ok(['user' => null]);
}

$pdo = db($CONFIG);
$uid = (int)$_SESSION['user_id'];

$userStmt = $pdo->prepare("
  SELECT
    u.id,
    u.email,
    u.first_name,
    u.middle_name,
    u.last_name,
    u.city_id,
    COALESCE(c.name, '') AS city_name,
    COALESCE(c.region, '') AS city_region
  FROM users u
  LEFT JOIN cities c ON c.id = u.city_id
  WHERE u.id = ?
  LIMIT 1
");
$userStmt->execute([$uid]);
$user = $userStmt->fetch();

if (!$user) {
  json_ok(['user' => null]);
}

$profStmt = $pdo->prepare("
  SELECT
    p.id,
    p.name,
    COALESCE(c.name, '') AS category,
    up.is_primary
  FROM user_professions up
  JOIN professions p ON p.id = up.profession_id
  LEFT JOIN profession_categories c ON c.id = p.category_id
  WHERE up.user_id = ?
  ORDER BY up.is_primary DESC, p.name ASC
");
$profStmt->execute([$uid]);
$rows = $profStmt->fetchAll();

$user['primary_profession'] = null;
$user['extra_professions'] = [];

foreach ($rows as $r) {
  $item = [
    'id' => (int)$r['id'],
    'name' => (string)$r['name'],
    'category' => (string)$r['category'],
    'is_primary' => (int)$r['is_primary']
  ];

  if ((int)$r['is_primary'] === 1) {
    $user['primary_profession'] = $item;
  } else {
    $user['extra_professions'][] = $item;
  }
}

$user['id'] = (int)$user['id'];
$user['city_id'] = (int)$user['city_id'];
$user['email'] = (string)$user['email'];
$user['first_name'] = (string)$user['first_name'];
$user['middle_name'] = (string)$user['middle_name'];
$user['last_name'] = (string)$user['last_name'];
$user['city_name'] = (string)$user['city_name'];
$user['city_region'] = (string)$user['city_region'];

json_ok(['user' => $user]);