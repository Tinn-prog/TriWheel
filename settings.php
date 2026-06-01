<?php
require 'auth.php';
require 'db.php';
require 'system_helpers.php';

ini_set('display_errors', '0');
ini_set('display_startup_errors', '0');
error_reporting(0);
header('Content-Type: text/html; charset=utf-8');
require_valid_csrf();

/* ===== AUTH CHECK ===== */
if (!isset($_SESSION['user_id'])) {
    header("Location: login.php");
    exit;
}

$error = '';
$success = '';

$hasVerifiedColumn = triwheel_column_exists($conn, 'users', 'is_verified');

// Fetch current user data
if ($hasVerifiedColumn) {
    $userStmt = $conn->prepare(
        "SELECT first_name, middle_name, last_name, email, contact_number, role, is_verified FROM users WHERE id = ?"
    );
} else {
    $userStmt = $conn->prepare(
        "SELECT first_name, middle_name, last_name, email, contact_number, role FROM users WHERE id = ?"
    );
}
$userStmt->bind_param("i", $_SESSION['user_id']);
$userStmt->execute();
$userData = $userStmt->get_result()->fetch_assoc();
$userStmt->close();

$userData['approval_status'] = null;
if ($_SESSION['user_role'] === 'driver') {
    $driverStmt = $conn->prepare("SELECT approval_status FROM drivers WHERE user_id = ? LIMIT 1");
    $driverStmt->bind_param("i", $_SESSION['user_id']);
    $driverStmt->execute();
    $driverRow = $driverStmt->get_result()->fetch_assoc();
    $driverStmt->close();
    $userData['approval_status'] = $driverRow['approval_status'] ?? null;
}

$verifiedBadge = false;
$verifiedBadgeText = '';
if ($_SESSION['user_role'] === 'driver') {
    if (($userData['approval_status'] ?? '') === 'approved') {
        $verifiedBadge = true;
        $verifiedBadgeText = 'Verified Driver';
    }
} elseif ($_SESSION['user_role'] === 'passenger') {
    if ($hasVerifiedColumn) {
        $verifiedBadge = !empty($userData['is_verified']);
    } else {
        // Passenger accounts are treated as verified when no explicit verification flag exists.
        $verifiedBadge = true;
    }
    $verifiedBadgeText = 'Verified Passenger';
}


if (!$userData) {
    header("Location: login.php");
    exit;
}

// Fetch driver-specific data if user is a driver
$driverData = null;
$vehicleData = null;
if ($_SESSION['user_role'] === 'driver') {
    $driverStmt = $conn->prepare("SELECT license_number FROM drivers WHERE user_id = ?");
    $driverStmt->bind_param("i", $_SESSION['user_id']);
    $driverStmt->execute();
    $driverData = $driverStmt->get_result()->fetch_assoc();
    $driverStmt->close();

    $vehicleStmt = $conn->prepare("SELECT plate_number FROM vehicles WHERE driver_id = (SELECT id FROM drivers WHERE user_id = ?)");
    $vehicleStmt->bind_param("i", $_SESSION['user_id']);
    $vehicleStmt->execute();
    $vehicleData = $vehicleStmt->get_result()->fetch_assoc();
    $vehicleStmt->close();
}

