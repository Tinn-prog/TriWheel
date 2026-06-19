<?php
require 'auth.php';
require 'db.php';

if (!isset($_SESSION['user_id']) || $_SESSION['user_role'] !== 'admin') {
    header("Location: login.php");
    exit;
}

header('Content-Type: text/html; charset=utf-8');

// Fetch all users
$stmt = $conn->prepare("
    SELECT id, name, email, contact_number, role, created_at 
    FROM users 
    ORDER BY created_at DESC 
    LIMIT 100
");
$stmt->execute();
$users = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

// Count by role
$roleCountStmt = $conn->query("SELECT role, COUNT(*) as count FROM users GROUP BY role");
$roleCounts = [];
while ($row = $roleCountStmt->fetch_assoc()) {
    $roleCounts[$row['role']] = $row['count'];
}
$totalUsers = array_sum($roleCounts);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Manage Users - TriWheel</title>
    <link rel="stylesheet" href="style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="app-dashboard app-admin">
    <?php require 'navbar.php'; ?>
    
    <div class="dashboard-container">
        <div class="container">
            <div class="dashboard-header">
                <h1><i class="fas fa-users"></i> Manage Users</h1>
                <p>View and manage all users in the system</p>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 32px;">
                <div class="dashboard-card">
                    <div class="card-content" style="text-align: center; padding: 20px;">
                        <p style="color: #6B7280; font-size: 0.875rem; margin-bottom: 8px;">Total Users</p>
                        <p style="color: #1A1D23; font-size: 2rem; font-weight: 700; margin: 0;">
                            <?php echo $totalUsers; ?>
                        </p>
                    </div>
                </div>
                <div class="dashboard-card">
                    <div class="card-content" style="text-align: center; padding: 20px;">
                        <p style="color: #6B7280; font-size: 0.875rem; margin-bottom: 8px;">Passengers</p>
                        <p style="color: #F4623A; font-size: 2rem; font-weight: 700; margin: 0;">
                            <?php echo $roleCounts['passenger'] ?? 0; ?>
                        </p>
                    </div>
                </div>
                <div class="dashboard-card">
                    <div class="card-content" style="text-align: center; padding: 20px;">
                        <p style="color: #6B7280; font-size: 0.875rem; margin-bottom: 8px;">Drivers</p>
                        <p style="color: #0EA5E9; font-size: 2rem; font-weight: 700; margin: 0;">
                            <?php echo $roleCounts['driver'] ?? 0; ?>
                        </p>
                    </div>
                </div>
            </div>

            <div class="dashboard-card">
                <div class="card-header" style="background: linear-gradient(135deg, #F4623A, #D94E28);">
                    <h3 style="margin: 0; color: white; flex: 1;"><i class="fas fa-list"></i> All Users</h3>
                </div>
                <div class="card-content">
                    <?php if (empty($users)): ?>
                        <p style="text-align: center; padding: 40px 20px; color: #6B7280;">No users found.</p>
                    <?php else: ?>
                        <div style="overflow-x: auto;">
                            <table style="width: 100%; border-collapse: collapse; font-size: 0.9375rem;">
                                <thead>
                                    <tr style="border-bottom: 2px solid #E5E7EB; background: #F9FAFB;">
                                        <th style="padding: 12px; text-align: left; font-weight: 600; color: #6B7280;">Name</th>
                                        <th style="padding: 12px; text-align: left; font-weight: 600; color: #6B7280;">Email</th>
                                        <th style="padding: 12px; text-align: left; font-weight: 600; color: #6B7280;">Role</th>
                                        <th style="padding: 12px; text-align: left; font-weight: 600; color: #6B7280;">Phone</th>
                                        <th style="padding: 12px; text-align: left; font-weight: 600; color: #6B7280;">Joined</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php foreach ($users as $user): ?>
                                    <tr style="border-bottom: 1px solid #E5E7EB;">
                                        <td style="padding: 12px; color: #1A1D23; font-weight: 500;">
                                            <i class="fas fa-user-circle" style="margin-right: 8px; color: #6B7280;"></i>
                                            <?php echo htmlspecialchars($user['name']); ?>
                                        </td>
                                        <td style="padding: 12px; color: #6B7280;">
                                            <?php echo htmlspecialchars($user['email']); ?>
                                        </td>
                                        <td style="padding: 12px;">
                                            <span style="background: <?php echo $user['role'] === 'passenger' ? '#FDF0EC' : ($user['role'] === 'driver' ? '#E0F5FF' : '#EFF6FF'); ?>; color: <?php echo $user['role'] === 'passenger' ? '#F4623A' : ($user['role'] === 'driver' ? '#0EA5E9' : '#3B82F6'); ?>; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600;">
                                                <?php echo ucfirst($user['role']); ?>
                                            </span>
                                        </td>
                                        <td style="padding: 12px; color: #6B7280;">
                                            <?php echo htmlspecialchars($user['contact_number'] ?? '-'); ?>
                                        </td>
                                        <td style="padding: 12px; color: #6B7280; font-size: 0.8125rem;">
                                            <?php echo date('M d, Y', strtotime($user['created_at'])); ?>
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
