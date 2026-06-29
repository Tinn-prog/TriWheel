"use client";

import { useStoredTriWheelSession } from "@/app/admin/AdminAccessGate";
import { AppShell } from "@/components/AppShell";
import { passengerNavItems } from "@/app/passenger/passengerNav";
import { NotificationBell } from "@/components/NotificationBell";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { RideCancelDialog } from "@/components/RideCancelDialog";
import { RideReportDialog } from "@/components/RideReportDialog";
import { TriWheelLoadingScreen } from "@/components/TriWheelLoadingScreen";
import { apiFetch, apiRoutes, readApiErrorMessage } from "@/lib/api";
import { logoutTriWheel } from "@/lib/logout";
import { DriverRatingSummary, RideRatingForm } from "@/components/RideStarRating";
import { RideContactPanel } from "@/components/RideContactPanel";
import {
  getRideRatingCopy,
  pickDriverRatingStats,
  rideRatingVariant,
} from "@/lib/rideRatingCopy";
import { formatRideTypeLabel } from "@/lib/rideTypes";
import {
  dismissRatingRide,
  readDismissedRatingRideIds,
} from "@/lib/rideFeedbackDismiss";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";
import type { PlaceSuggestion, Point } from "@/lib/mapTypes";
import { PlaceSuggestionOption } from "@/components/PlaceSuggestionOption";
import {
  looksLikeCoordinates,
  useGeocoder,
} from "@/hooks/useGeocoder";
import { useLiveDashboardRefresh } from "@/hooks/useLiveDashboardRefresh";
import { useRideReport } from "@/hooks/useRideReport";
import {
  passengerCancelReasons,
  type PassengerCancelReasonCode,
} from "@/lib/rideCancellation";
import {
  passengerReportReasons,
  type PassengerReportReasonCode,
} from "@/lib/rideReports";
import {
  checkRideCompliance,
  type ComplianceIssue,
} from "@/lib/roadCompliance";

const RideRequestMap = dynamic(
  () => import("./RideRequestMap").then((module) => module.RideRequestMap),
  {
    loading: () => (
      <TriWheelLoadingScreen
        compact
        message="Preparing the map so you can set accurate pickup and drop-off pins."
        title="Loading map"
      />
    ),
    ssr: false,
  },
);

type StoredUser = {
  id: number;
  name: string;
  email: string;
  role: string;
};

type Ride = {
  id: number;
  pickup_address: string;
  dropoff_address: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  ride_type: string | null;
  status: string;
  is_emergency?: boolean;
  fare: number | null;
  created_at: string;
  passenger_rated?: boolean;
  driver_name: string | null;
  driver_phone: string | null;
  driver_average_rating?: number | null;
  driver_rating_count?: number;
  driver_emergency_average_rating?: number | null;
  driver_emergency_rating_count?: number;
  driver_lat: number | null;
  driver_lng: number | null;
  driver_location_updated_at: string | null;
  vehicle_type: string | null;
  plate_number: string | null;
  vehicle_color: string | null;
  offers: RideOffer[];
  can_report?: boolean;
  report_submitted?: boolean;
  cancelled_by?: string | null;
  cancellation_reason?: string | null;
};

type RideOffer = {
  id: number;
  status: string;
  driver_id: number;
  driver_name: string | null;
  driver_phone: string | null;
  driver_status: string | null;
  driver_average_rating?: number | null;
  driver_rating_count?: number;
  driver_emergency_average_rating?: number | null;
  driver_emergency_rating_count?: number;
  vehicle_type: string | null;
  plate_number: string | null;
  vehicle_color: string | null;
  created_at: string;
};

type PassengerOverview = {
  passenger: {
    id: number;
    name: string;
    email: string;
    contact_number: string | null;
  };
  active_ride: Ride | null;
  pending_rating_ride: Ride | null;
  ride_history: Ride[];
};

function statusClass(status: string) {
  if (status === "completed") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "cancelled") {
    return "bg-red-100 text-red-700";
  }

  return "bg-orange-100 text-orange-700";
}

