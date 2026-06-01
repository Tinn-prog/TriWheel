<?php
require 'auth.php';
require 'db.php';
require 'system_helpers.php';

if (!isset($_SESSION['user_id']) || $_SESSION['user_role'] !== 'passenger') {
    header("Location: login.php");
    exit;
}

header('Content-Type: text/html; charset=utf-8');

// Fetch active rides for this passenger
$stmt = $conn->prepare("
    SELECT r.*, 
           du.name as driver_name,
           d.phone as driver_phone,
           v.vehicle_type, v.plate_number, v.color
    FROM rides r
    LEFT JOIN drivers d ON r.driver_id = d.id
    LEFT JOIN users du ON d.user_id = du.id
    LEFT JOIN vehicles v ON d.id = v.driver_id
    WHERE r.passenger_id = ? AND r.status IN ('requested', 'accepted', 'ongoing')
    ORDER BY r.created_at DESC
");
$stmt->bind_param("i", $_SESSION['user_id']);
$stmt->execute();
$rides = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Rides - TriWheel</title>
    <link rel="stylesheet" href="style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="app-dashboard app-passenger">
    <?php require 'navbar.php'; ?>
    
    <div class="dashboard-container">
        <div class="container">
            <div class="dashboard-header">
                <h1><i class="fas fa-car"></i> My Rides</h1>
                <p>View and manage your active rides</p>
            </div>

            <?php if (empty($rides)): ?>
                <div class="dashboard-card">
                    <div class="card-content" style="text-align: center; padding: 60px 20px;">
                        <i class="fas fa-car" style="font-size: 3rem; color: #E5E7EB; margin-bottom: 16px;"></i>
                        <p style="color: #6B7280; font-size: 1rem;">No active rides at the moment.</p>
                        <a href="passenger.php" style="color: #F4623A; text-decoration: none; font-weight: 600; margin-top: 12px; display: inline-block;">
                            <i class="fas fa-plus"></i> Request a Ride
                        </a>
                    </div>
                </div>
            <?php else: ?>
                <?php foreach ($rides as $ride): ?>
                <div class="dashboard-card">
                    <div class="card-header" style="background: linear-gradient(135deg, #F4623A, #D94E28);">
                        <h3><i class="fas fa-map-marker-alt"></i> Ride #<?php echo $ride['id']; ?></h3>
                        <span style="background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase;">
                            <?php echo htmlspecialchars($ride['status']); ?>
                        </span>
                    </div>
                    <div class="card-content">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                            <div>
                                <p style="color: #6B7280; font-size: 0.875rem; margin-bottom: 4px;">Pickup Location</p>
                                <p style="color: #1A1D23; font-weight: 600;"><?php echo htmlspecialchars($ride['pickup_address']); ?></p>
                            </div>
                            <div>
                                <p style="color: #6B7280; font-size: 0.875rem; margin-bottom: 4px;">Dropoff Location</p>
                                <p style="color: #1A1D23; font-weight: 600;"><?php echo htmlspecialchars($ride['dropoff_address']); ?></p>
                            </div>
                        </div>
                        
                        <?php if ($ride['driver_id']): ?>
                        <div style="background: #F3F4F6; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                            <p style="color: #6B7280; font-size: 0.875rem; margin-bottom: 8px; font-weight: 600;">Driver Information</p>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                                <div>
                                    <p style="color: #6B7280; font-size: 0.75rem;">Driver Name</p>
                                    <p style="color: #1A1D23; font-weight: 500;"><?php echo htmlspecialchars($ride['driver_name'] ?? 'N/A'); ?></p>
                                </div>
                                <div>
                                    <p style="color: #6B7280; font-size: 0.75rem;">Phone</p>
                                    <p style="color: #1A1D23; font-weight: 500;"><?php echo htmlspecialchars($ride['driver_phone'] ?? 'N/A'); ?></p>
                                </div>
                                <div>
                                    <p style="color: #6B7280; font-size: 0.75rem;">Vehicle</p>
                                    <p style="color: #1A1D23; font-weight: 500;"><?php echo htmlspecialchars($ride['vehicle_type'] ?? 'N/A'); ?></p>
                                </div>
                                <div>
                                    <p style="color: #6B7280; font-size: 0.75rem;">Plate Number</p>
                                    <p style="color: #1A1D23; font-weight: 500;"><?php echo htmlspecialchars($ride['plate_number'] ?? 'N/A'); ?></p>
                                </div>
                            </div>
                        </div>
                        <?php endif; ?>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                            <div>
                                <p style="color: #6B7280; font-size: 0.875rem;">Ride Type</p>
                                <p style="color: #1A1D23; font-weight: 600;"><?php echo htmlspecialchars($ride['ride_type']); ?></p>
                            </div>
                            <div>
                                <p style="color: #6B7280; font-size: 0.875rem;">Estimated Fare</p>
                                <p style="color: #10B981; font-weight: 600;">₱<?php echo number_format($ride['fare'] ?? 0, 2); ?></p>
                            </div>
                        </div>
                    </div>
                </div>
                <?php endforeach; ?>
            <?php endif; ?>
        </div>
    </div>
</body>
</html>

