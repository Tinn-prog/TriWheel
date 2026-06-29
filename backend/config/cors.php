<?php

$frontendOrigins = array_values(array_filter(array_map(
    static fn (string $origin): string => trim($origin),
    explode(',', (string) env('FRONTEND_URL', 'http://localhost:3000')),
)));

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => $frontendOrigins,
    'allowed_origins_patterns' => [
        '#^https://[a-z0-9-]+(\\.[a-z0-9-]+)*\\.vercel\\.app$#i',
        '#^https://[a-z0-9-]+\.ngrok-free\.app$#i',
        '#^https://[a-z0-9-]+\.ngrok-free\.dev$#i',
        '#^https://[a-z0-9-]+\.ngrok\.io$#i',
        '#^https://[a-z0-9-]+\.ngrok\.app$#i',
    ],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];
