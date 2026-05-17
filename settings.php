<?php
session_start();
require 'db.php';

ini_set('display_errors', '0');
ini_set('display_startup_errors', '0');
error_reporting(0);

/* ===== AUTH CHECK ===== */
if (!isset($_SESSION['user_id'])) {
    header("Location: login.php");
    exit;
}

$error = '';
$success = '';

// Fetch current user data
$userStmt = $conn->prepare("SELECT first_name, middle_name, last_name, email, contact_number FROM users WHERE id = ?");
$userStmt->bind_param("i", $_SESSION['user_id']);
$userStmt->execute();
$userData = $userStmt->get_result()->fetch_assoc();
$userStmt->close();

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
    <link rel="stylesheet" href="auth.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Montserrat:wght@700;800;900&display=swap" rel="stylesheet">
</head>
<body>
    <div class="auth-container">
        <!-- Left Side - Branding & Info -->
        <div class="auth-left">
            <div class="auth-brand">
                <a href="<?php echo $_SESSION['user_role'] === 'passenger' ? 'passenger.php' : 'driver.php'; ?>" class="back-home">
                    <i class="fas fa-arrow-left"></i> Back to Dashboard
                </a>
                <div class="brand-logo">
                    <img src="logo.png" alt="TriWheel Logo">
                    <h1>TriWheel</h1>
                </div>
                <p class="brand-tagline">Manage your account settings</p>
            </div>

            <div class="auth-benefits">
                <h3>Account Settings</h3>
                <div class="benefits-list">
                    <div class="benefit">
                        <i class="fas fa-check-circle"></i>
                        <span>Update your personal information</span>
                    </div>
                    <div class="benefit">
                        <i class="fas fa-check-circle"></i>
                        <span>Change your password securely</span>
                    </div>
                    <div class="benefit">
                        <i class="fas fa-check-circle"></i>
                        <span>Keep your contact details current</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Right Side - Settings Form -->
        <div class="auth-right">
            <div class="auth-form-container">
                <div class="auth-header">
                    <h2>Account Settings</h2>
                    <p>Update your profile information</p>
                </div>

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

                <form method="POST" class="auth-form" id="settingsForm">
                    <div class="form-group">
                        <label for="first_name">
                            <i class="fas fa-user"></i> First Name
                        </label>
                        <input type="text" id="first_name" name="first_name" required 
                               placeholder="Enter your first name"
                               value="<?php echo htmlspecialchars($post_first_name); ?>">
                    </div>

                    <div class="form-group">
                        <label for="middle_name">
                            <i class="fas fa-user"></i> Middle Name (Optional)
                        </label>
                        <input type="text" id="middle_name" name="middle_name" 
                               placeholder="Enter your middle name"
                               value="<?php echo htmlspecialchars($post_middle_name); ?>">
                    </div>

                    <div class="form-group">
                        <label for="last_name">
                            <i class="fas fa-user"></i> Last Name
                        </label>
                        <input type="text" id="last_name" name="last_name" required 
                               placeholder="Enter your last name"
                               value="<?php echo htmlspecialchars($post_last_name); ?>">
                    </div>

                    <div class="form-group">
                        <label for="email">
                            <i class="fas fa-envelope"></i> Email Address
                        </label>
                        <input type="email" id="email" name="email" required 
                               placeholder="Enter your email address"
                               value="<?php echo htmlspecialchars($post_email); ?>">
                    </div>

                    <div class="form-group">
                        <label for="contact_number">
                            <i class="fas fa-phone"></i> Contact Number
                        </label>
                        <input type="tel" id="contact_number" name="contact_number" required 
                               placeholder="Enter your contact number"
                               value="<?php echo htmlspecialchars($post_contact); ?>">
                    </div>

                    <?php if ($_SESSION['user_role'] === 'driver'): ?>
                    <div class="form-group">
                        <label for="license_number">
                            <i class="fas fa-id-card"></i> License Number
                        </label>
                        <input type="text" id="license_number" name="license_number" required 
                               placeholder="Enter your driver's license number"
                               value="<?php echo htmlspecialchars($post_license); ?>">
                    </div>

                    <div class="form-group">
                        <label for="plate_number">
                            <i class="fas fa-car"></i> Plate Number
                        </label>
                        <input type="text" id="plate_number" name="plate_number" required 
                               placeholder="Enter your vehicle plate number"
                               value="<?php echo htmlspecialchars($post_plate); ?>">
                    </div>
                    <?php endif; ?>

                    <div class="form-group">
                        <label for="current_password">
                            <i class="fas fa-lock"></i> Current Password (Required to change password)
                        </label>
                        <input type="password" id="current_password" name="current_password" 
                               placeholder="Enter current password to change it">
                    </div>

                    <div class="form-group">
                        <label for="new_password">
                            <i class="fas fa-lock"></i> New Password (Leave blank to keep current)
                        </label>
                        <div class="password-input">
                            <input type="password" id="new_password" name="new_password" 
                                   placeholder="Enter new password (min. 6 characters)"
                                   minlength="6">
                            <button type="button" class="toggle-password" onclick="togglePassword()">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                        <div class="password-strength">
                            <div class="strength-bar"></div>
                            <span class="strength-text">Password strength</span>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="confirm_password">
                            <i class="fas fa-lock"></i> Confirm New Password
                        </label>
                        <input type="password" id="confirm_password" name="confirm_password" 
                               placeholder="Confirm new password">
                    </div>

                    <button type="submit" class="btn-primary" style="width: 100%;">
                        <i class="fas fa-save"></i> Update Profile
                    </button>
                </form>
            </div>
        </div>
    </div>

    <script>
        function togglePassword() {
            const passwordInput = document.getElementById('new_password');
            const toggleBtn = document.querySelector('.toggle-password i');
            
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                toggleBtn.classList.remove('fa-eye');
                toggleBtn.classList.add('fa-eye-slash');
            } else {
                passwordInput.type = 'password';
                toggleBtn.classList.remove('fa-eye-slash');
                toggleBtn.classList.add('fa-eye');
            }
        }
    </script>
</body>
</html>

