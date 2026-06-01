<?php
require 'auth.php';
require 'db.php';

if (!isset($_SESSION['user_id']) || $_SESSION['user_role'] !== 'admin') {
    header("Location: login.php");
    exit;
}

header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Settings - TriWheel</title>
    <link rel="stylesheet" href="style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="app-dashboard app-admin">
    <?php require 'navbar.php'; ?>
    
    <div class="dashboard-container">
        <div class="container">
            <div class="dashboard-header">
                <h1><i class="fas fa-cog"></i> Settings</h1>
                <p>Configure system settings and preferences</p>
            </div>

            <div class="dashboard-card">
                <div class="card-header" style="background: linear-gradient(135deg, #7C3AED, #4F46E5);">
                    <h3 style="margin: 0; color: white;"><i class="fas fa-sliders-h"></i> System Information</h3>
                </div>
                <div class="card-content">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
                        <div>
                            <p style="color: #6B7280; font-size: 0.875rem; margin-bottom: 8px;">
                                <i class="fas fa-dollar-sign"></i> Base Fare
                            </p>
                            <p style="color: #1A1D23; font-weight: 600; font-size: 1.25rem; margin: 0;">₱10.00</p>
                        </div>
                        <div>
                            <p style="color: #6B7280; font-size: 0.875rem; margin-bottom: 8px;">
                                <i class="fas fa-ruler"></i> Per Km Rate
                            </p>
                            <p style="color: #1A1D23; font-weight: 600; font-size: 1.25rem; margin: 0;">₱12.00</p>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
                        <div>
                            <p style="color: #6B7280; font-size: 0.875rem; margin-bottom: 8px;">
                                <i class="fas fa-clock"></i> Minimum Ride Time
                            </p>
                            <p style="color: #1A1D23; font-weight: 600; font-size: 1.25rem; margin: 0;">5 minutes</p>
                        </div>
                        <div>
                            <p style="color: #6B7280; font-size: 0.875rem; margin-bottom: 8px;">
                                <i class="fas fa-users"></i> Max Passengers
                            </p>
                            <p style="color: #1A1D23; font-weight: 600; font-size: 1.25rem; margin: 0;">5 per ride</p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="dashboard-card" style="margin-top: 24px;">
                <div class="card-header" style="background: linear-gradient(135deg, #7C3AED, #4F46E5);">
                    <h3 style="margin: 0; color: white;"><i class="fas fa-shield-alt"></i> System Status</h3>
                </div>
                <div class="card-content">
                    <div style="display: grid; gap: 16px;">
                        <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; background: #F3F4F6; border-radius: 8px;">
                            <span style="color: #1A1D23; font-weight: 600;"><i class="fas fa-check-circle" style="color: #10B981; margin-right: 8px;"></i>Platform Status</span>
                            <span style="background: #D1FAE5; color: #10B981; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600;">Online</span>
                        </div>
                        <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; background: #F3F4F6; border-radius: 8px;">
                            <span style="color: #1A1D23; font-weight: 600;"><i class="fas fa-database" style="color: #0EA5E9; margin-right: 8px;"></i>Database</span>
                            <span style="background: #E0F5FF; color: #0369A1; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600;">Connected</span>
                        </div>
                        <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; background: #F3F4F6; border-radius: 8px;">
                            <span style="color: #1A1D23; font-weight: 600;"><i class="fas fa-lock" style="color: #7C3AED; margin-right: 8px;"></i>Security</span>
                            <span style="background: #EDE9FE; color: #7C3AED; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600;">Active</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
