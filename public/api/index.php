<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'];
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

$path = preg_replace('#^/api#', '', $uri);

$routes = [
    'POST /auth/register'   => __DIR__ . '/../../api/auth/register.php',
    'POST /auth/login'      => __DIR__ . '/../../api/auth/login.php',
    'POST /auth/forgot'     => __DIR__ . '/../../api/auth/forgot.php',
    'POST /auth/reset'      => __DIR__ . '/../../api/auth/reset.php',
    'GET /auth/verify'      => __DIR__ . '/../../api/auth/verify.php',
    'GET /auth/me'          => __DIR__ . '/../../api/auth/me.php',
    'POST /auth/logout'     => __DIR__ . '/../../api/auth/logout.php',

    'GET /geo/cities'       => __DIR__ . '/../../api/geo/cities.php',
    'GET /prof/professions' => __DIR__ . '/../../api/prof/professions.php',
    'GET /colleagues/my-chats' => __DIR__ . '/../../api/colleagues/my-chats.php',
];

$key = $method . ' ' . $path;

if (!isset($routes[$key])) {
    http_response_code(404);
    echo json_encode([
        'ok' => false,
        'error' => 'Route not found'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

require $routes[$key];