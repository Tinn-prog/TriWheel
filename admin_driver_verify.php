<?php
require 'auth.php';
require 'db.php';

require_admin();

header('Content-Type: text/html; charset=utf-8');

// Fetch all drivers with their information
$stmt = $conn->prepare("
    SELECT d.id, d.user_id, d.license_number, u.name, u.email, u.contact_number, u.created_at as application_date, v.vehicle_type, v.plate_number, v.color
    FROM drivers d
    LEFT JOIN users u ON d.user_id = u.id
    LEFT JOIN vehicles v ON d.id = v.driver_id
    ORDER BY u.created_at DESC
    LIMIT 100
");
$stmt->execute();
$drivers = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Driver Verification - TriWheel</title>
    <link rel="stylesheet" href="style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="app-dashboard app-admin">
    <?php require 'navbar.php'; ?>
    
    <div class="dashboard-container">
        <div class="container">
            <div class="dashboard-header">
                <h1><i class="fas fa-id-card"></i> Driver Verification</h1>
                <p>Review and accept/reject driver applications</p>
            </div>

            <?php if (empty($drivers)): ?>
                <div class="dashboard-card">
                    <div class="card-content" style="text-align: center; padding: 60px 20px;">
                        <i class="fas fa-check-circle" style="font-size: 3rem; color: #10B981; margin-bottom: 16px;"></i>
                        <p style="color: #6B7280; font-size: 1rem;">All drivers have been verified!</p>
                    </div>
                </div>
            <?php else: ?>
                <div style="display: grid; gap: 16px;">
                    <?php foreach ($drivers as $driver): ?>
                    <div class="dashboard-card">
                        <div class="card-header" style="background: linear-gradient(135deg, #0EA5E9, #0369A1); display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <h3 style="margin: 0; color: white; display: flex; align-items: center; gap: 12px;">
                                    <i class="fas fa-user-tie"></i> <?php echo htmlspecialchars($driver['name'] ?? 'N/A'); ?>
                                </h3>
                                <p style="margin: 4px 0 0 0; color: rgba(255,255,255,0.8); font-size: 0.875rem;">
                                    License: <?php echo htmlspecialchars($driver['license_number'] ?? 'N/A'); ?>
                                </p>
                            </div>
                            <span style="background: rgba(255,255,255,0.2); color: white; padding: 6px 14px; border-radius: 20px; font-size: 0.75rem; font-weight: 600;">
                                Applied: <?php echo date('M d, Y', strtotime($driver['application_date'])); ?>
                            </span>
                        </div>
                        <div class="card-content">
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                                <div>
                                    <p style="color: #6B7280; font-size: 0.875rem; margin-bottom: 8px;">
                                        <i class="fas fa-envelope" style="margin-right: 8px;"></i>Email
                                    </p>
                                    <p style="color: #1A1D23; margin: 0;">
                                        <?php echo htmlspecialchars($driver['email'] ?? 'N/A'); ?>
                                    </p>
                                </div>
                                <div>
                                    <p style="color: #6B7280; font-size: 0.875rem; margin-bottom: 8px;">
                                        <i class="fas fa-phone" style="margin-right: 8px;"></i>Phone
                                    </p>
                                    <p style="color: #1A1D23; margin: 0;">
                                        <?php echo htmlspecialchars($driver['contact_number'] ?? 'N/A'); ?>
                                    </p>
                                </div>
                            </div>

                            <?php if ($driver['vehicle_type']): ?>
                            <div style="background: #F3F4F6; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                                <p style="color: #6B7280; font-size: 0.875rem; font-weight: 600; margin-bottom: 12px;">Vehicle Information</p>
                                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px;">
                                    <div>
                                        <p style="color: #6B7280; font-size: 0.75rem; margin-bottom: 4px;">Type</p>
                                        <p style="color: #1A1D23; font-weight: 500; margin: 0;"><?php echo htmlspecialchars($driver['vehicle_type']); ?></p>
                                    </div>
                                    <div>
                                        <p style="color: #6B7280; font-size: 0.75rem; margin-bottom: 4px;">Plate Number</p>
                                        <p style="color: #1A1D23; font-weight: 500; margin: 0;"><?php echo htmlspecialchars($driver['plate_number'] ?? '-'); ?></p>
                                    </div>
                                    <div>
                                        <p style="color: #6B7280; font-size: 0.75rem; margin-bottom: 4px;">Color</p>
                                        <p style="color: #1A1D23; font-weight: 500; margin: 0;"><?php echo htmlspecialchars($driver['color'] ?? '-'); ?></p>
                                    </div>
                                </div>
                            </div>
                            <?php endif; ?>

                            <div style="background: #E0F5FF; padding: 16px; border-radius: 8px; border-left: 4px solid #0EA5E9;">
                                <p style="color: #0369A1; margin: 0; font-weight: 500;">
                                    <i class="fas fa-info-circle" style="margin-right: 8px;"></i>Driver status: Active and Verified
                                </p>
                            </div>
                        </div>
                    </div>
                    <?php endforeach; ?>
                </div>
            <?php endif; ?>
        </div>
    </div>
</body>
</html>
