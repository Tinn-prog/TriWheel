<?php
require 'auth.php';
require 'db.php';
require 'system_helpers.php';

// Only admins
require_admin();
header('Content-Type: text/html; charset=utf-8');
triwheel_ensure_schema($conn);

// Handle AJAX requests for getting driver/passenger data (MUST be before HTML output)
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['action'])) {
    if ($_GET['action'] === 'get_driver_data' && isset($_GET['driver_id'])) {
        $driverId = intval($_GET['driver_id']);
        $stmt = $conn->prepare(
            "SELECT d.id AS driver_id, u.name AS driver_name, u.email AS driver_email, u.contact_number AS driver_contact,
                    d.phone AS driver_phone, d.license_number, d.approval_status
             FROM drivers d
             JOIN users u ON u.id = d.user_id
             WHERE d.id = ?"
        );
        $stmt->bind_param('i', $driverId);
        $stmt->execute();
        $result = $stmt->get_result();
        if ($result->num_rows > 0) {
            $driver = $result->fetch_assoc();
            header('Content-Type: application/json');
            echo json_encode(['success' => true, 'driver' => $driver]);
        } else {
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'message' => 'Driver not found']);
        }
        $stmt->close();
        exit;
    } elseif ($_GET['action'] === 'get_passenger_data' && isset($_GET['passenger_id'])) {
        $passengerId = intval($_GET['passenger_id']);
        $stmt = $conn->prepare(
            "SELECT u.id AS passenger_id, u.name AS passenger_name, u.email, u.contact_number
             FROM users u
             WHERE u.id = ? AND u.role = 'passenger'"
        );
        $stmt->bind_param('i', $passengerId);
        $stmt->execute();
        $result = $stmt->get_result();
        if ($result->num_rows > 0) {
            $passenger = $result->fetch_assoc();
            header('Content-Type: application/json');
            echo json_encode(['success' => true, 'passenger' => $passenger]);
        } else {
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'message' => 'Passenger not found']);
        }
        $stmt->close();
        exit;
    }
}

// Handle POST requests for updating driver/passenger (MUST be before HTML output)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    if ($_POST['action'] === 'admin_edit_driver' && isset($_POST['driver_id'])) {
        $driverId = intval($_POST['driver_id']);
        $name = $_POST['name'] ?? '';
        $email = $_POST['email'] ?? '';
        $contactNumber = $_POST['contact_number'] ?? '';
        $phone = $_POST['phone'] ?? '';
        $licenseNumber = $_POST['license_number'] ?? '';
        $approvalStatus = $_POST['approval_status'] ?? 'pending';

        if (empty($name) || empty($email)) {
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'message' => 'Name and email are required']);
            exit;
        }

        // Update user info
        $userStmt = $conn->prepare("SELECT user_id FROM drivers WHERE id = ?");
        $userStmt->bind_param('i', $driverId);
        $userStmt->execute();
        $userResult = $userStmt->get_result();
        if ($userResult->num_rows === 0) {
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'message' => 'Driver not found']);
            exit;
        }
        $userId = $userResult->fetch_assoc()['user_id'];
        $userStmt->close();

        $updateUserStmt = $conn->prepare("UPDATE users SET name = ?, email = ?, contact_number = ? WHERE id = ?");
        $updateUserStmt->bind_param('sssi', $name, $email, $contactNumber, $userId);
        if (!$updateUserStmt->execute()) {
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'message' => 'Failed to update user']);
            exit;
        }
        $updateUserStmt->close();

        // Update driver info
        $updateDriverStmt = $conn->prepare("UPDATE drivers SET phone = ?, license_number = ?, approval_status = ? WHERE id = ?");
        $updateDriverStmt->bind_param('sssi', $phone, $licenseNumber, $approvalStatus, $driverId);
        if (!$updateDriverStmt->execute()) {
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'message' => 'Failed to update driver']);
            exit;
        }
        $updateDriverStmt->close();

        header('Content-Type: application/json');
        echo json_encode(['success' => true, 'message' => 'Driver updated successfully']);
        exit;
    } elseif ($_POST['action'] === 'admin_edit_passenger' && isset($_POST['passenger_id'])) {
        $passengerId = intval($_POST['passenger_id']);
        $name = $_POST['name'] ?? '';
        $email = $_POST['email'] ?? '';
        $contactNumber = $_POST['contact_number'] ?? '';

        if (empty($name) || empty($email)) {
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'message' => 'Name and email are required']);
            exit;
        }

        $updateStmt = $conn->prepare("UPDATE users SET name = ?, email = ?, contact_number = ? WHERE id = ? AND role = 'passenger'");
        $updateStmt->bind_param('sssi', $name, $email, $contactNumber, $passengerId);
        if (!$updateStmt->execute()) {
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'message' => 'Failed to update passenger']);
            exit;
        }
        $updateStmt->close();

        header('Content-Type: application/json');
        echo json_encode(['success' => true, 'message' => 'Passenger updated successfully']);
        exit;
    }
}

