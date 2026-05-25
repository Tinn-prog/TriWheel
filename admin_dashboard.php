<?php
require 'auth.php';
require 'db.php';

// Only admins
require_admin();

// Admin account status
$adminUserStmt = $conn->prepare("SELECT name, email, role, contact_number FROM users WHERE id = ?");
$adminUserStmt->bind_param("i", $_SESSION['user_id']);
$adminUserStmt->execute();
$adminUser = $adminUserStmt->get_result()->fetch_assoc();
$adminUserStmt->close();

// Summary stats
$totalStmt = $conn->prepare("SELECT COUNT(*) AS total FROM rides");
$totalStmt->execute();
$total = $totalStmt->get_result()->fetch_assoc()['total'] ?? 0;
$totalStmt->close();

$completedStmt = $conn->prepare("SELECT COUNT(*) AS completed FROM rides WHERE status = 'completed'");
$completedStmt->execute();
$completed = $completedStmt->get_result()->fetch_assoc()['completed'] ?? 0;
$completedStmt->close();

$revenueStmt = $conn->prepare("SELECT IFNULL(SUM(fare),0) AS revenue FROM rides WHERE status = 'completed'");
$revenueStmt->execute();
$revenue = $revenueStmt->get_result()->fetch_assoc()['revenue'] ?? 0.00;
$revenueStmt->close();

$driverStatusStmt = $conn->prepare("SELECT status, COUNT(*) AS cnt FROM drivers GROUP BY status");
$driverStatusStmt->execute();
$driverStatusCounts = [];
$driverStatusResult = $driverStatusStmt->get_result();
while ($row = $driverStatusResult->fetch_assoc()) {
    $driverStatusCounts[$row['status']] = $row['cnt'];
}
$driverStatusStmt->close();
$onlineDrivers = $driverStatusCounts['online'] ?? 0;
$offlineDrivers = $driverStatusCounts['offline'] ?? 0;

$driverListStmt = $conn->prepare("SELECT u.name AS driver_name, d.status, v.vehicle_type, v.plate_number FROM drivers d JOIN users u ON u.id = d.user_id LEFT JOIN vehicles v ON v.driver_id = d.id ORDER BY FIELD(d.status,'online','offline') ASC, u.name ASC LIMIT 8");
$driverListStmt->execute();
$driverList = $driverListStmt->get_result();
$driverListStmt->close();

$pendingRequestsStmt = $conn->prepare("SELECT r.id, r.created_at, r.pickup_address, r.dropoff_address, r.ride_type, p.name AS passenger_name FROM rides r JOIN users p ON p.id = r.passenger_id JOIN (SELECT passenger_id, MAX(id) AS latest_request_id FROM rides WHERE status = 'requested' GROUP BY passenger_id) latest ON r.passenger_id = latest.passenger_id AND r.id = latest.latest_request_id WHERE r.status = 'requested' ORDER BY r.created_at DESC LIMIT 10");
$pendingRequestsStmt->execute();
$pendingRequests = $pendingRequestsStmt->get_result();
$pendingCount = $pendingRequests->num_rows;

$activeDriversStmt = $conn->prepare("SELECT COUNT(*) AS active FROM drivers WHERE status = 'online'");
$activeDriversStmt->execute();
$activeDrivers = $activeDriversStmt->get_result()->fetch_assoc()['active'] ?? 0;
$activeDriversStmt->close();

// Peak hours
$peakStmt = $conn->prepare("SELECT HOUR(created_at) AS hour, COUNT(*) AS cnt FROM rides GROUP BY hour ORDER BY cnt DESC LIMIT 5");
$peakStmt->execute();
$peak = $peakStmt->get_result();
$peakHours = [];
while ($row = $peak->fetch_assoc()) {
    $peakHours[] = $row;
}
$peakStmt->close();

