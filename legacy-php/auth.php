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

function csrf_token() {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }

    return $_SESSION['csrf_token'];
}

function csrf_input() {
    return '<input type="hidden" name="csrf_token" value="' . htmlspecialchars(csrf_token(), ENT_QUOTES, 'UTF-8') . '">';
}

function require_valid_csrf() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        return;
    }

    $postedToken = $_POST['csrf_token'] ?? '';
    $sessionToken = $_SESSION['csrf_token'] ?? '';
    if ($postedToken === '' || $sessionToken === '' || !hash_equals($sessionToken, $postedToken)) {
        http_response_code(403);
        exit('Invalid request token. Please go back, refresh the page, and try again.');
    }
}

function csrf_form_script() {
    $token = htmlspecialchars(csrf_token(), ENT_QUOTES, 'UTF-8');
    return <<<HTML
<script>
document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('form[method="post"], form[method="POST"]').forEach(function (form) {
        if (!form.querySelector('input[name="csrf_token"]')) {
            var token = document.createElement('input');
            token.type = 'hidden';
            token.name = 'csrf_token';
            token.value = '{$token}';
            form.appendChild(token);
        }
    });
});
</script>
HTML;
}

// Run enforcement automatically when included
enforce_session_security();

?>
