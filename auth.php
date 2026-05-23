<?php
// Central session and auth helpers
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Basic session security settings
@ini_set('session.use_strict_mode', 1);

$SESSION_TIMEOUT = 1800; // 30 minutes

function enforce_session_security() {
    global $SESSION_TIMEOUT;
    if (!isset($_SESSION)) return;

    if (!isset($_SESSION['last_activity'])) {
        $_SESSION['last_activity'] = time();
        $_SESSION['created'] = $_SESSION['created'] ?? time();
        $_SESSION['regen_time'] = $_SESSION['regen_time'] ?? time();
    }

    // Expire session after inactivity
    if (time() - $_SESSION['last_activity'] > $SESSION_TIMEOUT) {
        session_unset();
        session_destroy();
        header('Location: login.php?expired=1');
        exit;
    }

    $_SESSION['last_activity'] = time();

    // Regenerate session id periodically
    if (!isset($_SESSION['regen_time']) || (time() - $_SESSION['regen_time']) > 300) {
        session_regenerate_id(true);
        $_SESSION['regen_time'] = time();
    }
}

function require_login() {
    if (!isset($_SESSION['user_id'])) {
        header('Location: login.php');
        exit;
    }
}

function require_admin() {
    require_login();
    if (!isset($_SESSION['user_role']) || $_SESSION['user_role'] !== 'admin') {
        header('Location: login.php');
        exit;
    }
}

// Run enforcement automatically when included
enforce_session_security();

?>
