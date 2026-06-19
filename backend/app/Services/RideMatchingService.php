<?php

namespace App\Services;

class RideMatchingService
{
    public function detectTerminal(?string $address): ?string
    {
        $normalizedAddress = strtolower(trim($address ?? ''));

        if ($normalizedAddress === '') {
            return null;
        }

        if (str_contains($normalizedAddress, 'tricycle terminal') || str_contains($normalizedAddress, 'tricycle')) {
            return 'tricycle';
        }

        if (str_contains($normalizedAddress, 'pedicab terminal') || str_contains($normalizedAddress, 'pedicab')) {
            return 'pedicab';
        }

        if (str_contains($normalizedAddress, 'terminal')) {
            return 'terminal';
        }

        return null;
    }
}
