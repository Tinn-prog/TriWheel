<?php
require 'auth.php';
require 'db.php';
require 'system_helpers.php';

ini_set('display_errors', '0');
ini_set('display_startup_errors', '0');
error_reporting(0);
header('Content-Type: text/html; charset=utf-8');
triwheel_ensure_schema($conn);
require_valid_csrf();
$statusUpdateError = '';
$rideActionError = '';

/* ===== AUTH CHECK ===== */
if (!isset($_SESSION['user_id']) || $_SESSION['user_role'] !== 'driver') {
    header("Location: login.php");
    exit;
}

$currentUserId = $_SESSION['user_id'];
$rideCancelled = false;

/* ===== HANDLE STATUS UPDATE ===== */
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['status'])) {
    $status = $_POST['status'];
    if (!in_array($status, ['online', 'offline'], true)) {
        $statusUpdateError = 'Invalid driver status.';
    } else {

    $approvalStmt = $conn->prepare("SELECT approval_status, status AS current_status, queue_position FROM drivers WHERE user_id = ?");
    $approvalStmt->bind_param("i", $currentUserId);
    $approvalStmt->execute();
    $approvalStatusRow = $approvalStmt->get_result()->fetch_assoc();
    $approvalStmt->close();

    $driverApprovalStatus = $approvalStatusRow['approval_status'] ?? 'pending';
    if ($driverApprovalStatus !== 'approved') {
        $statusUpdateError = 'Your account must be approved by an admin before you can go online.';
    } else {
        if ($status === 'online') {
            $queuePosition = $approvalStatusRow['queue_position'];
            if ($approvalStatusRow['current_status'] !== 'online' || $queuePosition === null) {
                $queueStmt = $conn->prepare("SELECT COALESCE(MAX(queue_position), 0) AS max_position FROM drivers WHERE status = 'online' AND queue_position IS NOT NULL");
                $queueStmt->execute();
                $queueMaxRow = $queueStmt->get_result()->fetch_assoc();
                $queueStmt->close();
                $queuePosition = intval($queueMaxRow['max_position'] ?? 0) + 1;
            }
            $update = $conn->prepare(
                "UPDATE drivers SET status = ?, queue_position = ? WHERE user_id = ?"
            );
            $update->bind_param("sii", $status, $queuePosition, $currentUserId);
        } else {
            $update = $conn->prepare(
                "UPDATE drivers SET status = ?, queue_position = NULL WHERE user_id = ?"
            );
            $update->bind_param("si", $status, $currentUserId);
        }
        $update->execute();

        header("Location: driver.php");
        exit;
    }
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['clear_history'])) {
    $driverIdStmt = $conn->prepare("SELECT id FROM drivers WHERE user_id = ?");
    $driverIdStmt->bind_param("i", $currentUserId);
    $driverIdStmt->execute();
    $driverIdData = $driverIdStmt->get_result()->fetch_assoc();
    $driverIdStmt->close();

    if ($driverIdData) {
        $clearStmt = $conn->prepare("UPDATE rides SET hidden_for_driver = 1 WHERE driver_id = ? AND status IN ('completed', 'cancelled')");
        $clearStmt->bind_param("i", $driverIdData['id']);
        $clearStmt->execute();
    }

    header("Location: driver.php");
    exit;
}

