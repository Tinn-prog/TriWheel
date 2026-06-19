<?php
session_start();
require 'db.php';

$error = '';
$selectedRole = $_GET['role'] ?? ''; // Get role from URL if clicked from landing page

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = $_POST['email'] ?? '';
    $password = $_POST['password'] ?? '';
    $intendedRole = $_POST['intended_role'] ?? $selectedRole; // Get intended role

    $stmt = $conn->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($user = $result->fetch_assoc()) {
        if (password_verify($password, $user['password'])) {
            // Check if user role matches intended role (if specified)
            if (!empty($intendedRole) && $user['role'] !== $intendedRole) {
                $error = "This email is registered as a " . ucfirst($user['role']) . ". 
                          Please login as a " . ucfirst($user['role']) . " or use a different email.";
            } else {
                $_SESSION['user_id'] = $user['id'];
                $_SESSION['user_role'] = $user['role'];
                $_SESSION['user_name'] = $user['name'];
                // Regenerate session id and set activity timestamps
                session_regenerate_id(true);
                $_SESSION['last_activity'] = time();
                $_SESSION['regen_time'] = time();

                // Redirect based on role
                if ($user['role'] === 'passenger') {
                    header("Location: passenger.php");
                    exit;
                } elseif ($user['role'] === 'driver') {
                    header("Location: driver.php");
                    exit;
                } elseif ($user['role'] === 'admin') {
                    header("Location: admin_dashboard.php");
                    exit;
                } else {
                    session_unset();
                    session_destroy();
                    $error = "Your account role is not set or is invalid. Please contact support or use a registered account.";
                }
            }
        } else {
            $error = "Invalid email or password.";
        }
    } else {
        $error = "Invalid email or password.";
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - TriWheel</title>
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
                <a href="index.php" class="back-home">
                    <i class="fas fa-arrow-left"></i> Back to Home
                </a>
                <div class="brand-logo">
                    <img src="logo.png" alt="TriWheel Logo">
                    <h1>TriWheel</h1>
                </div>
                <p class="brand-tagline">Your ride, your way. Welcome back!</p>
            </div>

            <div class="auth-features">
                <div class="feature">
                    <div class="feature-icon">
                        <i class="fas fa-shield-alt"></i>
                    </div>
                    <div class="feature-content">
                        <h3>Secure Login</h3>
                        <p>Your account is protected with industry-standard security.</p>
                    </div>
                </div>
                
                <div class="feature">
                    <div class="feature-icon">
                        <i class="fas fa-bolt"></i>
                    </div>
                    <div class="feature-content">
                        <h3>Quick Access</h3>
                        <p>Get back to booking rides or earning money instantly.</p>
                    </div>
                </div>
                
                <div class="feature">
                    <div class="feature-icon">
                        <i class="fas fa-headset"></i>
                    </div>
                    <div class="feature-content">
                        <h3>24/7 Support</h3>
                        <p>Need help? Our support team is always available.</p>
                    </div>
                </div>
            </div>

            <div class="auth-stats">
                <div class="stat">
                    <h3>100</h3>
                    <p>Happy Riders</p>
                </div>
                <div class="stat">
                    <h3>100</h3>
                    <p>Verified Drivers</p>
                </div>
                <div class="stat">
                    <h3>98%</h3>
                    <p>Satisfaction Rate</p>
                </div>
            </div>
        </div>

        <!-- Right Side - Login Form -->
        <div class="auth-right">
            <a href="index.php" class="mobile-back-home" aria-label="Back to Home">
                <i class="fas fa-arrow-left"></i>
                <span class="sr-only">Back to Home</span>
            </a>
            <div class="auth-form-container">
                <div class="auth-header">
                    <h2>Welcome Back!</h2>
                    <p>Sign in to your TriWheel account</p>
                </div>

                <?php if ($error): ?>
                    <div class="alert alert-error">
                        <i class="fas fa-exclamation-circle"></i>
                        <div class="error-message"><?php echo htmlspecialchars($error); ?></div>
                        <?php if (strpos($error, 'registered as a') !== false): ?>
                            <div class="role-suggestion">
                                <?php
                                preg_match('/registered as a (\w+)/', $error, $matches);
                                $actualRole = $matches[1] ?? '';
                                if ($actualRole): ?>
                                    <a href="login.php?role=<?php echo $actualRole; ?>" class="btn-small">
                                        Login as <?php echo ucfirst($actualRole); ?>
                                    </a>
                                <?php endif; ?>
                            </div>
                        <?php endif; ?>
                    </div>
                <?php endif; ?>

                <!-- Role Selection Display -->
                <?php if ($selectedRole): ?>
                    <div class="role-indicator">
                        <div class="role-badge <?php echo $selectedRole; ?>">
                            <i class="fas fa-<?php echo $selectedRole === 'passenger' ? 'user' : 'car'; ?>"></i>
                            <span>Logging in as <?php echo ucfirst($selectedRole); ?></span>
                        </div>
                        <p class="role-warning">
                            <i class="fas fa-info-circle"></i>
                            Please use an email registered as a <?php echo ucfirst($selectedRole); ?>
                        </p>
                    </div>
                <?php endif; ?>

                <form method="POST" class="auth-form">
                    <!-- Hidden field to store intended role -->
                    <input type="hidden" name="intended_role" value="<?php echo htmlspecialchars($selectedRole); ?>">
                    
                    <div class="form-group">
                        <label for="email">
                            <i class="fas fa-envelope"></i> Email Address
                        </label>
                        <input type="email" id="email" name="email" required 
                               placeholder="Enter your <?php echo $selectedRole ? ucfirst($selectedRole) : ''; ?>email"
                               value="<?php echo isset($_POST['email']) ? htmlspecialchars($_POST['email']) : ''; ?>">
                    </div>

                    <div class="form-group">
                        <label for="password">
                            <i class="fas fa-lock"></i> Password
                        </label>
                        <div class="password-input">
                            <input type="password" id="password" name="password" required 
                                   placeholder="Enter your password">
                            <button type="button" class="toggle-password" onclick="togglePassword()">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </div>

                    <div class="form-options">
                        <label class="checkbox">
                            <input type="checkbox" name="remember">
                            <span>Remember me</span>
                        </label>
                        <a href="forgot-password.php" class="forgot-password">Forgot Password?</a>
                    </div>

                    <button type="submit" class="btn-auth">
                        <i class="fas fa-sign-in-alt"></i> 
                        <?php echo $selectedRole ? 'Login as ' . ucfirst($selectedRole) : 'Sign In'; ?>
                    </button>

                    <?php if ($selectedRole): ?>
                        <div class="role-switch">
                            <p>Not a <?php echo ucfirst($selectedRole); ?>? 
                                <a href="login.php?role=<?php echo $selectedRole === 'passenger' ? 'driver' : 'passenger'; ?>">
                                    Login as <?php echo $selectedRole === 'passenger' ? 'Driver' : 'Passenger'; ?>
                                </a>
                            </p>
                        </div>
                    <?php endif; ?>

                    <div class="divider">
                        <span>or</span>
                    </div>

                    <div class="role-selection-quick">
                        <p>Login as:</p>
                        <div class="quick-roles">
                            <a href="login.php?role=passenger" class="quick-role passenger">
                                <i class="fas fa-user"></i>
                                <span>Passenger</span>
                            </a>
                            <a href="login.php?role=driver" class="quick-role driver">
                                <i class="fas fa-car"></i>
                                <span>Driver</span>
                            </a>
                        </div>
                    </div>

                    <div class="auth-footer">
                        <p>Don't have an account? <a href="signup.php">Sign up now</a></p>
                        <p class="terms">
                            By signing in, you agree to our 
                            <a href="terms.php">Terms of Service</a> and 
                            <a href="privacy.php">Privacy Policy</a>
                        </p>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <script>
        function togglePassword() {
            const passwordInput = document.getElementById('password');
            const toggleIcon = document.querySelector('.toggle-password i');
            
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                toggleIcon.classList.remove('fa-eye');
                toggleIcon.classList.add('fa-eye-slash');
            } else {
                passwordInput.type = 'password';
                toggleIcon.classList.remove('fa-eye-slash');
                toggleIcon.classList.add('fa-eye');
            }
        }

        // Auto-focus email field
        document.addEventListener('DOMContentLoaded', function() {
            document.getElementById('email').focus();
        });
    </script>
</body>
</html>

