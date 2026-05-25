<?php
session_start();
require 'db.php';

$error = '';
$success = '';

// Initialize variables
$post_first_name = $post_middle_name = $post_last_name = $post_email = $post_contact = $post_role = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $post_first_name = trim($_POST['first_name'] ?? '');
    $post_middle_name = trim($_POST['middle_name'] ?? '');
    $post_last_name = trim($_POST['last_name'] ?? '');
    $post_contact = trim($_POST['contact_number'] ?? '');
    $post_email = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';
    $post_role = $_POST['role'] ?? '';
    // Only allow passenger or driver from public signup
    if (!in_array($post_role, ['passenger', 'driver'], true)) {
        $post_role = 'passenger';
    }

    // Validate input
    if (empty($post_first_name) || empty($post_last_name) || empty($post_email) || empty($post_contact) || empty($password) || empty($post_role)) {
        $error = "All fields are required.";
    } elseif (!filter_var($post_email, FILTER_VALIDATE_EMAIL)) {
        $error = "Invalid email format.";
    } elseif (!preg_match('/^\d{10,15}$/', $post_contact)) {
        $error = "Invalid contact number. Must be 10-15 digits.";
    } elseif (strlen($password) < 6) {
        $error = "Password must be at least 6 characters.";
    } else {
        // Check if email exists
        $checkStmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
        $checkStmt->bind_param("s", $post_email);
        $checkStmt->execute();
        $checkStmt->store_result();
        
        if ($checkStmt->num_rows > 0) {
            $error = "Email already registered. Please use a different email.";
        } else {
            // Hash password and insert user
            $full_name = trim($post_first_name . ' ' . ($post_middle_name ? $post_middle_name . ' ' : '') . $post_last_name);
            $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
            $stmt = $conn->prepare(
                "INSERT INTO users (name, first_name, middle_name, last_name, email, contact_number, password, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
            );
            $stmt->bind_param("ssssssss", $full_name, $post_first_name, $post_middle_name, $post_last_name, $post_email, $post_contact, $hashedPassword, $post_role);
            
            if ($stmt->execute()) {
                $userId = $conn->insert_id;
                
                // Auto-login after signup
                $_SESSION['user_id'] = $userId;
                $_SESSION['user_role'] = $post_role;
                $_SESSION['user_name'] = $full_name;
                
                // Redirect based on role
                if ($post_role === 'passenger') {
                    header("Location: passenger.php");
                } elseif ($post_role === 'driver') {
                    header("Location: driver_details.php");
                }
                exit;
            } else {
                $error = "Registration failed. Please try again.";
            }
        }
        $checkStmt->close();
    }
}