// Fetch data using helper functions
$platformStats = admin_get_platform_stats($conn);
$driverCounts = admin_get_driver_status_counts($conn);
$driverList = admin_get_drivers_list($conn, 8);
$pendingRequests = admin_get_pending_requests($conn, 10);
$pendingCount = $pendingRequests->num_rows;
$avgRating = admin_get_average_rating($conn);
$peakHours = admin_get_peak_hours($conn, 5);
$auditLogs = admin_get_audit_logs($conn, 6);
$rideReport = admin_get_30_day_ride_report($conn);
$topDrivers30Day = admin_get_top_drivers_last_30_days($conn, 3);

$driverDetailsStmt = $conn->prepare(
    "SELECT d.id AS driver_id, u.name AS driver_name, u.email AS driver_email, u.contact_number AS driver_contact,
            d.phone AS driver_phone, d.license_number, d.approval_status, d.rejection_reason,
            d.license_file, d.toda_id_file, v.vehicle_type, v.plate_number, d.status
     FROM drivers d
     JOIN users u ON u.id = d.user_id
     LEFT JOIN vehicles v ON v.driver_id = d.id
     ORDER BY FIELD(d.status,'online','offline') ASC, u.name ASC"
);
$driverDetailsStmt->execute();
$driverDetails = $driverDetailsStmt->get_result();
$driverDetailsStmt->close();

$passengerDetailsStmt = $conn->prepare(
    "SELECT u.id AS passenger_id, u.name AS passenger_name, u.email, u.contact_number,
            COALESCE(COUNT(r.id), 0) AS completed_rides
     FROM users u
     LEFT JOIN rides r ON r.passenger_id = u.id AND r.status = 'completed'
     WHERE u.role = 'passenger'
     GROUP BY u.id
     ORDER BY u.name ASC"
);
$passengerDetailsStmt->execute();
$passengerDetails = $passengerDetailsStmt->get_result();
$passengerDetailsStmt->close();

// Extract stats for easier access
$total = $platformStats['total'];
$completed = $platformStats['completed'];
$revenue = $platformStats['revenue'];
$cancelled = $platformStats['cancelled'];
$onlineDrivers = $driverCounts['online'] ?? 0;
$offlineDrivers = $driverCounts['offline'] ?? 0;

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Admin Dashboard - TriWheel</title>
    <link rel="stylesheet" href="style.css?v=fitcards4">
    <link rel="stylesheet" href="auth.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
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
        .ops-strip {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
            gap: 14px;
            margin-top: 24px;
        }
        .ops-tile {
            background: #fff;
            border: 1px solid #eef0f3;
            border-radius: 12px;
            padding: 18px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.06);
        }
        .ops-tile strong {
            display: block;
            color: #212529;
            font-size: 1.35rem;
            margin-top: 6px;
        }
        .audit-list {
            display: grid;
            gap: 10px;
        }
        .audit-item {
            border: 1px solid #eef0f3;
            border-radius: 10px;
            padding: 12px;
            background: #fff;
        }
        .audit-item span {
            display: block;
        }
    </style>
