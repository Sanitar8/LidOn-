<?php
// НЕ КЛАДИ этот файл в публичные репозитории.
// Желательно защитить папку /api от листинга и прямого доступа к .env.php через .htaccess.

return [
  'db' => [
    'host' => 'localhost',
    'name' => 'davlet9z_ls',
    'user' => 'davlet9z_ls',
    'pass' => 'Sanitar2.0',
  ],
  'smtp' => [
    'host' => 'smtp.beget.com',
    'port' => 465,
    'secure' => 'ssl', // 465 = SSL
    'user' => 'noreply@mgno1.ru',
    'pass' => 'Scissors1991@',
    'from_email' => 'noreply@mgno1.ru',
    'from_name'  => 'LIDON — лидеры сферы',
  ],
  'app' => [
    'base_url' => 'https://mgno1.ru',
    'verify_ttl' => 3600,
    'reset_ttl'  => 3600,
  ],
];