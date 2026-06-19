<?php
require 'auth.php';
require 'db.php';
require 'system_helpers.php';
header('Content-Type: text/html; charset=utf-8');
triwheel_ensure_schema($conn);
require_valid_csrf();

// Only logged-in drivers can access
if (!isset($_SESSION['user_id']) || $_SESSION['user_role'] !== 'driver') {
    header("Location: index.php");
    exit;
}

$userId = $_SESSION['user_id'];
$error = '';
$existingDriver = null;

// Fetch the driver's approval_status (approved/pending/rejected).
// Approved and pending drivers are shown the details form; rejected drivers may resubmit.
$check = $conn->prepare("SELECT id, approval_status, rejection_reason, license_number, phone, license_file, toda_id_file FROM drivers WHERE user_id = ?");
$check->bind_param("i", $userId);
$check->execute();
$existingDriver = $check->get_result()->fetch_assoc();
$check->close();

$vehicle = null;
$initialLicense = '';
$initialPhone = '';
$initialVehicleType = 'tricycle';
$initialPlate = '';
$initialColor = '';
$existingLicenseFile = '';
$existingTodaFile = '';

if ($existingDriver) {
    $initialLicense = $existingDriver['license_number'] ?? '';
    $initialPhone = $existingDriver['phone'] ?? '';
    $existingLicenseFile = $existingDriver['license_file'] ?? '';
    $existingTodaFile = $existingDriver['toda_id_file'] ?? '';

    $vehicleStmt = $conn->prepare("SELECT vehicle_type, plate_number, color FROM vehicles WHERE driver_id = ? LIMIT 1");
    $vehicleStmt->bind_param("i", $existingDriver['id']);
    $vehicleStmt->execute();
    $vehicle = $vehicleStmt->get_result()->fetch_assoc();
    $vehicleStmt->close();

    if ($vehicle) {
        $initialVehicleType = $vehicle['vehicle_type'] ?? $initialVehicleType;
        $initialPlate = $vehicle['plate_number'] ?? '';
        $initialColor = $vehicle['color'] ?? '';
    }
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

    $licenseFile = $existingDriver['license_file'] ?? null;
    $todaFile = $existingDriver['toda_id_file'] ?? null;
    if ($error === '') {
        if ($existingDriver) {
            if (isset($_FILES['license_doc']) && $_FILES['license_doc']['error'] !== UPLOAD_ERR_NO_FILE) {
                $savedLicense = saveDriverDocument('license_doc', 'license', $error);
                if ($error === '') {
                    $licenseFile = $savedLicense;
                }
            }
            if ($error === '' && isset($_FILES['toda_id_doc']) && $_FILES['toda_id_doc']['error'] !== UPLOAD_ERR_NO_FILE) {
                $savedToda = saveDriverDocument('toda_id_doc', 'toda_id', $error);
                if ($error === '') {
                    $todaFile = $savedToda;
                }
            }
        } else {
            $licenseFile = saveDriverDocument('license_doc', 'license', $error);
            if ($error === '') {
                $todaFile = saveDriverDocument('toda_id_doc', 'toda_id', $error);
            }
        }
    }

    if ($error === '') {
        if ($existingDriver) {
            $driverId = intval($existingDriver['id']);
            // Preserve existing approved status: only set to 'pending' when resubmitting after rejection
            if (($existingDriver['approval_status'] ?? '') === 'approved') {
                $stmt = $conn->prepare(
                    "UPDATE drivers
                     SET license_number = ?, phone = ?, license_file = ?, toda_id_file = ?
                     WHERE id = ? AND user_id = ?"
                );
                $stmt->bind_param("ssssii", $license, $phone, $licenseFile, $todaFile, $driverId, $userId);
            } else {
                // New submission or previously rejected: move status to pending and clear rejection reason
                $stmt = $conn->prepare(
                    "UPDATE drivers
                     SET license_number = ?, phone = ?, license_file = ?, toda_id_file = ?, approval_status = 'pending', rejection_reason = NULL
                     WHERE id = ? AND user_id = ?"
                );
                $stmt->bind_param("ssssii", $license, $phone, $licenseFile, $todaFile, $driverId, $userId);
            }
            $stmt->execute();

            $vehicleCheck = $conn->prepare("SELECT id FROM vehicles WHERE driver_id = ? LIMIT 1");
            $vehicleCheck->bind_param("i", $driverId);
            $vehicleCheck->execute();
            $vehicleExists = $vehicleCheck->get_result()->num_rows > 0;
            $vehicleCheck->close();

            if ($vehicleExists) {
                $stmt = $conn->prepare(
                    "UPDATE vehicles SET vehicle_type = ?, plate_number = ?, color = ? WHERE driver_id = ?"
                );
                $stmt->bind_param("sssi", $vehicleType, $plate, $color, $driverId);
                $stmt->execute();
            } else {
                $stmt = $conn->prepare(
                    "INSERT INTO vehicles (driver_id, vehicle_type, plate_number, color)
                     VALUES (?, ?, ?, ?)"
                );
                $stmt->bind_param("isss", $driverId, $vehicleType, $plate, $color);
                $stmt->execute();
            }
        } else {
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
        }

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
<body class="app-dashboard app-driver">
    <?php require 'navbar.php'; ?>

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
                    <?php if ($existingDriver && !empty($existingDriver['rejection_reason'])): ?>
                        <div style="background:#fff3cd;color:#664d03;padding:12px;border-radius:10px;margin-bottom:16px;">
                            <i class="fas fa-info-circle"></i>
                            Previous rejection reason: <?php echo htmlspecialchars($existingDriver['rejection_reason']); ?>
                        </div>
                    <?php endif; ?>
                    <form method="post" enctype="multipart/form-data" class="booking-form">
                        <div class="form-group">
                            <label for="license">
                                <i class="fas fa-id-card"></i> License Number
                            </label>
                            <input type="text" id="license" name="license" placeholder="Enter license number" required value="<?php echo htmlspecialchars($initialLicense); ?>">
                        </div>

                        <div class="form-group">
                            <label for="license_doc">
                                <i class="fas fa-file-upload"></i> Upload License Document
                            </label>
                            <input type="file" id="license_doc" name="license_doc" accept=".pdf,image/png,image/jpeg" <?php echo $existingDriver ? '' : 'required'; ?>>
                        </div>

                        <div class="form-group">
                            <label for="toda_id_doc">
                                <i class="fas fa-id-badge"></i> Upload TODA ID
                            </label>
                            <input type="file" id="toda_id_doc" name="toda_id_doc" accept=".pdf,image/png,image/jpeg" <?php echo $existingDriver ? '' : 'required'; ?>>
                        </div>

                        <div class="form-group">
                            <label for="phone">
                                <i class="fas fa-phone"></i> Phone Number
                            </label>
                            <input type="text" id="phone" name="phone" placeholder="Enter phone number" required value="<?php echo htmlspecialchars($initialPhone); ?>">
                        </div>

                        <div class="form-group">
                            <label for="vehicle_type">
                                <i class="fas fa-car-side"></i> Vehicle Type
                            </label>
                            <select id="vehicle_type" name="vehicle_type" required>
                                <option value="tricycle" <?php echo $initialVehicleType === 'tricycle' ? 'selected' : ''; ?>>🚲 Tricycle</option>
                                <option value="pedicab" <?php echo $initialVehicleType === 'pedicab' ? 'selected' : ''; ?>>🚲 Pedicab</option>
                                <option value="e-tricycle" <?php echo $initialVehicleType === 'e-tricycle' ? 'selected' : ''; ?>>🛺 E Trike</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label for="plate">
                                <i class="fas fa-hashtag"></i> Plate Number
                            </label>
                            <input type="text" id="plate" name="plate" placeholder="Enter plate number" required value="<?php echo htmlspecialchars($initialPlate); ?>">
                        </div>

                        <div class="form-group">
                            <label for="color">
                                <i class="fas fa-palette"></i> Vehicle Color
                            </label>
                            <input type="text" id="color" name="color" placeholder="Enter vehicle color" required value="<?php echo htmlspecialchars($initialColor); ?>">
                        </div>

                        <button type="submit" class="btn-primary full-width">
                            <i class="fas fa-save"></i> Save & Continue
                        </button>
                    </form>
                </div>
            </div>
        </div>
    </main>
<?php echo csrf_form_script(); ?>
</body>
</html>
