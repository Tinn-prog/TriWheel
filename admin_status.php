<?php
require 'auth.php';
require 'db.php';

require_admin();

$errorMessage = '';
$successMessage = '';
$editingDriverId = isset($_GET['edit_driver']) ? intval($_GET['edit_driver']) : 0;
$editingPassengerId = isset($_GET['edit_passenger']) ? intval($_GET['edit_passenger']) : 0;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (isset($_POST['update_driver'], $_POST['driver_id'])) {
        $driverId = intval($_POST['driver_id']);
        $driverName = trim($_POST['driver_name'] ?? '');
        $driverEmail = trim($_POST['driver_email'] ?? '');
        $driverContact = trim($_POST['driver_contact'] ?? '');
        $driverPhone = trim($_POST['driver_phone'] ?? '');
        $driverLicense = trim($_POST['driver_license'] ?? '');
        $driverPlate = trim($_POST['driver_plate'] ?? '');

        if (empty($driverName) || empty($driverEmail) || empty($driverContact) || empty($driverLicense)) {
            $errorMessage = 'Driver name, email, contact number, and license number are required.';
        } elseif (!filter_var($driverEmail, FILTER_VALIDATE_EMAIL)) {
            $errorMessage = 'Please enter a valid email address for the driver.';
        } elseif (!preg_match('/^[0-9+\- ]{7,20}$/', $driverContact)) {
            $errorMessage = 'Please enter a valid driver contact number.';
        } else {
            $driverUserStmt = $conn->prepare("SELECT user_id FROM drivers WHERE id = ?");
            $driverUserStmt->bind_param("i", $driverId);
            $driverUserStmt->execute();
            $driverUser = $driverUserStmt->get_result()->fetch_assoc();
            $driverUserStmt->close();

            if ($driverUser) {
                $userId = $driverUser['user_id'];
                $checkEmailStmt = $conn->prepare("SELECT id FROM users WHERE email = ? AND id != ?");
                $checkEmailStmt->bind_param("si", $driverEmail, $userId);
                $checkEmailStmt->execute();
                $checkEmailStmt->store_result();
                if ($checkEmailStmt->num_rows > 0) {
                    $errorMessage = 'That email is already in use by another account.';
                }
                $checkEmailStmt->close();

                if (empty($errorMessage)) {
                    $updateUserStmt = $conn->prepare("UPDATE users SET name = ?, email = ?, contact_number = ? WHERE id = ?");
                    $updateUserStmt->bind_param("sssi", $driverName, $driverEmail, $driverContact, $userId);
                    $updateUserStmt->execute();
                    $updateUserStmt->close();

                    $updateDriverStmt = $conn->prepare("UPDATE drivers SET phone = ?, license_number = ? WHERE id = ?");
                    $updateDriverStmt->bind_param("ssi", $driverPhone, $driverLicense, $driverId);
                    $updateDriverStmt->execute();
                    $updateDriverStmt->close();

                    if ($driverPlate !== '') {
                        $updateVehicleStmt = $conn->prepare("UPDATE vehicles SET plate_number = ? WHERE driver_id = ?");
                        $updateVehicleStmt->bind_param("si", $driverPlate, $driverId);
                        $updateVehicleStmt->execute();
                        $updateVehicleStmt->close();
                    }

                    $successMessage = 'Driver details updated successfully.';
                    $editingDriverId = $driverId;
                }
            } else {
                $errorMessage = 'Driver record not found.';
            }
        }
    } elseif (isset($_POST['approve_driver'], $_POST['driver_id'])) {
        $driverId = intval($_POST['driver_id']);
        $approveStmt = $conn->prepare("UPDATE drivers SET approval_status = 'approved' WHERE id = ?");
        $approveStmt->bind_param("i", $driverId);
        $approveStmt->execute();
        $approveStmt->close();
        $successMessage = 'Driver has been approved and verified.';
        $editingDriverId = $driverId;
    } elseif (isset($_POST['reject_driver'], $_POST['driver_id'])) {
        $driverId = intval($_POST['driver_id']);
        $rejectStmt = $conn->prepare("UPDATE drivers SET approval_status = 'rejected' WHERE id = ?");
        $rejectStmt->bind_param("i", $driverId);
        $rejectStmt->execute();
        $rejectStmt->close();
        $successMessage = 'Driver approval has been rejected.';
        $editingDriverId = $driverId;
    } elseif (isset($_POST['update_passenger'], $_POST['passenger_id'])) {
        $passengerId = intval($_POST['passenger_id']);
        $passengerName = trim($_POST['passenger_name'] ?? '');
        $passengerEmail = trim($_POST['passenger_email'] ?? '');
        $passengerContact = trim($_POST['passenger_contact'] ?? '');

        if (empty($passengerName) || empty($passengerEmail) || empty($passengerContact)) {
            $errorMessage = 'Passenger name, email, and contact number are required.';
        } elseif (!filter_var($passengerEmail, FILTER_VALIDATE_EMAIL)) {
            $errorMessage = 'Please enter a valid passenger email address.';
        } elseif (!preg_match('/^[0-9+\- ]{7,20}$/', $passengerContact)) {
            $errorMessage = 'Please enter a valid passenger contact number.';
        } else {
            $checkEmailStmt = $conn->prepare("SELECT id FROM users WHERE email = ? AND id != ?");
            $checkEmailStmt->bind_param("si", $passengerEmail, $passengerId);
            $checkEmailStmt->execute();
            $checkEmailStmt->store_result();
            if ($checkEmailStmt->num_rows > 0) {
                $errorMessage = 'That email is already in use by another account.';
            }
            $checkEmailStmt->close();

            if (empty($errorMessage)) {
                $updatePassengerStmt = $conn->prepare("UPDATE users SET name = ?, email = ?, contact_number = ? WHERE id = ? AND role = 'passenger'");
                $updatePassengerStmt->bind_param("sssi", $passengerName, $passengerEmail, $passengerContact, $passengerId);
                $updatePassengerStmt->execute();
                $updatePassengerStmt->close();
                $successMessage = 'Passenger details updated successfully.';
                $editingPassengerId = $passengerId;
            }
        }
    }
}

