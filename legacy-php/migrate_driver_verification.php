<?php
require 'db.php';
header('Content-Type: text/plain; charset=utf-8');

$columns = [
    'license_file' => "VARCHAR(255) DEFAULT NULL",
    'toda_id_file' => "VARCHAR(255) DEFAULT NULL",
    'approval_status' => "ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending'"
];

foreach ($columns as $column => $definition) {
    $check = $conn->query("SHOW COLUMNS FROM drivers LIKE '$column'");
    if (!$check) {
        echo "Error checking column $column: " . $conn->error . "\n";
        continue;
    }

    if ($check->num_rows === 0) {
        $alter = $conn->query("ALTER TABLE drivers ADD COLUMN $column $definition");
        if ($alter) {
            echo "Added column $column\n";
        } else {
            echo "Failed to add column $column: " . $conn->error . "\n";
        }
    } else {
        echo "Column $column already exists\n";
    }
}

$conn->close();
