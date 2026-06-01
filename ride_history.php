<?php
require 'auth.php';
require 'db.php';
require 'system_helpers.php';

if (!isset($_SESSION['user_id'])) {
    header("Location: login.php");
    exit;
}

if (!in_array($_SESSION['user_role'], ['passenger', 'driver'])) {
    header("Location: login.php");
    exit;
}

require_valid_csrf();

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['clear_history']) && $_SESSION['user_role'] === 'passenger') {
    $clearStmt = $conn->prepare("UPDATE rides SET hidden_for_passenger = 1 WHERE passenger_id = ? AND status IN ('completed', 'cancelled')");
    $clearStmt->bind_param("i", $_SESSION['user_id']);
    $clearStmt->execute();
    header("Location: ride_history.php");
    exit;
}

header('Content-Type: text/html; charset=utf-8');

if ($_SESSION['user_role'] === 'passenger') {
    $stmt = $conn->prepare("
        SELECT r.*, 
               du.name as driver_name,
               d.phone as driver_phone,
               v.vehicle_type
        FROM rides r
        LEFT JOIN drivers d ON r.driver_id = d.id
        LEFT JOIN users du ON d.user_id = du.id
        LEFT JOIN vehicles v ON d.id = v.driver_id
        WHERE r.passenger_id = ? AND r.status IN ('completed', 'cancelled') AND r.hidden_for_passenger = 0
        ORDER BY r.created_at DESC
        LIMIT 50
    ");
    $stmt->bind_param("i", $_SESSION['user_id']);
} else {
    $stmt = $conn->prepare("
        SELECT r.*, 
               u.name as passenger_name,
               u.email as passenger_email
        FROM rides r
        LEFT JOIN users u ON r.passenger_id = u.id
        WHERE r.driver_id = (SELECT id FROM drivers WHERE user_id = ?) AND r.status IN ('completed', 'cancelled')
        ORDER BY r.created_at DESC
        LIMIT 50
    ");
    $stmt->bind_param("i", $_SESSION['user_id']);
}

$stmt->execute();
$rides = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ride History - TriWheel</title>
    <link rel="stylesheet" href="style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="app-dashboard <?php echo $_SESSION['user_role'] === 'passenger' ? 'app-passenger' : 'app-driver'; ?>">
    <?php require 'navbar.php'; ?>
    
    <div class="dashboard-container">
        <div class="container">
            <div class="dashboard-header">
                <h1><i class="fas fa-history"></i> Ride History</h1>
                <p>View your completed and cancelled rides</p>
            </div>

            <div class="dashboard-card history-card">
                <div class="card-header">
                    <h3><i class="fas fa-history"></i> Ride History</h3>
                    <?php if ($_SESSION['user_role'] === 'passenger'): ?>
                    <form method="POST" style="display: inline;">
                        <?php echo csrf_input(); ?>
                        <button type="submit" name="clear_history" class="btn-secondary small" onclick="return confirm('Are you sure you want to hide completed and cancelled rides from your history?')">
                            <i class="fas fa-eye-slash"></i> Hide History
                        </button>
                    </form>
                    <?php endif; ?>
                </div>
                <div class="card-content">
                    <?php if (empty($rides)): ?>
                        <div class="no-history">
                            <i class="fas fa-inbox"></i>
                            <p>No ride history yet.</p>
                        </div>
                    <?php else: ?>
                        <div class="history-wrapper">
                        <?php foreach ($rides as $ride): ?>
                        <div class="history-item clickable">
                            <div class="history-header">
                                <span class="ride-date"><?php echo date('M d, h:i A', strtotime($ride['created_at'])); ?></span>
                                <span class="ride-status <?php echo $ride['status']; ?>">
                                    <?php echo ucfirst($ride['status']); ?>
                                </span>
                            </div>
                            <div class="history-details">
                                <div class="detail-row">
                                    <i class="fas fa-map-marker-alt"></i>
                                    <span><?php echo htmlspecialchars(substr($ride['pickup_address'], 0, 30)); ?>...</span>
                                </div>
                                <div class="detail-row">
                                    <i class="fas fa-arrow-right"></i>
                                    <span><?php echo htmlspecialchars(substr($ride['dropoff_address'], 0, 30)); ?>...</span>
                                </div>
                                <div class="fare-amount">
                                    <strong><?php echo $ride['fare'] ? '₱' . number_format($ride['fare'], 2) : '--'; ?></strong>
                                </div>
                            </div>
                            <div class="history-expanded">
                                <div class="detail-row">
                                    <i class="fas fa-motorcycle"></i>
                                    <strong>Ride Type:</strong>
                                    <span><?php echo htmlspecialchars($ride['ride_type']); ?></span>
                                </div>
                                <?php if ($_SESSION['user_role'] === 'passenger'): ?>
                                <div class="detail-row">
                                    <i class="fas fa-user"></i>
                                    <strong>Driver:</strong>
                                    <span><?php echo htmlspecialchars($ride['driver_name'] ?? 'N/A'); ?></span>
                                </div>
                                <div class="detail-row">
                                    <i class="fas fa-phone"></i>
                                    <strong>Driver Phone:</strong>
                                    <span><?php echo htmlspecialchars($ride['driver_phone'] ?? '--'); ?></span>
                                </div>
                                <?php else: ?>
                                <div class="detail-row">
                                    <i class="fas fa-user"></i>
                                    <strong>Passenger:</strong>
                                    <span><?php echo htmlspecialchars($ride['passenger_name'] ?? 'N/A'); ?></span>
                                </div>
                                <?php endif; ?>
                                <div class="detail-row">
                                    <i class="fas fa-map-marker-alt"></i>
                                    <strong>Pickup:</strong>
                                    <span><?php echo htmlspecialchars($ride['pickup_address']); ?></span>
                                </div>
                                <div class="detail-row">
                                    <i class="fas fa-flag-checkered"></i>
                                    <strong>Drop-off:</strong>
                                    <span><?php echo htmlspecialchars($ride['dropoff_address']); ?></span>
                                </div>
                            </div>
                        </div>
                        <?php endforeach; ?>
                        </div>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    </div>
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            document.querySelectorAll('.history-item.clickable').forEach(item => {
                item.addEventListener('click', () => {
                    item.classList.toggle('open');
                });
            });
        });
    </script>
</body>
</html>