function statusLabel(status: string) {
  return status
    .split("_")
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

function formatFare(fare: number | null) {
  return fare !== null ? `PHP ${fare.toFixed(2)}` : "Waiting for estimate";
}

const rideProgress = [
  { key: "requested", label: "Finding offers" },
  { key: "accepted", label: "Driver matched" },
  { key: "ongoing", label: "On trip" },
  { key: "completed", label: "Completed" },
];

function tripTrackingCopy(status: string, offerCount: number, isEmergency = false) {
  if (status === "requested") {
    return {
      action: offerCount > 0 ? "Choose your driver" : "Wait for driver offers",
      description:
        offerCount > 0
          ? "Drivers are ready. Compare the offers and choose the one you prefer."
          : "Your request is live. Online drivers can now send offers for this ride.",
      title: offerCount > 0 ? `${offerCount} driver offer${offerCount > 1 ? "s" : ""}` : "Finding nearby drivers",
    };
  }

  if (status === "accepted") {
    return {
      action: isEmergency ? "Emergency driver is on the way" : "Meet your driver at pickup",
      description: isEmergency
        ? "TriWheel assigned the nearest available tricycle or e-tricycle driver to your emergency request."
        : "Your selected driver has accepted the trip. Stay near the pickup point and keep your phone available.",
      title: isEmergency ? "Emergency driver assigned" : "Driver is assigned",
    };
  }

  if (status === "ongoing") {
    return {
      action: "Enjoy your ride",
      description:
        "Your trip is now in progress. You can review the trip details here anytime.",
      title: "Trip in progress",
    };
  }

  if (status === "completed") {
    return {
      action: "Trip completed",
      description: "Thanks for riding with TriWheel. Your trip is saved in history.",
      title: "Arrived safely",
    };
  }

  return {
    action: "Check trip status",
    description: "Your latest trip status is shown below.",
    title: statusLabel(status),
  };
}

function canPassengerCancelRide(status: string) {
  return status === "requested" || status === "accepted";
}

export function PassengerDashboard() {
  const router = useRouter();
  const { isChecking, user } = useStoredTriWheelSession() as {
    isChecking: boolean;
    user: StoredUser | null;
  };
  const [overview, setOverview] = useState<PassengerOverview | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmittingRide, setIsSubmittingRide] = useState(false);
  const [isSubmittingEmergency, setIsSubmittingEmergency] = useState(false);
  const [showEmergencyConfirm, setShowEmergencyConfirm] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelRideId, setCancelRideId] = useState<number | null>(null);
  const [cancelError, setCancelError] = useState("");
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportRideId, setReportRideId] = useState<number | null>(null);
  const [isCancellingRide, setIsCancellingRide] = useState(false);
  const [choosingOfferId, setChoosingOfferId] = useState<number | null>(null);
  const [ratingRideId, setRatingRideId] = useState<number | null>(null);
  const [dismissedRatingRideIds, setDismissedRatingRideIds] = useState<number[]>(
    [],
  );
  const [rideType, setRideType] = useState("tricycle");
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [pickupPoint, setPickupPoint] = useState<Point | null>(null);
  const [dropoffPoint, setDropoffPoint] = useState<Point | null>(null);
  const [pickupSuggestions, setPickupSuggestions] = useState<PlaceSuggestion[]>(
    [],
  );
  const [dropoffSuggestions, setDropoffSuggestions] = useState<
    PlaceSuggestion[]
  >([]);
  const [placeSearchStatus, setPlaceSearchStatus] = useState("");
  const [complianceIssues, setComplianceIssues] = useState<ComplianceIssue[]>([]);
  const {
    isGeocoderReady,
    resolvePlaceDetails,
    reverseGeocode: geocodeAddress,
    searchPlaces: searchLocations,
  } = useGeocoder();

  useEffect(() => {
    if (!isChecking && user?.role !== "passenger") {
      router.replace("/login?role=passenger");
    }
  }, [isChecking, router, user]);

  const loadOverview = useCallback(async (userId: number) => {
    const response = await fetch(`${apiRoutes.passengerOverview}?user_id=${userId}`);

    if (!response.ok) {
      throw new Error("Unable to load passenger dashboard.");
    }

    setOverview((await response.json()) as PassengerOverview);
  }, []);

  const {
    error: reportError,
    isSubmitting: isSubmittingReport,
    submitReport,
  } = useRideReport(user?.id, () => {
    if (user) {
      void loadOverview(user.id);
    }
    setNotice("Report submitted. TriWheel admins will review it.");
  });

  const refreshDashboard = useCallback(async () => {
    if (!user) {
      return;
    }

    try {
      await loadOverview(user.id);
    } catch {
      // Keep the last good dashboard snapshot during background refresh.
    }
  }, [loadOverview, user]);

  useLiveDashboardRefresh(
    refreshDashboard,
    Boolean(user),
    overview?.active_ride?.status === "accepted" ||
      overview?.active_ride?.status === "ongoing"
      ? 5000
      : 8000,
  );

  useEffect(() => {
    setDismissedRatingRideIds(readDismissedRatingRideIds());
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    const userId = user.id;

    async function loadDashboard() {
      try {
        await loadOverview(userId);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load passenger dashboard.",
        );
      }
    }

    void loadDashboard();
  }, [loadOverview, user]);

  useEffect(() => {
    const query = pickupAddress.trim();

    if (query.length < 2 || pickupPoint || !isGeocoderReady) {
      return;
    }

    const timeout = window.setTimeout(async () => {
      try {
        setPlaceSearchStatus("Searching pickup suggestions...");
        const result = await searchLocations(query);
        setPickupSuggestions(result.suggestions);
        setPlaceSearchStatus("");
      } catch (caughtError) {
        setPickupSuggestions([]);
        setPlaceSearchStatus(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to search pickup.",
        );
      }
    }, 350);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [isGeocoderReady, pickupAddress, pickupPoint, searchLocations]);

  useEffect(() => {
    if (!pickupPoint || !isGeocoderReady || !looksLikeCoordinates(pickupAddress)) {
      return;
    }

    void geocodeAddress(pickupPoint)
      .then((address) => setPickupAddress(address))
      .catch(() => undefined);
  }, [geocodeAddress, isGeocoderReady, pickupAddress, pickupPoint]);

  useEffect(() => {
    const query = dropoffAddress.trim();

    if (query.length < 2 || dropoffPoint || !isGeocoderReady) {
      return;
    }

    const timeout = window.setTimeout(async () => {
      try {
        setPlaceSearchStatus("Searching drop-off suggestions...");
        const result = await searchLocations(query);
        setDropoffSuggestions(result.suggestions);
        setPlaceSearchStatus("");
      } catch (caughtError) {
        setDropoffSuggestions([]);
        setPlaceSearchStatus(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to search drop-off.",
        );
      }
    }, 350);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [dropoffAddress, dropoffPoint, isGeocoderReady, searchLocations]);

  useEffect(() => {
    if (!dropoffPoint || !isGeocoderReady || !looksLikeCoordinates(dropoffAddress)) {
      return;
    }

    void geocodeAddress(dropoffPoint)
      .then((address) => setDropoffAddress(address))
      .catch(() => undefined);
  }, [dropoffAddress, dropoffPoint, geocodeAddress, isGeocoderReady]);

  async function handleRideRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      return;
    }

    setError("");
    setNotice("");
    setComplianceIssues([]);
    setIsSubmittingRide(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const rideTypeValue = rideType;
    const pickupLat = formData.get("pickup_lat")
      ? Number(formData.get("pickup_lat"))
      : null;
    const pickupLng = formData.get("pickup_lng")
      ? Number(formData.get("pickup_lng"))
      : null;
    const dropoffLat = formData.get("dropoff_lat")
      ? Number(formData.get("dropoff_lat"))
      : null;
    const dropoffLng = formData.get("dropoff_lng")
      ? Number(formData.get("dropoff_lng"))
      : null;
    const payload = {
      user_id: user.id,
      pickup_address: String(formData.get("pickup_address") ?? ""),
      dropoff_address: String(formData.get("dropoff_address") ?? ""),
      ride_type: rideTypeValue,
      pickup_lat: pickupPoint?.lat ?? pickupLat,
      pickup_lng: pickupPoint?.lng ?? pickupLng,
      dropoff_lat: dropoffPoint?.lat ?? dropoffLat,
      dropoff_lng: dropoffPoint?.lng ?? dropoffLng,
    };

    try {
      const compliance = await checkRideCompliance({
        ride_type: rideTypeValue,
        pickup_lat: payload.pickup_lat,
        pickup_lng: payload.pickup_lng,
        dropoff_lat: payload.dropoff_lat,
        dropoff_lng: payload.dropoff_lng,
      });

      if (compliance.issues.length) {
        setComplianceIssues(compliance.issues);
      }

      if (compliance.level === "block" || !compliance.allowed) {
        throw new Error(
          compliance.issues.map((issue) => issue.message).join(" ") ||
            "This route is not allowed for the selected vehicle type.",
        );
      }

      const response = await fetch(apiRoutes.passengerRides, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to request ride.");
      }

      setNotice(data.message ?? "Ride requested successfully.");
      setComplianceIssues([]);
      form.reset();
      setPickupAddress("");
      setDropoffAddress("");
      setRideType("tricycle");
      setPickupPoint(null);
      setDropoffPoint(null);
      await loadOverview(user.id);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to request ride.",
      );
    } finally {
      setIsSubmittingRide(false);
    }
  }

  async function resolveEmergencyPickupPoint(): Promise<Point | null> {
    if (pickupPoint) {
      return pickupPoint;
    }

    const query = pickupAddress.trim();

    if (!query || !isGeocoderReady) {
      return null;
    }

    try {
      const result = await searchLocations(query);
      const suggestion = result.suggestions[0];

      if (!suggestion) {
        return null;
      }

      if (suggestion.lat && suggestion.lon) {
        const point = {
          lat: Number(suggestion.lat),
          lng: Number(suggestion.lon),
        };
        setPickupPoint(point);
        return point;
      }

      const details = await resolvePlaceDetails(suggestion.place_id);
      setPickupAddress(details.address);
      setPickupPoint(details.point);
      return details.point;
    } catch {
      return null;
    }
  }

  async function openEmergencyConfirm() {
    if (!pickupAddress.trim()) {
      setError("Set your pickup location before requesting emergency help.");
      return;
    }

    setError("");
    setPlaceSearchStatus("Checking pickup location for emergency dispatch...");

    const point = await resolveEmergencyPickupPoint();

    setPlaceSearchStatus("");

    if (!point) {
      setError(
        "Use your current location, pick a map pin, or choose a pickup suggestion so we can find the nearest driver.",
      );
      return;
    }

    setShowEmergencyConfirm(true);
  }

  async function handleEmergencyRequest() {
    if (!user) {
      return;
    }

    setError("");
    setNotice("");
    setIsSubmittingEmergency(true);

    try {
      const point = pickupPoint ?? (await resolveEmergencyPickupPoint());

      if (!point) {
        throw new Error("Pickup location is required for emergency dispatch.");
      }

      const response = await fetch(apiRoutes.passengerEmergencyRide, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user.id,
          pickup_address: pickupAddress,
          pickup_lat: point.lat,
          pickup_lng: point.lng,
          dropoff_address: dropoffAddress.trim() || pickupAddress,
          dropoff_lat: dropoffPoint?.lat ?? point.lat,
          dropoff_lng: dropoffPoint?.lng ?? point.lng,
        }),
      });
      const data = (await response.json()) as {
        message?: string;
        errors?: Record<string, string[]>;
      };

      if (!response.ok) {
        const validationMessage = data.errors
          ? Object.values(data.errors).flat().join(" ")
          : null;
        throw new Error(
          validationMessage ?? data.message ?? "Unable to dispatch emergency ride.",
        );
      }

      setShowEmergencyConfirm(false);
      setNotice(data.message ?? "Emergency ride dispatched.");
      await loadOverview(user.id);
      window.location.hash = "active-ride";
    } catch (caughtError) {
      setShowEmergencyConfirm(false);
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to dispatch emergency ride.",
      );
    } finally {
      setIsSubmittingEmergency(false);
    }
  }

  function openCancelDialog(rideId: number) {
    setCancelRideId(rideId);
    setCancelError("");
    setShowCancelDialog(true);
  }

  async function handleCancelRide(payload: {
    cancellation_reason_code: PassengerCancelReasonCode;
    cancellation_reason_detail?: string;
  }) {
    const rideId = cancelRideId ?? overview?.active_ride?.id;

    if (!user || !rideId) {
      setCancelError("No active ride found to cancel.");
      return;
    }

    setError("");
    setNotice("");
    setCancelError("");
    setIsCancellingRide(true);

    try {
      const response = await apiFetch(apiRoutes.rideCancel(rideId), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user.id,
          cancellation_reason_code: payload.cancellation_reason_code,
          cancellation_reason_detail: payload.cancellation_reason_detail ?? null,
        }),
      });

      if (!response.ok) {
        throw new Error(
          await readApiErrorMessage(response, "Unable to cancel ride."),
        );
      }

      const data = (await response.json()) as { message?: string };

      setShowCancelDialog(false);
      setCancelRideId(null);
      setNotice(data.message ?? "Ride cancelled successfully.");
      window.location.hash = "book-ride";
      await loadOverview(user.id);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to cancel ride.";
      setCancelError(message);
      setError(message);
    } finally {
      setIsCancellingRide(false);
    }
  }

  async function handleReportRide(payload: {
    report_reason_code: PassengerReportReasonCode;
    report_reason_detail?: string;
  }) {
    if (!reportRideId) {
      return;
    }

    const succeeded = await submitReport(reportRideId, payload);

    if (succeeded) {
      setShowReportDialog(false);
      setReportRideId(null);
    }
  }

  async function handleChooseOffer(offerId: number) {
    if (!user) {
      return;
    }

    setError("");
    setNotice("");
    setChoosingOfferId(offerId);

    try {
      const response = await fetch(apiRoutes.passengerRideOfferChoose(offerId), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_id: user.id }),
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to choose driver.");
      }

      setNotice(data.message ?? "Driver selected successfully.");
      await loadOverview(user.id);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to choose driver.",
      );
    } finally {
      setChoosingOfferId(null);
    }
  }

  async function selectPickupSuggestion(suggestion: PlaceSuggestion) {
    setPickupSuggestions([]);
    setPlaceSearchStatus("Loading place details...");

    try {
      if (suggestion.lat && suggestion.lon) {
        setPickupAddress(suggestion.display_name);
        setPickupPoint({
          lat: Number(suggestion.lat),
          lng: Number(suggestion.lon),
        });
      } else {
        const details = await resolvePlaceDetails(suggestion.place_id);
        setPickupAddress(details.address);
        setPickupPoint(details.point);
      }

      setPlaceSearchStatus("");
    } catch (caughtError) {
      setPlaceSearchStatus(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load this pickup location.",
      );
    }
  }

  async function selectDropoffSuggestion(suggestion: PlaceSuggestion) {
    setDropoffSuggestions([]);
    setPlaceSearchStatus("Loading place details...");

    try {
      if (suggestion.lat && suggestion.lon) {
        setDropoffAddress(suggestion.display_name);
        setDropoffPoint({
          lat: Number(suggestion.lat),
          lng: Number(suggestion.lon),
        });
      } else {
        const details = await resolvePlaceDetails(suggestion.place_id);
        setDropoffAddress(details.address);
        setDropoffPoint(details.point);
      }

      setPlaceSearchStatus("");
    } catch (caughtError) {
      setPlaceSearchStatus(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load this drop-off location.",
      );
    }
  }

  const handleMapPickupSelect = useCallback(
    async (point: Point) => {
      setPickupPoint(point);
      setPickupSuggestions([]);
      setPickupAddress("Looking up address...");
      setPlaceSearchStatus("Looking up pickup address...");

      try {
        setPickupAddress(await geocodeAddress(point));
        setPlaceSearchStatus("");
      } catch (caughtError) {
        setPickupAddress("Looking up address...");
        setPlaceSearchStatus(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to look up pickup address.",
        );
      }
    },
    [geocodeAddress],
  );

  const handleMapDropoffSelect = useCallback(
    async (point: Point) => {
      setDropoffPoint(point);
      setDropoffSuggestions([]);
      setDropoffAddress("Looking up address...");
      setPlaceSearchStatus("Looking up drop-off address...");

      try {
        setDropoffAddress(await geocodeAddress(point));
        setPlaceSearchStatus("");
      } catch (caughtError) {
        setDropoffAddress("Looking up address...");
        setPlaceSearchStatus(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to look up drop-off address.",
        );
      }
    },
    [geocodeAddress],
  );

  function useCurrentLocationAsPickup() {
    if (!navigator.geolocation) {
      setPlaceSearchStatus("Your browser does not support current location.");
      return;
    }

    setPlaceSearchStatus("Getting your current location...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const point = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        setPickupPoint(point);
        setPickupSuggestions([]);
        setPlaceSearchStatus("Looking up pickup address...");

        void geocodeAddress(point)
          .then((address) => {
            setPickupAddress(address);
            setPlaceSearchStatus("");
          })
          .catch(() => {
            setPickupAddress("Current location");
            setPlaceSearchStatus("");
          });
      },
      () => {
        setPlaceSearchStatus(
          "Unable to get your current location. Please allow location access.",
        );
      },
    );
  }

  async function handleRateDriver(
    event: FormEvent<HTMLFormElement>,
    rideId: number,
  ) {
    event.preventDefault();

    if (!user) {
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);

    setError("");
    setNotice("");
    setRatingRideId(rideId);

    try {
      const response = await fetch(apiRoutes.passengerRideRating(rideId), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user.id,
          rating: Number(formData.get("rating") ?? 0),
          feedback: String(formData.get("feedback") ?? ""),
        }),
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to submit feedback.");
      }

      setNotice(data.message ?? "Thank you for your feedback!");
      form.reset();
      await loadOverview(user.id);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to submit feedback.",
      );
    } finally {
      setRatingRideId(null);
    }
  }

  function handleDismissRating(rideId: number) {
    dismissRatingRide(rideId);
    setDismissedRatingRideIds(readDismissedRatingRideIds());
    setNotice("You can rate this trip later from Ride History.");
  }

  function handleLogout() {
    void logoutTriWheel();
  }

  if (isChecking || !user) {
    return (
      <TriWheelLoadingScreen
        message="Checking your passenger session and keeping your dashboard secure."
        title="Opening Passenger Dashboard"
      />
    );
  }

  if (!overview && !error) {
    return (
      <TriWheelLoadingScreen
        message="Loading your rides, active trip, driver offers, and history."
        title="Getting your dashboard ready"
      />
    );
  }

  const activeRide = overview?.active_ride ?? null;
  const pendingRatingRide = overview?.pending_rating_ride ?? null;
  const showPendingRating =
    pendingRatingRide &&
    !pendingRatingRide.passenger_rated &&
    !dismissedRatingRideIds.includes(pendingRatingRide.id);
  const hasActiveRide = Boolean(activeRide);
  const canRequestRide = !hasActiveRide && !isSubmittingRide && !isSubmittingEmergency;
  const hasEmergencyPickup =
    Boolean(pickupPoint) || pickupAddress.trim().length >= 3;
  const canRequestEmergency =
    !hasActiveRide &&
    !isSubmittingRide &&
    !isSubmittingEmergency &&
    hasEmergencyPickup;
  const pendingOfferCount = activeRide?.offers.length ?? 0;
  const activeTripTracking = activeRide
    ? tripTrackingCopy(activeRide.status, pendingOfferCount, Boolean(activeRide.is_emergency))
    : null;
  const activeDriverRating = activeRide ? pickDriverRatingStats(activeRide) : null;
  const pendingRatingCopy = pendingRatingRide
    ? getRideRatingCopy(
        rideRatingVariant(Boolean(pendingRatingRide.is_emergency)),
        "passenger",
      )
    : null;

  return (
    <AppShell
      dashboardLabel="Passenger Dashboard"
      navItems={passengerNavItems}
      onLogout={handleLogout}
      user={user}
    >
      <section className="w-full min-w-0">
        <header className="rounded-[1.75rem] bg-gradient-to-br from-orange-500 via-orange-600 to-orange-800 p-5 text-white shadow-xl shadow-orange-200 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-orange-100">
                Passenger Dashboard
              </p>
              <h1 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">
                Welcome, {overview?.passenger.name ?? user.name}.
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-orange-50">
                Book a ride, compare driver offers, choose your driver, and
                track your trip from one clean dashboard.
              </p>
              <a
                className="mt-4 inline-flex w-fit rounded-2xl bg-white px-4 py-2.5 text-sm font-black text-orange-700 shadow-lg shadow-orange-950/10"
                href={hasActiveRide ? "#active-ride" : "#book-ride"}
              >
                {hasActiveRide ? "View Active Ride" : "Book a Ride"}
              </a>
            </div>
            <NotificationBell href="/passenger/notifications" userId={user.id} />
          </div>
          {activeRide && activeTripTracking ? (
            <div className="mt-5 rounded-3xl bg-white p-3 text-slate-950 shadow-xl shadow-orange-950/10">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex gap-3">
                  <div className="relative grid size-12 shrink-0 place-items-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-500/30">
                    <span className="absolute inline-flex size-12 animate-ping rounded-2xl bg-orange-400 opacity-25" />
                    <span className="relative text-lg font-black">TW</span>
                  </div>
                  <div>
                    <p className="text-[0.7rem] font-black uppercase tracking-[0.2em] text-orange-600">
                      Live trip tracking
                    </p>
                    <h2 className="mt-1 text-xl font-black">
                      {activeTripTracking.title}
                    </h2>
                    <p className="mt-1 max-w-2xl text-sm text-slate-500">
                      {activeTripTracking.description}
                    </p>
                  </div>
                </div>
                <a
                  className="inline-flex w-fit rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white"
                  href="#active-ride"
                >
                  {activeTripTracking.action}
                </a>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-4">
                {rideProgress.map((step) => {
                  const currentIndex = rideProgress.findIndex(
                    (item) => item.key === activeRide.status,
                  );
                  const stepIndex = rideProgress.findIndex(
                    (item) => item.key === step.key,
                  );
                  const isComplete = currentIndex >= 0 && stepIndex <= currentIndex;

                  return (
                    <div
                      className={`rounded-2xl px-3 py-2 text-center text-xs font-black ${
                        isComplete
                          ? "bg-orange-500 text-white"
                          : "bg-slate-100 text-slate-500"
                      }`}
                      key={step.key}
                    >
                      {step.label}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </header>

        {error && <div className="tw-alert-error mt-6">{error}</div>}
        {reportError && <div className="tw-alert-error mt-6">{reportError}</div>}
        {notice && <div className="tw-alert-success mt-6">{notice}</div>}

        <section className="mt-6 grid min-w-0 gap-6">
          <article
            className="relative overflow-hidden rounded-[1.75rem] bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:rounded-[2rem] sm:p-6"
            id="book-ride"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-400 via-orange-500 to-amber-400"
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-orange-600 sm:text-sm">
                  Book now
                </p>
                <h2 className="mt-1.5 text-2xl font-black sm:mt-2 sm:text-3xl">
                  Request a Ride
                </h2>
              </div>
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1.5 text-xs font-black text-orange-700 sm:px-4 sm:py-2">
                <span className="size-2 rounded-full bg-orange-500" />
                {hasActiveRide ? "Ride active" : "Ready"}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 sm:mt-5">
              {["Pickup", "Drop-off", "Confirm"].map((step, index) => (
                <div
                  className="rounded-2xl bg-slate-50 px-2 py-2 text-center text-[0.65rem] font-bold uppercase tracking-wide text-slate-500 sm:text-xs"
                  key={step}
                >
                  <span className="text-orange-600">{index + 1}.</span> {step}
                </div>
              ))}
            </div>

            {hasActiveRide && (
              <div className="mt-5 rounded-3xl bg-amber-50 p-4 text-sm font-bold text-amber-800">
                You already have an active ride. Finish, complete, or cancel it
                before requesting a new one.
              </div>
            )}

            <form className="mt-6 grid gap-4" onSubmit={handleRideRequest}>
              <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
                <fieldset
                  className="grid content-start gap-4 disabled:opacity-60"
                  disabled={!canRequestRide}
                >
                  <div className="grid gap-3 rounded-3xl bg-slate-50 p-4">
                    <label className="grid gap-2 text-sm font-bold">
                      <span className="flex items-center gap-2">
                        <span className="grid size-7 place-items-center rounded-xl bg-orange-100 text-orange-700">
                          <svg
                            className="size-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            viewBox="0 0 24 24"
                          >
                            <path
                              d="M12 21s-6-4.35-6-10a6 6 0 1 1 12 0c0 5.65-6 10-6 10Z"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <circle cx="12" cy="11" r="2.5" />
                          </svg>
                        </span>
                        Pickup location
                      </span>
                      <input
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-normal outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                        name="pickup_address"
                        onChange={(event) => {
                          const value = event.target.value;

                          setPickupAddress(value);
                          if (!value.trim()) {
                            setPickupPoint(null);
                          }
                          if (value.trim().length < 2) {
                            setPickupSuggestions([]);
                          }
                        }}
                        placeholder="Where should we pick you up?"
                        required
                        type="text"
                        value={pickupAddress}
                      />
                      <button
                        className="mt-1 w-fit rounded-2xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-xs font-black text-orange-700 transition hover:border-orange-300 hover:bg-orange-100"
                        onClick={useCurrentLocationAsPickup}
                        type="button"
                      >
                        Use my current location as pickup
                      </button>
                      {pickupSuggestions.length > 0 && (
                        <div className="grid gap-2 rounded-2xl border border-orange-100 bg-white p-2 shadow-lg shadow-orange-100">
                          {pickupSuggestions.map((suggestion) => (
                            <PlaceSuggestionOption
                              key={suggestion.place_id}
                              onSelect={(item) => void selectPickupSuggestion(item)}
                              suggestion={suggestion}
                            />
                          ))}
                        </div>
                      )}
                    </label>
                    <label className="grid gap-2 text-sm font-bold">
                      <span className="flex items-center gap-2">
                        <span className="grid size-7 place-items-center rounded-xl bg-slate-200 text-slate-700">
                          <svg
                            className="size-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            viewBox="0 0 24 24"
                          >
                            <path
                              d="m5 12 5 5L20 7"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                        Drop-off location
                      </span>
                      <input
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-normal outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                        name="dropoff_address"
                        onChange={(event) => {
                          const value = event.target.value;

                          setDropoffAddress(value);
                          if (!value.trim()) {
                            setDropoffPoint(null);
                          }
                          if (value.trim().length < 2) {
                            setDropoffSuggestions([]);
                          }
                        }}
                        placeholder="Where are you going?"
                        required
                        type="text"
                        value={dropoffAddress}
                      />
                      {dropoffSuggestions.length > 0 && (
                        <div className="grid gap-2 rounded-2xl border border-orange-100 bg-white p-2 shadow-lg shadow-orange-100">
                          {dropoffSuggestions.map((suggestion) => (
                            <PlaceSuggestionOption
                              key={suggestion.place_id}
                              onSelect={(item) => void selectDropoffSuggestion(item)}
                              suggestion={suggestion}
                            />
                          ))}
                        </div>
                      )}
                    </label>
                    {placeSearchStatus && (
                      <p className="rounded-2xl bg-orange-50 px-4 py-3 text-xs font-bold text-orange-800">
                        {placeSearchStatus}
                      </p>
                    )}
                    <label className="grid gap-2 text-sm font-bold">
                      Ride type
                      <select
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-normal outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                        name="ride_type"
                        onChange={(event) => setRideType(event.target.value)}
                        value={rideType}
                      >
                        <option value="tricycle">Tricycle</option>
                        <option value="pedicab">Pedicab</option>
                        <option value="e-tricycle">E-tricycle</option>
                      </select>
                    </label>
                  </div>

                  {complianceIssues.length > 0 ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                      <p className="font-black">Route compliance notice</p>
                      <ul className="mt-2 list-disc space-y-1 pl-5">
                        {complianceIssues.map((issue) => (
                          <li key={issue.code}>{issue.message}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="rounded-2xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
                      TriWheel routes follow LGU and national road rules. Tricycles
                      and pedicabs should use local streets and the rightmost lane
                      where allowed — major highways may be restricted.
                    </p>
                  )}

                  <button
                    className="rounded-2xl bg-slate-950 px-6 py-4 font-black text-white shadow-lg shadow-slate-300 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                    disabled={!canRequestRide}
                    type="submit"
                  >
                    {isSubmittingRide
                      ? "Sending request..."
                      : hasActiveRide
                        ? "Active Ride in Progress"
                        : "Find Drivers"}
                  </button>

                  <div className="rounded-3xl border border-red-200 bg-gradient-to-br from-red-50/90 to-white p-4">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-red-600">
                      Emergency dispatch
                    </p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-red-900/80">
                      Assigns the nearest online tricycle or e-tricycle driver who is
                      not on another trip. Ignores your selected ride type.
                    </p>
                    {!hasEmergencyPickup ? (
                      <p className="mt-2 text-xs font-semibold text-red-700">
                        Set a pickup location first to enable emergency dispatch.
                      </p>
                    ) : null}
                    <button
                      className="mt-4 min-h-11 w-full rounded-2xl border border-red-300 bg-white px-6 py-3 text-sm font-black text-red-600 shadow-sm transition hover:border-red-400 hover:bg-red-50 disabled:cursor-not-allowed disabled:border-red-100 disabled:bg-red-50/60 disabled:text-red-300"
                      disabled={!canRequestEmergency}
                      onClick={() => void openEmergencyConfirm()}
                      type="button"
                    >
                      {isSubmittingEmergency ? "Dispatching..." : "Emergency Ride"}
                    </button>
                  </div>
                </fieldset>

                <div className="grid content-start gap-4">
                  <RideRequestMap
                    activeRide={overview?.active_ride ?? null}
                    dropoffLabel={dropoffAddress}
                    onDropoffSelect={handleMapDropoffSelect}
                    onPickupSelect={handleMapPickupSelect}
                    pickupLabel={pickupAddress}
                    rideType={rideType}
                    selectedDropoff={dropoffPoint}
                    selectedPickup={pickupPoint}
                  />
                </div>
              </div>
            </form>
          </article>

          {overview?.active_ride &&
            (() => {
                const activeRide = overview.active_ride;
                const tracking = tripTrackingCopy(
                  activeRide.status,
                  activeRide.offers.length,
                  Boolean(activeRide.is_emergency),
                );

                return (
                  <article
                    className="mb-4 rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:mb-0 sm:p-6"
                    id="active-ride"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-2xl font-black">Active Ride</h2>
                        {activeRide.is_emergency ? (
                          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-red-700">
                            Emergency
                          </span>
                        ) : null}
                      </div>
                      {canPassengerCancelRide(activeRide.status) ? (
                        <button
                          className="inline-flex min-h-10 shrink-0 items-center rounded-2xl bg-red-500 px-3 py-2 text-xs font-black text-white shadow-lg shadow-red-500/20 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none sm:min-h-11 sm:px-4 sm:py-2.5 sm:text-sm"
                          disabled={isCancellingRide}
                          onClick={() => openCancelDialog(activeRide.id)}
                          type="button"
                        >
                          {isCancellingRide
                            ? "Cancelling..."
                            : activeRide.is_emergency
                              ? "Cancel emergency"
                              : "Cancel ride"}
                        </button>
                      ) : null}
                    </div>
                    <div className="mt-6 overflow-hidden rounded-3xl bg-slate-950 text-white shadow-2xl shadow-slate-200">
                      <div className="bg-gradient-to-br from-orange-500 via-orange-600 to-orange-800 p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-bold uppercase tracking-[0.22em] text-orange-100">
                            Trip #{activeRide.id}
                          </p>
                          <h3 className="mt-2 text-2xl font-black">
                            {tracking.title}
                          </h3>
                          <p className="mt-2 text-sm leading-6 text-orange-50">
                            {tracking.description}
                          </p>
                        </div>
                        <span
                          className={`w-fit rounded-full px-3 py-1 text-xs font-black ${statusClass(
                            activeRide.status,
                          )}`}
                        >
                          {statusLabel(activeRide.status)}
                        </span>
                      </div>

                      <div className="mt-5 grid gap-2 sm:grid-cols-4">
                        {rideProgress.map((step) => {
                          const currentIndex = rideProgress.findIndex(
                            (item) => item.key === activeRide.status,
                          );
                          const stepIndex = rideProgress.findIndex(
                            (item) => item.key === step.key,
                          );
                          const isComplete =
                            currentIndex >= 0 && stepIndex <= currentIndex;

                          return (
                            <div
                              className={`rounded-2xl p-3 text-xs font-black ${
                                isComplete
                                  ? "bg-white text-orange-700"
                                  : "bg-white/15 text-orange-50"
                              }`}
                              key={step.key}
                            >
                              {step.label}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                      <div className="grid gap-4 bg-white p-5 text-slate-950">
                      <div className="rounded-3xl bg-slate-50 p-4">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                          Pickup
                        </p>
                        <p className="mt-2 font-black">
                          {activeRide.pickup_address}
                        </p>
                      </div>
                      <div className="rounded-3xl bg-slate-50 p-4">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                          Drop-off
                        </p>
                        <p className="mt-2 font-black">
                          {activeRide.dropoff_address}
                        </p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-4">
                        <div className="rounded-2xl bg-slate-50 p-4 text-sm">
                          <p className="font-bold text-slate-500">Ride type</p>
                          <p className="mt-1 font-black">
                            {formatRideTypeLabel(activeRide.ride_type)}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-orange-50 p-4 text-sm">
                          <p className="font-bold text-slate-500">Driver</p>
                          <p className="mt-1 font-black">
                            {activeRide.driver_name ?? "Waiting for driver"}
                          </p>
                          {activeRide.driver_phone && (
                            <p className="mt-1 text-xs font-bold text-slate-500">
                              {activeRide.driver_phone}
                            </p>
                          )}
                          {activeRide.driver_name ? (
                            <div className="mt-2">
                              <DriverRatingSummary
                                average={activeDriverRating?.average ?? null}
                                count={activeDriverRating?.count ?? 0}
                                variant={activeDriverRating?.variant ?? "regular"}
                              />
                            </div>
                          ) : null}
                        </div>
                        <div className="rounded-2xl bg-emerald-50 p-4 text-sm">
                          <p className="font-bold text-slate-500">Fare</p>
                          <p className="mt-1 font-black text-emerald-700">
                            {formatFare(activeRide.fare)}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-4 text-sm">
                          <p className="font-bold text-slate-500">Offers</p>
                          <p className="mt-1 font-black text-slate-950">
                            {pendingOfferCount}
                          </p>
                        </div>
                      </div>
                      {activeRide.driver_name &&
                      ["accepted", "ongoing", "completed"].includes(activeRide.status) &&
                      user ? (
                        <div className="mt-4">
                          <RideContactPanel
                            contactName={activeRide.driver_name}
                            contactPhone={activeRide.driver_phone}
                            enabled
                            messagesHref={`/passenger/messages?ride=${activeRide.id}`}
                            rideId={activeRide.id}
                            userId={user.id}
                            viewerRole="passenger"
                          />
                        </div>
                      ) : null}
                      {activeRide.can_report ? (
                        <div className="mt-4 flex justify-end">
                          <button
                            className="rounded-2xl bg-amber-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-amber-500/20 disabled:cursor-not-allowed disabled:bg-slate-300"
                            disabled={isSubmittingReport}
                            onClick={() => {
                              setReportRideId(activeRide.id);
                              setShowReportDialog(true);
                            }}
                            type="button"
                          >
                            Report Driver
                          </button>
                        </div>
                      ) : activeRide.report_submitted ? (
                        <p className="mt-4 text-center text-sm font-semibold text-amber-700">
                          Report submitted for admin review.
                        </p>
                      ) : null}
                    </div>
                    {activeRide.status === "requested" && (
                      <div className="m-5 mt-0 rounded-3xl bg-white p-4 text-slate-950">
                        {activeRide.cancelled_by === "driver" && activeRide.cancellation_reason ? (
                          <div className="mb-4 rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-900">
                            Your previous driver cancelled ({activeRide.cancellation_reason}). We are finding another driver for you.
                          </div>
                        ) : null}
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-600">
                            Choose your match
                          </p>
                          <h3 className="mt-1 text-xl font-black">Driver Offers</h3>
                          <p className="text-sm text-slate-500">
                            Compare available drivers before confirming your trip.
                          </p>
                        </div>

                        <div className="mt-4 grid gap-3">
                          {activeRide.offers.length ? (
                            activeRide.offers.map((offer) => (
                              <article
                                className="rounded-3xl border border-slate-100 bg-slate-50 p-4 transition hover:border-orange-200 hover:bg-orange-50/60"
                                key={offer.id}
                              >
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                  <div className="flex gap-3">
                                    <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-orange-500 font-black text-white shadow-lg shadow-orange-500/20">
                                      {(offer.driver_name ?? "D").charAt(0)}
                                    </div>
                                    <div>
                                      <div className="font-black">
                                        {offer.driver_name ?? "Driver"}
                                      </div>
                                      <div className="mt-1">
                                        <DriverRatingSummary
                                          average={offer.driver_average_rating ?? null}
                                          count={offer.driver_rating_count ?? 0}
                                          variant="regular"
                                        />
                                      </div>
                                      <div className="mt-1 text-sm text-slate-500">
                                        {offer.vehicle_type ?? "Vehicle"}{" "}
                                        {offer.plate_number
                                          ? `• ${offer.plate_number}`
                                          : ""}
                                      </div>
                                      <div className="mt-1 text-sm text-slate-500">
                                        {offer.vehicle_color
                                          ? `${offer.vehicle_color} vehicle`
                                          : "Vehicle color not set"}
                                      </div>
                                      <div className="mt-2 flex flex-wrap gap-2">
                                        <span className="rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-orange-600">
                                          {offer.driver_status ?? "online"}
                                        </span>
                                        {offer.driver_phone && (
                                          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">
                                            {offer.driver_phone}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex flex-col gap-2 sm:items-end">
                                    <div className="text-sm font-black text-emerald-700">
                                      {formatFare(activeRide.fare)}
                                    </div>
                                    <button
                                      className="rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-orange-500/20 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                                      disabled={choosingOfferId === offer.id}
                                      onClick={() => handleChooseOffer(offer.id)}
                                      type="button"
                                    >
                                      {choosingOfferId === offer.id
                                        ? "Choosing..."
                                        : "Choose Driver"}
                                    </button>
                                  </div>
                                </div>
                              </article>
                            ))
                          ) : (
                            <div className="rounded-2xl bg-slate-50 p-5 text-center text-sm font-bold text-slate-500">
                              Waiting for nearby drivers to send offers.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    </div>
                  </article>
                );
              })()}

          {showPendingRating && pendingRatingRide ? (
            <article
              className="mt-6 rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200"
              id="ride-feedback"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p
                    className={`text-sm font-bold uppercase tracking-[0.22em] ${
                      pendingRatingRide.is_emergency ? "text-red-600" : "text-orange-600"
                    }`}
                  >
                    {pendingRatingRide.is_emergency ? "Emergency trip completed" : "Trip completed"}
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-slate-900">
                    {pendingRatingCopy?.title ?? "How was your ride?"}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Trip #{pendingRatingRide.id}
                    {pendingRatingRide.driver_name
                      ? ` with ${pendingRatingRide.driver_name}`
                      : ""}
                    . {pendingRatingCopy?.description}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${
                    pendingRatingRide.is_emergency
                      ? "bg-red-100 text-red-700"
                      : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {pendingRatingRide.is_emergency ? "Emergency" : "Completed"}
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4 text-sm">
                  <p className="font-bold text-slate-500">Pickup</p>
                  <p className="mt-1 font-black">{pendingRatingRide.pickup_address}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 text-sm">
                  <p className="font-bold text-slate-500">Drop-off</p>
                  <p className="mt-1 font-black">{pendingRatingRide.dropoff_address}</p>
                </div>
              </div>

              <RideRatingForm
                audience="passenger"
                isSubmitting={ratingRideId === pendingRatingRide.id}
                onCancel={() => handleDismissRating(pendingRatingRide.id)}
                onSubmit={(event) =>
                  void handleRateDriver(event, pendingRatingRide.id)
                }
                variant={rideRatingVariant(Boolean(pendingRatingRide.is_emergency))}
              />
            </article>
          ) : null}
        </section>

      </section>

      <ConfirmDialog
        cancelLabel="Not now"
        confirmLabel="Dispatch emergency ride"
        description="TriWheel will immediately assign the nearest available tricycle or e-tricycle driver who is online and not on another trip."
        isConfirming={isSubmittingEmergency}
        onCancel={() => setShowEmergencyConfirm(false)}
        onConfirm={() => void handleEmergencyRequest()}
        open={showEmergencyConfirm}
        title="Request emergency ride?"
        tone="danger"
      />

      <RideCancelDialog<PassengerCancelReasonCode>
        description="Choose a reason so nearby drivers know why this ride was cancelled."
        detailPlaceholder="Tell the driver why you are cancelling..."
        error={cancelError}
        isOpen={showCancelDialog}
        isSubmitting={isCancellingRide}
        onClose={() => {
          setCancelError("");
          setCancelRideId(null);
          setShowCancelDialog(false);
        }}
        onConfirm={(payload) => void handleCancelRide(payload)}
        reasons={passengerCancelReasons}
        title="Why are you cancelling?"
      />

      <RideReportDialog<PassengerReportReasonCode>
        description="Tell TriWheel what happened. Reports are reviewed by admins and are not shared directly with the driver."
        detailPlaceholder="Describe the issue with this driver..."
        isOpen={showReportDialog}
        isSubmitting={isSubmittingReport}
        onClose={() => {
          setShowReportDialog(false);
          setReportRideId(null);
        }}
        onConfirm={(payload) => void handleReportRide(payload)}
        reasons={passengerReportReasons}
        title="Report driver"
      />
    </AppShell>
  );
}
