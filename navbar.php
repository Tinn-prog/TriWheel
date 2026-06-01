<?php
// navbar.php - Navigation bar for all authenticated users
if (!isset($_SESSION['user_id'])) {
    header("Location: login.php");
    exit;
}

$user_role = $_SESSION['user_role'] ?? '';
?>

<nav class="navbar">
    <div class="nav-container">
        <div class="logo logo-header">
            <img src="logo-header.png" alt="TriWheel Logo" class="logo-img">
            <span class="logo-text">TriWheel</span>
        </div>
        
        <?php if ($user_role === 'passenger'): ?>
            <div class="hamburger" onclick="toggleSidebar()">
                <span></span>
                <span></span>
                <span></span>
            </div>
            <div class="nav-links desktop-only">
                <span class="user-greeting">Welcome, <strong><?php echo htmlspecialchars($_SESSION['user_name'] ?? 'Passenger'); ?></strong></span>
                <a href="passenger.php" class="btn-secondary app-nav-link" title="Dashboard">
                    <i class="fas fa-home"></i> Dashboard
                </a>
                <a href="ride_history.php" class="btn-secondary app-nav-link" title="History">
                    <i class="fas fa-history"></i> History
                </a>
                <a href="settings.php" class="btn-secondary app-nav-link" title="Account Settings">
                    <i class="fas fa-user-cog"></i> Account
                </a>
                <form action="logout.php" method="post" style="display: inline;">
                    <button type="submit" class="btn-secondary app-nav-link" title="Logout" style="padding: 8px 16px; font-size: 0.9rem;">
                        <i class="fas fa-sign-out-alt"></i> Logout
                    </button>
                </form>
            </div>
            <div class="sidebar" id="sidebar">
                <div class="sidebar-header">
                    <span class="close-btn" onclick="toggleSidebar()">&times;</span>
                </div>
                <div class="sidebar-content">
                    <div class="sidebar-logo">
                        <img src="logo.png" alt="TriWheel Logo" class="logo-img">
                        <span class="logo-text">TriWheel</span>
                    </div>
                    <span class="user-greeting">Welcome, <strong><?php echo htmlspecialchars($_SESSION['user_name'] ?? 'Passenger'); ?></strong></span>
                    <a href="settings.php" class="sidebar-link">
                        <i class="fas fa-cog"></i> Settings
                    </a>
                    <form action="logout.php" method="post">
                        <button type="submit" class="sidebar-link logout-btn">
                            <i class="fas fa-sign-out-alt"></i> Logout
                        </button>
                    </form>
                </div>
            </div>
            <div class="sidebar-overlay" onclick="toggleSidebar()"></div>

        <?php elseif ($user_role === 'driver'): ?>
            <div class="hamburger" onclick="toggleSidebar()">
                <span></span>
                <span></span>
                <span></span>
            </div>
            <div class="nav-links desktop-only">
                <span class="user-greeting">Welcome, <strong><?php echo htmlspecialchars($_SESSION['user_name'] ?? 'Driver'); ?></strong></span>
                <a href="driver.php" class="btn-secondary app-nav-link" title="Dashboard">
                    <i class="fas fa-home"></i> Dashboard
                </a>
                <a href="active_rides.php" class="btn-secondary app-nav-link" title="Active Rides">
                    <i class="fas fa-route"></i> Active Rides
                </a>
                <a href="ride_history.php" class="btn-secondary app-nav-link" title="History">
                    <i class="fas fa-history"></i> History
                </a>
                <a href="vehicle_info.php" class="btn-secondary app-nav-link" title="Vehicle Info">
                    <i class="fas fa-car-side"></i> Vehicle
                </a>
                <a href="settings.php" class="btn-secondary app-nav-link" title="Account Settings">
                    <i class="fas fa-user-cog"></i> Account
                </a>
                <form action="logout.php" method="post" style="display: inline;">
                    <button type="submit" class="btn-secondary app-nav-link" title="Logout" style="padding: 8px 16px; font-size: 0.9rem;">
                        <i class="fas fa-sign-out-alt"></i> Logout
                    </button>
                </form>
            </div>
            <div class="sidebar" id="sidebar">
                <div class="sidebar-header">
                    <span class="close-btn" onclick="toggleSidebar()">&times;</span>
                </div>
                <div class="sidebar-content">
                    <div class="sidebar-logo">
                        <img src="logo.png" alt="TriWheel Logo" class="logo-img">
                        <span class="logo-text">TriWheel</span>
                    </div>
                    <span class="user-greeting">Welcome, <strong><?php echo htmlspecialchars($_SESSION['user_name'] ?? 'Driver'); ?></strong></span>
                    <a href="settings.php" class="sidebar-link">
                        <i class="fas fa-user-cog"></i> Account Settings
                    </a>
                    <form action="logout.php" method="post">
                        <button type="submit" class="sidebar-link logout-btn">
                            <i class="fas fa-arrow-right-from-bracket"></i> Logout
                        </button>
                    </form>
                </div>
            </div>
            <div class="sidebar-overlay" onclick="toggleSidebar()"></div>

        <?php elseif ($user_role === 'admin'): ?>
            <div class="hamburger" onclick="toggleSidebar()">
                <span></span>
                <span></span>
                <span></span>
            </div>
            <div class="nav-links desktop-only admin-nav">
                <span class="user-greeting">Welcome, <strong><?php echo htmlspecialchars($_SESSION['user_name'] ?? 'Admin'); ?></strong></span>
                <a href="admin_dashboard.php" class="btn-secondary app-nav-link" title="Dashboard">
                    <i class="fas fa-home"></i> Dashboard
                </a>
                <a href="admin_users.php" class="btn-secondary app-nav-link" title="Users">
                    <i class="fas fa-users"></i> Users
                </a>
                <a href="admin_rides.php" class="btn-secondary app-nav-link" title="Rides">
                    <i class="fas fa-book"></i> Rides
                </a>
                <a href="admin_driver_verify.php" class="btn-secondary app-nav-link" title="Driver Verification">
                    <i class="fas fa-id-card"></i> Driver Verify
                </a>
                <a href="admin_passenger_verify.php" class="btn-secondary app-nav-link" title="Passenger Verification">
                    <i class="fas fa-user-check"></i> Passenger Verify
                </a>
                <a href="admin_settings.php" class="btn-secondary app-nav-link" title="Settings">
                    <i class="fas fa-cog"></i> Settings
                </a>
                <form action="logout.php" method="post" style="display: inline;">
                    <button type="submit" class="btn-secondary app-nav-link" title="Logout" style="padding: 8px 16px; font-size: 0.9rem;">
                        <i class="fas fa-sign-out-alt"></i> Logout
                    </button>
                </form>
            </div>
            <div class="sidebar" id="sidebar">
                <div class="sidebar-header">
                    <span class="close-btn" onclick="toggleSidebar()">&times;</span>
                </div>
                <div class="sidebar-content">
                    <div class="sidebar-logo">
                        <img src="logo.png" alt="TriWheel Logo" class="logo-img">
                        <span class="logo-text">TriWheel</span>
                    </div>
                    <a href="admin_dashboard.php" class="sidebar-link">
                        <i class="fas fa-home"></i> Dashboard
                    </a>
                    <a href="admin_settings.php" class="sidebar-link">
                        <i class="fas fa-cog"></i> Settings
                    </a>
                    <form action="logout.php" method="post">
                        <button type="submit" class="sidebar-link logout-btn">
                            <i class="fas fa-sign-out-alt"></i> Logout
                        </button>
                    </form>
                </div>
            </div>
            <div class="sidebar-overlay" onclick="toggleSidebar()"></div>
        <?php endif; ?>
    </div>
</nav>

<script>
    function toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.querySelector('.sidebar-overlay');
        
        if (sidebar) {
            sidebar.classList.toggle('open');
        }
        if (overlay && !overlay.classList.contains('hidden')) {
            overlay.classList.add('hidden');
        } else if (overlay) {
            overlay.classList.remove('hidden');
        }
    }
</script>