// Initialize variables with current data
$post_first_name = $userData['first_name'] ?? '';
$post_middle_name = $userData['middle_name'] ?? '';
$post_last_name = $userData['last_name'] ?? '';
$post_email = $userData['email'] ?? '';
$post_contact = $userData['contact_number'] ?? '';
$post_license = $driverData['license_number'] ?? '';
$post_plate = $vehicleData['plate_number'] ?? '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $post_first_name = trim($_POST['first_name'] ?? '');
    $post_middle_name = trim($_POST['middle_name'] ?? '');
    $post_last_name = trim($_POST['last_name'] ?? '');
    $post_email = trim($_POST['email'] ?? '');
    $post_contact = trim($_POST['contact_number'] ?? '');
    $post_license = trim($_POST['license_number'] ?? '');
    $post_plate = trim($_POST['plate_number'] ?? '');
    $current_password = $_POST['current_password'] ?? '';
    $new_password = $_POST['new_password'] ?? '';
    $confirm_password = $_POST['confirm_password'] ?? '';

    // Validate input
    $validationError = '';
    if (empty($post_first_name) || empty($post_last_name) || empty($post_email) || empty($post_contact)) {
        $validationError = "First name, last name, email, and contact number are required.";
    } elseif (!filter_var($post_email, FILTER_VALIDATE_EMAIL)) {
        $validationError = "Invalid email format.";
    } elseif (!preg_match('/^\d{10,15}$/', $post_contact)) {
        $validationError = "Invalid contact number. Must be 10-15 digits.";
    } elseif ($_SESSION['user_role'] === 'driver' && (empty($post_license) || empty($post_plate))) {
        $validationError = "License number and plate number are required for drivers.";
    } elseif (!empty($new_password) && strlen($new_password) < 6) {
        $validationError = "New password must be at least 6 characters.";
    } elseif ($new_password !== $confirm_password) {
        $validationError = "New passwords do not match.";
    }

    if (!empty($validationError)) {
        $error = $validationError;
    } else {
        // Check if email exists (if changed)
        if ($post_email !== $userData['email']) {
            $checkStmt = $conn->prepare("SELECT id FROM users WHERE email = ? AND id != ?");
            $checkStmt->bind_param("si", $post_email, $_SESSION['user_id']);
            $checkStmt->execute();
            $checkStmt->store_result();
            if ($checkStmt->num_rows > 0) {
                $error = "Email already registered. Please use a different email.";
            }
            $checkStmt->close();
        }

        if (empty($error)) {
            // If changing password, verify current password
            if (!empty($new_password)) {
                $passStmt = $conn->prepare("SELECT password FROM users WHERE id = ?");
                $passStmt->bind_param("i", $_SESSION['user_id']);
                $passStmt->execute();
                $passResult = $passStmt->get_result()->fetch_assoc();
                if (!password_verify($current_password, $passResult['password'])) {
                    $error = "Current password is incorrect.";
                }
                $passStmt->close();
            }

            if (empty($error)) {
                // Update user
                $full_name = trim($post_first_name . ' ' . ($post_middle_name ? $post_middle_name . ' ' : '') . $post_last_name);
                $updateFields = "name = ?, first_name = ?, middle_name = ?, last_name = ?, email = ?, contact_number = ?";
                $params = [$full_name, $post_first_name, $post_middle_name, $post_last_name, $post_email, $post_contact];
                $types = "ssssss";

                if (!empty($new_password)) {
                    $hashedPassword = password_hash($new_password, PASSWORD_DEFAULT);
                    $updateFields .= ", password = ?";
                    $params[] = $hashedPassword;
                    $types .= "s";
                }

                $updateStmt = $conn->prepare("UPDATE users SET $updateFields WHERE id = ?");
                $params[] = $_SESSION['user_id'];
                $types .= "i";
                $updateStmt->bind_param($types, ...$params);

                $updateSuccess = $updateStmt->execute();
                $updateStmt->close();

                // Update driver-specific data if driver
                if ($_SESSION['user_role'] === 'driver' && $updateSuccess) {
                    $driverUpdateStmt = $conn->prepare("UPDATE drivers SET license_number = ? WHERE user_id = ?");
                    $driverUpdateStmt->bind_param("si", $post_license, $_SESSION['user_id']);
                    $driverUpdateStmt->execute();
                    $driverUpdateStmt->close();

                    $vehicleUpdateStmt = $conn->prepare("UPDATE vehicles SET plate_number = ? WHERE driver_id = (SELECT id FROM drivers WHERE user_id = ?)");
                    $vehicleUpdateStmt->bind_param("si", $post_plate, $_SESSION['user_id']);
                    $vehicleUpdateStmt->execute();
                    $vehicleUpdateStmt->close();
                }

                if ($updateSuccess) {
                    $success = "Profile updated successfully.";
                    $_SESSION['user_name'] = $full_name;
                    // Refresh userData
                    $userData['first_name'] = $post_first_name;
                    $userData['middle_name'] = $post_middle_name;
                    $userData['last_name'] = $post_last_name;
                    $userData['email'] = $post_email;
                    $userData['contact_number'] = $post_contact;
                    if ($_SESSION['user_role'] === 'driver') {
                        $driverData['license_number'] = $post_license;
                        $vehicleData['plate_number'] = $post_plate;
                    }
                } else {
                    $error = "Update failed. Please try again.";
                }
            }
        }
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Settings - TriWheel</title>
    <link rel="stylesheet" href="style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Montserrat:wght@700;800;900&display=swap" rel="stylesheet">
</head>
<body class="app-dashboard app-<?php echo $_SESSION['user_role'] ?? 'user'; ?>">
    <!-- Persistent Sidebar Navigation -->
    <?php require 'navbar.php'; ?>

    <main class="settings-container">
        <div class="settings-wrapper">
            <!-- Profile Card Section -->
            <div class="profile-card">
                <div class="profile-avatar">
                    <div class="avatar-circle">
                        <?php 
                            $initials = strtoupper(substr($userData['first_name'] ?? 'U', 0, 1) . substr($userData['last_name'] ?? 'U', 0, 1));
                            echo $initials;
                        ?>
                    </div>
                </div>
                
                <h2 class="profile-name"><?php echo htmlspecialchars($userData['first_name'] . ' ' . $userData['last_name']); ?></h2>
                <p class="profile-email"><?php echo htmlspecialchars($userData['email'] ?? ''); ?></p>
                <p class="profile-phone"><?php echo htmlspecialchars($userData['contact_number'] ?? ''); ?></p>
                <?php if (!empty($verifiedBadge)): ?>
                    <div style="margin-top:8px;">
                        <span class="verification-badge">
                            <i class="fas fa-check-circle"></i> <?php echo htmlspecialchars($verifiedBadgeText); ?>
                        </span>
                    </div>
                <?php endif; ?>
            </div>

            <!-- Alerts -->
            <?php if ($error): ?>
                <div class="alert alert-error">
                    <i class="fas fa-exclamation-circle"></i>
                    <?php echo htmlspecialchars($error); ?>
                </div>
            <?php endif; ?>

            <?php if ($success): ?>
                <div class="alert alert-success">
                    <i class="fas fa-check-circle"></i>
                    <?php echo htmlspecialchars($success); ?>
                </div>
            <?php endif; ?>

            <!-- Settings Menu -->
            <div class="settings-menu">
                <div class="settings-section">
                    <h3 class="section-title">ACCOUNT SETTINGS</h3>
                    
                    <button type="button" class="settings-item" onclick="toggleSection('personal-info')">
                        <div class="settings-item-left">
                            <i class="fas fa-user"></i>
                            <span>Personal Information</span>
                        </div>
                        <i class="fas fa-chevron-right"></i>
                    </button>
                    
                    <button type="button" class="settings-item" onclick="toggleSection('security')">
                        <div class="settings-item-left">
                            <i class="fas fa-lock"></i>
                            <span>Security</span>
                        </div>
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>

                <div class="settings-section">
                    <h3 class="section-title">HELP & SUPPORT</h3>
                    
                    <a href="#" class="settings-item">
                        <div class="settings-item-left">
                            <i class="fas fa-headset"></i>
                            <span>Contact Support</span>
                        </div>
                        <i class="fas fa-chevron-right"></i>
                    </a>
                </div>
            </div>

            <!-- Personal Information Form -->
            <div id="personal-info" class="settings-section-content" style="display: none;">
                <div class="settings-form-card">
                    <h3><i class="fas fa-user"></i> Personal Information</h3>
                    
                    <form method="POST" class="settings-form">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="first_name">First Name</label>
                                <input type="text" id="first_name" name="first_name" required 
                                       value="<?php echo htmlspecialchars($post_first_name); ?>">
                            </div>
                            <div class="form-group">
                                <label for="last_name">Last Name</label>
                                <input type="text" id="last_name" name="last_name" required 
                                       value="<?php echo htmlspecialchars($post_last_name); ?>">
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="middle_name">Middle Name (Optional)</label>
                            <input type="text" id="middle_name" name="middle_name" 
                                   value="<?php echo htmlspecialchars($post_middle_name); ?>">
                        </div>

                        <div class="form-group">
                            <label for="email">Email Address</label>
                            <input type="email" id="email" name="email" required 
                                   value="<?php echo htmlspecialchars($post_email); ?>">
                        </div>

                        <div class="form-group">
                            <label for="contact_number">Contact Number</label>
                            <input type="tel" id="contact_number" name="contact_number" required 
                                   value="<?php echo htmlspecialchars($post_contact); ?>">
                        </div>

                        <?php if ($_SESSION['user_role'] === 'driver'): ?>
                            <div class="form-group">
                                <label for="license_number">License Number</label>
                                <input type="text" id="license_number" name="license_number" required 
                                       value="<?php echo htmlspecialchars($post_license); ?>">
                            </div>

                            <div class="form-group">
                                <label for="plate_number">Plate Number</label>
                                <input type="text" id="plate_number" name="plate_number" required 
                                       value="<?php echo htmlspecialchars($post_plate); ?>">
                            </div>
                        <?php endif; ?>

                        <button type="submit" class="btn-save">
                            <i class="fas fa-save"></i> Save Changes
                        </button>
                    </form>
                </div>
            </div>

            <!-- Security Form -->
            <div id="security" class="settings-section-content" style="display: none;">
                <div class="settings-form-card">
                    <h3><i class="fas fa-lock"></i> Change Password</h3>
                    
                    <form method="POST" class="settings-form">
                        <div class="form-group">
                            <label for="current_password">Current Password</label>
                            <input type="password" id="current_password" name="current_password" 
                                   placeholder="Enter current password">
                        </div>

                        <div class="form-group">
                            <label for="new_password">New Password</label>
                            <input type="password" id="new_password" name="new_password" 
                                   placeholder="Enter new password (min. 6 characters)"
                                   minlength="6">
                        </div>

                        <div class="form-group">
                            <label for="confirm_password">Confirm New Password</label>
                            <input type="password" id="confirm_password" name="confirm_password" 
                                   placeholder="Confirm new password">
                        </div>

                        <button type="submit" class="btn-save">
                            <i class="fas fa-save"></i> Update Password
                        </button>
                    </form>
                </div>
            </div>
        </div>
    </main>

    <style>
        .settings-container {
            padding: 24px;
            max-width: 900px;
            margin: 40px auto;
        }

        .settings-wrapper {
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        /* Profile Card */
        .profile-card {
            background: linear-gradient(135deg, #f5f5f5, #fafafa);
            padding: 24px 16px;
            text-align: center;
            border-bottom: 1px solid #e5e7eb;
        }

        .profile-avatar {
            margin-bottom: 12px;
            position: relative;
            display: inline-block;
        }

        .avatar-circle {
            width: 64px;
            height: 64px;
            background: linear-gradient(135deg, var(--primary), var(--primary-dark));
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 22px;
            font-weight: 700;
        }

        .verification-badge {
            position: static;
            display: inline-block;
            margin: 8px auto 0;
            background: var(--success);
            color: white;
            padding: 4px 10px;
            border-radius: 999px;
            font-size: 0.8rem;
            font-weight: 700;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            min-width: 120px;
            max-width: 220px;
            text-align: center;
        }

        .profile-name {
            margin: 12px 0 6px 0;
            font-size: 1.25rem;
            font-weight: 700;
            color: var(--dark);
        }

        .profile-email {
            margin: 0 0 4px 0;
            color: var(--gray);
            font-size: 0.9rem;
        }

        .profile-phone {
            margin: 0;
            color: var(--gray);
            font-size: 0.9rem;
        }

        /* Settings Menu */
        .settings-menu {
            padding: 20px 0;
        }

        .settings-section {
            border-bottom: 1px solid #e5e7eb;
        }

        .settings-section:last-child {
            border-bottom: none;
        }

        .section-title {
            padding: 12px 20px;
            margin: 0;
            font-size: 0.75rem;
            font-weight: 700;
            color: var(--gray);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            background: #f9fafb;
        }

        .settings-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            padding: 16px 20px;
            border: none;
            background: white;
            cursor: pointer;
            transition: background 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
            border-bottom: 1px solid #f0f0f0;
            text-align: left;
            text-decoration: none;
            color: inherit;
        }

        .settings-item:hover,
        .settings-item:focus-visible {
            background: #eef4ff;
            transform: translateY(-0.5px);
            box-shadow: 0 8px 20px rgba(15, 23, 42, 0.04);
            outline: none;
            color: var(--primary);
        }

        .settings-item:hover .settings-item-left span,
        .settings-item:focus-visible .settings-item-left span {
            color: var(--primary);
        }

        .settings-item:focus-visible {
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.18);
        }

        .settings-item:active {
            transform: translateY(0);
        }

        .settings-item-left {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .settings-item i {
            color: var(--primary);
            font-size: 1.1rem;
        }

        .settings-item span {
            color: var(--dark);
            font-weight: 500;
        }

        .settings-item .fa-chevron-right {
            color: var(--gray-light);
            font-size: 0.9rem;
        }

        /* Forms */
        .settings-section-content {
            padding: 20px;
            background: #f9fafb;
            border-bottom: 1px solid #e5e7eb;
        }

        .settings-form-card {
            background: white;
            padding: 24px;
            border-radius: 8px;
        }

        .settings-form-card h3 {
            margin: 0 0 20px 0;
            color: var(--dark);
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .settings-form {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
        }

        .form-group {
            display: flex;
            flex-direction: column;
        }

        .form-group label {
            margin-bottom: 6px;
            font-weight: 500;
            color: var(--dark);
            font-size: 0.9rem;
        }

        .form-group input {
            padding: 10px 12px;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            font-size: 0.9rem;
            transition: all 0.2s ease;
        }

        .form-group input:focus {
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 3px rgba(244, 98, 58, 0.1);
        }

        .btn-save {
            background: var(--primary);
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 6px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            transition: all 0.2s ease;
            margin-top: 8px;
        }

        .btn-save:hover {
            background: var(--primary-dark);
            transform: translateY(-1px);
        }

        /* Alerts */
        .alert {
            padding: 12px 16px;
            border-radius: 6px;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.9rem;
        }

        .alert-success {
            background: #d1e7dd;
            color: #0f5132;
            border: 1px solid #badbcc;
        }

        .alert-error {
            background: #f8d7da;
            color: #842029;
            border: 1px solid #f5c2c7;
        }

        @media (max-width: 768px) {
            .form-row {
                grid-template-columns: 1fr;
            }

            .profile-card {
                padding: 30px 15px;
            }

            .settings-form-card {
                padding: 16px;
            }

            .settings-container {
                padding: 20px 15px;
            }
        }
    </style>

    <script>
        function toggleSection(sectionId) {
            const section = document.getElementById(sectionId);
            const allSections = document.querySelectorAll('.settings-section-content');
            
            allSections.forEach(s => {
                if (s.id !== sectionId) {
                    s.style.display = 'none';
                }
            });

            section.style.display = section.style.display === 'none' ? 'block' : 'none';
        }
    </script>
<?php echo csrf_form_script(); ?>
</body>
</html>