/* ===== HANDLE RIDE ACCEPTANCE ===== */
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['accept_ride'])) {
    $rideId = intval($_POST['accept_ride']);
    
    // First, get driver's ID and queue position
    $driverIdStmt = $conn->prepare("SELECT id, status, queue_position FROM drivers WHERE user_id = ?");
    $driverIdStmt->bind_param("i", $currentUserId);
    $driverIdStmt->execute();
    $driverResult = $driverIdStmt->get_result();
    $driverData = $driverResult->fetch_assoc();
    
    if ($driverData) {
        if ($driverData['status'] !== 'online' || $driverData['queue_position'] === null) {
            header("Location: driver.php?ride_error=queue");
            exit;
        }

        $nextDriverStmt = $conn->prepare("SELECT id FROM drivers WHERE status = 'online' AND queue_position IS NOT NULL ORDER BY queue_position ASC LIMIT 1");
        $nextDriverStmt->execute();
        $nextDriverData = $nextDriverStmt->get_result()->fetch_assoc();
        $nextDriverStmt->close();

        if (!$nextDriverData || intval($nextDriverData['id']) !== intval($driverData['id'])) {
            header("Location: driver.php?ride_error=queue");
            exit;
        }

        $oldestStmt = $conn->prepare("SELECT id FROM rides WHERE status = 'requested' ORDER BY created_at ASC, id ASC LIMIT 1");
        $oldestStmt->execute();
        $oldestRide = $oldestStmt->get_result()->fetch_assoc();
        $oldestStmt->close();

        if (!$oldestRide || intval($oldestRide['id']) !== $rideId) {
            header("Location: driver.php?ride_error=not_your_turn");
            exit;
        }

        $activeStmt = $conn->prepare("SELECT id FROM rides WHERE driver_id = ? AND status IN ('accepted', 'ongoing') LIMIT 1");
        $activeStmt->bind_param("i", $driverData['id']);
        $activeStmt->execute();
        $activeResult = $activeStmt->get_result();
        $activeStmt->close();

        if ($activeResult && $activeResult->num_rows > 0) {
            header("Location: driver.php?ride_error=active");
            exit;
        }

        // Accept the ride
        $acceptStmt = $conn->prepare("
            UPDATE rides 
            SET driver_id = ?, status = 'accepted'
            WHERE id = ? AND status = 'requested'
        ");
        $acceptStmt->bind_param("ii", $driverData['id'], $rideId);
        $acceptStmt->execute();

        if ($acceptStmt->affected_rows < 1) {
            header("Location: driver.php?ride_error=taken");
            exit;
        }

        $clearQueueStmt = $conn->prepare("UPDATE drivers SET queue_position = NULL WHERE id = ?");
        $clearQueueStmt->bind_param("i", $driverData['id']);
        $clearQueueStmt->execute();

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
        WHERE id = ? AND status = 'accepted' AND driver_id = (SELECT id FROM drivers WHERE user_id = ?)
    ");
    $startStmt->bind_param("ii", $rideId, $currentUserId);
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
    $cancelStmt->bind_param("ii", $rideId, $currentUserId);
    $cancelStmt->execute();

    if ($cancelStmt->affected_rows > 0) {
        $driverStatusStmt = $conn->prepare("SELECT status FROM drivers WHERE user_id = ?");
        $driverStatusStmt->bind_param("i", $currentUserId);
        $driverStatusStmt->execute();
        $driverStatusRow = $driverStatusStmt->get_result()->fetch_assoc();
        $driverStatusStmt->close();

        if ($driverStatusRow && $driverStatusRow['status'] === 'online') {
            $queueStmt = $conn->prepare("SELECT COALESCE(MAX(queue_position), 0) AS max_position FROM drivers WHERE status = 'online' AND queue_position IS NOT NULL");
            $queueStmt->execute();
            $queueMaxRow = $queueStmt->get_result()->fetch_assoc();
            $queueStmt->close();

            $requeuePosition = intval($queueMaxRow['max_position'] ?? 0) + 1;
            $requeueStmt = $conn->prepare("UPDATE drivers SET queue_position = ? WHERE user_id = ?");
            $requeueStmt->bind_param("ii", $requeuePosition, $currentUserId);
            $requeueStmt->execute();
        }
    }
    
    header("Location: driver.php?ride_cancelled=1");
    exit;
}

/* ===== HANDLE COMPLETE RIDE ===== */
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['complete_ride'])) {
    $rideId = $_POST['complete_ride'];

    $distanceStmt = $conn->prepare("SELECT pickup_lat, pickup_lng, dropoff_lat, dropoff_lng FROM rides WHERE id = ? AND status = 'ongoing' AND driver_id = (SELECT id FROM drivers WHERE user_id = ?)");
    $distanceStmt->bind_param("ii", $rideId, $currentUserId);
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
        WHERE id = ? AND status = 'ongoing' AND driver_id = (SELECT id FROM drivers WHERE user_id = ?)
    ");
    $completeStmt->bind_param("dii", $fare, $rideId, $currentUserId);
    $completeStmt->execute();

    if ($completeStmt->affected_rows > 0) {
        $driverStatusStmt = $conn->prepare("SELECT status FROM drivers WHERE user_id = ?");
        $driverStatusStmt->bind_param("i", $currentUserId);
        $driverStatusStmt->execute();
        $driverStatusRow = $driverStatusStmt->get_result()->fetch_assoc();
        $driverStatusStmt->close();

        if ($driverStatusRow && $driverStatusRow['status'] === 'online') {
            $queueStmt = $conn->prepare("SELECT COALESCE(MAX(queue_position), 0) AS max_position FROM drivers WHERE status = 'online' AND queue_position IS NOT NULL");
            $queueStmt->execute();
            $queueMaxRow = $queueStmt->get_result()->fetch_assoc();
            $queueStmt->close();

            $requeuePosition = intval($queueMaxRow['max_position'] ?? 0) + 1;
            $requeueStmt = $conn->prepare("UPDATE drivers SET queue_position = ? WHERE user_id = ?");
            $requeueStmt->bind_param("ii", $requeuePosition, $currentUserId);
            $requeueStmt->execute();
        }
    }
    
    header("Location: driver.php");
    exit;
}