// Check if role is passed from landing page
$selectedRole = $_GET['role'] ?? '';
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sign Up - TriWheel</title>
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
                <p class="brand-tagline">Join thousands who trust TriWheel for their rides.</p>
            </div>

            <div class="auth-benefits">
                <h3>Why Join TriWheel?</h3>
                <div class="benefits-list">
                    <div class="benefit">
                        <i class="fas fa-check-circle"></i>
                        <span>Quick and easy ride booking</span>
                    </div>
                    <div class="benefit">
                        <i class="fas fa-check-circle"></i>
                        <span>Verified drivers for your safety</span>
                    </div>
                    <div class="benefit">
                        <i class="fas fa-check-circle"></i>
                        <span>Real-time ride tracking</span>
                    </div>
                    <div class="benefit">
                        <i class="fas fa-check-circle"></i>
                        <span>Secure payment options</span>
                    </div>
                    <div class="benefit">
                        <i class="fas fa-check-circle"></i>
                        <span>24/7 customer support</span>
                    </div>
                </div>
            </div>

            <div class="testimonials">
                <h3>What Our Users Say</h3>
                <div class="testimonial">
                    <div class="testimonial-content">
                        <p>"TriWheel has made my daily commute so much easier and affordable!"</p>
                    </div>
                    <div class="testimonial-author">
                        <div class="author-avatar">
                            <i class="fas fa-user"></i>
                        </div>
                        <div class="author-info">
                            <h4>Ciara Joy Abong</h4>
                            <p>Passenger for 1 Month</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Right Side - Signup Form -->
        <div class="auth-right">
            <a href="index.php" class="mobile-back-home" aria-label="Back to Home">
                <i class="fas fa-arrow-left"></i>
                <span class="sr-only">Back to Home</span>
            </a>
            <div class="auth-form-container">
                <div class="auth-header">
                    <h2>Create Account</h2>
                    <p>Join TriWheel today</p>
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

                <form method="POST" class="auth-form" id="signupForm">
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

                    <div class="form-group">
                        <label for="password">
                            <i class="fas fa-lock"></i> Password
                        </label>
                        <div class="password-input">
                            <input type="password" id="password" name="password" required 
                                   placeholder="Create a password (min. 6 characters)"
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
                            <i class="fas fa-lock"></i> Confirm Password
                        </label>
                        <input type="password" id="confirm_password" name="confirm_password" required 
                               placeholder="Confirm your password"
                               minlength="6">
                        <div id="password-match"></div>
                    </div>

                    <div class="form-group">
                        <label for="role">
                            <i class="fas fa-user-tag"></i> Account Type
                        </label>
                        <div class="role-selection-form">
                            <div class="role-option <?php echo (($selectedRole === 'passenger' || $post_role === 'passenger') ? 'selected' : ''); ?>"
                                 onclick="selectRole('passenger')">
                                <div class="role-icon">
                                    <i class="fas fa-user"></i>
                                </div>
                                <div class="role-info">
                                    <h4>Passenger</h4>
                                    <p>Book rides</p>
                                </div>
                                <input type="radio" name="role" value="passenger" 
                                       <?php echo (($selectedRole === 'passenger' || $post_role === 'passenger') ? 'checked' : ''); ?> required>
                            </div>
                            
                            <div class="role-option <?php echo (($selectedRole === 'driver' || $post_role === 'driver') ? 'selected' : ''); ?>"
                                 onclick="selectRole('driver')">
                                <div class="role-icon">
                                    <i class="fas fa-car"></i>
                                </div>
                                <div class="role-info">
                                    <h4>Driver</h4>
                                    <p>Provide rides — subject to admin verification</p>
                                </div>
                                <input type="radio" name="role" value="driver" 
                                       <?php echo (($selectedRole === 'driver' || $post_role === 'driver') ? 'checked' : ''); ?> required>
                            </div>
                        </div>
                    </div>

                    <div class="form-group terms-group">
                        <label class="checkbox">
                            <input type="checkbox" name="terms" required>
                            <span>I agree to the <a href="terms.php">Terms of Service</a> and <a href="privacy.php">Privacy Policy</a></span>
                        </label>
                        <label class="checkbox">
                            <input type="checkbox" name="newsletter" checked>
                            <span>Send me updates and promotions via email</span>
                        </label>
                    </div>

                    <button type="submit" class="btn-auth" id="submitBtn">
                        <i class="fas fa-user-plus"></i> Create Account
                    </button>

                    <div class="divider">
                        <span>or sign up with</span>
                    </div>

                    <div class="social-auth">
                        <button type="button" class="btn-social google">
                            <i class="fab fa-google"></i> Google
                        </button>
                        <button type="button" class="btn-social facebook">
                            <i class="fab fa-facebook-f"></i> Facebook
                        </button>
                    </div>

                    <div class="auth-footer">
                        <p>Already have an account? <a href="login.php">Sign in here</a></p>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <script>
        function togglePassword() {
            const passwordInput = document.getElementById('password');
            const confirmInput = document.getElementById('confirm_password');
            const toggleIcon = document.querySelector('.toggle-password i');
            
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                confirmInput.type = 'text';
                toggleIcon.classList.remove('fa-eye');
                toggleIcon.classList.add('fa-eye-slash');
            } else {
                passwordInput.type = 'password';
                confirmInput.type = 'password';
                toggleIcon.classList.remove('fa-eye-slash');
                toggleIcon.classList.add('fa-eye');
            }
        }

        function selectRole(role) {
            const options = document.querySelectorAll('.role-option');
            options.forEach(option => {
                option.classList.remove('selected');
                const radio = option.querySelector('input[type="radio"]');
                if (radio) radio.checked = false;
            });
            
            const selectedOption = document.querySelector(`.role-option[onclick*="${role}"]`);
            if (selectedOption) {
                selectedOption.classList.add('selected');
                const radio = selectedOption.querySelector('input[type="radio"]');
                if (radio) radio.checked = true;
            }
        }

        function checkPasswordStrength() {
            const password = document.getElementById('password').value;
            const strengthBar = document.querySelector('.strength-bar');
            const strengthText = document.querySelector('.strength-text');
            
            let strength = 0;
            let color = '#dc3545';
            let text = 'Weak';
            
            if (password.length >= 6) strength++;
            if (password.length >= 8) strength++;
            if (/[A-Z]/.test(password)) strength++;
            if (/[0-9]/.test(password)) strength++;
            if (/[^A-Za-z0-9]/.test(password)) strength++;
            
            switch(strength) {
                case 0:
                case 1:
                    color = '#dc3545';
                    text = 'Weak';
                    break;
                case 2:
                case 3:
                    color = '#ffc107';
                    text = 'Fair';
                    break;
                case 4:
                    color = '#28a745';
                    text = 'Good';
                    break;
                case 5:
                    color = '#20c997';
                    text = 'Strong';
                    break;
            }
            
            if (strengthBar) {
                strengthBar.style.width = `${strength * 20}%`;
                strengthBar.style.background = color;
            }
            if (strengthText) {
                strengthText.textContent = `Password strength: ${text}`;
                strengthText.style.color = color;
            }
        }

        function checkPasswordMatch() {
            const password = document.getElementById('password').value;
            const confirm = document.getElementById('confirm_password').value;
            const matchDiv = document.getElementById('password-match');
            
            if (!matchDiv) return;
            
            if (confirm === '') {
                matchDiv.innerHTML = '';
                return;
            }
            
            if (password === confirm) {
                matchDiv.innerHTML = '<i class="fas fa-check-circle" style="color: #28a745;"></i> Passwords match';
            } else {
                matchDiv.innerHTML = '<i class="fas fa-times-circle" style="color: #dc3545;"></i> Passwords do not match';
            }
        }

        document.addEventListener('DOMContentLoaded', function() {
            // Auto-focus name field
            const nameField = document.getElementById('name');
            if (nameField) nameField.focus();
            
            // Event listeners
            const passwordField = document.getElementById('password');
            const confirmField = document.getElementById('confirm_password');
            
            if (passwordField) {
                passwordField.addEventListener('input', function() {
                    checkPasswordStrength();
                    checkPasswordMatch();
                });
            }
            
            if (confirmField) {
                confirmField.addEventListener('input', checkPasswordMatch);
            }
            
            // Form validation
            const signupForm = document.getElementById('signupForm');
            if (signupForm) {
                signupForm.addEventListener('submit', function(e) {
                    const password = passwordField ? passwordField.value : '';
                    const confirm = confirmField ? confirmField.value : '';
                    
                    if (password !== confirm) {
                        e.preventDefault();
                        alert('Passwords do not match!');
                        return false;
                    }
                    
                    if (password.length < 6) {
                        e.preventDefault();
                        alert('Password must be at least 6 characters!');
                        return false;
                    }
                    
                    const roleSelected = document.querySelector('input[name="role"]:checked');
                    if (!roleSelected) {
                        e.preventDefault();
                        alert('Please select an account type!');
                        return false;
                    }
                    
                    const terms = document.querySelector('input[name="terms"]');
                    if (!terms || !terms.checked) {
                        e.preventDefault();
                        alert('You must agree to the Terms of Service!');
                        return false;
                    }
                });
            }
        });
    </script>
</body>
</html>

