<?php
session_start();

// If user is already logged in, redirect to appropriate dashboard
if (isset($_SESSION['user_id'])) {
    if ($_SESSION['user_role'] === 'passenger') {
        header("Location: passenger.php");
    } elseif ($_SESSION['user_role'] === 'driver') {
        header("Location: driver.php");
    } elseif ($_SESSION['user_role'] === 'admin') {
        header("Location: admin.php");
    }
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TriWheel - Your Ride, Your Way</title>
    <link rel="stylesheet" href="style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Montserrat:wght@700;800;900&display=swap" rel="stylesheet">
</head>
<body>
    <!-- Navigation -->
    <nav class="navbar">
        <div class="nav-container">
            <div class="logo logo-header">
                <img src="logo-header.png" alt="TriWheel Logo" class="logo-img">
                <span class="logo-text">TriWheel</span>
            </div>
            <div class="nav-links">
                <a href="#features">Features</a>
                <a href="#how-it-works">How It Works</a>
                <a href="#about">About</a>
                <a href="login.php" class="btn-login">Login</a>
            </div>
        </div>
    </nav>

    <!-- Hero Section -->
    <section class="hero">
        <div class="hero-container">
            <div class="hero-content">
                <h1 class="hero-title">Your Ride, <span class="highlight">Your Way</span></h1>
                <p class="hero-subtitle">Affordable, reliable, and convenient tricycle, pedicab, and e-tricycle rides at your fingertips.</p>
                
                <!-- Role Selection -->
                <div class="role-selection">
                    <h2 class="role-title">Select Your Role</h2>
                    <p class="role-subtitle">Choose how you want to use TriWheel</p>
                    
                    <div class="role-cards">
                        <!-- Passenger Card -->
                        <a href="login.php?role=passenger" class="role-card passenger">
                            <div class="role-icon">
                                <i class="fas fa-user"></i>
                            </div>
                            <h3 class="role-name">I'm a Passenger</h3>
                            <p class="role-desc">Book rides quickly and safely</p>
                            <ul class="role-features">
                                <li><i class="fas fa-check"></i> Quick booking</li>
                                <li><i class="fas fa-check"></i> Live tracking</li>
                                <li><i class="fas fa-check"></i> Secure payments</li>
                            </ul>
                            <button class="role-btn">Get a Ride</button>
                        </a>

                        <!-- Driver Card -->
                        <a href="login.php?role=driver" class="role-card driver">
                            <div class="role-icon">
                                <i class="fas fa-car"></i>
                            </div>
                            <h3 class="role-name">I'm a Driver</h3>
                            <p class="role-desc">Earn money on your schedule</p>
                            <ul class="role-features">
                                <li><i class="fas fa-check"></i> Flexible hours</li>
                                <li><i class="fas fa-check"></i> Good earnings</li>
                                <li><i class="fas fa-check"></i> Ride requests</li>
                            </ul>
                            <button class="role-btn">Start Driving</button>
                        </a>

                        <!-- Admin Card -->
                        <a href="admin_login.php" class="role-card admin hidden-admin">
                            <div class="role-icon">
                                <i class="fas fa-cog"></i>
                            </div>
                            <h3 class="role-name">I'm an Admin</h3>
                            <p class="role-desc">Manage the TriWheel platform</p>
                            <ul class="role-features">
                                <li><i class="fas fa-check"></i> Monitor rides</li>
                                <li><i class="fas fa-check"></i> Manage users</li>
                                <li><i class="fas fa-check"></i> View analytics</li>
                            </ul>
                            <button class="role-btn">Admin Panel</button>
                        </a>
                    </div>
                </div>

                <div class="cta-buttons">
                    <a href="signup.php" class="btn-primary">Sign Up Free</a>
                    <a href="#how-it-works" class="btn-secondary">How It Works <i class="fas fa-arrow-down"></i></a>
                </div>
            </div>
            <div class="hero-image">
                <img src="logo.png" alt="TriWheel Logo">
            </div>
        </div>
    </section>

    <!-- Features Section -->
    <section id="features" class="features">
        <div class="container">
            <h2 class="section-title">Why Choose TriWheel?</h2>
            <p class="section-subtitle">Experience the future of transportation</p>
            
            <div class="features-grid">
                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-bolt"></i>
                    </div>
                    <h3>Fast Booking</h3>
                    <p>Get a ride in under 2 minutes with our simple booking system.</p>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-shield-alt"></i>
                    </div>
                    <h3>Safe & Secure</h3>
                    <p>Verified drivers and real-time tracking for your safety.</p>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-money-bill-wave"></i>
                    </div>
                    <h3>Affordable</h3>
                    <p>Competitive pricing with transparent fare calculation.</p>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-map-marker-alt"></i>
                    </div>
                    <h3>Live Tracking</h3>
                    <p>Track your ride in real-time from pickup to destination.</p>
                </div>
            </div>
        </div>
    </section>

    <!-- How It Works Section -->
    <section id="how-it-works" class="how-it-works">
        <div class="container">
            <h2 class="section-title">How TriWheel Works</h2>
            
            <div class="steps">
                <div class="step">
                    <div class="step-number">1</div>
                    <h3>Book a Ride</h3>
                    <p>Enter your pickup and drop-off locations in the app.</p>
                </div>
                
                <div class="step">
                    <div class="step-number">2</div>
                    <h3>Choose Your Ride</h3>
                    <p>Select from tricycle, pedicab, or e-tricycle (soon) .</p>
                </div>
                
                <div class="step">
                    <div class="step-number">3</div>
                    <h3>Track & Ride</h3>
                    <p>Track your driver in real-time and enjoy the ride.</p>
                </div>
                
                <div class="step">
                    <div class="step-number">4</div>
                    <h3>Pay & Rate</h3>
                    <p>Pay securely and rate your experience.</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
        <div class="container">
            <div class="footer-content" id="about">
                <div class="footer-logo logo-header">
                    <img src="logo-header.png" alt="TriWheel Logo" class="footer-logo-img">
                    <span class="footer-logo-text">TriWheel</span>
                    <p>Your reliable ride-hailing partner</p>
                </div>
                
                <div class="footer-links">
                    <div class="footer-column">
                        <h4>Company</h4>
                        <a href="#about">About Us</a>
                        <a href="#careers">Careers</a>
                        <a href="#press">Press</a>
                        <a href="#blog">Blog</a>
                    </div>
                    
                    <div class="footer-column">
                        <h4>Support</h4>
                        <a href="#help">Help Center</a>
                        <a href="#safety">Safety</a>
                        <a href="#contact">Contact Us</a>
                        <a href="#faq">FAQ</a>
                    </div>
                    
                    <div class="footer-column">
                        <h4>Legal</h4>
                        <a href="#terms">Terms of Service</a>
                        <a href="#privacy">Privacy Policy</a>
                        <a href="#cookies">Cookie Policy</a>
                    </div>
                </div>
            </div>
            
            <div class="footer-bottom">
                <p>&copy; 2026 TriWheel. All rights reserved.</p>
                <div class="social-links">
                    <a href="https://www.facebook.com/profile.php?id=61586455232006"><i class="fab fa-facebook"></i></a>
                    <a href="#"><i class="fab fa-twitter"></i></a>
                    <a href="#"><i class="fab fa-instagram"></i></a>
                    <a href="#"><i class="fab fa-linkedin"></i></a>
                </div>
            </div>
        </div>
    </footer>

    <script>
        // Smooth scrolling for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const targetId = this.getAttribute('href');
                if(targetId === '#') return;
                
                const targetElement = document.querySelector(targetId);
                if(targetElement) {
                    window.scrollTo({
                        top: targetElement.offsetTop - 80,
                        behavior: 'smooth'
                    });
                }
            });
        });

        // Add active class to nav links on scroll
        window.addEventListener('scroll', function() {
            const navbar = document.querySelector('.navbar');
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });
    </script>
</body>
</html>


