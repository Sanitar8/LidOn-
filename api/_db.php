<?php
declare(strict_types=1);

function db(array $CONFIG): PDO {
  static $pdo = null;
  if ($pdo instanceof PDO) return $pdo;

  $dsn = sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4',
    $CONFIG['db']['host'],
    $CONFIG['db']['name']
  );

  $pdo = new PDO($dsn, $CONFIG['db']['user'], $CONFIG['db']['pass'], [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
  ]);

  return $pdo;
}
