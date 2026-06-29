export const PASSWORD_MIN_LENGTH = 6;

export function getPasswordRequirementStatus(
  password: string,
  confirmPassword?: string,
) {
  return {
    minLength: password.length >= PASSWORD_MIN_LENGTH,
    matches:
      confirmPassword === undefined
        ? null
        : confirmPassword.length > 0 && password === confirmPassword,
  };
}