$driverFeedbackSuccess = '';
$driverFeedbackError = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['rate_passenger'])) {
    $rideId = intval($_POST['ride_id']);
    $driverRating = $_POST['driver_rating'] ?? '';
    $driverFeedback = trim($_POST['driver_feedback'] ?? '');
    $allowedRatings = ['good', 'satisfied', 'neutral', 'dissatisfied', 'very_dissatisfied'];

    if (!in_array($driverRating, $allowedRatings, true)) {
        $driverFeedbackError = "Please select a valid rating.";
    } else {
        // Verify ride belongs to this driver, is completed, and not yet rated by driver
        $driverIdCheck = $conn->prepare("SELECT id FROM drivers WHERE user_id = ?");
        $driverIdCheck->bind_param("i", $currentUserId);
        $driverIdCheck->execute();
        $driverIdCheckData = $driverIdCheck->get_result()->fetch_assoc();
        $driverIdCheck->close();

        if ($driverIdCheckData) {
            $checkStmt = $conn->prepare(
                "SELECT id FROM rides WHERE id = ? AND driver_id = ? AND status = 'completed' AND driver_rated = 0"
            );
            $checkStmt->bind_param("ii", $rideId, $driverIdCheckData['id']);
            $checkStmt->execute();
            $checkResult = $checkStmt->get_result();
            $checkStmt->close();

            if ($checkResult->num_rows === 0) {
                $driverFeedbackError = "Unable to submit feedback. Already submitted or ride not found.";
            } else {
                $rateStmt = $conn->prepare(
                    "UPDATE rides SET driver_rating = ?, driver_feedback = ?, driver_rated = 1 WHERE id = ? AND driver_id = ?"
                );
                $rateStmt->bind_param("ssii", $driverRating, $driverFeedback, $rideId, $driverIdCheckData['id']);
                if ($rateStmt->execute() && $rateStmt->affected_rows > 0) {
                    $driverFeedbackSuccess = "Thank you! Your feedback has been submitted.";
                } else {
                    $driverFeedbackError = "Unable to submit feedback. Please try again.";
                }
                $rateStmt->close();
            }
        }
    }
}

