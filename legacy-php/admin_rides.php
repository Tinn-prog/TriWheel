<?php
require 'auth.php';
require 'db.php';

require_admin();

header('Content-Type: text/html; charset=utf-8');

// Fetch all rides with complete details
$stmt = $conn->prepare("
    SELECT r.*, 
           u.name as passenger_name, u.email as passenger_email,
           du.name as driver_name, du.email as driver_email,
           d.phone as driver_phone,
           v.vehicle_type, v.plate_number
    FROM rides r
    LEFT JOIN users u ON r.passenger_id = u.id
    LEFT JOIN drivers d ON r.driver_id = d.id
    LEFT JOIN users du ON d.user_id = du.id
    LEFT JOIN vehicles v ON d.id = v.driver_id
    ORDER BY r.created_at DESC 
    LIMIT 200
");
$stmt->execute();
$rides = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

// Get statistics
$statsStmt = $conn->query("
    SELECT 
        COUNT(*) as total_rides,
        SUM(fare) as total_revenue,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled
    FROM rides
");
$stats = $statsStmt->fetch_assoc();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rides & Transactions - TriWheel</title>
    <link rel="stylesheet" href="style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="app-dashboard app-admin">
    <?php require 'navbar.php'; ?>
    
    <div class="dashboard-container">
        <div class="container">
            <div class="dashboard-header">
                <h1><i class="fas fa-book"></i> Rides & Transactions</h1>
                <p>View all booking history, transaction details, time and location information</p>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 32px;">
                <div class="dashboard-card">
                    <div class="card-content" style="text-align: center; padding: 20px;">
                        <p style="color: #6B7280; font-size: 0.875rem; margin-bottom: 8px;">Total Rides</p>
                        <p style="color: #1A1D23; font-size: 2rem; font-weight: 700; margin: 0;">
                            <?php echo number_format($stats['total_rides'] ?? 0); ?>
                        </p>
                    </div>
                </div>
                <div class="dashboard-card">
                    <div class="card-content" style="text-align: center; padding: 20px;">
                        <p style="color: #6B7280; font-size: 0.875rem; margin-bottom: 8px;">Total Revenue</p>
                        <p style="color: #10B981; font-size: 2rem; font-weight: 700; margin: 0;">
                            ₱<?php echo number_format($stats['total_revenue'] ?? 0, 2); ?>
                        </p>
                    </div>
                </div>
                <div class="dashboard-card">
                    <div class="card-content" style="text-align: center; padding: 20px;">
                        <p style="color: #6B7280; font-size: 0.875rem; margin-bottom: 8px;">Completed</p>
                        <p style="color: #10B981; font-size: 2rem; font-weight: 700; margin: 0;">
                            <?php echo $stats['completed'] ?? 0; ?>
                        </p>
                    </div>
                </div>
                <div class="dashboard-card">
                    <div class="card-content" style="text-align: center; padding: 20px;">
                        <p style="color: #6B7280; font-size: 0.875rem; margin-bottom: 8px;">Cancelled</p>
                        <p style="color: #EF4444; font-size: 2rem; font-weight: 700; margin: 0;">
                            <?php echo $stats['cancelled'] ?? 0; ?>
                        </p>
                    </div>
                </div>
            </div>

            <div class="dashboard-card">
                <div class="card-header" style="background: linear-gradient(135deg, #F4623A, #D94E28);">
                    <h3 style="margin: 0; color: white; flex: 1;"><i class="fas fa-list"></i> All Rides</h3>
                </div>
                <div class="card-content">
                    <?php if (empty($rides)): ?>
                        <p style="text-align: center; padding: 40px 20px; color: #6B7280;">No rides found.</p>
                    <?php else: ?>
                        <div style="overflow-x: auto;">
                            <table style="width: 100%; border-collapse: collapse; font-size: 0.875rem;">
                                <thead>
                                    <tr style="border-bottom: 2px solid #E5E7EB; background: #F9FAFB;">
                                        <th style="padding: 12px; text-align: left; font-weight: 600; color: #6B7280;">ID</th>
                                        <th style="padding: 12px; text-align: left; font-weight: 600; color: #6B7280;">Passenger</th>
                                        <th style="padding: 12px; text-align: left; font-weight: 600; color: #6B7280;">Driver</th>
                                        <th style="padding: 12px; text-align: left; font-weight: 600; color: #6B7280;">Route</th>
                                        <th style="padding: 12px; text-align: left; font-weight: 600; color: #6B7280;">Status</th>
                                        <th style="padding: 12px; text-align: left; font-weight: 600; color: #6B7280;">Fare</th>
                                        <th style="padding: 12px; text-align: left; font-weight: 600; color: #6B7280;">Time</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php foreach ($rides as $ride): ?>
                                    <tr style="border-bottom: 1px solid #E5E7EB;">
                                        <td style="padding: 12px; color: #6B7280; font-weight: 600;">#<?php echo $ride['id']; ?></td>
                                        <td style="padding: 12px; color: #1A1D23;">
                                            <div style="font-weight: 500;"><?php echo htmlspecialchars($ride['passenger_name'] ?? 'N/A'); ?></div>
                                            <div style="color: #9CA3AF; font-size: 0.75rem;"><?php echo htmlspecialchars($ride['passenger_email'] ?? ''); ?></div>
                                        </td>
                                        <td style="padding: 12px; color: #1A1D23;">
                                            <div style="font-weight: 500;"><?php echo htmlspecialchars($ride['driver_name'] ?? 'Unassigned'); ?></div>
                                            <div style="color: #9CA3AF; font-size: 0.75rem;"><?php echo htmlspecialchars($ride['driver_phone'] ?? ''); ?></div>
                                        </td>
                                        <td style="padding: 12px; color: #6B7280; font-size: 0.8125rem;">
                                            <div><i class="fas fa-map-pin"></i> <?php echo htmlspecialchars(mb_substr($ride['pickup_address'], 0, 20)); ?><?php echo mb_strlen($ride['pickup_address']) > 20 ? '...' : ''; ?></div>
                                            <div><i class="fas fa-map-marker-alt"></i> <?php echo htmlspecialchars(mb_substr($ride['dropoff_address'], 0, 20)); ?><?php echo mb_strlen($ride['dropoff_address']) > 20 ? '...' : ''; ?></div>
                                        </td>
                                        <td style="padding: 12px;">
                                            <span style="background: <?php echo $ride['status'] === 'completed' ? '#D1FAE5' : ($ride['status'] === 'cancelled' ? '#FEE2E2' : ($ride['status'] === 'ongoing' ? '#FEF3C7' : '#E0F5FF')); ?>; color: <?php echo $ride['status'] === 'completed' ? '#10B981' : ($ride['status'] === 'cancelled' ? '#EF4444' : ($ride['status'] === 'ongoing' ? '#F59E0B' : '#0EA5E9')); ?>; padding: 4px 12px; border-radius: 20px; font-size: 0.7rem; font-weight: 600;">
                                                <?php echo ucfirst(str_replace('_', ' ', $ride['status'])); ?>
                                            </span>
                                        </td>
                                        <td style="padding: 12px; color: #10B981; font-weight: 600;">₱<?php echo number_format($ride['fare'] ?? 0, 2); ?></td>
                                        <td style="padding: 12px; color: #6B7280; font-size: 0.8125rem;">
                                            <?php echo date('M d, Y g:i A', strtotime($ride['created_at'])); ?>
                                        </td>
                                    </tr>
                                    <?php endforeach; ?>
                                </tbody>
                            </table>
                        </div>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
