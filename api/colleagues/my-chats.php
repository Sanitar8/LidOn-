<?php
declare(strict_types=1);
require_once __DIR__ . '/../_bootstrap.php';

require_get();

if (empty($_SESSION['user_id'])) {
  json_ok(['ok' => true, 'items' => [], 'user' => null]);
}

$pdo = db($CONFIG);
$uid = (int)$_SESSION['user_id'];

/*
  Возвращаем до 3 профессий пользователя (primary + extras)
  + привязку к TG (если задана в profession_tg_chats)
*/
$stmt = $pdo->prepare("
  SELECT
    p.id AS profession_id,
    p.name AS profession_name,
    c.name AS category_name,
    up.is_primary,
    COALESCE(tg.tg_title, '') AS tg_title,
    COALESCE(tg.tg_url, '') AS tg_url
  FROM user_professions up
  JOIN professions p ON p.id = up.profession_id
  JOIN profession_categories c ON c.id = p.category_id
  LEFT JOIN profession_tg_chats tg
    ON tg.profession_id = p.id AND tg.is_active = 1
  WHERE up.user_id = ?
  ORDER BY up.is_primary DESC, p.name ASC
  LIMIT 3
");
$stmt->execute([$uid]);
$items = $stmt->fetchAll() ?: [];

// Нормализуем ссылки (если пусто — оставим пусто, фронт покажет заглушку)
foreach ($items as &$it) {
  $it['is_primary'] = (int)($it['is_primary'] ?? 0);
  $it['profession_id'] = (int)($it['profession_id'] ?? 0);

  $it['tg_title'] = trim((string)($it['tg_title'] ?? ''));
  $it['tg_url']   = trim((string)($it['tg_url'] ?? ''));
}
unset($it);

json_ok(['items' => $items]);
