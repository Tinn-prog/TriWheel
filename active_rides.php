<?php
require 'auth.php';
require 'db.php';

if (!isset($_SESSION['user_id']) || $_SESSION['user_role'] !== 'driver') {
    header("Location: login.php");
    exit;
}

header('Content-Type: text/html; charset=utf-8');

// Get driver info
$driverStmt = $conn->prepare("SELECT id FROM drivers WHERE user_id = ?");
$driverStmt->bind_param("i", $_SESSION['user_id']);
$driverStmt->execute();
$driverData = $driverStmt->get_result()->fetch_assoc();
$driver_id = $driverData['id'] ?? null;

if (!$driver_id) {
    header("Location: driver.php");
    exit;
}

require_valid_csrf();

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['accept_ride'])) {
    $rideId = intval($_POST['accept_ride']);
    $acceptStmt = $conn->prepare(
        "UPDATE rides SET driver_id = ?, status = 'accepted' WHERE id = ? AND status = 'requested' AND driver_id IS NULL"
    );
    $acceptStmt->bind_param("ii", $driver_id, $rideId);
    if ($acceptStmt->execute()) {
        if ($acceptStmt->affected_rows > 0) {
            header("Location: active_rides.php?accepted=1");
            exit;
        } else {
            // No rows updated — likely another driver accepted the ride
            header("Location: active_rides.php?accepted=0&error=ride_taken");
            exit;
        }
    } else {
        // Execute failed — return an error
        header("Location: active_rides.php?accepted=0&error=execute_failed");
        exit;
    }
}

