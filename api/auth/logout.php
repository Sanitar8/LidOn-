<?php
declare(strict_types=1);
require_once __DIR__ . '/../_bootstrap.php';

require_post();

$_SESSION = [];
if (ini_get("session.use_cookies")) {
  $params = session_get_cookie_params();
  setcookie(session_name(), '', time() - 42000,
    $params["path"], $params["domain"],
    (bool)$params["secure"], (bool)$params["httponly"]
  );
}
session_destroy();

json_ok(['message' => 'Logged out']);
