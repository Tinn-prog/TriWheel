<?php
session_start();
require 'db.php';

$error = '';
$success = '';
$resetLink = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = trim($_POST['email'] ?? '');

    if (empty($email)) {
        $error = "Please enter your email address.";
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $error = "Invalid email format.";
    } else {
        // Check if email exists
        $stmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->bind_param("s", $email);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows > 0) {
            // Generate reset token
            $token = bin2hex(random_bytes(32));

            // Use the database server time for expiry so the reset link is valid
            // according to the same clock used by the token validation query.
            $updateStmt = $conn->prepare("UPDATE users SET reset_token = ?, reset_expiry = DATE_ADD(NOW(), INTERVAL 2 HOUR) WHERE email = ?");
            $updateStmt->bind_param("ss", $token, $email);
            $updateStmt->execute();

            // For demo purposes, show the reset link (in real app, send via email)
            $resetLink = "https://sixth-brink-roundworm.ngrok-free.dev/TriWheel/reset-password.php?token=" . $token;
            $success = "Password reset link generated successfully. It expires in 2 hours. Copy this link to reset your password: <br><strong>" . $resetLink . "</strong>";
        } else {
            $error = "No account found with this email address.";
        }
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Forgot Password - TriWheel</title>
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
                <a href="login.php" class="back-home">
                    <i class="fas fa-arrow-left"></i> Back to Login
                </a>
                <div class="brand-logo">
                    <img src="logo.png" alt="TriWheel Logo">
                    <h1>TriWheel</h1>
                </div>
                <p class="brand-tagline">Reset your password securely</p>
            </div>

            <div class="auth-benefits">
                <h3>Password Reset</h3>
                <div class="benefits-list">
                    <div class="benefit">
                        <i class="fas fa-check-circle"></i>
                        <span>Secure reset process</span>
                    </div>
                    <div class="benefit">
                        <i class="fas fa-check-circle"></i>
                        <span>Link expires in 1 hour</span>
                    </div>
                    <div class="benefit">
                        <i class="fas fa-check-circle"></i>
                        <span>One-time use token</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Right Side - Forgot Password Form -->
        <div class="auth-right">
            <div class="auth-form-container">
                <div class="auth-header">
                    <h2>Forgot Password?</h2>
                    <p>Enter your email address and we'll help you reset your password</p>
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
                        <?php echo $success; ?>
                    </div>
                <?php endif; ?>

                <form method="POST" class="auth-form" id="forgotForm">
                    <div class="form-group">
                        <label for="email">
                            <i class="fas fa-envelope"></i> Email Address
                        </label>
                        <input type="email" id="email" name="email" required 
                               placeholder="Enter your registered email address"
                               value="<?php echo isset($_POST['email']) ? htmlspecialchars($_POST['email']) : ''; ?>">
                    </div>

                    <button type="submit" class="btn-primary" style="width: 100%;">
                        <i class="fas fa-paper-plane"></i> Send Reset Link
                    </button>
                </form>

                <div class="auth-footer">
                    <p>Remember your password? <a href="login.php">Back to Login</a></p>
                </div>
            </div>
        </div>
    </div>
</body>
</html>

