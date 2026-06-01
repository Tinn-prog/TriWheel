<?php
require 'auth.php';
require 'db.php';

require_admin();

header('Content-Type: text/html; charset=utf-8');

// Fetch all passengers
$stmt = $conn->prepare("
    SELECT u.id, u.name, u.email, u.contact_number, u.created_at,
           COUNT(r.id) as ride_count
    FROM users u
    LEFT JOIN rides r ON u.id = r.passenger_id AND r.status = 'completed'
    WHERE u.role = 'passenger'
    GROUP BY u.id
    ORDER BY u.created_at DESC
    LIMIT 100
");
$stmt->execute();
$passengers = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Passenger Verification - TriWheel</title>
    <link rel="stylesheet" href="style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="app-dashboard app-admin">
    <?php require 'navbar.php'; ?>
    
    <div class="dashboard-container">
        <div class="container">
            <div class="dashboard-header">
                <h1><i class="fas fa-user-check"></i> Passenger Verification</h1>
                <p>Review and manage passenger accounts</p>
            </div>

            <?php if (empty($passengers)): ?>
                <div class="dashboard-card">
                    <div class="card-content" style="text-align: center; padding: 60px 20px;">
                        <i class="fas fa-users" style="font-size: 3rem; color: #E5E7EB; margin-bottom: 16px;"></i>
                        <p style="color: #6B7280; font-size: 1rem;">No passengers found.</p>
                    </div>
                </div>
            <?php else: ?>
                <div class="dashboard-card">
                    <div class="card-header" style="background: linear-gradient(135deg, #F4623A, #D94E28);">
                        <h3 style="margin: 0; color: white; flex: 1;"><i class="fas fa-list"></i> All Passengers (<?php echo count($passengers); ?>)</h3>
                    </div>
                    <div class="card-content">
                        <div style="overflow-x: auto;">
                            <table style="width: 100%; border-collapse: collapse; font-size: 0.9375rem;">
                                <thead>
                                    <tr style="border-bottom: 2px solid #E5E7EB; background: #F9FAFB;">
                                        <th style="padding: 12px; text-align: left; font-weight: 600; color: #6B7280;">Name</th>
                                        <th style="padding: 12px; text-align: left; font-weight: 600; color: #6B7280;">Email</th>
                                        <th style="padding: 12px; text-align: left; font-weight: 600; color: #6B7280;">Phone</th>
                                        <th style="padding: 12px; text-align: left; font-weight: 600; color: #6B7280;">Rides Completed</th>
                                        <th style="padding: 12px; text-align: left; font-weight: 600; color: #6B7280;">Joined</th>
                                        <th style="padding: 12px; text-align: left; font-weight: 600; color: #6B7280;">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php foreach ($passengers as $passenger): ?>
                                    <tr style="border-bottom: 1px solid #E5E7EB;">
                                        <td style="padding: 12px; color: #1A1D23; font-weight: 500;">
                                            <i class="fas fa-user-circle" style="margin-right: 8px; color: #6B7280;"></i>
                                            <?php echo htmlspecialchars($passenger['name']); ?>
                                        </td>
                                        <td style="padding: 12px; color: #6B7280;">
                                            <?php echo htmlspecialchars($passenger['email']); ?>
                                        </td>
                                        <td style="padding: 12px; color: #6B7280;">
                                            <?php echo htmlspecialchars($passenger['contact_number'] ?? '-'); ?>
                                        </td>
                                        <td style="padding: 12px;">
                                            <span style="background: #D1FAE5; color: #10B981; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 600;">
                                                <?php echo $passenger['ride_count']; ?> rides
                                            </span>
                                        </td>
                                        <td style="padding: 12px; color: #6B7280; font-size: 0.8125rem;">
                                            <?php echo date('M d, Y', strtotime($passenger['created_at'])); ?>
                                        </td>
                                        <td style="padding: 12px; color: #1A1D23;">
                                            <span style="background: #D1FAE5; color: #10B981; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600;">
                                                <i class="fas fa-check-circle"></i> Verified
                                            </span>
                                        </td>
                                    </tr>
                                    <?php endforeach; ?>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            <?php endif; ?>
        </div>
    </div>
</body>
</html>
