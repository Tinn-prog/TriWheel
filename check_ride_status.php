<?php
require 'db.php';

if (isset($_GET['ride_id'])) {
    $rideId = intval($_GET['ride_id']);
    
    $stmt = $conn->prepare("SELECT status FROM rides WHERE id = ?");
    $stmt->bind_param("i", $rideId);
    $stmt->execute();
    $result = $stmt->get_result()->fetch_assoc();
    
    header('Content-Type: application/json');
    echo json_encode(['status' => $result['status'] ?? 'unknown']);
    exit;
}