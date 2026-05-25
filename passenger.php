<?php
session_start();
require 'db.php';

ini_set('display_errors', '0');
ini_set('display_startup_errors', '0');
error_reporting(0);

/* ===== AUTH CHECK ===== */
if (!isset($_SESSION['user_id']) || $_SESSION['user_role'] !== 'passenger') {
    header("Location: login.php");
    exit;
}

/* ===== HANDLE RIDE REQUEST ===== */
$rideRequested = false;
$rideCanceled = false;
$rideAlreadyActive = false;
$currentRide = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['request_ride'])) {
    // Prevent a passenger from requesting more than one active ride at a time
    $activeCheck = $conn->prepare("SELECT id FROM rides WHERE passenger_id = ? AND status IN ('requested', 'accepted', 'ongoing') LIMIT 1");
    $activeCheck->bind_param("i", $_SESSION['user_id']);
    $activeCheck->execute();
    $activeResult = $activeCheck->get_result();

    if ($activeResult->num_rows > 0) {
        $rideAlreadyActive = true;
    } else {
        $pickup = $_POST['pickup'];
        $dropoff = $_POST['dropoff'];
        $rideType = $_POST['ride_type'];
        
        $pickupLat = 14.5995;
        $pickupLng = 120.9842;
        $dropoffLat = 14.6091;
        $dropoffLng = 121.0223;
        
        $stmt = $conn->prepare("
            INSERT INTO rides (passenger_id, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, 
                              pickup_address, dropoff_address, ride_type, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'requested', NOW())
        ");
        $stmt->bind_param("iddddsss", $_SESSION['user_id'], $pickupLat, $pickupLng, 
                         $dropoffLat, $dropoffLng, $pickup, $dropoff, $rideType);
        
        if ($stmt->execute()) {
            header("Location: passenger.php?ride_requested=1");
            exit;
        }
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['cancel_ride'])) {
    $rideId = intval($_POST['cancel_ride']);
    $cancelStmt = $conn->prepare("UPDATE rides SET status = 'cancelled' WHERE id = ? AND passenger_id = ? AND status = 'requested'");
    $cancelStmt->bind_param("ii", $rideId, $_SESSION['user_id']);
    if ($cancelStmt->execute()) {
        header("Location: passenger.php?ride_cancelled=1");
        exit;
    }
}

if (isset($_GET['ride_requested']) && $_GET['ride_requested'] === '1') {
    $rideRequested = true;
}

if (isset($_GET['ride_cancelled']) && $_GET['ride_cancelled'] === '1') {
    $rideCanceled = true;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['rate_driver'])) {
    $rideId = intval($_POST['ride_id']);
    $rating = $_POST['rating'] ?? '';
    $allowedRatings = ['good', 'satisfied', 'neutral', 'dissatisfied', 'bad'];

    if (!in_array($rating, $allowedRatings, true)) {
        $error = "Please select a valid rating.";
    } else {
        $rateStmt = $conn->prepare(
            "UPDATE rides SET rating = ? WHERE id = ? AND passenger_id = ? AND status = 'completed' AND rating IS NULL"
        );
        $rateStmt->bind_param("sii", $rating, $rideId, $_SESSION['user_id']);
        if ($rateStmt->execute() && $rateStmt->affected_rows > 0) {
            $success = "Your rating has been recorded. Thank you for your feedback!";
        } else {
            $error = "Unable to submit rating. Please make sure the ride is completed and not already rated.";
        }
        $rateStmt->close();
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['clear_history'])) {
    $clearStmt = $conn->prepare("DELETE FROM rides WHERE passenger_id = ? AND status IN ('completed', 'cancelled')");
    $clearStmt->bind_param("i", $_SESSION['user_id']);
    $clearStmt->execute();
    header("Location: passenger.php");
    exit;
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

/* ===== CHECK FOR CURRENT RIDE ===== */
$stmt = $conn->prepare("
    SELECT r.*, 
           u.name as passenger_name,
           du.name as driver_name,
           d.phone as driver_phone,
           v.vehicle_type, v.plate_number, v.color
    FROM rides r
    LEFT JOIN users u ON r.passenger_id = u.id
    LEFT JOIN drivers d ON r.driver_id = d.id
    LEFT JOIN users du ON d.user_id = du.id
    LEFT JOIN vehicles v ON d.id = v.driver_id
    WHERE r.passenger_id = ? 
    AND r.status IN ('requested', 'accepted', 'ongoing')
    ORDER BY r.created_at DESC
    LIMIT 1
");
$stmt->bind_param("i", $_SESSION['user_id']);
$stmt->execute();
$currentRide = $stmt->get_result()->fetch_assoc();

$currentRideFare = null;
if ($currentRide) {
    if (!empty($currentRide['fare'])) {
        $currentRideFare = $currentRide['fare'];
    } elseif (!empty($currentRide['pickup_lat']) && !empty($currentRide['pickup_lng']) && !empty($currentRide['dropoff_lat']) && !empty($currentRide['dropoff_lng'])) {
        $distanceKm = calculateDistanceKm($currentRide['pickup_lat'], $currentRide['pickup_lng'], $currentRide['dropoff_lat'], $currentRide['dropoff_lng']);
        $currentRideFare = calculateFare($distanceKm);
    } else {
        $currentRideFare = 10.00;
    }
}

if ($rideRequested && !$currentRide) {
    $rideRequested = false;
}

if (isset($_GET['ajax']) && $_GET['ajax'] === 'ride_status') {
    header('Content-Type: application/json');
    echo json_encode([
        'status' => $currentRide ? $currentRide['status'] : null,
        'driver_name' => $currentRide['driver_name'] ?? null,
        'driver_phone' => $currentRide['driver_phone'] ?? null,
    ]);
    exit;
}

$rideCompletedNotification = false;
if (!$currentRide) {
    $completedRideStmt = $conn->prepare(
        "SELECT id FROM rides WHERE passenger_id = ? AND status = 'completed' AND rating IS NULL AND created_at >= DATE_SUB(NOW(), INTERVAL 30 MINUTE) ORDER BY created_at DESC LIMIT 1"
    );
    $completedRideStmt->bind_param("i", $_SESSION['user_id']);
    $completedRideStmt->execute();
    $completedRideResult = $completedRideStmt->get_result();
    if ($completedRideResult && $completedRideResult->num_rows > 0) {
        $rideCompletedNotification = true;
    }
    $completedRideStmt->close();
}

/* ===== FETCH RIDE HISTORY ===== */
$historyStmt = $conn->prepare("\n    SELECT r.*, d.phone as driver_phone, du.name as driver_name, v.vehicle_type, v.plate_number, v.color\n    FROM rides r\n    LEFT JOIN drivers d ON r.driver_id = d.id\n    LEFT JOIN users du ON d.user_id = du.id\n    LEFT JOIN vehicles v ON d.id = v.driver_id\n    WHERE r.passenger_id = ?\n    ORDER BY r.created_at DESC\n    LIMIT 10\n");
$historyStmt->bind_param("i", $_SESSION['user_id']);
$historyStmt->execute();
$history = $historyStmt->get_result();
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TriWheel - Passenger Dashboard</title>
    
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
                <span class="user-greeting">Welcome, <strong><?php echo htmlspecialchars($_SESSION['user_name'] ?? 'Passenger'); ?></strong></span>
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
                    <span class="user-greeting">Welcome, <strong><?php echo htmlspecialchars($_SESSION['user_name'] ?? 'Passenger'); ?></strong></span>
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
                <h1><i class="fas fa-user"></i> Passenger Dashboard</h1>
                <p>Book rides and track your journey</p>
            </div>

            <div class="dashboard-grid">
                <!-- Current Ride Status -->
                <div class="dashboard-card status-card">
                    <div class="card-header">
                        <h3><i class="fas fa-route"></i> Current Ride Status</h3>
                    </div>
                    <div class="card-content">
                        <?php if ($rideCompletedNotification): ?>
                            <div class="success-message">
                                <i class="fas fa-check-circle"></i>
                                Your ride has been completed. Thank you for riding with TriWheel!
                            </div>
                        <?php endif; ?>
                        <?php if ($currentRide): ?>
                            <div class="ride-status <?php echo $currentRide['status']; ?>">
                                <div class="status-indicator">
                                    <i class="fas fa-<?php echo $currentRide['status'] === 'requested' ? 'clock' : ($currentRide['status'] === 'accepted' ? 'check-circle' : ($currentRide['status'] === 'ongoing' ? 'route' : 'question-circle')); ?>"></i>
                                    <span><?php echo ucfirst($currentRide['status']); ?></span>
                                </div>
                                
                                <div class="ride-details">
                                    <div class="detail-row">
                                        <i class="fas fa-map-marker-alt"></i>
                                        <div>
                                            <strong>Pickup:</strong> <?php echo htmlspecialchars($currentRide['pickup_address']); ?>
                                        </div>
                                    </div>
                                    <div class="detail-row">
                                        <i class="fas fa-flag-checkered"></i>
                                        <div>
                                            <strong>Drop-off:</strong> <?php echo htmlspecialchars($currentRide['dropoff_address']); ?>
                                        </div>
                                    </div>
                                    <div class="detail-row">
                                        <i class="fas fa-motorcycle"></i>
                                        <div>
                                            <strong>Ride Type:</strong> <?php echo htmlspecialchars(formatRideType($currentRide['ride_type'])); ?>
                                        </div>
                                    </div>
                                    <div class="detail-row">
                                        <i class="fas fa-money-bill-wave"></i>
                                        <div>
                                            <strong>Estimated Fare:</strong> <?php echo '₱' . number_format($currentRideFare ?? 10.00, 2); ?>
                                        </div>
                                    </div>
                                    
                                    <?php if ($currentRide['status'] === 'accepted' || $currentRide['status'] === 'ongoing'): ?>
                                        <div class="driver-info">
                                            <h4><i class="fas fa-id-card"></i> Driver Information</h4>
                                            <div class="driver-details">
                                                <div class="detail-row">
                                                    <i class="fas fa-car"></i>
                                                    <div>
                                                        <strong>Vehicle:</strong> <?php echo htmlspecialchars($currentRide['vehicle_type']); ?>
                                                    </div>
                                                </div>
                                                <?php if (!empty($currentRide['driver_name'])): ?>
                                                    <div class="detail-row">
                                                        <i class="fas fa-user"></i>
                                                        <div>
                                                            <strong>Driver Name:</strong> <?php echo htmlspecialchars($currentRide['driver_name']); ?>
                                                        </div>
                                                    </div>
                                                <?php endif; ?>
                                                <div class="detail-row">
                                                    <i class="fas fa-hashtag"></i>
                                                    <div>
                                                        <strong>Plate:</strong> <?php echo htmlspecialchars($currentRide['plate_number']); ?>
                                                    </div>
                                                </div>
                                                <div class="detail-row">
                                                    <i class="fas fa-palette"></i>
                                                    <div>
                                                        <strong>Color:</strong> <?php echo htmlspecialchars($currentRide['color']); ?>
                                                    </div>
                                                </div>
                                                <div class="detail-row">
                                                    <i class="fas fa-phone"></i>
                                                    <div>
                                                        <strong>Driver Phone:</strong> <a href="tel:<?php echo htmlspecialchars($currentRide['driver_phone']); ?>"><?php echo htmlspecialchars($currentRide['driver_phone']); ?></a>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    <?php endif; ?>
                                    
                                    <?php if ($currentRide['status'] === 'requested'): ?>
                                        <div class="waiting-message">
                                            <i class="fas fa-spinner fa-spin"></i>
                                            Looking for available drivers...
                                        </div>
                                    <?php endif; ?>

                                    <?php if ($currentRide['status'] === 'requested'): ?>
                                        <form method="post" class="cancel-form">
                                            <input type="hidden" name="cancel_ride" value="<?php echo $currentRide['id']; ?>">
                                            <button type="submit" class="btn-danger full-width">
                                                <i class="fas fa-times-circle"></i> Cancel Ride
                                            </button>
                                        </form>
                                    <?php endif; ?>
                                </div>
                            </div>
                        <?php else: ?>
                            <div class="no-ride">
                                <i class="fas fa-sleep"></i>
                                <p>No active ride</p>
                            </div>
                        <?php endif; ?>
                    </div>
                </div>

                <!-- Book Ride Form -->
                <div class="dashboard-card booking-card">
                    <div class="card-header">
                        <h3><i class="fas fa-plus-circle"></i> Book a Ride</h3>
                    </div>
                    <div class="card-content">
                        <?php if ($rideRequested && !$currentRide): ?>
                            <div class="success-message">
                                <i class="fas fa-check-circle"></i>
                                Ride requested successfully! Waiting for driver...
                            </div>
                        <?php endif; ?>

                        <?php if ($rideAlreadyActive): ?>
                            <div class="error-message">
                                <i class="fas fa-exclamation-circle"></i>
                                You already have an active ride request. Cancel it before requesting a new one.
                            </div>
                        <?php endif; ?>

                        <?php if ($rideCanceled): ?>
                            <div class="success-message">
                                <i class="fas fa-check-circle"></i>
                                Your ride request has been cancelled.
                            </div>
                        <?php endif; ?>

                        <?php if (!$currentRide): ?>
                            <form method="post" class="booking-form">
                                <div class="form-group">
                                    <label for="pickup">
                                        <i class="fas fa-map-marker-alt"></i> Pickup Location
                                    </label>
                                    <input type="text" id="pickup" name="pickup" placeholder="Enter pickup address" required>
                                </div>

                                <div class="form-group">
                                    <label for="dropoff">
                                        <i class="fas fa-flag-checkered"></i> Drop-off Location
                                    </label>
                                    <input type="text" id="dropoff" name="dropoff" placeholder="Enter destination" required>
                                </div>

                                <div class="form-group">
                                    <label for="ride_type">
                                        <i class="fas fa-motorcycle"></i> Ride Type
                                    </label>
                                    <select id="ride_type" name="ride_type" required>
                                        <option value="tricycle">🚲 Tricycle</option>
                                        <option value="motorcycle">🏍️ Pedicab</option>
                                        <option value="car" disabled>🛺 E Trike (Unavailable)</option>
                                    </select>
                                </div>

                                <button type="submit" name="request_ride" class="btn-primary full-width">
                                    <i class="fas fa-search"></i> Request Ride
                                </button>
                            </form>
                        <?php else: ?>
                            <div class="info-message">
                                <i class="fas fa-info-circle"></i>
                                You already have an active ride. Please wait for it to complete.
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
                                <i class="fas fa-map-marker-alt" style="color: green;"></i>
                                <span>Your Location</span>
                            </div>
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
                                                <span><?php echo htmlspecialchars(formatRideType($ride['ride_type'])); ?></span>
                                            </div>
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
                                            <?php if ($ride['status'] === 'completed' && !$ride['rating']): ?>
                                                <form method="POST" class="rating-form" onclick="event.stopPropagation();">
                                                    <input type="hidden" name="ride_id" value="<?php echo intval($ride['id']); ?>">
                                                    <div class="rating-stars">
                                                        <input type="radio" id="rating-5-<?php echo intval($ride['id']); ?>" name="rating" value="good" required>
                                                        <label for="rating-5-<?php echo intval($ride['id']); ?>" title="Good">★</label>
                                                        <input type="radio" id="rating-4-<?php echo intval($ride['id']); ?>" name="rating" value="satisfied">
                                                        <label for="rating-4-<?php echo intval($ride['id']); ?>" title="Satisfied">★</label>
                                                        <input type="radio" id="rating-3-<?php echo intval($ride['id']); ?>" name="rating" value="neutral">
                                                        <label for="rating-3-<?php echo intval($ride['id']); ?>" title="Neutral">★</label>
                                                        <input type="radio" id="rating-2-<?php echo intval($ride['id']); ?>" name="rating" value="dissatisfied">
                                                        <label for="rating-2-<?php echo intval($ride['id']); ?>" title="Dissatisfied">★</label>
                                                        <input type="radio" id="rating-1-<?php echo intval($ride['id']); ?>" name="rating" value="bad">
                                                        <label for="rating-1-<?php echo intval($ride['id']); ?>" title="Bad">★</label>
                                                    </div>
                                                    <button type="submit" name="rate_driver" class="btn-secondary small">Submit Rating</button>
                                                </form>
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

    <!-- ===== MAP SCRIPT ===== -->
    <script>
        // Initialize map
        const map = L.map('map').setView([14.5995, 120.9842], 13);
        
        // Load OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);
        
        let passengerMarker = null;
        
        function updatePassengerLocation(lat, lng) {
            if (!passengerMarker) {
                passengerMarker = L.marker([lat, lng], {
                    icon: L.icon({
                        iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
                        iconSize: [25, 41],
                        iconAnchor: [12, 41],
                        popupAnchor: [1, -34]
                    })
                }).addTo(map);
                passengerMarker.bindPopup("<b>Your Location</b>").openPopup();
            } else {
                passengerMarker.setLatLng([lat, lng]);
            }
            map.setView([lat, lng], 15);
        }
        
        function trackPassenger() {
            if (!navigator.geolocation) {
                alert("Geolocation not supported");
                return;
            }
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    updatePassengerLocation(
                        position.coords.latitude,
                        position.coords.longitude
                    );
                },
                () => {
                    console.log("Location access denied - showing default location");
                    // Still show default location even if permission denied
                    updatePassengerLocation(14.5995, 120.9842);
                }
            );
        }
        
        // Initial location
        trackPassenger();
        
        // Update every 10 seconds
        setInterval(trackPassenger, 10000);
        
        // Poll ride status periodically so passenger sees accepted/ongoing updates promptly.
        <?php if ($currentRide && in_array($currentRide['status'], ['requested', 'accepted', 'ongoing'], true)): ?>
        const currentRideStatus = '<?php echo $currentRide['status']; ?>';
        setInterval(async () => {
            try {
                const response = await fetch('passenger.php?ajax=ride_status');
                const data = await response.json();
                if (data.status !== currentRideStatus) {
                    location.reload();
                }
            } catch (error) {
                console.error('Ride status polling failed:', error);
            }
        }, 10000);
        <?php endif; ?>

        // Expand recent ride details on click
        document.addEventListener('DOMContentLoaded', () => {
            document.querySelectorAll('.history-item.clickable').forEach(item => {
                item.addEventListener('click', () => {
                    item.classList.toggle('open');
                });
            });

        });

        // Mobile sidebar toggle
        function toggleSidebar() {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.querySelector('.sidebar-overlay');
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        }
    </script>

</body>
</html>


