import { MigrationPlaceholder } from "@/components/MigrationPlaceholder";

export default function ForgotPasswordPage() {
  return (
    <MigrationPlaceholder
      description="Request a password reset link or code using the migrated account recovery flow."
      eyebrow="Auth Module"
      source="legacy-php/forgot-password.php"
      title="Forgot Password"
    />
  );
}