if (isset($_GET['ride_cancelled']) && $_GET['ride_cancelled'] === '1') {
    $rideCancelled = true;
}
if (isset($_GET['ride_error'])) {
    if ($_GET['ride_error'] === 'taken') {
        $rideActionError = 'That ride was already accepted by another driver.';
    } elseif ($_GET['ride_error'] === 'active') {
        $rideActionError = 'Finish or cancel your current ride before accepting another request.';
    } elseif ($_GET['ride_error'] === 'queue') {
        $rideActionError = 'You are not the next driver in the queue. Please wait for your turn.';
    } elseif ($_GET['ride_error'] === 'not_your_turn') {
        $rideActionError = 'Only the oldest pending request may be accepted by the next driver in queue.';
    }
}

/* ===== FETCH DRIVER & VEHICLE INFO ===== */
$stmt = $conn->prepare("
    SELECT 
        d.license_number,
        d.phone,
        d.status,
        d.queue_position,
        d.approval_status,
        v.vehicle_type,
        v.plate_number,
        v.color
    FROM drivers d
    JOIN vehicles v ON d.id = v.driver_id
    WHERE d.user_id = ?
");
$stmt->bind_param("i", $currentUserId);
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
$currentQueuePosition = null;
$isNextInQueue = false;
$driverIdStmt = $conn->prepare("SELECT id FROM drivers WHERE user_id = ?");
$driverIdStmt->bind_param("i", $currentUserId);
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
    $historyStmt = $conn->prepare("\n        SELECT r.*, u.name as passenger_name\n        FROM rides r\n        JOIN users u ON r.passenger_id = u.id\n        WHERE r.driver_id = ? AND r.hidden_for_driver = 0\n        ORDER BY r.created_at DESC\n        LIMIT 10\n    ");
    $historyStmt->bind_param("i", $driverIdData['id']);
    $historyStmt->execute();
    $history = $historyStmt->get_result();

    /* ===== FETCH DRIVER RATING SUMMARY ===== */
    $ratingSummaryStmt = $conn->prepare(
        "SELECT COUNT(*) AS total_ratings, AVG(CASE rating WHEN 'good' THEN 5 WHEN 'satisfied' THEN 4 WHEN 'neutral' THEN 3 WHEN 'dissatisfied' THEN 2 WHEN 'very_dissatisfied' THEN 1 WHEN 'bad' THEN 1 END) AS avg_rating_value FROM rides WHERE driver_id = ? AND rating IS NOT NULL"
    );
    $ratingSummaryStmt->bind_param("i", $driverIdData['id']);
    $ratingSummaryStmt->execute();
    $ratingSummary = $ratingSummaryStmt->get_result()->fetch_assoc();
    $ratingSummaryStmt->close();

    $queueStmt = $conn->prepare("SELECT id FROM drivers WHERE status = 'online' AND queue_position IS NOT NULL ORDER BY queue_position ASC LIMIT 1");
    $queueStmt->execute();
    $nextQueueDriver = $queueStmt->get_result()->fetch_assoc();
    $queueStmt->close();

    $currentQueuePosition = $driver['queue_position'] ?? null;
    $isNextInQueue = ($nextQueueDriver && intval($nextQueueDriver['id']) === intval($driverIdData['id']));
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
        'good'              => 5,
        'satisfied'         => 4,
        'neutral'           => 3,
        'dissatisfied'      => 2,
        'very_dissatisfied' => 1,
        'bad'               => 1,
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
    <link rel="stylesheet" href="style.css?v=fitcards4">
    
    <!-- Leaflet JS -->
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>
        .star-rating {
            display: inline-flex;
            flex-direction: row-reverse;
            gap: 8px;
            align-items: center;
            background: #fff;
            border-radius: 8px;
            padding: 8px 12px;
            box-shadow: 0 8px 20px rgba(0,0,0,0.08);
            user-select: none;
        }
        .star-rating input {
            position: absolute;
            opacity: 0;
            pointer-events: none;
        }
        .star-rating label {
            cursor: pointer;
            line-height: 1;
            font-size: 1.65rem;
            color: #ffc107;
            transition: transform 0.15s ease, color 0.15s ease;
        }
        .star-rating label::before { content: "\2606"; }
        .star-rating label:hover::before,
        .star-rating label:hover ~ label::before,
        .star-rating input:checked ~ label::before { content: "\2605"; }
        .star-rating label:hover { transform: translateY(-1px) scale(1.08); }
        .feedback-modal-overlay {
            display: none;
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.55);
            z-index: 9999;
            align-items: center;
            justify-content: center;
        }
        .feedback-modal-overlay.active { display: flex; }
        .feedback-modal {
            background: white;
            border-radius: 18px;
            padding: 32px 28px;
            max-width: 440px;
            width: 90%;
            box-shadow: 0 20px 60px rgba(0,0,0,0.2);
            animation: fbSlideIn 0.3s ease;
            position: relative;
        }
        .feedback-modal h3 { font-size: 1.2rem; margin-bottom: 6px; color: var(--dark); }
        .feedback-modal .modal-close {
            position: absolute; top: 16px; right: 18px;
            background: none; border: none; font-size: 1.3rem; cursor: pointer; color: var(--gray);
        }
        .feedback-modal .modal-close:hover { color: var(--dark); }
        .modal-ride-info {
            background: #f8f9fa; border-radius: 10px;
            padding: 10px 14px; margin-bottom: 18px;
            font-size: 0.88em; color: var(--gray);
        }
        @keyframes fbSlideIn {
            from { opacity:0; transform:translateY(20px); }
            to   { opacity:1; transform:translateY(0); }
        }
    </style>