// Recent transactions
$recentStmt = $conn->prepare(
    "SELECT r.id, r.status, r.fare, r.created_at, r.pickup_address, r.dropoff_address, p.name AS passenger_name, du.name AS driver_name
     FROM rides r
     LEFT JOIN users p ON r.passenger_id = p.id
     LEFT JOIN drivers dr ON r.driver_id = dr.id
     LEFT JOIN users du ON dr.user_id = du.id
     WHERE r.id IN (
         SELECT MAX(id) FROM rides
         GROUP BY passenger_id,
                  LOWER(TRIM(pickup_address)),
                  LOWER(TRIM(dropoff_address)),
                  DATE_FORMAT(created_at, '%Y-%m-%d %H:%i')
     )
     ORDER BY r.created_at DESC
     LIMIT 50"
);
$recentStmt->execute();
$recentResult = $recentStmt->get_result();
$recentRows = [];
while ($r = $recentResult->fetch_assoc()) {
    $recentRows[] = $r;
}
$recentCount = count($recentRows);
$recentStmt->close();

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Admin Dashboard - TriWheel</title>
    <link rel="stylesheet" href="style.css">
    <link rel="stylesheet" href="auth.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        .transactions table {
            width: 100%;
            border-collapse: collapse;
            min-width: 820px;
        }
        .transactions th,
        .transactions td {
            padding: 12px 14px;
            border-bottom: 1px solid #f1f1f1;
            text-align: left;
            font-size: 0.95rem;
            color: #495057;
        }
        .transactions thead th {
            background: #fff;
            color: #343a40;
            font-weight: 700;
        }
        .transactions tbody tr:hover {
            background: #f8f9fa;
        }
        .request-table {
            width: 100%;
            border-collapse: collapse;
        }
        .request-table th,
        .request-table td {
            padding: 12px 14px;
            border-bottom: 1px solid #f1f1f1;
            text-align: left;
            font-size: 0.95rem;
            color: #495057;
        }
        .request-table thead th {
            background: #fff;
            color: #343a40;
            font-weight: 700;
        }
        .request-table tbody tr:hover {
            background: #f8f9fa;
        }
        .peak-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        .peak-list li {
            margin-bottom: 14px;
            font-size: 0.98rem;
            color: #343a40;
        }
        .peak-list li strong {
            display: inline-block;
            min-width: 90px;
            color: #212529;
        }
        .small-muted {
            color: #6c757d;
            font-size: 0.9rem;
        }
    </style>
