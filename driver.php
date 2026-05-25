<?php
session_start();
require 'db.php';

ini_set('display_errors', '0');
ini_set('display_startup_errors', '0');
error_reporting(0);
$statusUpdateError = '';

/* ===== AUTH CHECK ===== */
if (!isset($_SESSION['user_id']) || $_SESSION['user_role'] !== 'driver') {
    header("Location: login.php");
    exit;
}

$rideCancelled = false;

/* ===== HANDLE STATUS UPDATE ===== */
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['status'])) {
    $status = $_POST['status'];

    $approvalStmt = $conn->prepare("SELECT approval_status FROM drivers WHERE user_id = ?");
    $approvalStmt->bind_param("i", $_SESSION['user_id']);
    $approvalStmt->execute();
    $approvalStatusRow = $approvalStmt->get_result()->fetch_assoc();
    $approvalStmt->close();

    $driverApprovalStatus = $approvalStatusRow['approval_status'] ?? 'pending';
    if ($driverApprovalStatus !== 'approved') {
        $statusUpdateError = 'Your account must be approved by an admin before you can go online.';
    } else {
        $update = $conn->prepare(
            "UPDATE drivers SET status = ? WHERE user_id = ?"
        );
        $update->bind_param("si", $status, $_SESSION['user_id']);
        $update->execute();

        header("Location: driver.php");
        exit;
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['clear_history'])) {
    $driverIdStmt = $conn->prepare("SELECT id FROM drivers WHERE user_id = ?");
    $driverIdStmt->bind_param("i", $_SESSION['user_id']);
    $driverIdStmt->execute();
    $driverIdData = $driverIdStmt->get_result()->fetch_assoc();
    $driverIdStmt->close();

    if ($driverIdData) {
        $clearStmt = $conn->prepare("DELETE FROM rides WHERE driver_id = ? AND status IN ('completed', 'cancelled')");
        $clearStmt->bind_param("i", $driverIdData['id']);
        $clearStmt->execute();
    }

    header("Location: driver.php");
    exit;
}

