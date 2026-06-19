<?php

namespace App\Services;

class DriverVerificationService
{
    public const ALLOWED_DOCUMENT_MIME_TYPES = [
        'application/pdf',
        'image/jpeg',
        'image/png',
    ];

    public const MAX_DOCUMENT_SIZE_KB = 4096;

    public function pendingStatus(): string
    {
        return 'pending';
    }
}