</head>

<body class="app-dashboard app-driver">
    <!-- Persistent Sidebar Navigation -->
    <?php require 'navbar.php'; ?>

    <!-- Main Content -->
    <main class="dashboard-container" id="dashboard-top">
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
                <div class="dashboard-card status-card" id="driver-status">
                    <div class="card-header">
                        <h3><i class="fas fa-toggle-on"></i> Driver Status</h3>
                    </div>
                    <div class="card-content">
                        <!-- Removed informational tiles: Verified Gate, Duplicate Accept, History -->
                        <div class="status-display <?php echo $driver['status']; ?>">
                            <div class="status-indicator">
                                <i class="fas fa-<?php echo $driver['status'] === 'online' ? 'check-circle' : 'times-circle'; ?>"></i>
                                <span><?php echo strtoupper($driver['status']); ?></span>
                            </div>
                            <p class="status-description">
                                <?php echo $driver['status'] === 'online' ? 'You are available to receive ride requests' : 'You are offline and not receiving ride requests'; ?>
                            </p>
                            <?php if ($driver['status'] === 'online'): ?>
                                <div style="margin-top:14px;padding:12px;background:#eff6ff;color:#0f4a80;border-radius:12px;">
                                    <strong>Queue position:</strong>
                                    <?php echo $currentQueuePosition !== null ? intval($currentQueuePosition) : 'N/A'; ?>
                                    <br>
                                    <small><?php echo $isNextInQueue ? 'You are next to receive the next ride request.' : 'Please wait for drivers ahead of you to take the current passenger.'; ?></small>
                                </div>
                            <?php endif; ?>
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

                <!-- Ride Requests -->
                <div class="dashboard-card requests-card" id="ride-requests">
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
                            <?php if (!empty($rideActionError)): ?>
                                <div style="background:#f8d7da;color:#842029;padding:12px;border-radius:10px;margin-bottom:12px;">
                                    <?php echo htmlspecialchars($rideActionError); ?>
                                </div>
                            <?php endif; ?>
                            <?php if (!$isNextInQueue): ?>
                                <div style="background:#ecfdf5;color:#0f5132;padding:12px;border-radius:10px;margin-bottom:12px;">
                                    <strong>Queue note:</strong> You are waiting for your turn. Only the next driver in the queue may accept the current passenger.
                                </div>
                            <?php endif; ?>
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
                                                                echo '₱10.00';
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
                                                <?php if ($isNextInQueue): ?>
                                                    <button type="submit" class="btn-primary">
                                                        <i class="fas fa-check"></i> Accept
                                                    </button>
                                                <?php else: ?>
                                                    <button type="button" class="btn-secondary" disabled>
                                                        <i class="fas fa-hourglass-half"></i> Waiting in Queue
                                                    </button>
                                                <?php endif; ?>
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
                <div class="dashboard-card map-card" id="live-map">
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

                <!-- Feedback Report -->
                <div class="dashboard-card history-card" id="feedback-report">
                    <div class="card-header">
                        <h3><i class="fas fa-comments"></i> Feedback Report</h3>
                    </div>
                    <div class="card-content">
                        <p style="margin-top:0;color:var(--gray);font-size:0.9rem;">Tap a ride to review passenger ratings and comments.</p>
                        <?php $historyCount = $history ? $history->num_rows : 0; ?>
                        <?php if ($historyCount > 0): ?>
                            <div class="history-wrapper">
                                <div class="ride-history">
                                    <?php while ($ride = $history->fetch_assoc()): ?>
                                    <div class="history-item">
                                        <div class="history-header">
                                            <span class="ride-date"><?php echo date('M d, h:i A', strtotime($ride['created_at'])); ?></span>
                                            <span class="ride-status <?php echo $ride['status']; ?>">
                                                <?php echo ucfirst($ride['status']); ?>
                                            </span>
                                        </div>
                                        <div class="history-details">
                                            <?php if ($ride['status'] === 'completed'): ?>
                                                <!-- Passenger rating received by driver -->
                                                <?php if ($ride['rating']): ?>
                                                    <div class="detail-row">
                                                        <i class="fas fa-star" style="color:#f4a50a;"></i>
                                                        <strong>Passenger Rating:</strong>
                                                        <span class="rating-badge <?php echo htmlspecialchars($ride['rating']); ?>">
                                                            <?php echo renderRatingStars($ride['rating']); ?>
                                                        </span>
                                                    </div>
                                                    <?php if (!empty($ride['passenger_feedback'])): ?>
                                                    <div class="detail-row">
                                                        <i class="fas fa-comment-alt"></i>
                                                        <strong>Passenger Comment:</strong>
                                                        <span><?php echo htmlspecialchars($ride['passenger_feedback']); ?></span>
                                                    </div>
                                                    <?php endif; ?>
                                                <?php else: ?>
                                                    <div class="detail-row" style="color:var(--gray);font-size:0.88em;">
                                                        <i class="fas fa-clock"></i>
                                                        <span>Passenger hasn't rated yet.</span>
                                                    </div>
                                                <?php endif; ?>

                                                <!-- Driver's own rating for passenger -->
                                                <?php if ($ride['driver_rated']): ?>
                                                    <div class="detail-row" style="margin-top:6px;">
                                                        <i class="fas fa-star" style="color:#00B4D8;"></i>
                                                        <strong>Your Rating for Passenger:</strong>
                                                        <span class="rating-badge <?php echo htmlspecialchars($ride['driver_rating']); ?>">
                                                            <?php echo renderRatingStars($ride['driver_rating']); ?>
                                                        </span>
                                                    </div>
                                                    <?php if (!empty($ride['driver_feedback'])): ?>
                                                    <div class="detail-row">
                                                        <i class="fas fa-comment"></i>
                                                        <strong>Your Comment:</strong>
                                                        <span><?php echo htmlspecialchars($ride['driver_feedback']); ?></span>
                                                    </div>
                                                    <?php endif; ?>
                                                <?php else: ?>
                                                    <div class="detail-row" style="color:var(--gray);font-size:0.88em;">
                                                        <i class="fas fa-clock"></i>
                                                        <span>You haven't rated this passenger yet.</span>
                                                    </div>
                                                <?php endif; ?>
                                            <?php else: ?>
                                                <div class="detail-row" style="color:var(--gray);font-size:0.88em;">
                                                    <i class="fas fa-info-circle"></i>
                                                    <span>Feedback available for completed rides only.</span>
                                                </div>
                                            <?php endif; ?>
                                        </div>
                                        <div class="history-expanded">
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
        
        const hasActiveRideRoute = <?php echo $currentDriverRide ? 'true' : 'false'; ?>;
        let driverMarker = null;
        let routeBounds = null;
        let routeBoundsApplied = false;
        
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

            if (hasActiveRideRoute && routeBounds) {
                routeBounds.extend([lat, lng]);
                if (!routeBoundsApplied) {
                    map.fitBounds(routeBounds, { padding: [32, 32], maxZoom: 16 });
                    routeBoundsApplied = true;
                }
            } else {
                map.setView([lat, lng], 15);
            }
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
        const pickupLatLng = [<?php echo $currentDriverRide['pickup_lat'] ?: '14.5995'; ?>, <?php echo $currentDriverRide['pickup_lng'] ?: '120.9842'; ?>];
        const dropoffLatLng = [<?php echo $currentDriverRide['dropoff_lat'] ?: '14.6091'; ?>, <?php echo $currentDriverRide['dropoff_lng'] ?: '121.0223'; ?>];

        // Pickup marker
        const pickupMarker = L.marker(
            pickupLatLng, 
            {
                icon: L.icon({
                    iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34]
                })
            }
        ).addTo(map);
        pickupMarker.bindPopup("<b>Pickup Location</b><br><?php echo htmlspecialchars($currentDriverRide['pickup_address']); ?>");
        
        // Dropoff marker
        const dropoffMarker = L.marker(
            dropoffLatLng, 
            {
                icon: L.icon({
                    iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34]
                })
            }
        ).addTo(map);
        dropoffMarker.bindPopup("<b>Destination</b><br><?php echo htmlspecialchars($currentDriverRide['dropoff_address']); ?>");
        
        // Draw route line 
        const routeLine = L.polyline([
            pickupLatLng,
            dropoffLatLng
        ], {color: '#0d6efd', weight: 4, opacity: 0.75, dashArray: '8 8'}).addTo(map);
        
        // Fit map to show all markers
        routeBounds = L.latLngBounds([pickupLatLng, dropoffLatLng]);
        map.fitBounds(routeBounds, { padding: [32, 32], maxZoom: 16 });
        pickupMarker.openPopup();
        <?php endif; ?>

        // Mobile sidebar toggle
        function toggleSidebar() {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.querySelector('.sidebar-overlay');
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        }
    </script>
    <!-- ===== DRIVER FEEDBACK MODAL ===== -->
    <?php
    if ($driverIdData) {
        $pendingDriverFeedbackStmt = $conn->prepare(
            "SELECT r.id, r.pickup_address, r.dropoff_address, r.fare, u.name as passenger_name
             FROM rides r
             JOIN users u ON r.passenger_id = u.id
             WHERE r.driver_id = ? AND r.status = 'completed' AND r.driver_rated = 0
             ORDER BY r.updated_at DESC LIMIT 1"
        );
        $pendingDriverFeedbackStmt->bind_param("i", $driverIdData['id']);
        $pendingDriverFeedbackStmt->execute();
        $pendingDriverRide = $pendingDriverFeedbackStmt->get_result()->fetch_assoc();
        $pendingDriverFeedbackStmt->close();
    } else {
        $pendingDriverRide = null;
    }
    ?>
    <?php if ($pendingDriverRide): ?>
    <div class="feedback-modal-overlay" id="driverFeedbackModal" data-ride-id="<?php echo intval($pendingDriverRide['id']); ?>">
        <div class="feedback-modal">
            <button class="modal-close" onclick="dismissDriverFeedbackModal(true)" title="Close">
                <i class="fas fa-times"></i>
            </button>
            <h3><i class="fas fa-star" style="color:#00B4D8;"></i> Rate Your Passenger</h3>
            <p style="color:var(--gray);font-size:0.9em;margin-bottom:14px;">Share your experience — your feedback helps build a better community.</p>
            <div class="modal-ride-info">
                <div><i class="fas fa-user"></i> Passenger: <strong><?php echo htmlspecialchars($pendingDriverRide['passenger_name'] ?? 'N/A'); ?></strong></div>
                <div style="margin-top:4px;"><i class="fas fa-map-marker-alt"></i> <?php echo htmlspecialchars(substr($pendingDriverRide['pickup_address'], 0, 28)); ?>... → <?php echo htmlspecialchars(substr($pendingDriverRide['dropoff_address'], 0, 22)); ?>...</div>
                <?php if ($pendingDriverRide['fare']): ?>
                <div style="margin-top:4px;"><i class="fas fa-money-bill-wave"></i> Fare: <strong>₱<?php echo number_format($pendingDriverRide['fare'], 2); ?></strong></div>
                <?php endif; ?>
            </div>
            <form method="POST" id="driverModalFeedbackForm">
                <input type="hidden" name="ride_id" value="<?php echo intval($pendingDriverRide['id']); ?>">
                <div class="star-rating" style="margin-bottom:16px;" aria-label="Rate your passenger">
                    <?php
                    $driverModalRatings = [
                        'good'              => 5,
                        'satisfied'         => 4,
                        'neutral'           => 3,
                        'dissatisfied'      => 2,
                        'very_dissatisfied' => 1,
                    ];
                    foreach ($driverModalRatings as $val => $stars): ?>
                    <input type="radio" id="driver-modal-rating-<?php echo $stars; ?>" name="driver_rating" value="<?php echo $val; ?>" required>
                    <label for="driver-modal-rating-<?php echo $stars; ?>" aria-label="<?php echo $stars; ?> stars"></label>
                    <?php endforeach; ?>
                </div>
                <div style="margin-bottom:16px;">
                    <label style="font-size:0.9em;font-weight:500;display:block;margin-bottom:6px;">
                        <i class="fas fa-comment"></i> Comment <span style="color:var(--gray);font-weight:400;">(optional)</span>
                    </label>
                    <textarea name="driver_feedback" rows="3" placeholder="How was this passenger?" style="width:100%;padding:10px;border:2px solid var(--gray-light);border-radius:10px;font-family:inherit;font-size:0.9em;resize:vertical;box-sizing:border-box;" onfocus="this.style.borderColor='var(--primary)'" onblur="this.style.borderColor='var(--gray-light)'"></textarea>
                </div>
                <button type="submit" name="rate_passenger" class="btn-primary btn-block">
                    <i class="fas fa-paper-plane"></i> Submit Feedback
                </button>
                <button type="button" onclick="dismissDriverFeedbackModal(true)" class="btn-secondary btn-block" style="margin-top:10px;">
                    Maybe Later
                </button>
            </form>
        </div>
    </div>
    <script>
        const driverFeedbackRideId = '<?php echo intval($pendingDriverRide['id']); ?>';
        const driverFeedbackDismissKey = `triwheel_driver_feedback_dismissed_${driverFeedbackRideId}`;

        function isDriverFeedbackDismissed() {
            try {
                return localStorage.getItem(driverFeedbackDismissKey) === '1';
            } catch (e) {
                return false;
            }
        }

        function dismissDriverFeedbackModal(remember) {
            const modal = document.getElementById('driverFeedbackModal');
            if (remember) {
                try {
                    localStorage.setItem(driverFeedbackDismissKey, '1');
                } catch (e) {}
            }
            if (modal) modal.classList.remove('active');
        }

        document.getElementById('driverModalFeedbackForm')?.addEventListener('submit', () => {
            try {
                localStorage.removeItem(driverFeedbackDismissKey);
            } catch (e) {}
        });

        window.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                const modal = document.getElementById('driverFeedbackModal');
                if (modal && !isDriverFeedbackDismissed()) modal.classList.add('active');
            }, 800);
        });
        document.getElementById('driverFeedbackModal')?.addEventListener('click', function(e) {
            if (e.target === this) dismissDriverFeedbackModal(true);
        });
    </script>
    <?php endif; ?>

<?php echo csrf_form_script(); ?>
</body>
</html>