$adminUserStmt = $conn->prepare("SELECT name, email, role, contact_number FROM users WHERE id = ?");
$adminUserStmt->bind_param("i", $_SESSION['user_id']);
$adminUserStmt->execute();
$adminUser = $adminUserStmt->get_result()->fetch_assoc();
$adminUserStmt->close();

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

$pendingRequestsStmt = $conn->prepare("SELECT COUNT(*) AS total FROM rides WHERE status = 'requested'");
$pendingRequestsStmt->execute();
$pendingRequests = $pendingRequestsStmt->get_result()->fetch_assoc();
$pendingCount = $pendingRequests['total'] ?? 0;
$pendingRequestsStmt->close();

$driversStmt = $conn->prepare(
    "SELECT d.id AS driver_id, u.id AS driver_user_id, u.name AS driver_name, u.email AS driver_email, u.contact_number AS driver_contact, d.status, d.approval_status, d.license_file, d.toda_id_file, d.license_number, d.phone AS driver_phone, v.vehicle_type, v.plate_number, v.color
     FROM drivers d
     JOIN users u ON u.id = d.user_id
     LEFT JOIN vehicles v ON v.driver_id = d.id
     ORDER BY FIELD(d.status,'online','offline') ASC, u.name ASC"
);
$driversStmt->execute();
$driverList = $driversStmt->get_result();
$driversStmt->close();

$passengerStmt = $conn->prepare(
    "SELECT u.id AS passenger_id, u.name AS passenger_name, u.email, u.contact_number, COALESCE(COUNT(r.id),0) AS completed_rides
     FROM users u
     LEFT JOIN rides r ON r.passenger_id = u.id AND r.status = 'completed'
     WHERE u.role = 'passenger'
     GROUP BY u.id
     ORDER BY u.name ASC"
);
$passengerStmt->execute();
$passengers = $passengerStmt->get_result();
$passengerStmt->close();

$editDriver = null;
$editPassenger = null;
if ($editingDriverId) {
    $editDriverStmt = $conn->prepare(
        "SELECT d.id AS driver_id, u.id AS driver_user_id, u.name AS driver_name, u.email AS driver_email, u.contact_number AS driver_contact, d.phone AS driver_phone, d.license_number, d.approval_status, d.license_file, d.toda_id_file, v.plate_number
         FROM drivers d
         JOIN users u ON u.id = d.user_id
         LEFT JOIN vehicles v ON v.driver_id = d.id
         WHERE d.id = ?"
    );
    $editDriverStmt->bind_param("i", $editingDriverId);
    $editDriverStmt->execute();
    $editDriver = $editDriverStmt->get_result()->fetch_assoc();
    $editDriverStmt->close();
}
if ($editingPassengerId) {
    $editPassengerStmt = $conn->prepare(
        "SELECT id AS passenger_id, name AS passenger_name, email AS passenger_email, contact_number AS passenger_contact
         FROM users
         WHERE id = ? AND role = 'passenger'"
    );
    $editPassengerStmt->bind_param("i", $editingPassengerId);
    $editPassengerStmt->execute();
    $editPassenger = $editPassengerStmt->get_result()->fetch_assoc();
    $editPassengerStmt->close();
}

