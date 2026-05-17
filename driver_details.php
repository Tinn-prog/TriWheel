    <?php
session_start();
require 'db.php';

// Only logged-in drivers can access
if (!isset($_SESSION['user_id']) || $_SESSION['user_role'] !== 'driver') {
    header("Location: index.php");
    exit;
}

$userId = $_SESSION['user_id'];

// Prevent duplicate driver info
$check = $conn->prepare("SELECT id FROM drivers WHERE user_id = ?");
$check->bind_param("i", $userId);
$check->execute();
$check->store_result();

if ($check->num_rows > 0) {
    header("Location: driver.php");
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $license = $_POST['license'];
    $phone = $_POST['phone'];
    $vehicleType = $_POST['vehicle_type'];
    $plate = $_POST['plate'];
    $color = $_POST['color'];

    // Insert driver info
    $stmt = $conn->prepare(
        "INSERT INTO drivers (user_id, license_number, phone)
         VALUES (?, ?, ?)"
    );
    $stmt->bind_param("iss", $userId, $license, $phone);
    $stmt->execute();

    $driverId = $conn->insert_id;

    // Insert vehicle info
    $stmt = $conn->prepare(
        "INSERT INTO vehicles (driver_id, vehicle_type, plate_number, color)
         VALUES (?, ?, ?, ?)"
    );
    $stmt->bind_param("isss", $driverId, $vehicleType, $plate, $color);
    $stmt->execute();

    header("Location: driver.php");
    exit;
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TriWheel - Driver Details</title>
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
                    <form method="post" class="booking-form">
                        <div class="form-group">
                            <label for="license">
                                <i class="fas fa-id-card"></i> License Number
                            </label>
                            <input type="text" id="license" name="license" placeholder="Enter license number" required>
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
