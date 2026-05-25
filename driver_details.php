    <?php
session_start();
require 'db.php';

// Only logged-in drivers can access
if (!isset($_SESSION['user_id']) || $_SESSION['user_role'] !== 'driver') {
    header("Location: index.php");
    exit;
}

$userId = $_SESSION['user_id'];
$error = '';

// Prevent duplicate driver info
$check = $conn->prepare("SELECT id FROM drivers WHERE user_id = ?");
$check->bind_param("i", $userId);
$check->execute();
$check->store_result();

if ($check->num_rows > 0) {
    header("Location: driver.php");
    exit;
}

function saveDriverDocument($fieldName, $prefix, &$error) {
    if (!isset($_FILES[$fieldName]) || $_FILES[$fieldName]['error'] === UPLOAD_ERR_NO_FILE) {
        $error = ucfirst(str_replace('_', ' ', $fieldName)) . ' document is required.';
        return null;
    }

    $file = $_FILES[$fieldName];
    if ($file['error'] !== UPLOAD_ERR_OK) {
        $error = 'Failed to upload the document. Please try again.';
        return null;
    }

    $allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!in_array($file['type'], $allowedTypes, true)) {
        $error = 'Only PDF, JPG, and PNG files are accepted for uploaded documents.';
        return null;
    }

    if ($file['size'] > 4 * 1024 * 1024) {
        $error = 'Uploaded documents must be 4MB or smaller.';
        return null;
    }

    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $safeName = $prefix . '_' . time() . '_' . bin2hex(random_bytes(8)) . '.' . $extension;
    $uploadDir = __DIR__ . '/uploads/driver_docs';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    $targetPath = $uploadDir . '/' . $safeName;
    if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
        $error = 'Could not save the uploaded document. Please try again.';
        return null;
    }

    return 'uploads/driver_docs/' . $safeName;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $license = trim($_POST['license'] ?? '');
    $phone = trim($_POST['phone'] ?? '');
    $vehicleType = trim($_POST['vehicle_type'] ?? '');
    $plate = trim($_POST['plate'] ?? '');
    $color = trim($_POST['color'] ?? '');
    $error = '';

    if ($license === '' || $phone === '' || $vehicleType === '' || $plate === '' || $color === '') {
        $error = 'All fields are required to complete your driver profile.';
    }

    $licenseFile = null;
    $todaFile = null;
    if ($error === '') {
        $licenseFile = saveDriverDocument('license_doc', 'license', $error);
    }
    if ($error === '') {
        $todaFile = saveDriverDocument('toda_id_doc', 'toda_id', $error);
    }

    if ($error === '') {
        $stmt = $conn->prepare(
            "INSERT INTO drivers (user_id, license_number, phone, license_file, toda_id_file, approval_status)
             VALUES (?, ?, ?, ?, ?, 'pending')"
        );
        $stmt->bind_param("issss", $userId, $license, $phone, $licenseFile, $todaFile);
        $stmt->execute();

        $driverId = $conn->insert_id;

        $stmt = $conn->prepare(
            "INSERT INTO vehicles (driver_id, vehicle_type, plate_number, color)
             VALUES (?, ?, ?, ?)"
        );
        $stmt->bind_param("isss", $driverId, $vehicleType, $plate, $color);
        $stmt->execute();

        header("Location: driver.php");
        exit;
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TriWheel - Driver Verification</title>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Montserrat:wght@600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <nav class="navbar">
        <div class="nav-container">
            <div class="logo logo-header-sec">
                <i class="fas fa-biking" style="font-size: 2rem; color: var(--primary);"></i>
                <span class="logo-text">TriWheel</span>
            </div>
        </div>
    </nav>

    <main class="dashboard-container">
        <div class="container" style="max-width: 720px;">
            <div class="dashboard-header">
                <h1><i class="fas fa-id-card"></i> Driver Details</h1>
                <p>Enter your license and vehicle details to begin receiving rides.</p>
            </div>

            <div class="dashboard-card booking-card">
                <div class="card-header">
                    <h3><i class="fas fa-clipboard-list"></i> Complete Your Driver Profile</h3>
                </div>
                <div class="card-content">
                    <?php if ($error): ?>
                        <div style="background:#f8d7da;color:#842029;padding:12px;border-radius:10px;margin-bottom:16px;">
                            <i class="fas fa-exclamation-circle"></i>
                            <?php echo htmlspecialchars($error); ?>
                        </div>
                    <?php endif; ?>
                    <form method="post" enctype="multipart/form-data" class="booking-form">
                        <div class="form-group">
                            <label for="license">
                                <i class="fas fa-id-card"></i> License Number
                            </label>
                            <input type="text" id="license" name="license" placeholder="Enter license number" required>
                        </div>

                        <div class="form-group">
                            <label for="license_doc">
                                <i class="fas fa-file-upload"></i> Upload License Document
                            </label>
                            <input type="file" id="license_doc" name="license_doc" accept=".pdf,image/png,image/jpeg" required>
                        </div>

                        <div class="form-group">
                            <label for="toda_id_doc">
                                <i class="fas fa-id-badge"></i> Upload TODA ID
                            </label>
                            <input type="file" id="toda_id_doc" name="toda_id_doc" accept=".pdf,image/png,image/jpeg" required>
                        </div>

                        <div class="form-group">
                            <label for="phone">
                                <i class="fas fa-phone"></i> Phone Number
                            </label>
                            <input type="text" id="phone" name="phone" placeholder="Enter phone number" required>
                        </div>

                        <div class="form-group">
                            <label for="vehicle_type">
                                <i class="fas fa-car-side"></i> Vehicle Type
                            </label>
                            <select id="vehicle_type" name="vehicle_type" required>
                                <option value="tricycle">🚲 Tricycle</option>
                                <option value="pedicab">🚲 Pedicab</option>
                                <option value="e-tricycle">🛺 E Trike</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label for="plate">
                                <i class="fas fa-hashtag"></i> Plate Number
                            </label>
                            <input type="text" id="plate" name="plate" placeholder="Enter plate number" required>
                        </div>

                        <div class="form-group">
                            <label for="color">
                                <i class="fas fa-palette"></i> Vehicle Color
                            </label>
                            <input type="text" id="color" name="color" placeholder="Enter vehicle color" required>
                        </div>

                        <button type="submit" class="btn-primary full-width">
                            <i class="fas fa-save"></i> Save & Continue
                        </button>
                    </form>
                </div>
            </div>
        </div>
    </main>
</body>
</html>