$accountReady = isset($adminUser['role']) && $adminUser['role'] === 'admin';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Admin Status - TriWheel</title>
    <link rel="stylesheet" href="style.css">
    <link rel="stylesheet" href="auth.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        .details-table { width:100%; border-collapse:collapse; table-layout:fixed; }
        .details-table th, .details-table td { padding:10px; border-bottom:1px solid #f0f0f0; text-overflow:ellipsis; overflow:hidden; white-space:nowrap; }
        .details-table thead th { background:transparent; color:#343a40; font-weight:700; }
        .dashboard-grid .dashboard-card { min-height: 220px; }
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
                    <button type="submit" class="btn-secondary">Logout</button>
                </form>
            </div>
        </div>
    </nav>

    <main class="dashboard-container">
        <div class="container" style="max-width:1100px;margin:0 auto;padding:20px;">
            <div class="dashboard-header">
                <h1>Admin Status Configuration</h1>
                <p>Verify user account setup and monitor driver/passenger activity.</p>
                <a href="admin_dashboard.php" class="btn-secondary">Dashboard</a>
            </div>

            <?php if ($errorMessage || $successMessage): ?>
                <div class="dashboard-grid" style="margin-top:16px;">
                    <div class="dashboard-card" style="grid-column: 1 / -1; padding: 0;">
                        <div class="card-content" style="padding: 16px;">
                            <?php if ($successMessage): ?>
                                <div style="background:#d1e7dd;color:#0f5132;padding:12px;border-radius:10px;margin-bottom:10px;">
                                    <?php echo htmlspecialchars($successMessage); ?>
                                </div>
                            <?php endif; ?>
                            <?php if ($errorMessage): ?>
                                <div style="background:#f8d7da;color:#842029;padding:12px;border-radius:10px;">
                                    <?php echo htmlspecialchars($errorMessage); ?>
                                </div>
                            <?php endif; ?>
                        </div>
                    </div>
                </div>
            <?php endif; ?>


            <div class="dashboard-grid" style="margin-top:24px; grid-template-columns: 1fr; gap:20px; align-items:start;">
                <div class="dashboard-card" style="width:100%;">
                    <div class="card-header">
                        <h3><i class="fas fa-users"></i> Driver Details</h3>
                    </div>
                    <div class="card-content" style="overflow:auto;max-height:420px;">
                        <?php if ($editDriver): ?>
                            <div style="background:#ffffff;border:1px solid #f0f0f0;border-radius:12px;padding:16px;margin-bottom:18px;box-shadow:0 1px 4px rgba(0,0,0,0.05);">
                                <h4 style="margin-top:0;margin-bottom:12px;">Edit Driver Details</h4>
                                <form method="POST" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                                    <input type="hidden" name="driver_id" value="<?php echo intval($editDriver['driver_id']); ?>">
                                    <input type="hidden" name="update_driver" value="1">

                                    <label style="display:block;font-size:0.9rem;color:#333;">
                                        Name
                                        <input type="text" name="driver_name" required value="<?php echo htmlspecialchars($editDriver['driver_name']); ?>" style="width:100%;padding:10px;margin-top:6px;border:1px solid #ddd;border-radius:8px;">
                                    </label>

                                    <label style="display:block;font-size:0.9rem;color:#333;">
                                        Email
                                        <input type="email" name="driver_email" required value="<?php echo htmlspecialchars($editDriver['driver_email']); ?>" style="width:100%;padding:10px;margin-top:6px;border:1px solid #ddd;border-radius:8px;">
                                    </label>

                                    <label style="display:block;font-size:0.9rem;color:#333;">
                                        Contact
                                        <input type="text" name="driver_contact" required value="<?php echo htmlspecialchars($editDriver['driver_contact']); ?>" style="width:100%;padding:10px;margin-top:6px;border:1px solid #ddd;border-radius:8px;">
                                    </label>

                                    <label style="display:block;font-size:0.9rem;color:#333;">
                                        Phone
                                        <input type="text" name="driver_phone" value="<?php echo htmlspecialchars($editDriver['driver_phone'] ?? ''); ?>" style="width:100%;padding:10px;margin-top:6px;border:1px solid #ddd;border-radius:8px;">
                                    </label>

                                    <label style="display:block;font-size:0.9rem;color:#333;">
                                        License
                                        <input type="text" name="driver_license" required value="<?php echo htmlspecialchars($editDriver['license_number']); ?>" style="width:100%;padding:10px;margin-top:6px;border:1px solid #ddd;border-radius:8px;">
                                    </label>

                                    <label style="display:block;font-size:0.9rem;color:#333;">
                                        Approval Status
                                        <input type="text" disabled value="<?php echo ucfirst(htmlspecialchars($editDriver['approval_status'] ?? 'pending')); ?>" style="width:100%;padding:10px;margin-top:6px;border:1px solid #ddd;border-radius:8px;background:#f8f9fa;">
                                    </label>

                                    <label style="display:block;font-size:0.9rem;color:#333;">
                                        Document Links
                                        <div style="margin-top:6px;">
                                            <?php if (!empty($editDriver['license_file'])): ?>
                                                <a href="<?php echo htmlspecialchars($editDriver['license_file']); ?>" target="_blank" style="display:inline-block;margin-right:8px;">License</a>
                                            <?php endif; ?>
                                            <?php if (!empty($editDriver['toda_id_file'])): ?>
                                                <a href="<?php echo htmlspecialchars($editDriver['toda_id_file']); ?>" target="_blank">TODA</a>
                                            <?php endif; ?>
                                        </div>
                                    </label>

                                    <label style="display:block;font-size:0.9rem;color:#333;">
                                        Plate
                                        <input type="text" name="driver_plate" value="<?php echo htmlspecialchars($editDriver['plate_number'] ?? ''); ?>" style="width:100%;padding:10px;margin-top:6px;border:1px solid #ddd;border-radius:8px;">
                                    </label>

                                    <div style="grid-column:1 / -1;display:flex;gap:10px;justify-content:flex-end;align-items:center;margin-top:6px;">
                                        <button type="submit" class="btn-primary" style="padding:10px 18px;">Save Changes</button>
                                        <a href="admin_status.php" class="btn-secondary" style="padding:10px 18px;">Cancel</a>
                                    </div>
                                </form>
                            </div>
                        <?php endif; ?>
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
                                    <th style="padding:10px;border-bottom:1px solid #ddd;text-align:left;">Docs</th>
                                    <th style="padding:10px;border-bottom:1px solid #ddd;text-align:left;">Vehicle</th>
                                    <th style="padding:10px;border-bottom:1px solid #ddd;text-align:left;">Plate</th>
                                    <th style="padding:10px;border-bottom:1px solid #ddd;text-align:left;">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php if ($driverList && $driverList->num_rows > 0): ?>
                                    <?php while ($driver = $driverList->fetch_assoc()): ?>
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
                                            <td style="padding:10px;border-bottom:1px solid #f0f0f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100px;color:<?php echo ($driver['approval_status'] === 'approved' ? '#198754' : ($driver['approval_status'] === 'rejected' ? '#dc3545' : '#6c757d')); ?>;font-weight:700;">
                                                <?php echo ucfirst(htmlspecialchars($driver['approval_status'] ?? 'pending')); ?>
                                            </td>
                                            <td style="padding:10px;border-bottom:1px solid #f0f0f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:140px;">
                                                <?php if (!empty($driver['license_file'])): ?>
                                                    <a href="<?php echo htmlspecialchars($driver['license_file']); ?>" target="_blank">License</a>
                                                <?php endif; ?>
                                                <?php if (!empty($driver['license_file']) && !empty($driver['toda_id_file'])): ?>
                                                    <span> | </span>
                                                <?php endif; ?>
                                                <?php if (!empty($driver['toda_id_file'])): ?>
                                                    <a href="<?php echo htmlspecialchars($driver['toda_id_file']); ?>" target="_blank">TODA</a>
                                                <?php endif; ?>
                                            </td>
                                            <td style="padding:10px;border-bottom:1px solid #f0f0f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px;">
                                                <?php echo htmlspecialchars($driver['vehicle_type'] ?? '—'); ?>
                                            </td>
                                            <td style="padding:10px;border-bottom:1px solid #f0f0f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100px;">
                                                <?php echo htmlspecialchars($driver['plate_number'] ?? '—'); ?>
                                            </td>
                                            <td style="padding:10px;border-bottom:1px solid #f0f0f0;">
                                                <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;">
                                                    <a href="admin_status.php?edit_driver=<?php echo intval($driver['driver_id']); ?>" class="btn-secondary" style="padding:6px 10px;font-size:0.85rem;">Edit</a>
                                                    <?php if (($driver['approval_status'] ?? 'pending') !== 'approved'): ?>
                                                        <form method="post" style="display:inline;">
                                                            <input type="hidden" name="driver_id" value="<?php echo intval($driver['driver_id']); ?>">
                                                            <button type="submit" name="approve_driver" class="btn-primary" style="padding:6px 10px;font-size:0.85rem;">Approve</button>
                                                        </form>
                                                        <form method="post" style="display:inline;">
                                                            <input type="hidden" name="driver_id" value="<?php echo intval($driver['driver_id']); ?>">
                                                            <button type="submit" name="reject_driver" class="btn-danger" style="padding:6px 10px;font-size:0.85rem;">Reject</button>
                                                        </form>
                                                    <?php else: ?>
                                                        <span style="font-size:0.8rem;color:#198754;font-weight:700;">Verified</span>
                                                    <?php endif; ?>
                                                </div>
                                            </td>
                                        </tr>
                                    <?php endwhile; ?>
                                <?php else: ?>
                                    <tr>
                                        <td colspan="9" style="padding:10px;text-align:center;color:#666;">No driver records found.</td>
                                    </tr>
                                <?php endif; ?>
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="dashboard-card">
                    <div class="card-header">
                        <h3><i class="fas fa-user"></i> Passenger Details</h3>
                    </div>
                    <div class="card-content" style="overflow:auto;max-height:420px;">
                        <?php if ($editPassenger): ?>
                            <div style="background:#ffffff;border:1px solid #f0f0f0;border-radius:12px;padding:16px;margin-bottom:18px;box-shadow:0 1px 4px rgba(0,0,0,0.05);">
                                <h4 style="margin-top:0;margin-bottom:12px;">Edit Passenger Details</h4>
                                <form method="POST" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                                    <input type="hidden" name="passenger_id" value="<?php echo intval($editPassenger['passenger_id']); ?>">
                                    <input type="hidden" name="update_passenger" value="1">

                                    <label style="display:block;font-size:0.9rem;color:#333;">
                                        Name
                                        <input type="text" name="passenger_name" required value="<?php echo htmlspecialchars($editPassenger['passenger_name']); ?>" style="width:100%;padding:10px;margin-top:6px;border:1px solid #ddd;border-radius:8px;">
                                    </label>

                                    <label style="display:block;font-size:0.9rem;color:#333;">
                                        Email
                                        <input type="email" name="passenger_email" required value="<?php echo htmlspecialchars($editPassenger['passenger_email']); ?>" style="width:100%;padding:10px;margin-top:6px;border:1px solid #ddd;border-radius:8px;">
                                    </label>

                                    <label style="display:block;font-size:0.9rem;color:#333;grid-column:1 / -1;">
                                        Contact
                                        <input type="text" name="passenger_contact" required value="<?php echo htmlspecialchars($editPassenger['passenger_contact']); ?>" style="width:100%;padding:10px;margin-top:6px;border:1px solid #ddd;border-radius:8px;">
                                    </label>

                                    <div style="grid-column:1 / -1;display:flex;gap:10px;justify-content:flex-end;align-items:center;">
                                        <button type="submit" class="btn-primary" style="padding:10px 18px;">Save Changes</button>
                                        <a href="admin_status.php" class="btn-secondary" style="padding:10px 18px;">Cancel</a>
                                    </div>
                                </form>
                            </div>
                        <?php endif; ?>
                        <table class="details-table">
                            <thead>
                                <tr>
                                    <th style="padding:10px;border-bottom:1px solid #ddd;text-align:left;">Name</th>
                                    <th style="padding:10px;border-bottom:1px solid #ddd;text-align:left;">Email</th>
                                    <th style="padding:10px;border-bottom:1px solid #ddd;text-align:left;">Contact</th>
                                    <th style="padding:10px;border-bottom:1px solid #ddd;text-align:left;">Completed Rides</th>
                                    <th style="padding:10px;border-bottom:1px solid #ddd;text-align:left;">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php if ($passengers && $passengers->num_rows > 0): ?>
                                    <?php while ($passenger = $passengers->fetch_assoc()): ?>
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
                                            <td style="padding:10px;border-bottom:1px solid #f0f0f0;">
                                                <a href="admin_status.php?edit_passenger=<?php echo intval($passenger['passenger_id']); ?>" class="btn-secondary" style="padding:6px 10px;font-size:0.85rem;">Edit</a>
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
        </div>
    </main>
</body>
</html>