</head>
<body class="app-dashboard app-admin">
    <!-- Persistent Sidebar Navigation -->
    <?php require 'navbar.php'; ?>

    <main class="dashboard-container" id="dashboard-top">
        <div class="container" style="max-width:1400px;padding:20px;">
            <div class="dashboard-header">
                <h1>Admin Monitoring Dashboard</h1>
                <p>Monitor transactions, bookings and platform activity.</p>
            </div>

            <div class="dashboard-card" style="margin-top:2rem;">
                <div class="card-header">
                    <h3><i class="fas fa-chart-bar"></i> 30-Day Ride Report</h3>
                </div>
                <div class="card-content">
                    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:14px;">
                        <div style="background:#f8f9fa;border-radius:10px;padding:14px;text-align:center;">
                            <strong><?php echo intval($rideReport['completed_rides'] ?? 0); ?></strong>
                            <div style="font-size:0.85rem;color:#666;margin-top:6px;">Completed rides</div>
                        </div>
                        <div style="background:#f8f9fa;border-radius:10px;padding:14px;text-align:center;">
                            <strong><?php echo intval($rideReport['cancelled_rides'] ?? 0); ?></strong>
                            <div style="font-size:0.85rem;color:#666;margin-top:6px;">Cancelled rides</div>
                        </div>
                        <div style="background:#f8f9fa;border-radius:10px;padding:14px;text-align:center;">
                            <strong>₱<?php echo number_format(floatval($rideReport['total_fare'] ?? 0), 2); ?></strong>
                            <div style="font-size:0.85rem;color:#666;margin-top:6px;">Total fare</div>
                        </div>
                        <div style="background:#f8f9fa;border-radius:10px;padding:14px;text-align:center;">
                            <strong><?php echo number_format(floatval($rideReport['avg_rating'] ?? 0), 1); ?>/5</strong>
                            <div style="font-size:0.85rem;color:#666;margin-top:6px;">Average rating</div>
                        </div>
                    </div>
                    <div style="font-size:0.9rem;color:#333;">
                        <strong>Top drivers:</strong>
                        <?php if ($topDrivers30Day && $topDrivers30Day->num_rows > 0): ?>
                            <?php
                                $driverRankings = [];
                                while ($topDriver = $topDrivers30Day->fetch_assoc()) {
                                    $driverRankings[] = htmlspecialchars($topDriver['name']) . ' (' . intval($topDriver['completed_rides']) . ')';
                                }
                                echo implode(', ', $driverRankings);
                            ?>
                        <?php else: ?>
                            No completed rides yet.
                        <?php endif; ?>
                    </div>
                </div>
            </div>

            <div class="dashboard-card" id="driver-details" style="margin-top:24px;">
                <div class="card-header">
                    <h3><i class="fas fa-users"></i> Driver Details</h3>
                </div>
                <div class="card-content" style="overflow:auto;max-height:420px;">
                    <table class="details-table">
                        <thead>
                            <tr>
                                <th style="padding:10px;border-bottom:1px solid #ddd;text-align:left;">Name</th>
                                <th style="padding:10px;border-bottom:1px solid #ddd;text-align:left;">Email</th>
                                <th style="padding:10px;border-bottom:1px solid #ddd;text-align:left;">Contact</th>
                                <th style="padding:10px;border-bottom:1px solid #ddd;text-align:left;">Phone</th>
                                <th style="padding:10px;border-bottom:1px solid #ddd;text-align:left;">Status</th>
                                <th style="padding:10px;border-bottom:1px solid #ddd;text-align:left;">License</th>
                                <th style="padding:10px;border-bottom:1px solid #ddd;text-align:left;">Approval</th>
                                <th style="padding:10px;border-bottom:1px solid #ddd;text-align:left;">Vehicle</th>
                                <th style="padding:10px;border-bottom:1px solid #ddd;text-align:left;">Plate</th>
                                <th style="padding:10px;border-bottom:1px solid #ddd;text-align:center;">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php if ($driverDetails && $driverDetails->num_rows > 0): ?>
                                <?php while ($driver = $driverDetails->fetch_assoc()): ?>
                                    <tr>
                                        <td style="padding:10px;border-bottom:1px solid #f0f0f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:160px;">
                                            <?php echo htmlspecialchars($driver['driver_name']); ?>
                                        </td>
                                        <td style="padding:10px;border-bottom:1px solid #f0f0f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:160px;">
                                            <?php echo htmlspecialchars($driver['driver_email']); ?>
                                        </td>
                                        <td style="padding:10px;border-bottom:1px solid #f0f0f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px;">
                                            <?php echo htmlspecialchars($driver['driver_contact']); ?>
                                        </td>
                                        <td style="padding:10px;border-bottom:1px solid #f0f0f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100px;">
                                            <?php echo htmlspecialchars($driver['driver_phone'] ?? '—'); ?>
                                        </td>
                                        <td style="padding:10px;border-bottom:1px solid #f0f0f0;color:<?php echo $driver['status'] === 'online' ? '#198754' : '#6c757d'; ?>;font-weight:600;">
                                            <?php echo ucfirst(htmlspecialchars($driver['status'])); ?>
                                        </td>
                                        <td style="padding:10px;border-bottom:1px solid #f0f0f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px;">
                                            <?php echo htmlspecialchars($driver['license_number']); ?>
                                        </td>
                                        <td style="padding:10px;border-bottom:1px solid #f0f0f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:130px;color:<?php echo ($driver['approval_status'] === 'approved' ? '#198754' : ($driver['approval_status'] === 'rejected' ? '#dc3545' : '#6c757d')); ?>;font-weight:700;">
                                            <?php echo ucfirst(htmlspecialchars($driver['approval_status'] ?? 'pending')); ?>
                                        </td>
                                        <td style="padding:10px;border-bottom:1px solid #f0f0f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px;">
                                            <?php echo htmlspecialchars($driver['vehicle_type'] ?? '—'); ?>
                                        </td>
                                        <td style="padding:10px;border-bottom:1px solid #f0f0f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100px;">
                                            <?php echo htmlspecialchars($driver['plate_number'] ?? '—'); ?>
                                        </td>
                                        <td style="padding:10px;border-bottom:1px solid #f0f0f0;text-align:center;">
                                            <button type="button" class="btn-secondary btn-xs" onclick="openEditDriverModal(<?php echo intval($driver['driver_id']); ?>)">Edit</button>
                                        </td>
                                    </tr>
                                <?php endwhile; ?>
                            <?php else: ?>
                                <tr>
                                    <td colspan="10" style="padding:10px;text-align:center;color:#666;">No driver records found.</td>
                                </tr>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="dashboard-card" id="passenger-details" style="margin-top:24px;">
                <div class="card-header">
                    <h3><i class="fas fa-user"></i> Passenger Details</h3>
                </div>
                <div class="card-content" style="overflow:auto;max-height:420px;">
                    <table class="details-table">
                        <thead>
                            <tr>
                                <th style="padding:10px;border-bottom:1px solid #ddd;text-align:left;">Name</th>
                                <th style="padding:10px;border-bottom:1px solid #ddd;text-align:left;">Email</th>
                                <th style="padding:10px;border-bottom:1px solid #ddd;text-align:left;">Contact</th>
                                <th style="padding:10px;border-bottom:1px solid #ddd;text-align:left;">Completed Rides</th>
                                <th style="padding:10px;border-bottom:1px solid #ddd;text-align:center;">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php if ($passengerDetails && $passengerDetails->num_rows > 0): ?>
                                <?php while ($passenger = $passengerDetails->fetch_assoc()): ?>
                                    <tr>
                                        <td style="padding:10px;border-bottom:1px solid #f0f0f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px;">
                                            <?php echo htmlspecialchars($passenger['passenger_name']); ?>
                                        </td>
                                        <td style="padding:10px;border-bottom:1px solid #f0f0f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px;">
                                            <?php echo htmlspecialchars($passenger['email']); ?>
                                        </td>
                                        <td style="padding:10px;border-bottom:1px solid #f0f0f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:140px;">
                                            <?php echo htmlspecialchars($passenger['contact_number']); ?>
                                        </td>
                                        <td style="padding:10px;border-bottom:1px solid #f0f0f0;">
                                            <?php echo intval($passenger['completed_rides']); ?>
                                        </td>
                                        <td style="padding:10px;border-bottom:1px solid #f0f0f0;text-align:center;">
                                            <button type="button" class="btn-secondary btn-xs" onclick="openEditPassengerModal(<?php echo intval($passenger['passenger_id']); ?>)">Edit</button>
                                        </td>
                                    </tr>
                                <?php endwhile; ?>
                            <?php else: ?>
                                <tr>
                                    <td colspan="5" style="padding:10px;text-align:center;color:#666;">No passenger records found.</td>
                                </tr>
                            <?php endif; ?>
                        </tbody>
                    </table>
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
            <div class="dashboard-card requests-card" id="pending-requests">
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
            <div class="dashboard-card" id="admin-audit-log" style="grid-column:1/-1;">
                <div class="card-header">
                    <h3><i class="fas fa-clipboard-check"></i> Admin Audit Log</h3>
                </div>
                <div class="card-content">
                    <?php if ($auditLogs && $auditLogs->num_rows > 0): ?>
                        <div class="audit-list">
                            <?php while ($audit = $auditLogs->fetch_assoc()): ?>
                                <div class="audit-item">
                                    <strong><?php echo htmlspecialchars(str_replace('_', ' ', ucwords($audit['action'], '_'))); ?></strong>
                                    <span class="small-muted">
                                        <?php echo htmlspecialchars($audit['admin_name'] ?? 'Admin'); ?>
                                        updated <?php echo htmlspecialchars($audit['target_type']); ?> #<?php echo intval($audit['target_id']); ?>
                                        on <?php echo date('M d, h:i A', strtotime($audit['created_at'])); ?>
                                    </span>
                                    <?php if (!empty($audit['details'])): ?>
                                        <span><?php echo htmlspecialchars($audit['details']); ?></span>
                                    <?php endif; ?>
                                </div>
                            <?php endwhile; ?>
                        </div>
                    <?php else: ?>
                        <p class="small-muted" style="margin:0;">No admin changes recorded yet. Approvals, rejections, and account edits will appear here.</p>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    </main>

    <!-- Modal for Editing Driver -->
    <div id="editDriverModal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:1000;overflow:auto;">
        <div style="background:#fff;margin:50px auto;padding:30px;border-radius:10px;max-width:500px;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
            <h3 style="margin-top:0;">Edit Driver Account</h3>
            <form id="editDriverForm" style="display:flex;flex-direction:column;gap:15px;">
                <input type="hidden" id="driverId" name="driver_id">
                <input type="hidden" name="action" value="admin_edit_driver">
                <div>
                    <label style="display:block;font-weight:600;margin-bottom:5px;color:#333;">Name</label>
                    <input type="text" id="driverName" name="name" required style="width:100%;padding:10px;border:1px solid #ccc;border-radius:5px;box-sizing:border-box;font-size:0.95rem;">
                </div>
                <div>
                    <label style="display:block;font-weight:600;margin-bottom:5px;color:#333;">Email</label>
                    <input type="email" id="driverEmail" name="email" required style="width:100%;padding:10px;border:1px solid #ccc;border-radius:5px;box-sizing:border-box;font-size:0.95rem;">
                </div>
                <div>
                    <label style="display:block;font-weight:600;margin-bottom:5px;color:#333;">Contact Number</label>
                    <input type="text" id="driverContact" name="contact_number" style="width:100%;padding:10px;border:1px solid #ccc;border-radius:5px;box-sizing:border-box;font-size:0.95rem;">
                </div>
                <div>
                    <label style="display:block;font-weight:600;margin-bottom:5px;color:#333;">Phone</label>
                    <input type="text" id="driverPhone" name="phone" style="width:100%;padding:10px;border:1px solid #ccc;border-radius:5px;box-sizing:border-box;font-size:0.95rem;">
                </div>
                <div>
                    <label style="display:block;font-weight:600;margin-bottom:5px;color:#333;">License Number</label>
                    <input type="text" id="licenseNumber" name="license_number" style="width:100%;padding:10px;border:1px solid #ccc;border-radius:5px;box-sizing:border-box;font-size:0.95rem;">
                </div>
                <div>
                    <label style="display:block;font-weight:600;margin-bottom:5px;color:#333;">Approval Status</label>
                    <select id="approvalStatus" name="approval_status" style="width:100%;padding:10px;border:1px solid #ccc;border-radius:5px;box-sizing:border-box;font-size:0.95rem;">
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                    </select>
                </div>
                <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:10px;">
                    <button type="button" class="btn-secondary" onclick="closeEditDriverModal()">Cancel</button>
                    <button type="submit" class="btn-primary">Save Changes</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Modal for Editing Passenger -->
    <div id="editPassengerModal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:1000;overflow:auto;">
        <div style="background:#fff;margin:50px auto;padding:30px;border-radius:10px;max-width:500px;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
            <h3 style="margin-top:0;">Edit Passenger Account</h3>
            <form id="editPassengerForm" style="display:flex;flex-direction:column;gap:15px;">
                <input type="hidden" id="passengerId" name="passenger_id">
                <input type="hidden" name="action" value="admin_edit_passenger">
                <div>
                    <label style="display:block;font-weight:600;margin-bottom:5px;color:#333;">Name</label>
                    <input type="text" id="passengerName" name="name" required style="width:100%;padding:10px;border:1px solid #ccc;border-radius:5px;box-sizing:border-box;font-size:0.95rem;">
                </div>
                <div>
                    <label style="display:block;font-weight:600;margin-bottom:5px;color:#333;">Email</label>
                    <input type="email" id="passengerEmail" name="email" required style="width:100%;padding:10px;border:1px solid #ccc;border-radius:5px;box-sizing:border-box;font-size:0.95rem;">
                </div>
                <div>
                    <label style="display:block;font-weight:600;margin-bottom:5px;color:#333;">Contact Number</label>
                    <input type="text" id="passengerContact" name="contact_number" style="width:100%;padding:10px;border:1px solid #ccc;border-radius:5px;box-sizing:border-box;font-size:0.95rem;">
                </div>
                <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:10px;">
                    <button type="button" class="btn-secondary" onclick="closeEditPassengerModal()">Cancel</button>
                    <button type="submit" class="btn-primary">Save Changes</button>
                </div>
            </form>
        </div>
    </div>

    <script>
        function openEditDriverModal(driverId) {
            const url = window.location.pathname + '?action=get_driver_data&driver_id=' + driverId;
            console.log('Fetching driver data from:', url);
            fetch(url)
                .then(response => {
                    console.log('Response status:', response.status);
                    if (!response.ok) throw new Error('Network error: ' + response.status);
                    return response.text();
                })
                .then(text => {
                    console.log('Response text:', text);
                    return JSON.parse(text);
                })
                .then(data => {
                    console.log('Parsed data:', data);
                    if (data.success) {
                        document.getElementById('driverId').value = data.driver.driver_id;
                        document.getElementById('driverName').value = data.driver.driver_name;
                        document.getElementById('driverEmail').value = data.driver.driver_email;
                        document.getElementById('driverContact').value = data.driver.driver_contact || '';
                        document.getElementById('driverPhone').value = data.driver.driver_phone || '';
                        document.getElementById('licenseNumber').value = data.driver.license_number || '';
                        document.getElementById('approvalStatus').value = data.driver.approval_status || 'pending';
                        document.getElementById('editDriverModal').style.display = 'block';
                    } else {
                        alert('Error loading driver data: ' + (data.message || 'Unknown error'));
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('Error loading driver: ' + error.message);
                });
        }

        function closeEditDriverModal() {
            document.getElementById('editDriverModal').style.display = 'none';
        }

        function openEditPassengerModal(passengerId) {
            const url = window.location.pathname + '?action=get_passenger_data&passenger_id=' + passengerId;
            console.log('Fetching passenger data from:', url);
            fetch(url)
                .then(response => {
                    console.log('Response status:', response.status);
                    if (!response.ok) throw new Error('Network error: ' + response.status);
                    return response.text();
                })
                .then(text => {
                    console.log('Response text:', text);
                    return JSON.parse(text);
                })
                .then(data => {
                    console.log('Parsed data:', data);
                    if (data.success) {
                        document.getElementById('passengerId').value = data.passenger.passenger_id;
                        document.getElementById('passengerName').value = data.passenger.passenger_name;
                        document.getElementById('passengerEmail').value = data.passenger.email;
                        document.getElementById('passengerContact').value = data.passenger.contact_number || '';
                        document.getElementById('editPassengerModal').style.display = 'block';
                    } else {
                        alert('Error loading passenger data: ' + (data.message || 'Unknown error'));
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('Error loading passenger: ' + error.message);
                });
        }

        function closeEditPassengerModal() {
            document.getElementById('editPassengerModal').style.display = 'none';
        }

        document.getElementById('editDriverForm').addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            fetch('', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('Driver updated successfully');
                    closeEditDriverModal();
                    location.reload();
                } else {
                    alert('Error: ' + (data.message || 'Failed to update driver'));
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Error updating driver');
            });
        });

        document.getElementById('editPassengerForm').addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            fetch('', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('Passenger updated successfully');
                    closeEditPassengerModal();
                    location.reload();
                } else {
                    alert('Error: ' + (data.message || 'Failed to update passenger'));
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Error updating passenger');
            });
        });

        // Close modal when clicking outside of it
        window.onclick = function(event) {
            const driverModal = document.getElementById('editDriverModal');
            const passengerModal = document.getElementById('editPassengerModal');
            if (event.target === driverModal) {
                driverModal.style.display = 'none';
            }
            if (event.target === passengerModal) {
                passengerModal.style.display = 'none';
            }
        };
    </script>

<?php echo csrf_form_script(); ?>
</body>
</html>
