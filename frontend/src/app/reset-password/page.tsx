import { MigrationPlaceholder } from "@/components/MigrationPlaceholder";

export default function ResetPasswordPage() {
  return (
    <MigrationPlaceholder
      description="Complete account recovery after validating a reset token or code."
      eyebrow="Auth Module"
      source="legacy-php/reset-password.php"
      title="Reset Password"
    />
  );
}
