import { MigrationPlaceholder } from "@/components/MigrationPlaceholder";

export default function DriverVehiclePage() {
  return (
    <MigrationPlaceholder
      description="Manage vehicle details, plate number, color, and required driver registration documents."
      eyebrow="Driver Module"
      source="legacy-php/vehicle_info.php and legacy-php/driver_details.php"
      title="Vehicle Information"
    />
  );
}
