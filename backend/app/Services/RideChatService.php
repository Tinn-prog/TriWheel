<?php

namespace App\Services;

use App\Models\Driver;
use App\Models\Ride;
use App\Models\User;
use Illuminate\Support\Carbon;

class RideChatService
{
    public const WINDOW_HOURS = 24;

    public function chatOpensAt(Ride $ride): ?Carbon
    {
        return $ride->accepted_at?->copy();
    }

    public function chatExpiresAt(Ride $ride): ?Carbon
    {
        $opensAt = $this->chatOpensAt($ride);

        return $opensAt?->copy()->addHours(self::WINDOW_HOURS);
    }

    public function isChatWindowOpen(Ride $ride): bool
    {
        $expiresAt = $this->chatExpiresAt($ride);

        if (! $expiresAt) {
            return false;
        }

        return now()->lt($expiresAt);
    }

    public function userParticipatesInRide(Ride $ride, User $user): bool
    {
        if (! in_array($user->role, ['passenger', 'driver'], true)) {
            return false;
        }

        if ((int) $ride->passenger_id === (int) $user->id) {
            return true;
        }

        if ($user->role !== 'driver') {
            return false;
        }

        $driver = Driver::query()->where('user_id', $user->id)->first();

        return $driver && (int) $ride->driver_id === (int) $driver->id;
    }

    public function canReadChat(Ride $ride, User $user): bool
    {
        if (! $this->userParticipatesInRide($ride, $user)) {
            return false;
        }

        if (! $ride->accepted_at) {
            return false;
        }

        return $this->isChatWindowOpen($ride);
    }

    public function canSendChat(Ride $ride, User $user): bool
    {
        if (! $this->canReadChat($ride, $user)) {
            return false;
        }

        if (! in_array($ride->status, ['accepted', 'ongoing', 'completed'], true)) {
            return false;
        }

        return true;
    }

  /**
     * @return array{
     *     open: bool,
     *     opens_at: string|null,
     *     expires_at: string|null,
     *     can_read: bool,
     *     can_send: bool,
     *     status: string
     * }
     */
    public function chatMeta(Ride $ride, User $user): array
    {
        $open = $this->isChatWindowOpen($ride);

        return [
            'open' => $open,
            'opens_at' => $this->chatOpensAt($ride)?->toIso8601String(),
            'expires_at' => $this->chatExpiresAt($ride)?->toIso8601String(),
            'can_read' => $this->canReadChat($ride, $user),
            'can_send' => $this->canSendChat($ride, $user),
            'status' => $open ? 'active' : ($ride->accepted_at ? 'ended' : 'unavailable'),
        ];
    }

    public function otherPartyName(Ride $ride, User $user): ?string
    {
        if ((int) $ride->passenger_id === (int) $user->id) {
            $ride->loadMissing('driver.user:id,name');

            return $ride->driver?->user?->name;
        }

        $ride->loadMissing('passenger:id,name');

        return $ride->passenger?->name;
    }

    public function otherPartyRole(Ride $ride, User $user): ?string
    {
        return (int) $ride->passenger_id === (int) $user->id ? 'driver' : 'passenger';
    }
}
