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

$vehicle = null;
if ($driver_id) {
    $vehicleStmt = $conn->prepare("SELECT * FROM vehicles WHERE driver_id = ? LIMIT 1");
    $vehicleStmt->bind_param("i", $driver_id);
    $vehicleStmt->execute();
    $vehicle = $vehicleStmt->get_result()->fetch_assoc();
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vehicle Information - TriWheel</title>
    <link rel="stylesheet" href="style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="app-dashboard app-driver">
    <?php require 'navbar.php'; ?>
    
    <div class="dashboard-container">
        <div class="container">
            <div class="dashboard-header">
                <h1><i class="fas fa-truck"></i> Vehicle Information</h1>
                <p>Manage and update your vehicle details</p>
            </div>

            <?php if ($vehicle): ?>
                <div class="dashboard-card">
                    <div class="card-header" style="background: linear-gradient(135deg, #0EA5E9, #0369A1); display: flex; align-items: center; gap: 12px;">
                        <i class="fas fa-car" style="font-size: 1.5rem;"></i>
                        <h3 style="margin: 0; color: white;"><?php echo htmlspecialchars($vehicle['vehicle_type']); ?></h3>
                    </div>
                    <div class="card-content">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
                            <div>
                                <p style="color: #6B7280; font-size: 0.875rem; margin-bottom: 8px;">
                                    <i class="fas fa-id-card" style="margin-right: 8px;"></i>Plate Number
                                </p>
                                <p style="color: #1A1D23; font-weight: 600; font-size: 1.125rem; margin: 0;">
                                    <?php echo htmlspecialchars($vehicle['plate_number']); ?>
                                </p>
                            </div>
                            <div>
                                <p style="color: #6B7280; font-size: 0.875rem; margin-bottom: 8px;">
                                    <i class="fas fa-paint-brush" style="margin-right: 8px;"></i>Color
                                </p>
                                <p style="color: #1A1D23; font-weight: 600; font-size: 1.125rem; margin: 0;">
                                    <?php echo htmlspecialchars($vehicle['color']); ?>
                                </p>
                            </div>
                        </div>

                        <div style="background: #F3F4F6; padding: 16px; border-radius: 8px; margin-top: 20px;">
                            <h4 style="color: #1A1D23; margin: 0 0 16px 0; font-size: 0.9375rem;">
                                <i class="fas fa-info-circle" style="color: #3B82F6; margin-right: 8px;"></i>Additional Details
                            </h4>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                                <div>
                                    <p style="color: #6B7280; font-size: 0.75rem; margin-bottom: 4px;">Vehicle Type</p>
                                    <p style="color: #1A1D23; font-weight: 500; margin: 0;"><?php echo htmlspecialchars($vehicle['vehicle_type']); ?></p>
                                </div>
                                <?php if (!empty($vehicle['approval_status'])):
                                    $statusLabels = [
                                        'approved' => 'Active',
                                        'pending' => 'Pending',
                                        'rejected' => 'Rejected'
                                    ];
                                    $statusLabel = $statusLabels[$vehicle['approval_status']] ?? ucfirst($vehicle['approval_status']);
                                ?>
                                <div>
                                    <p style="color: #6B7280; font-size: 0.75rem; margin-bottom: 4px;">Registration Status</p>
                                    <p style="color: #1A1D23; font-weight: 500; margin: 0;"><?php echo htmlspecialchars($statusLabel); ?></p>
                                </div>
                                <?php endif; ?>
                            </div>
                        </div>

                        <a href="driver_details.php" class="btn-primary btn-block" style="margin-top:20px;display:flex;align-items:center;justify-content:center;text-decoration:none;">
                            <i class="fas fa-edit"></i> Edit Vehicle Information
                        </a>
                    </div>
                </div>
            <?php else: ?>
                <div class="dashboard-card">
                    <div class="card-content" style="text-align: center; padding: 60px 20px;">
                        <i class="fas fa-car" style="font-size: 3rem; color: #E5E7EB; margin-bottom: 16px;"></i>
                        <p style="color: #6B7280; font-size: 1rem;">No vehicle information on file.</p>
                        <p style="color: #9CA3AF; font-size: 0.875rem; margin-top: 8px;">Please update your vehicle details in your profile settings.</p>
                    </div>
                </div>
            <?php endif; ?>
        </div>
    </div>
</body>
</html>