</head>
<body>
    <nav class="navbar">
        <div class="nav-container">
            <div class="logo logo-header">
                <img src="logo-header.png" alt="TriWheel Logo" class="logo-img">
                <span class="logo-text">TriWheel</span>
            </div>
            <div class="nav-links desktop-only">
                <span class="user-greeting">Welcome, <strong><?php echo htmlspecialchars($_SESSION['user_name'] ?? 'Admin'); ?></strong></span>
                <form action="logout.php" method="post" style="display:inline">
                    <button class="btn-secondary" type="submit"><i class="fas fa-sign-out-alt"></i> Logout</button>
                </form>
            </div>
        </div>
    </nav>

    <main class="dashboard-container">
        <div class="container" style="max-width:1200px;margin:0 auto;padding:20px;">
            <div class="dashboard-header">
                <h1>Admin Monitoring Dashboard</h1>
                <p>Monitor transactions, bookings and platform activity.</p>
                <div style="margin-top:16px;display:flex;flex-wrap:wrap;gap:12px;justify-content:center;">
                    <a href="admin_status.php" class="btn-secondary" style="padding:10px 18px;">Admin Status Configuration</a>
                </div>
            </div>

            <div class="dashboard-grid" style="margin-top:2rem; gap:20px;">
                <div class="dashboard-card" style="padding: 24px; text-align:center;">
                    <h3>Total Rides</h3>
                    <div style="font-size:1.8rem;font-weight:700;margin-top:14px;"><?php echo intval($total); ?></div>
                </div>
                <div class="dashboard-card" style="padding: 24px; text-align:center;">
                    <h3>Completed Rides</h3>
                    <div style="font-size:1.8rem;font-weight:700;margin-top:14px;"><?php echo intval($completed); ?></div>
                </div>
                <div class="dashboard-card" style="padding: 24px; text-align:center;">
                    <h3>Total Revenue (₱)</h3>
                    <div style="font-size:1.8rem;font-weight:700;margin-top:14px;"><?php echo number_format((float)$revenue,2); ?></div>
                </div>
                <div class="dashboard-card" style="padding: 24px; text-align:center;">
                    <h3>Active Drivers</h3>
                    <div style="font-size:1.8rem;font-weight:700;margin-top:14px;"><?php echo intval($activeDrivers); ?></div>
                </div>
            </div>

        <div class="dashboard-grid">
            <div class="dashboard-card">
                <div class="card-header">
                    <h3><i class="fas fa-user-shield"></i> Admin Status</h3>
                </div>
                <div class="card-content">
                    <div class="detail-row"><strong>Email:</strong><span><?php echo htmlspecialchars($adminUser['email'] ?? 'N/A'); ?></span></div>
                    <div class="detail-row"><strong>Name:</strong><span><?php echo htmlspecialchars($adminUser['name'] ?? 'N/A'); ?></span></div>
                    <div class="detail-row"><strong>Role:</strong><span><?php echo htmlspecialchars($adminUser['role'] ?? 'N/A'); ?></span></div>
                    <div class="detail-row"><strong>Account Status:</strong>
                        <span style="color: <?php echo ($adminUser['role'] === 'admin' ? '#198754' : '#dc3545'); ?>; font-weight: 700;">
                            <?php echo ($adminUser['role'] === 'admin' ? 'Ready' : 'Requires attention'); ?>
                        </span>
                    </div>
                    <div class="detail-row" style="margin-top:15px;">
                        <p style="margin:0;color:var(--gray);">This page checks your admin role and helps you review driver activity and pending passenger ride requests.</p>
                    </div>
                </div>
            </div>
            <div class="dashboard-card">
                <div class="card-header">
                    <h3><i class="fas fa-car-side"></i> Driver Overview</h3>
                </div>
                <div class="card-content">
                    <div class="detail-row"><strong>Online Drivers:</strong><span><?php echo intval($onlineDrivers); ?></span></div>
                    <div class="detail-row"><strong>Offline Drivers:</strong><span><?php echo intval($offlineDrivers); ?></span></div>
                    <div style="margin-top:18px;">
                        <h4 style="margin-bottom:10px;font-size:1rem;color:var(--dark);">Latest Drivers</h4>
                        <?php if ($driverList && $driverList->num_rows > 0): ?>
                            <ul style="list-style:none;padding:0;margin:0;">
                                <?php while ($driver = $driverList->fetch_assoc()): ?>
                                    <li style="padding:10px 0;border-bottom:1px solid var(--gray-light);display:flex;justify-content:space-between;align-items:center;">
                                        <span><?php echo htmlspecialchars($driver['driver_name']); ?></span>
                                        <span style="color:<?php echo $driver['status'] === 'online' ? '#198754' : '#6c757d'; ?>;font-weight:600;"><?php echo ucfirst($driver['status']); ?></span>
                                    </li>
                                <?php endwhile; ?>
                            </ul>
                        <?php else: ?>
                            <p>No drivers found.</p>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
            </div>

        <div class="dashboard-grid" style="margin-top:24px;">
            <div class="dashboard-card peak-card">
                <div class="card-header">
                    <h3><i class="fas fa-chart-line"></i> Peak Hours</h3>
                </div>
                <div class="card-content">
                    <ul class="peak-list">
                        <?php foreach($peakHours as $h): ?>
                            <li>
                                <strong><?php echo date('g:00 A', strtotime($h['hour'] . ':00')); ?></strong>
                                — <?php echo intval($h['cnt']); ?> ride<?php echo intval($h['cnt']) === 1 ? '' : 's'; ?>
                            </li>
                        <?php endforeach; ?>
                    </ul>
                </div>
            </div>
            <div class="dashboard-card requests-card">
                <div class="card-header">
                    <h3><i class="fas fa-bell"></i> Pending Ride Requests</h3>
                </div>
                <div class="card-content">
                    <div class="detail-row" style="margin-bottom:18px;">
                        <strong>Total Requests:</strong>
                        <span style="font-size:1.05rem;font-weight:700;color:#495057;"><?php echo intval($pendingCount); ?></span>
                    </div>
                    <?php if ($pendingCount > 0): ?>
                        <div style="margin-top:0;overflow:auto;">
                            <table class="request-table">
                                <thead>
                                    <tr>
                                        <th>Passenger</th>
                                        <th>Pickup</th>
                                        <th>Time</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php while ($request = $pendingRequests->fetch_assoc()): ?>
                                    <tr>
                                        <td><?php echo htmlspecialchars($request['passenger_name']); ?></td>
                                        <td><?php echo htmlspecialchars(substr($request['pickup_address'], 0, 30)); ?><?php echo strlen($request['pickup_address'] ?? '') > 30 ? '...' : ''; ?></td>
                                        <td><?php echo date('h:i A', strtotime($request['created_at'])); ?></td>
                                    </tr>
                                    <?php endwhile; ?>
                                </tbody>
                            </table>
                        </div>
                    <?php else: ?>
                        <p>No passengers have requested a ride at the moment.</p>
                    <?php endif; ?>
                </div>
            </div>
        </div>
        <div class="dashboard-grid" style="margin-top:24px;">
            <div class="dashboard-card transactions-card" style="grid-column:1/-1;">
                <div class="card-header">
                    <h3><i class="fas fa-history"></i> Recent Transactions</h3>
                </div>
                <div class="card-content">
                    <div class="detail-row" style="margin-bottom:18px;">
                        <strong>Total Transactions:</strong>
                        <span style="font-size:1.05rem;font-weight:700;color:#495057;"><?php echo intval($recentCount); ?></span>
                    </div>
                    <div style="margin-top:0;overflow:auto;">
                        <table class="request-table">
                            <thead>
                                <tr>
                                    <th>Passenger</th>
                                    <th>Pickup</th>
                                    <th>Dropoff</th>
                                    <th>Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($recentRows as $row): ?>
                                    <tr>
                                        <td><?php echo htmlspecialchars($row['passenger_name'] ?? '—'); ?></td>
                                        <td><?php echo htmlspecialchars(substr($row['pickup_address'] ?? '—', 0, 30)); ?><?php echo strlen($row['pickup_address'] ?? '') > 30 ? '...' : ''; ?></td>
                                        <td><?php echo htmlspecialchars(substr($row['dropoff_address'] ?? '—', 0, 30)); ?><?php echo strlen($row['dropoff_address'] ?? '') > 30 ? '...' : ''; ?></td>
                                        <td><?php echo htmlspecialchars(date('h:i A', strtotime($row['created_at']))); ?></td>
                                    </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </main>
</body>
</html>
