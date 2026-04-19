<?php
declare(strict_types=1);
require_once __DIR__ . '/../_bootstrap.php';

require_get();
$pdo = db($CONFIG);

function fetch_items(PDO $pdo, bool $withActive): array {
  $where = $withActive ? 'WHERE p.is_active = 1' : '';
  $sql = "
    SELECT
      p.id,
      p.name,
      COALESCE(p.category_id, 0) AS category_id,
      COALESCE(pc.name, '') AS category,
      COALESCE(pc.sort, 999999) AS cat_sort
    FROM professions p
    LEFT JOIN profession_categories pc ON pc.id = p.category_id
    $where
    ORDER BY cat_sort ASC, pc.name ASC, p.name ASC
  ";

  $stmt = $pdo->query($sql);
  $items = [];
  while ($row = $stmt->fetch()) {
    $items[] = [
      'id' => (int)$row['id'],
      'name' => (string)$row['name'],
      'category_id' => (int)$row['category_id'],
      'category' => (string)$row['category'],
    ];
  }
  return $items;
}

try {
  // 1) пробуем “по правилам” с is_active
  try {
    $items = fetch_items($pdo, true);
  } catch (Throwable $e) {
    // 2) если колонки is_active нет — пробуем без неё
    $items = fetch_items($pdo, false);
  }

  // если категорий нет вообще — сделаем одну “Все профессии”
  $hasCats = false;
  foreach ($items as $it) {
    if (!empty($it['category_id'])) { $hasCats = true; break; }
  }
  if (!$hasCats) {
    foreach ($items as &$it) {
      $it['category_id'] = 1;
      $it['category'] = 'Все профессии';
    }
    unset($it);
  }

  json_ok(['items' => $items]);
} catch (Throwable $e) {
  // самый жёсткий фолбэк: просто id + name (вообще без условий)
  try {
    $stmt = $pdo->query("SELECT id, name FROM professions ORDER BY name ASC");
    $items = [];
    while ($row = $stmt->fetch()) {
      $items[] = [
        'id' => (int)$row['id'],
        'name' => (string)$row['name'],
        'category_id' => 1,
        'category' => 'Все профессии'
      ];
    }
    json_ok(['items' => $items]);
  } catch (Throwable $e2) {
    json_ok(['items' => []]);
  }
}
