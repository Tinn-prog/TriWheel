<?php

namespace App\Support;

class DocumentUrl
{
    public static function from(?string $path): ?string
    {
        if (! $path) {
            return null;
        }

        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }

        return rtrim(config('app.url'), '/').'/api/files/'.ltrim($path, '/');
    }
}
