<?php
declare(strict_types=1);

// ПУТИ К PHPMailer — поправь под себя
require_once __DIR__ . '/vendor/PHPMailer/Exception.php';
require_once __DIR__ . '/vendor/PHPMailer/PHPMailer.php';
require_once __DIR__ . '/vendor/PHPMailer/SMTP.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

function mailer(array $CONFIG): PHPMailer {
  $m = new PHPMailer(true);
  $m->CharSet = 'UTF-8';
  $m->isSMTP();
  $m->Host       = $CONFIG['smtp']['host'];
  $m->SMTPAuth   = true;
  $m->Username   = $CONFIG['smtp']['user'];
  $m->Password   = $CONFIG['smtp']['pass'];
  $m->Port       = (int)$CONFIG['smtp']['port'];
  $m->SMTPSecure = $CONFIG['smtp']['secure']; // 'ssl' для 465
  $m->setFrom($CONFIG['smtp']['from_email'], $CONFIG['smtp']['from_name']);
  return $m;
}

function send_mail(array $CONFIG, string $toEmail, string $toName, string $subject, string $html, string $text = ''): void {
  $m = mailer($CONFIG);
  $m->addAddress($toEmail, $toName ?: $toEmail);
  $m->Subject = $subject;
  $m->isHTML(true);
  $m->Body = $html;
  $m->AltBody = $text ?: strip_tags($html);
  $m->send();
}