/* ===== HANDLE RIDE ACCEPTANCE ===== */
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['accept_ride'])) {
    $rideId = $_POST['accept_ride'];
    
    // First, get driver's ID
    $driverIdStmt = $conn->prepare("SELECT id FROM drivers WHERE user_id = ?");
    $driverIdStmt->bind_param("i", $_SESSION['user_id']);
    $driverIdStmt->execute();
    $driverResult = $driverIdStmt->get_result();
    $driverData = $driverResult->fetch_assoc();
    
    if ($driverData) {
        // Accept the ride
        $acceptStmt = $conn->prepare("
            UPDATE rides 
            SET driver_id = ?, status = 'accepted'
            WHERE id = ? AND status = 'requested'
        ");
        $acceptStmt->bind_param("ii", $driverData['id'], $rideId);
        $acceptStmt->execute();
        
        header("Location: driver.php");
        exit;
    }
}

/* ===== HANDLE START RIDE ===== */
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['start_ride'])) {
    $rideId = $_POST['start_ride'];
    
    $startStmt = $conn->prepare("
        UPDATE rides 
        SET status = 'ongoing'
        WHERE id = ? AND driver_id = (SELECT id FROM drivers WHERE user_id = ?)
    ");
    $startStmt->bind_param("ii", $rideId, $_SESSION['user_id']);
    $startStmt->execute();
    
    header("Location: driver.php");
    exit;
}

/* ===== HANDLE CANCEL RIDE ===== */
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['cancel_ride'])) {
    $rideId = $_POST['cancel_ride'];
    
    $cancelStmt = $conn->prepare("
        UPDATE rides
        SET status = 'cancelled', driver_id = NULL
        WHERE id = ? AND driver_id = (SELECT id FROM drivers WHERE user_id = ?)
    ");
    $cancelStmt->bind_param("ii", $rideId, $_SESSION['user_id']);
    $cancelStmt->execute();
    
    header("Location: driver.php?ride_cancelled=1");
    exit;
}

/* ===== HELPER FUNCTIONS ===== */
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

/* ===== HANDLE COMPLETE RIDE ===== */
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['complete_ride'])) {
    $rideId = $_POST['complete_ride'];

    $distanceStmt = $conn->prepare("SELECT pickup_lat, pickup_lng, dropoff_lat, dropoff_lng FROM rides WHERE id = ? AND driver_id = (SELECT id FROM drivers WHERE user_id = ?)");
    $distanceStmt->bind_param("ii", $rideId, $_SESSION['user_id']);
    $distanceStmt->execute();
    $distanceData = $distanceStmt->get_result()->fetch_assoc();
    $distanceStmt->close();

    if ($distanceData && $distanceData['pickup_lat'] && $distanceData['pickup_lng'] && $distanceData['dropoff_lat'] && $distanceData['dropoff_lng']) {
        $distanceKm = calculateDistanceKm($distanceData['pickup_lat'], $distanceData['pickup_lng'], $distanceData['dropoff_lat'], $distanceData['dropoff_lng']);
        $fare = calculateFare($distanceKm);
    } else {
        $fare = 10.00;
    }
    
    $completeStmt = $conn->prepare("
        UPDATE rides 
        SET status = 'completed', fare = ?
        WHERE id = ? AND driver_id = (SELECT id FROM drivers WHERE user_id = ?)
    ");
    $completeStmt->bind_param("dii", $fare, $rideId, $_SESSION['user_id']);
    $completeStmt->execute();
    
    header("Location: driver.php");
    exit;
}

if (isset($_GET['ride_cancelled']) && $_GET['ride_cancelled'] === '1') {
    $rideCancelled = true;
}

/* ===== FETCH DRIVER & VEHICLE INFO ===== */
$stmt = $conn->prepare("
    SELECT 
        d.license_number,
        d.phone,
        d.status,
        d.approval_status,
        v.vehicle_type,
        v.plate_number,
        v.color
    FROM drivers d
    JOIN vehicles v ON d.id = v.driver_id
    WHERE d.user_id = ?
");
$stmt->bind_param("i", $_SESSION['user_id']);
$stmt->execute();
$result = $stmt->get_result();
$driver = $result->fetch_assoc();
$driverApprovalStatus = $driver['approval_status'] ?? 'pending';
$driverNotApproved = $driverApprovalStatus !== 'approved';

/* ===== FORCE DRIVER DETAILS ===== */
if (!$driver) {
    header("Location: driver_details.php");
    exit;
}

/* ===== CHECK FOR CURRENT DRIVER RIDE ===== */
$currentDriverRide = null;
$currentRideDistanceKm = null;
$currentRideAutoFare = null;
$requests = null;
$hasRequests = false;
$history = null;
$ratingSummary = null;
$driverIdStmt = $conn->prepare("SELECT id FROM drivers WHERE user_id = ?");
$driverIdStmt->bind_param("i", $_SESSION['user_id']);
$driverIdStmt->execute();
$driverIdResult = $driverIdStmt->get_result();
$driverIdData = $driverIdResult->fetch_assoc();

if ($driverIdData) {
    $rideStmt = $conn->prepare("
        SELECT r.*, u.name as passenger_name
        FROM rides r
        JOIN users u ON r.passenger_id = u.id
        WHERE r.driver_id = ?
        AND r.status IN ('accepted', 'ongoing')
        ORDER BY r.created_at DESC
        LIMIT 1
    ");
    $rideStmt->bind_param("i", $driverIdData['id']);
    $rideStmt->execute();
    $currentDriverRide = $rideStmt->get_result()->fetch_assoc();

    $currentRideDistanceKm = null;
    $currentRideAutoFare = null;
    if ($currentDriverRide && in_array($currentDriverRide['status'], ['accepted', 'ongoing'], true) && $currentDriverRide['pickup_lat'] && $currentDriverRide['pickup_lng'] && $currentDriverRide['dropoff_lat'] && $currentDriverRide['dropoff_lng']) {
        $currentRideDistanceKm = calculateDistanceKm($currentDriverRide['pickup_lat'], $currentDriverRide['pickup_lng'], $currentDriverRide['dropoff_lat'], $currentDriverRide['dropoff_lng']);
        $currentRideAutoFare = calculateFare($currentRideDistanceKm);
    }

    /* ===== FETCH RIDE REQUESTS ===== */
    $requestsStmt = $conn->prepare("\n        SELECT r.*, u.name as passenger_name\n        FROM rides r\n        JOIN users u ON r.passenger_id = u.id\n        JOIN (\n            SELECT passenger_id, MAX(id) AS ride_id\n            FROM rides\n            WHERE status = 'requested'\n            GROUP BY passenger_id\n        ) grouped_rides ON r.passenger_id = grouped_rides.passenger_id AND r.id = grouped_rides.ride_id\n        ORDER BY r.created_at DESC, r.id DESC\n    ");
    $requestsStmt->execute();
    $requests = $requestsStmt->get_result();
    $hasRequests = $requests && $requests->num_rows > 0;

    /* ===== FETCH RIDE HISTORY ===== */
    $historyStmt = $conn->prepare("\n        SELECT r.*, u.name as passenger_name\n        FROM rides r\n        JOIN users u ON r.passenger_id = u.id\n        WHERE r.driver_id = ?\n        ORDER BY r.created_at DESC\n        LIMIT 10\n    ");
    $historyStmt->bind_param("i", $driverIdData['id']);
    $historyStmt->execute();
    $history = $historyStmt->get_result();

    /* ===== FETCH DRIVER RATING SUMMARY ===== */
    $ratingSummaryStmt = $conn->prepare(
        "SELECT COUNT(*) AS total_ratings, AVG(CASE rating WHEN 'good' THEN 5 WHEN 'satisfied' THEN 4 WHEN 'neutral' THEN 3 WHEN 'dissatisfied' THEN 2 WHEN 'bad' THEN 1 END) AS avg_rating_value FROM rides WHERE driver_id = ? AND rating IS NOT NULL"
    );
    $ratingSummaryStmt->bind_param("i", $driverIdData['id']);
    $ratingSummaryStmt->execute();
    $ratingSummary = $ratingSummaryStmt->get_result()->fetch_assoc();
    $ratingSummaryStmt->close();
}

function formatRideType($type) {
    if ($type === 'motorcycle') {
        return 'Pedicab';
    }
    if ($type === 'car') {
        return 'E Trike';
    }
    return ucfirst($type);
}

function renderRatingStars($rating) {
    $map = [
        'good' => 5,
        'satisfied' => 4,
        'neutral' => 3,
        'dissatisfied' => 2,
        'bad' => 1,
    ];
    $count = $map[$rating] ?? 0;
    $filled = str_repeat('★', $count);
    $empty = str_repeat('☆', 5 - $count);
    return $filled . $empty;
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TriWheel - Driver Dashboard</title>
    
    <!-- External Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Montserrat:wght@700;800;900&display=swap" rel="stylesheet">
    
    <!-- Font Awesome Icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <!-- Leaflet CSS -->
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
    
    <!-- Custom Styles -->
    <link rel="stylesheet" href="style.css">
    
    <!-- Leaflet JS -->
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
</head>

<body>
    <!-- Navigation -->
    <nav class="navbar">
        <div class="nav-container">
            <div class="logo logo-header">
                <img src="logo-header.png" alt="TriWheel Logo" class="logo-img">
                <span class="logo-text">TriWheel</span>
            </div>
            <div class="hamburger" onclick="toggleSidebar()">
                <span></span>
                <span></span>
                <span></span>
            </div>
            <div class="nav-links desktop-only">
                <span class="user-greeting">Welcome, <strong><?php echo htmlspecialchars($_SESSION['user_name'] ?? 'Driver'); ?></strong></span>
                <a href="settings.php" class="btn-secondary" style="padding: 8px 16px; font-size: 0.9rem; margin-right: 10px;">
                    <i class="fas fa-cog"></i> Settings
                </a>
                <form action="logout.php" method="post" style="display: inline;">
                    <button type="submit" class="btn-secondary" style="padding: 8px 16px; font-size: 0.9rem;">
                        <i class="fas fa-sign-out-alt"></i> Logout
                    </button>
                </form>
            </div>
            <div class="sidebar" id="sidebar">
                <div class="sidebar-header">
                    <span class="close-btn" onclick="toggleSidebar()">&times;</span>
                </div>
                <div class="sidebar-content">
                    <div class="sidebar-logo">
                        <img src="logo.png" alt="TriWheel Logo" class="logo-img">
                        <span class="logo-text">TriWheel</span>
                    </div>
                    <span class="user-greeting">Welcome, <strong><?php echo htmlspecialchars($_SESSION['user_name'] ?? 'Driver'); ?></strong></span>
                    <a href="settings.php" class="sidebar-link">
                        <i class="fas fa-cog"></i> Settings
                    </a>
                    <form action="logout.php" method="post">
                        <button type="submit" class="sidebar-link logout-btn">
                            <i class="fas fa-sign-out-alt"></i> Logout
                        </button>
                    </form>
                </div>
            </div>
            <div class="sidebar-overlay" onclick="toggleSidebar()"></div>
        </div>
    </nav>

    <!-- Main Content -->
    <main class="dashboard-container">
        <div class="container">
            <!-- Header Section -->
            <div class="dashboard-header">
                <h1><i class="fas fa-id-card"></i> Driver Dashboard</h1>
                <p>Manage your rides and availability</p>
            </div>
            <?php if ($driverNotApproved): ?>
                <div style="margin-bottom:20px;padding:16px;border-radius:12px;background:#fff3cd;color:#664d03;border:1px solid #ffecb5;">
                    <strong>Verification status:</strong>
                    <?php echo ucfirst(htmlspecialchars($driverApprovalStatus)); ?>.
                    <?php if ($driverApprovalStatus === 'pending'): ?>
                        Your profile is under review by an admin. You will be able to go online once approved.
                    <?php else: ?>
                        Your account has been rejected. Please contact support or resubmit your driver details.
                    <?php endif; ?>
                </div>
            <?php endif; ?>

            <div class="dashboard-grid">
                <!-- Driver Status -->
                <div class="dashboard-card status-card">
                    <div class="card-header">
                        <h3><i class="fas fa-toggle-on"></i> Driver Status</h3>
                    </div>
                    <div class="card-content">
                        <div class="status-display <?php echo $driver['status']; ?>">
                            <div class="status-indicator">
                                <i class="fas fa-<?php echo $driver['status'] === 'online' ? 'check-circle' : 'times-circle'; ?>"></i>
                                <span><?php echo strtoupper($driver['status']); ?></span>
                            </div>
                            <p class="status-description">
                                <?php echo $driver['status'] === 'online' ? 'You are available to receive ride requests' : 'You are offline and not receiving ride requests'; ?>
                            </p>
                        </div>

                        <?php if (!empty($statusUpdateError)): ?>
                            <div style="background:#f8d7da;color:#842029;padding:12px;border-radius:10px;margin-bottom:12px;">
                                <?php echo htmlspecialchars($statusUpdateError); ?>
                            </div>
                        <?php endif; ?>

                        <form method="post" class="status-form">
                            <label for="status">
                                <i class="fas fa-toggle-on"></i> Change Status
                            </label>
                            <select id="status" name="status" <?php echo $driverNotApproved ? 'disabled' : ''; ?>>
                                <option value="online" <?php echo $driver['status'] === 'online' ? 'selected' : ''; ?>>
                                    🟢 Online (Available for rides)
                                </option>
                                <option value="offline" <?php echo $driver['status'] === 'offline' ? 'selected' : ''; ?>>
                                    🔴 Offline (Not available)
                                </option>
                            </select>
                            <button type="submit" class="btn-primary full-width" <?php echo $driverNotApproved ? 'disabled' : ''; ?>>
                                <i class="fas fa-save"></i> Update Status
                            </button>
                        </form>
                    </div>
                </div>

                <!-- Driver Info -->
                <div class="dashboard-card info-card">
                    <div class="card-header">
                        <h3><i class="fas fa-user-tie"></i> Driver Information</h3>
                    </div>
                    <div class="card-content">
                        <div class="driver-profile">
                            <div class="profile-section">
                                <h4><i class="fas fa-id-card"></i> Personal Details</h4>
                                <div class="info-grid">
                                    <div class="info-item">
                                        <span class="label">License Number:</span>
                                        <span class="value"><?php echo htmlspecialchars($driver['license_number']); ?></span>
                                    </div>
                                    <div class="info-item">
                                        <span class="label">Phone:</span>
                                        <span class="value"><?php echo htmlspecialchars($driver['phone']); ?></span>
                                    </div>
                                </div>
                            </div>

                            <div class="profile-section">
                                <h4><i class="fas fa-car"></i> Vehicle Details</h4>
                                <div class="info-grid">
                                    <div class="info-item">
                                        <span class="label">Type:</span>
                                        <span class="value"><?php echo htmlspecialchars($driver['vehicle_type']); ?></span>
                                    </div>
                                    <div class="info-item">
                                        <span class="label">Plate Number:</span>
                                        <span class="value"><?php echo htmlspecialchars($driver['plate_number']); ?></span>
                                    </div>
                                    <div class="info-item">
                                        <span class="label">Color:</span>
                                        <span class="value"><?php echo htmlspecialchars($driver['color']); ?></span>
                                    </div>
                                    <div class="info-item">
                                        <span class="label">Driver Rating:</span>
                                        <span class="value"><?php echo $ratingSummary && $ratingSummary['total_ratings'] ? round($ratingSummary['avg_rating_value'], 1) . ' / 5 (' . intval($ratingSummary['total_ratings']) . ' ratings)' : 'No ratings yet'; ?></span>
                                    </div>
                                    <div class="info-item">
                                        <span class="label">Verification:</span>
                                        <span class="value"><?php echo ucfirst(htmlspecialchars($driverApprovalStatus)); ?></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Current Ride -->
                <div class="dashboard-card ride-card">
                    <div class="card-header">
                        <h3><i class="fas fa-route"></i> Current Ride</h3>
                    </div>
                    <div class="card-content">
                        <?php if ($currentDriverRide): ?>
                            <div class="ride-status <?php echo $currentDriverRide['status']; ?>">
                                <div class="status-indicator">
                                    <i class="fas fa-<?php echo $currentDriverRide['status'] === 'accepted' ? 'clock' : ($currentDriverRide['status'] === 'ongoing' ? 'route' : 'question-circle'); ?>"></i>
                                    <span><?php echo strtoupper($currentDriverRide['status']); ?></span>
                                </div>
                                
                                <div class="ride-details">
                                    <div class="detail-row">
                                        <i class="fas fa-user"></i>
                                        <div>
                                            <strong>Passenger:</strong> <?php echo htmlspecialchars($currentDriverRide['passenger_name']); ?>
                                        </div>
                                    </div>
                                    <div class="detail-row">
                                        <i class="fas fa-map-marker-alt"></i>
                                        <div>
                                            <strong>Pickup:</strong> <?php echo htmlspecialchars($currentDriverRide['pickup_address']); ?>
                                        </div>
                                    </div>
                                    <div class="detail-row">
                                        <i class="fas fa-flag-checkered"></i>
                                        <div>
                                            <strong>Drop-off:</strong> <?php echo htmlspecialchars($currentDriverRide['dropoff_address']); ?>
                                        </div>
                                    </div>
                                    <div class="detail-row">
                                        <i class="fas fa-motorcycle"></i>
                                        <div>
                                            <strong>Ride Type:</strong> <?php echo htmlspecialchars(formatRideType($currentDriverRide['ride_type'])); ?>
                                        </div>
                                    </div>
                                    <div class="detail-row">
                                        <i class="fas fa-money-bill-wave"></i>
                                        <div>
                                            <strong>Estimated Fare:</strong> ₱<?php echo number_format($currentRideAutoFare !== null ? $currentRideAutoFare : 40.00, 2); ?>
                                        </div>
                                    </div>
                                </div>
                                
                                <?php if ($currentDriverRide['status'] === 'accepted'): ?>
                                    <?php if ($rideCancelled): ?>
                                        <div class="success-message">
                                            <i class="fas fa-check-circle"></i>
                                            Ride cancelled successfully.
                                        </div>
                                    <?php endif; ?>
                                    <div class="action-buttons">
                                        <form method="post" class="action-form">
                                            <input type="hidden" name="start_ride" value="<?php echo $currentDriverRide['id']; ?>">
                                            <button type="submit" class="btn-primary">
                                                <i class="fas fa-play"></i> Start Ride
                                            </button>
                                        </form>
                                        <form method="post" class="action-form">
                                            <input type="hidden" name="cancel_ride" value="<?php echo $currentDriverRide['id']; ?>">
                                            <button type="submit" class="btn-danger">
                                                <i class="fas fa-ban"></i> Cancel Ride
                                            </button>
                                        </form>
                                    </div>
                                <?php elseif ($currentDriverRide['status'] === 'ongoing'): ?>
                                    <form method="post" class="action-form">
                                        <input type="hidden" name="complete_ride" value="<?php echo $currentDriverRide['id']; ?>">
                                        <?php if ($currentRideDistanceKm !== null): ?>
                                            <div class="fare-input">
                                                <label>Distance (km):</label>
                                                <span><?php echo number_format($currentRideDistanceKm, 2); ?> km</span>
                                            </div>
                                        <?php endif; ?>
                                        <div class="fare-input">
                                            <label for="fare">Fare Amount (₱):</label>
                                            <input type="number" id="fare" step="0.01" min="0" value="<?php echo $currentRideAutoFare !== null ? number_format($currentRideAutoFare, 2) : '40.00'; ?>" readonly>
                                        </div>
                                        <button type="submit" class="btn-success full-width">
                                            <i class="fas fa-check"></i> Complete Ride
                                        </button>
                                    </form>
                                <?php endif; ?>
                            </div>
                        <?php else: ?>
                            <div class="no-ride">
                                <i class="fas fa-sleep"></i>
                                <p>No active ride</p>
                            </div>
                        <?php endif; ?>
                    </div>
                </div>

                <!-- Ride Requests -->
                <div class="dashboard-card requests-card">
                    <div class="card-header">
                        <h3><i class="fas fa-bell"></i> Ride Requests</h3>
                    </div>
                    <div class="card-content">
                        <?php if ($hasRequests): ?>
                            <div class="success-message">
                                <i class="fas fa-bell"></i>
                                New ride request(s) have arrived. Please check the request list below.
                            </div>
                        <?php endif; ?>
                        <?php if ($driver['status'] === 'online' && !$currentDriverRide): ?>
                            <?php if ($requests && $requests->num_rows > 0): ?>
                                <div class="requests-list">
                                    <?php while ($request = $requests->fetch_assoc()): ?>
                                        <div class="request-item">
                                            <div class="request-header">
                                                <div class="passenger-info">
                                                    <i class="fas fa-user"></i>
                                                    <span><?php echo htmlspecialchars($request['passenger_name']); ?></span>
                                                </div>
                                                <div class="request-time">
                                                    <i class="fas fa-clock"></i>
                                                    <span><?php echo date('h:i A', strtotime($request['created_at'])); ?></span>
                                                </div>
                                            </div>
                                            <div class="request-details">
                                                <div class="detail-row">
                                                    <i class="fas fa-map-marker-alt"></i>
                                                    <span><?php echo htmlspecialchars(substr($request['pickup_address'], 0, 25)); ?>...</span>
                                                </div>
                                                <div class="detail-row">
                                                    <i class="fas fa-arrow-right"></i>
                                                    <span><?php echo htmlspecialchars(substr($request['dropoff_address'], 0, 25)); ?>...</span>
                                                </div>
                                                <div class="detail-row">
                                                    <i class="fas fa-money-bill-wave"></i>
                                                    <span>
                                                        <?php
                                                            if (!empty($request['fare'])) {
                                                                echo '₱' . number_format($request['fare'], 2);
                                                            } elseif (!empty($request['pickup_lat']) && !empty($request['pickup_lng']) && !empty($request['dropoff_lat']) && !empty($request['dropoff_lng'])) {
                                                                $requestDistance = calculateDistanceKm($request['pickup_lat'], $request['pickup_lng'], $request['dropoff_lat'], $request['dropoff_lng']);
                                                                echo '₱' . number_format(calculateFare($requestDistance), 2);
                                                            } else {
                                                                echo '₱40.00';
                                                            }
                                                        ?>
                                                    </span>
                                                </div>
                                                <div class="ride-type">
                                                    <i class="fas fa-motorcycle"></i>
                                                    <span><?php echo htmlspecialchars(formatRideType($request['ride_type'])); ?></span>
                                                </div>
                                            </div>
                                            <form method="post" class="request-action">
                                                <input type="hidden" name="accept_ride" value="<?php echo $request['id']; ?>">
                                                <button type="submit" class="btn-primary">
                                                    <i class="fas fa-check"></i> Accept
                                                </button>
                                            </form>
                                        </div>
                                    <?php endwhile; ?>
                                </div>
                            <?php else: ?>
                                <div class="no-requests">
                                    <i class="fas fa-inbox"></i>
                                    <p>No ride requests at the moment</p>
                                    <small>Please wait for new requests...</small>
                                </div>
                            <?php endif; ?>
                        <?php elseif ($driver['status'] === 'offline'): ?>
                            <div class="offline-message">
                                <i class="fas fa-toggle-off"></i>
                                <p>You are offline</p>
                                <small>There are <?php echo $requests ? $requests->num_rows : 0; ?> request(s) waiting. Go online to accept them.</small>
                            </div>
                        <?php else: ?>
                            <div class="busy-message">
                                <i class="fas fa-route"></i>
                                <p>You have an active ride</p>
                                <small>There are <?php echo $requests ? $requests->num_rows : 0; ?> request(s) waiting. Complete your current ride to accept new ones.</small>
                            </div>
                        <?php endif; ?>
                    </div>
                </div>

                <!-- Live Map -->
                <div class="dashboard-card map-card">
                    <div class="card-header">
                        <h3><i class="fas fa-map-marked-alt"></i> Live Map</h3>
                    </div>
                    <div class="card-content">
                        <div id="map" class="map-container"></div>
                        <div class="map-legend">
                            <div class="legend-item">
                                <i class="fas fa-map-marker-alt" style="color: blue;"></i>
                                <span>Your Location</span>
                            </div>
                            <?php if ($currentDriverRide): ?>
                                <div class="legend-item">
                                    <i class="fas fa-map-marker-alt" style="color: green;"></i>
                                    <span>Pickup</span>
                                </div>
                                <div class="legend-item">
                                    <i class="fas fa-map-marker-alt" style="color: red;"></i>
                                    <span>Drop-off</span>
                                </div>
                            <?php endif; ?>
                        </div>
                    </div>
                </div>

                <!-- Ride History -->
                <div class="dashboard-card history-card">
                    <div class="card-header">
                        <h3><i class="fas fa-history"></i> Recent Rides</h3>
                        <form method="POST" style="display: inline;">
                            <button type="submit" name="clear_history" class="btn-secondary small" onclick="return confirm('Are you sure you want to clear completed and cancelled rides from history?')">
                                <i class="fas fa-trash"></i> Clear History
                            </button>
                        </form>
                    </div>
                    <div class="card-content">
                        <?php $historyCount = $history ? $history->num_rows : 0; ?>
                        <?php if ($historyCount > 0): ?>
                            <div class="history-wrapper">
                                <div class="ride-history">
                                    <?php while ($ride = $history->fetch_assoc()): ?>
                                    <div class="history-item clickable">
                                        <div class="history-header">
                                            <span class="ride-date"><?php echo date('M d, h:i A', strtotime($ride['created_at'])); ?></span>
                                            <span class="ride-status <?php echo $ride['status']; ?>">
                                                <?php echo ucfirst($ride['status']); ?>
                                            </span>
                                        </div>
                                        <div class="history-details">
                                            <div class="detail-row">
                                                <i class="fas fa-user"></i>
                                                <span><?php echo htmlspecialchars($ride['passenger_name']); ?></span>
                                            </div>
                                            <div class="detail-row">
                                                <i class="fas fa-map-marker-alt"></i>
                                                <span><?php echo htmlspecialchars(substr($ride['pickup_address'], 0, 20)); ?>...</span>
                                            </div>
                                            <div class="fare-amount">
                                                <strong><?php echo $ride['fare'] ? '₱' . number_format($ride['fare'], 2) : '--'; ?></strong>
                                            </div>
                                        </div>
                                        <div class="history-expanded">
                                            <div class="detail-row">
                                                <i class="fas fa-user"></i>
                                                <strong>Passenger:</strong>
                                                <span><?php echo htmlspecialchars($ride['passenger_name']); ?></span>
                                            </div>
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
                                            <div class="detail-row">
                                                <i class="fas fa-motorcycle"></i>
                                                <strong>Ride Type:</strong>
                                                <span><?php echo htmlspecialchars(formatRideType($ride['ride_type'])); ?></span>
                                            </div>
                                            <div class="detail-row">
                                                <i class="fas fa-money-bill-wave"></i>
                                                <strong>Fare:</strong>
                                                <span><?php echo $ride['fare'] ? '₱' . number_format($ride['fare'], 2) : '--'; ?></span>
                                            </div>
                                            <?php if ($ride['status'] === 'completed'): ?>
                                                <?php if ($ride['rating']): ?>
                                                    <div class="detail-row">
                                                        <i class="fas fa-star"></i>
                                                        <strong>Rating:</strong>
                                                        <span class="rating-badge <?php echo htmlspecialchars($ride['rating']); ?>" title="<?php echo ucfirst(htmlspecialchars($ride['rating'])); ?>">
                                                            <?php echo renderRatingStars($ride['rating']); ?>
                                                        </span>
                                                    </div>
                                                <?php else: ?>
                                                    <div class="detail-row">
                                                        <i class="fas fa-star"></i>
                                                        <strong>Rating:</strong>
                                                        <span>Not rated yet</span>
                                                    </div>
                                                <?php endif; ?>
                                            <?php endif; ?>
                                        </div>
                                    </div>
                                <?php endwhile; ?>
                            </div>
                        <?php else: ?>
                            <div class="no-history">
                                <i class="fas fa-inbox"></i>
                                <p>No ride history yet</p>
                            </div>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <!-- Auto-refresh script -->
    <script>
        // Auto-refresh if driver is online and has no active ride
        <?php if ($driver['status'] === 'online' && !$currentDriverRide): ?>
        setTimeout(function() {
            location.reload();
        }, 10000); // Refresh every 10 seconds
        <?php endif; ?>
    </script>

    <!-- ===== MAP SCRIPT ===== -->
    <script>
        // Initialize map (default Manila)
        const map = L.map('map').setView([14.5995, 120.9842], 13);
        
        // Load OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);
        
        let driverMarker = null;
        
        function updateDriverLocation(lat, lng) {
            if (!driverMarker) {
                driverMarker = L.marker([lat, lng], {
                    icon: L.icon({
                        iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
                        iconSize: [25, 41],
                        iconAnchor: [12, 41],
                        popupAnchor: [1, -34]
                    })
                }).addTo(map);
                driverMarker.bindPopup("<b>Your Location</b><br>Driver: <?php echo htmlspecialchars($_SESSION['user_name'] ?? 'Driver'); ?>").openPopup();
            } else {
                driverMarker.setLatLng([lat, lng]);
            }
            map.setView([lat, lng], 15);
        }
        
        function trackDriver() {
            if (!navigator.geolocation) {
                alert("Geolocation not supported");
                return;
            }
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    updateDriverLocation(
                        position.coords.latitude,
                        position.coords.longitude
                    );
                    
                    // Optional: Send location to server (for real-time tracking)
                    <?php if ($currentDriverRide): ?>
                    // If on a ride, you could send location to server
                    fetch('update_location.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                            ride_id: <?php echo $currentDriverRide['id'] ?? 0; ?>
                        })
                    });
                    <?php endif; ?>
                },
                () => {
                    console.log("Location access denied - showing default location");
                    // Still show default location even if permission denied
                    updateDriverLocation(14.5995, 120.9842);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 0
                }
            );
        }
        
        // Initial location
        trackDriver();
        
        // Update location every 5 seconds
        setInterval(trackDriver, 5000);
        
        // Add pickup and dropoff markers if on a ride
        <?php if ($currentDriverRide): ?>
        // Pickup marker
        const pickupMarker = L.marker(
            [<?php echo $currentDriverRide['pickup_lat'] ?: '14.5995'; ?>, <?php echo $currentDriverRide['pickup_lng'] ?: '120.9842'; ?>], 
            {
                icon: L.icon({
                    iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
                    iconSize: [25, 41]
                })
            }
        ).addTo(map);
        pickupMarker.bindPopup("<b>Pickup Location</b><br><?php echo htmlspecialchars($currentDriverRide['pickup_address']); ?>");
        
        // Dropoff marker
        const dropoffMarker = L.marker(
            [<?php echo $currentDriverRide['dropoff_lat'] ?: '14.6091'; ?>, <?php echo $currentDriverRide['dropoff_lng'] ?: '121.0223'; ?>], 
            {
                icon: L.icon({
                    iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
                    iconSize: [25, 41]
                })
            }
        ).addTo(map);
        dropoffMarker.bindPopup("<b>Destination</b><br><?php echo htmlspecialchars($currentDriverRide['dropoff_address']); ?>");
        
        // Draw route line 
        const routeLine = L.polyline([
            [<?php echo $currentDriverRide['pickup_lat'] ?: '14.5995'; ?>, <?php echo $currentDriverRide['pickup_lng'] ?: '120.9842'; ?>],
            [<?php echo $currentDriverRide['dropoff_lat'] ?: '14.6091'; ?>, <?php echo $currentDriverRide['dropoff_lng'] ?: '121.0223'; ?>]
        ], {color: 'blue', weight: 3, opacity: 0.7}).addTo(map);
        
        // Fit map to show all markers
        const bounds = L.latLngBounds([
            [<?php echo $currentDriverRide['pickup_lat'] ?: '14.5995'; ?>, <?php echo $currentDriverRide['pickup_lng'] ?: '120.9842'; ?>],
            [<?php echo $currentDriverRide['dropoff_lat'] ?: '14.6091'; ?>, <?php echo $currentDriverRide['dropoff_lng'] ?: '121.0223'; ?>]
        ]);
        map.fitBounds(bounds);
        <?php endif; ?>

        // Mobile sidebar toggle
        function toggleSidebar() {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.querySelector('.sidebar-overlay');
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        }

        // Expand recent ride details on click
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


