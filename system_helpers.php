<?php
function triwheel_table_exists(mysqli $conn, $tableName) {
    $stmt = $conn->prepare(
        "SELECT COUNT(*) AS total FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?"
    );
    $stmt->bind_param("s", $tableName);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    return intval($row['total'] ?? 0) > 0;
}

function triwheel_column_exists(mysqli $conn, $tableName, $columnName) {
    $stmt = $conn->prepare(
        "SELECT COUNT(*) AS total FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?"
    );
    $stmt->bind_param("ss", $tableName, $columnName);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    return intval($row['total'] ?? 0) > 0;
}

function triwheel_ensure_schema(mysqli $conn) {
    static $done = false;
    if ($done) {
        return;
    }
    $done = true;

    if (triwheel_table_exists($conn, 'rides')) {
        if (!triwheel_column_exists($conn, 'rides', 'hidden_for_passenger')) {
            $conn->query("ALTER TABLE rides ADD COLUMN hidden_for_passenger TINYINT(1) NOT NULL DEFAULT 0");
        }
        if (!triwheel_column_exists($conn, 'rides', 'hidden_for_driver')) {
            $conn->query("ALTER TABLE rides ADD COLUMN hidden_for_driver TINYINT(1) NOT NULL DEFAULT 0");
        }
    }

    if (triwheel_table_exists($conn, 'drivers')) {
        if (!triwheel_column_exists($conn, 'drivers', 'rejection_reason')) {
            $conn->query("ALTER TABLE drivers ADD COLUMN rejection_reason VARCHAR(255) NULL");
        }
        if (!triwheel_column_exists($conn, 'drivers', 'queue_position')) {
            $conn->query("ALTER TABLE drivers ADD COLUMN queue_position INT NULL");
        }
    }

    if (triwheel_table_exists($conn, 'rides')) {
        if (!triwheel_column_exists($conn, 'rides', 'terminal')) {
            $conn->query("ALTER TABLE rides ADD COLUMN terminal VARCHAR(50) NULL");
        }
    }

    $conn->query(
        "CREATE TABLE IF NOT EXISTS admin_audit_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            admin_user_id INT NOT NULL,
            action VARCHAR(80) NOT NULL,
            target_type VARCHAR(40) NOT NULL,
            target_id INT NOT NULL,
            details TEXT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_admin_audit_created_at (created_at),
            INDEX idx_admin_audit_target (target_type, target_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );
}

function triwheel_detect_terminal($address) {
    $address = strtolower(trim($address));
    if ($address === '') {
        return null;
    }

    if (strpos($address, 'tricycle terminal') !== false || strpos($address, 'tricycle') !== false) {
        return 'tricycle';
    }
    if (strpos($address, 'pedicab terminal') !== false || strpos($address, 'pedicab') !== false) {
        return 'pedicab';
    }
    if (strpos($address, 'terminal') !== false) {
        return 'terminal';
    }

    return null;
}

function triwheel_log_admin_action(mysqli $conn, $action, $targetType, $targetId, $details = '') {
    if (!triwheel_table_exists($conn, 'admin_audit_logs')) {
        return;
    }

    $adminUserId = intval($_SESSION['user_id'] ?? 0);
    $targetId = intval($targetId);
    $stmt = $conn->prepare(
        "INSERT INTO admin_audit_logs (admin_user_id, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?)"
    );
    $stmt->bind_param("issis", $adminUserId, $action, $targetType, $targetId, $details);
    $stmt->execute();
    $stmt->close();
}

function calculateDistanceKm($lat1, $lng1, $lat2, $lng2) {
    $earthRadius = 6371;
    $latFrom = deg2rad($lat1);
    $lonFrom = deg2rad($lng1);
    $latTo = deg2rad($lat2);
    $lonTo = deg2rad($lng2);

    $latDelta = $latTo - $latFrom;
    $lonDelta = $lonTo - $lonFrom;

    $a = sin($latDelta / 2) * sin($latDelta / 2) + cos($latFrom) * cos($latTo) * sin($lonDelta / 2) * sin($lonDelta / 2);
    $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

    return $earthRadius * $c;
}

function calculateFare($distanceKm) {
    $baseFare = 10.00;
    $perKmRate = 12.00;
    $fare = $baseFare + ($distanceKm * $perKmRate);

    return round(max($fare, $baseFare), 2);
}

function triwheel_location_coordinates($address) {
    $address = strtolower(trim($address));
    $knownLocations = [
        'itech building' => [14.5987, 120.9848],
        'cea building' => [14.5979, 120.9855],
        'pup main' => [14.5981, 120.9870],
        'tricycle terminal' => [14.6070, 120.9890],
        'pedicab terminal' => [14.6048, 120.9862],
        'city hall' => [14.5995, 120.9842],
        'market' => [14.6042, 120.9822],
        'terminal' => [14.6070, 120.9890],
        'school' => [14.6025, 120.9915],
        'hospital' => [14.6091, 121.0223],
        'barangay hall' => [14.5968, 120.9878],
        'church' => [14.5908, 120.9812],
        'plaza' => [14.5998, 120.9850],
    ];

    foreach ($knownLocations as $keyword => $coordinates) {
        if (strpos($address, $keyword) !== false) {
            return $coordinates;
        }
    }

    if ($address === '') {
        return [14.5995, 120.9842];
    }

    $hash = crc32($address);
    $latOffset = (($hash % 2000) - 1000) / 100000;
    $lngOffset = ((intval($hash / 2000) % 2000) - 1000) / 100000;

    return [14.5995 + $latOffset, 120.9842 + $lngOffset];
}

/**
 * Admin Dashboard Helper Functions
 */

function admin_get_platform_stats(mysqli $conn) {
    $stats = [
        'total' => 0,
        'completed' => 0,
        'revenue' => 0.00,
        'cancelled' => 0
    ];

    $stmt = $conn->prepare("SELECT COUNT(*) AS total FROM rides");
    $stmt->execute();
    $stats['total'] = $stmt->get_result()->fetch_assoc()['total'] ?? 0;
    $stmt->close();

    $stmt = $conn->prepare("SELECT COUNT(*) AS completed FROM rides WHERE status = 'completed'");
    $stmt->execute();
    $stats['completed'] = $stmt->get_result()->fetch_assoc()['completed'] ?? 0;
    $stmt->close();

    $stmt = $conn->prepare("SELECT IFNULL(SUM(fare), 0) AS revenue FROM rides WHERE status = 'completed'");
    $stmt->execute();
    $stats['revenue'] = $stmt->get_result()->fetch_assoc()['revenue'] ?? 0.00;
    $stmt->close();

    $stmt = $conn->prepare("SELECT COUNT(*) AS cancelled FROM rides WHERE status = 'cancelled'");
    $stmt->execute();
    $stats['cancelled'] = $stmt->get_result()->fetch_assoc()['cancelled'] ?? 0;
    $stmt->close();

    return $stats;
}

function admin_get_30_day_ride_report(mysqli $conn) {
    $stmt = $conn->prepare(
        "SELECT
            COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed_rides,
            COUNT(CASE WHEN status = 'cancelled' THEN 1 END) AS cancelled_rides,
            COALESCE(SUM(CASE WHEN status = 'completed' THEN fare ELSE 0 END), 0) AS total_fare,
            COALESCE(AVG(CASE rating WHEN 'good' THEN 5 WHEN 'satisfied' THEN 4 WHEN 'neutral' THEN 3 WHEN 'dissatisfied' THEN 2 WHEN 'very_dissatisfied' THEN 1 WHEN 'bad' THEN 1 END), 0) AS avg_rating
         FROM rides
         WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)"
    );
    $stmt->execute();
    $report = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    return $report;
}

