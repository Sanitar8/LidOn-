<?php
declare(strict_types=1);
require_once __DIR__ . '/../_bootstrap.php';

require_get();
$pdo = db($CONFIG);

$q = trim((string)($_GET['q'] ?? ''));
if ($q === '' || mb_strlen($q) < 2) {
  json_ok(['items' => []]);
}

$qLike = '%' . $q . '%';

$stmt = $pdo->prepare("
  SELECT id, name, region
  FROM cities
  WHERE name LIKE ?
     OR region LIKE ?
  ORDER BY population DESC, name ASC
  LIMIT 20
");
$stmt->execute([$qLike, $qLike]);
$items = [];

while ($row = $stmt->fetch()) {
  $label = $row['name'];
  if (!empty($row['region'])) $label .= ' — ' . $row['region'];
  $items[] = [
    'id' => (int)$row['id'],
    'label' => $label
  ];
}

json_ok(['items' => $items]);