// Fetch active ride requests not yet accepted by this driver
$stmt = $conn->prepare("
    SELECT r.*, 
           u.name as passenger_name,
           u.email as passenger_email
    FROM rides r
    LEFT JOIN users u ON r.passenger_id = u.id
    WHERE r.status = 'requested' AND r.driver_id IS NULL
    ORDER BY r.created_at DESC
    LIMIT 30
");
$stmt->execute();
$requests = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

// Fetch accepted rides
$acceptedStmt = $conn->prepare("
    SELECT r.*, 
           u.name as passenger_name,
           u.email as passenger_email
    FROM rides r
    LEFT JOIN users u ON r.passenger_id = u.id
    WHERE r.driver_id = ? AND r.status IN ('accepted', 'ongoing')
    ORDER BY r.created_at DESC
");
$acceptedStmt->bind_param("i", $driver_id);
$acceptedStmt->execute();
$active = $acceptedStmt->get_result()->fetch_all(MYSQLI_ASSOC);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Active Rides - TriWheel</title>
    <link rel="stylesheet" href="style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="app-dashboard app-driver">
    <?php require 'navbar.php'; ?>
    
    <div class="dashboard-container">
        <div class="container">
            <div class="dashboard-header">
                <h1><i class="fas fa-tasks"></i> Active Rides</h1>
                <p>View and manage your active ride requests and accepted rides</p>
            </div>

            <?php if (!empty($_GET['error'])): ?>
                <div style="background:#f8d7da;color:#842029;padding:12px;border-radius:10px;margin-bottom:16px;">
                    <i class="fas fa-exclamation-circle"></i>
                    <?php if ($_GET['error'] === 'ride_taken'): ?>
                        This ride was already accepted by another driver.
                    <?php else: ?>
                        An error occurred while accepting the ride. Please try again.
                    <?php endif; ?>
                </div>
            <?php endif; ?>

            <?php if (!empty($active)): ?>
            <div style="margin-bottom: 32px;">
                <h3 style="color: #1A1D23; font-size: 1.125rem; margin-bottom: 16px;">
                    <i class="fas fa-check-circle" style="color: #10B981; margin-right: 8px;"></i>Your Accepted Rides
                </h3>
                <div style="display: grid; gap: 16px;">
                    <?php foreach ($active as $ride): ?>
                    <div class="dashboard-card">
                        <div class="card-content">
                            <div style="display: grid; grid-template-columns: 1fr auto; gap: 20px;">
                                <div>
                                    <h4 style="margin: 0 0 8px 0; color: #1A1D23;"><?php echo htmlspecialchars($ride['pickup_address']); ?></h4>
                                    <p style="color: #6B7280; font-size: 0.875rem; margin: 0 0 12px 0;">
                                        <i class="fas fa-map-marker-alt"></i> To: <?php echo htmlspecialchars($ride['dropoff_address']); ?>
                                    </p>
                                    <p style="color: #6B7280; font-size: 0.875rem; margin: 0;">
                                        <strong>Passenger:</strong> <?php echo htmlspecialchars($ride['passenger_name']); ?>
                                    </p>
                                </div>
                                <div style="text-align: right;">
                                    <span style="background: <?php echo $ride['status'] === 'ongoing' ? '#D1FAE5' : '#FEF3C7'; ?>; color: <?php echo $ride['status'] === 'ongoing' ? '#10B981' : '#F59E0B'; ?>; padding: 6px 14px; border-radius: 20px; font-size: 0.75rem; font-weight: 600;">
                                        <?php echo ucfirst(str_replace('_', ' ', $ride['status'])); ?>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <?php endforeach; ?>
                </div>
            </div>
            <?php endif; ?>

            <?php if (!empty($requests)): ?>
            <div>
                <h3 style="color: #1A1D23; font-size: 1.125rem; margin-bottom: 16px;">
                    <i class="fas fa-bell" style="color: #F59E0B; margin-right: 8px;"></i>Available Ride Requests
                </h3>
                <div style="display: grid; gap: 16px;">
                    <?php foreach ($requests as $req): ?>
                    <div class="dashboard-card">
                        <div class="card-header" style="background: linear-gradient(135deg, #F59E0B, #F97316);">
                            <h4 style="margin: 0; color: white; flex: 1;"><i class="fas fa-map-marker-alt"></i> New Ride Request</h4>
                            <span style="background: rgba(255,255,255,0.2); color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600;">
                                Just Now
                            </span>
                        </div>
                        <div class="card-content">
                            <div style="display: grid; grid-template-columns: 1fr auto; gap: 20px; margin-bottom: 16px;">
                                <div>
                                    <p style="color: #6B7280; font-size: 0.875rem; margin: 0 0 4px 0;">Pickup</p>
                                    <p style="color: #1A1D23; font-weight: 600; margin: 0 0 16px 0;"><?php echo htmlspecialchars($req['pickup_address']); ?></p>
                                    <p style="color: #6B7280; font-size: 0.875rem; margin: 0 0 4px 0;">Dropoff</p>
                                    <p style="color: #1A1D23; font-weight: 600; margin: 0;"><?php echo htmlspecialchars($req['dropoff_address']); ?></p>
                                </div>
                                <div style="text-align: right;">
                                    <p style="color: #10B981; font-size: 1.25rem; font-weight: 700; margin: 0;">₱<?php echo number_format($req['fare'] ?? 0, 2); ?></p>
                                    <p style="color: #6B7280; font-size: 0.75rem; margin-top: 4px;"><?php echo htmlspecialchars($req['ride_type']); ?></p>
                                </div>
                            </div>
                            <form method="POST" style="margin: 0;">
                                <?php echo csrf_input(); ?>
                                <input type="hidden" name="accept_ride" value="<?php echo intval($req['id']); ?>">
                                <button type="submit" class="btn-primary btn-block">
                                    <i class="fas fa-check"></i> Accept Ride
                                </button>
                            </form>
                        </div>
                    </div>
                    <?php endforeach; ?>
                </div>
            </div>
            <?php elseif (empty($active)): ?>
                <div class="dashboard-card">
                    <div class="card-content" style="text-align: center; padding: 60px 20px;">
                        <i class="fas fa-inbox" style="font-size: 3rem; color: #E5E7EB; margin-bottom: 16px;"></i>
                        <p style="color: #6B7280; font-size: 1rem;">No ride requests available at the moment.</p>
                        <p style="color: #9CA3AF; font-size: 0.875rem; margin-top: 8px;">Check back soon or go online to receive requests!</p>
                    </div>
                </div>
            <?php endif; ?>
        </div>
    </div>
</body>
</html>