function admin_get_top_drivers_last_30_days(mysqli $conn, $limit = 3) {
    $stmt = $conn->prepare(
        "SELECT u.name, COUNT(r.id) AS completed_rides
         FROM rides r
         JOIN drivers d ON d.id = r.driver_id
         JOIN users u ON u.id = d.user_id
         WHERE r.status = 'completed' AND r.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
         GROUP BY d.id, u.name
         ORDER BY completed_rides DESC, u.name ASC
         LIMIT ?"
    );
    $stmt->bind_param("i", $limit);
    $stmt->execute();
    $result = $stmt->get_result();
    $stmt->close();
    return $result;
}

function admin_get_driver_status_counts(mysqli $conn) {
    $counts = ['online' => 0, 'offline' => 0];

    $stmt = $conn->prepare("SELECT status, COUNT(*) AS cnt FROM drivers GROUP BY status");
    $stmt->execute();
    $result = $stmt->get_result();
    while ($row = $result->fetch_assoc()) {
        $counts[$row['status']] = $row['cnt'];
    }
    $stmt->close();

    return $counts;
}

function admin_get_drivers_list(mysqli $conn, $limit = 8) {
    $stmt = $conn->prepare("
        SELECT u.name AS driver_name, d.status, v.vehicle_type, v.plate_number 
        FROM drivers d 
        JOIN users u ON u.id = d.user_id 
        LEFT JOIN vehicles v ON v.driver_id = d.id 
        ORDER BY FIELD(d.status, 'online', 'offline') ASC, u.name ASC 
        LIMIT ?
    ");
    $stmt->bind_param("i", $limit);
    $stmt->execute();
    return $stmt->get_result();
}

function admin_get_pending_requests(mysqli $conn, $limit = 10) {
    $stmt = $conn->prepare("
        SELECT r.id, r.created_at, r.pickup_address, r.dropoff_address, r.ride_type, p.name AS passenger_name 
        FROM rides r 
        JOIN users p ON p.id = r.passenger_id 
        JOIN (
            SELECT passenger_id, MAX(id) AS latest_request_id 
            FROM rides 
            WHERE status = 'requested' 
            GROUP BY passenger_id
        ) latest ON r.passenger_id = latest.passenger_id AND r.id = latest.latest_request_id 
        WHERE r.status = 'requested' 
        ORDER BY r.created_at DESC 
        LIMIT ?
    ");
    $stmt->bind_param("i", $limit);
    $stmt->execute();
    return $stmt->get_result();
}

function admin_get_average_rating(mysqli $conn) {
    $stmt = $conn->prepare(
        "SELECT COALESCE(AVG(CASE rating WHEN 'good' THEN 5 WHEN 'satisfied' THEN 4 WHEN 'neutral' THEN 3 WHEN 'dissatisfied' THEN 2 WHEN 'very_dissatisfied' THEN 1 WHEN 'bad' THEN 1 END), 0) AS avg_rating FROM rides WHERE rating IS NOT NULL"
    );
    $stmt->execute();
    return $stmt->get_result()->fetch_assoc()['avg_rating'] ?? 0;
}

function admin_get_peak_hours(mysqli $conn, $limit = 5) {
    $stmt = $conn->prepare("SELECT HOUR(created_at) AS hour, COUNT(*) AS cnt FROM rides GROUP BY hour ORDER BY cnt DESC LIMIT ?");
    $stmt->bind_param("i", $limit);
    $stmt->execute();
    $result = $stmt->get_result();
    $hours = [];
    while ($row = $result->fetch_assoc()) {
        $hours[] = $row;
    }
    $stmt->close();
    return $hours;
}

function admin_get_audit_logs(mysqli $conn, $limit = 6) {
    $stmt = $conn->prepare("
        SELECT a.action, a.target_type, a.target_id, a.details, a.created_at, u.name AS admin_name
        FROM admin_audit_logs a
        LEFT JOIN users u ON u.id = a.admin_user_id
        ORDER BY a.created_at DESC
        LIMIT ?
    ");
    $stmt->bind_param("i", $limit);
    $stmt->execute();
    return $stmt->get_result();
}

// ===== ERROR HANDLING & VALIDATION =====

/**
 * Safe database query execution with error handling
 * Returns result or null on error; logs to error_log
 * Usage: $result = triwheel_safe_query($conn, "SELECT * FROM users WHERE id = ?", "i", $userId);
 */
function triwheel_safe_query(mysqli $conn, $query, $types = "", ...$params) {
    try {
        if (!$conn) {
            throw new Exception("Database connection failed");
        }
        
        if (empty($types)) {
            // Simple query without parameters
            $result = $conn->query($query);
            if (!$result) {
                throw new Exception("Query failed: " . $conn->error);
            }
            return $result;
        }
        
        $stmt = $conn->prepare($query);
        if (!$stmt) {
            throw new Exception("Prepare failed: " . $conn->error);
        }
        
        if (!empty($params)) {
            $stmt->bind_param($types, ...$params);
        }
        
        if (!$stmt->execute()) {
            throw new Exception("Execute failed: " . $stmt->error);
        }
        
        return $stmt->get_result();
    } catch (Exception $e) {
        error_log("[TriWheel DB Error] " . $e->getMessage());
        return null;
    }
}

/**
 * Get safe data from result set with type checking
 * Usage: $name = triwheel_get_data($row, 'name', 'string', 'Unknown');
 */
function triwheel_get_data($row, $key, $type = 'string', $default = null) {
    if (!is_array($row) || !isset($row[$key])) {
        return $default;
    }
    
    $value = $row[$key];
    
    switch ($type) {
        case 'int':
        case 'integer':
            return intval($value) ?? $default;
        case 'float':
            return floatval($value) ?? $default;
        case 'bool':
        case 'boolean':
            return (bool) $value ?? $default;
        case 'string':
        default:
            return htmlspecialchars((string) $value) ?? $default;
    }
}

/**
 * Validate email format
 */
function triwheel_validate_email($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

/**
 * Validate phone number (basic pattern)
 */
function triwheel_validate_phone($phone) {
    return preg_match('/^[0-9+\-\s\(\)]{7,15}$/', $phone) === 1;
}

/**
 * Sanitize string input
 */
function triwheel_sanitize_string($input) {
    return htmlspecialchars(trim((string) $input), ENT_QUOTES, 'UTF-8');
}

/**
 * Return JSON response with consistent format
 * Usage: triwheel_json_response(true, "Success message", ['data' => $value]);
 */
function triwheel_json_response($success, $message = "", $data = []) {
    header('Content-Type: application/json');
    echo json_encode([
        'success' => (bool) $success,
        'message' => triwheel_sanitize_string($message),
        'data' => $data,
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    exit;
}

/**
 * Check if user has required role
 * Usage: if (!triwheel_check_role('admin')) { redirect to home; }
 */
function triwheel_check_role($role) {
    return isset($_SESSION['user_role']) && $_SESSION['user_role'] === $role;
}

/**
 * Check if user is authenticated
 */
function triwheel_is_authenticated() {
    return isset($_SESSION['user_id']) && isset($_SESSION['user_role']);
}

/**
 * Validate CSRF token
 * Usage: if (!triwheel_validate_csrf($_POST['csrf_token'])) { handle error; }
 */
function triwheel_validate_csrf($token) {
    if (!isset($_SESSION['csrf_token'])) {
        return false;
    }
    return hash_equals($_SESSION['csrf_token'], $token ?? '');
}

/**
 * Generate CSRF token
 */
function triwheel_generate_csrf() {
    if (!isset($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

?>
