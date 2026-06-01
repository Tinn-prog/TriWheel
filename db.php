<?php
$conn = new mysqli("localhost", "root", "", "triwheel_db");
ini_set('log_errors', '1');
$logsDir = sys_get_temp_dir() . '/triwheel_logs';
if (!is_dir($logsDir)) { mkdir($logsDir, 0700, true); }
ini_set('error_log', $logsDir . '/php-error.log');

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

$conn->set_charset("utf8mb4");
