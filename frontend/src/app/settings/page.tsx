"use client";

import { useStoredTriWheelSession } from "@/app/admin/AdminAccessGate";
import { driverNavItems } from "@/app/driver/driverNav";
import { passengerNavItems } from "@/app/passenger/passengerNav";
import { AppShell } from "@/components/AppShell";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { LogoutConfirmButton } from "@/components/LogoutConfirmButton";
import { TriWheelLoadingScreen } from "@/components/TriWheelLoadingScreen";
import { apiFetch, apiRoutes, resolveMediaUrl, toApiUrl } from "@/lib/api";
import { logoutTriWheel } from "@/lib/logout";
import {
  buildProfileChanges,
  formatPasswordChangeConfirmation,
  formatPasswordLimitSummary,
  formatProfileChangeDescription,
  formatProfileLimitSummary,
  type PasswordChangeLimit,
  type ProfileChangeLimit,
  snapshotFromForm,
  type ProfileSnapshot,
} from "@/lib/profileChanges";
import { compressImageFile } from "@/lib/compressImage";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";

type StoredUser = {
  id?: number;
  name: string;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  email: string;
  role: string;
  is_verified?: boolean;
  contact_number?: string | null;
  current_address?: string | null;
  phone?: string | null;
  profile_photo_url?: string | null;
};

function splitNameParts(user: StoredUser) {
  if (user.first_name || user.last_name) {
    return {
      firstName: user.first_name ?? "",
      middleName: user.middle_name ?? "",
      lastName: user.last_name ?? "",
    };
  }

  const parts = user.name.trim().split(/\s+/);

  if (parts.length === 1) {
    return { firstName: parts[0] ?? "", middleName: "", lastName: "" };
  }

  if (parts.length === 2) {
    return { firstName: parts[0] ?? "", middleName: "", lastName: parts[1] ?? "" };
  }

  return {
    firstName: parts[0] ?? "",
    middleName: parts.slice(1, -1).join(" "),
    lastName: parts.at(-1) ?? "",
  };
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Unable to read the selected photo."));
    reader.readAsDataURL(file);
  });
}

export default function SettingsPage() {
  const router = useRouter();
  const { isChecking, user } = useStoredTriWheelSession() as {
    isChecking: boolean;
    user: StoredUser | null;
  };
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [currentAddress, setCurrentAddress] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null);
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [profileError, setProfileError] = useState("");
  const [profileNotice, setProfileNotice] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordNotice, setPasswordNotice] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [baselineProfile, setBaselineProfile] = useState<ProfileSnapshot | null>(null);
  const [profileChangeLimit, setProfileChangeLimit] = useState<ProfileChangeLimit | null>(null);
  const [passwordChangeLimit, setPasswordChangeLimit] = useState<PasswordChangeLimit | null>(null);
  const [showConfirmSave, setShowConfirmSave] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirmDescription, setConfirmDescription] = useState("");

  useEffect(() => {
    if (!isChecking && !user) {
      router.replace("/login");
    }
  }, [isChecking, router, user]);

  useEffect(() => {
    return () => {
      if (profilePhotoPreview) {
        URL.revokeObjectURL(profilePhotoPreview);
      }
    };
  }, [profilePhotoPreview]);

  function applyProfile(
    profile: StoredUser,
    limits?: {
      profile?: ProfileChangeLimit | null;
      password?: PasswordChangeLimit | null;
    },
  ) {
    const nameParts = splitNameParts(profile);

    setFirstName(nameParts.firstName);
    setMiddleName(nameParts.middleName);
    setLastName(nameParts.lastName);
    setEmail(profile.email);
    setContactNumber(profile.contact_number ?? "");
    setCurrentAddress(profile.current_address ?? "");
    setDriverPhone(profile.phone ?? "");
    setProfilePhotoUrl(resolveMediaUrl(profile.profile_photo_url));
    setBaselineProfile(
      snapshotFromForm({
        firstName: nameParts.firstName,
        middleName: nameParts.middleName,
        lastName: nameParts.lastName,
        email: profile.email,
        contactNumber: profile.contact_number ?? "",
        currentAddress: profile.current_address ?? "",
        driverPhone: profile.phone ?? "",
      }),
    );

    if (limits?.profile) {
      setProfileChangeLimit(limits.profile);
    }

    if (limits?.password) {
      setPasswordChangeLimit(limits.password);
    }
  }

  useEffect(() => {
    if (!user) {
      return;
    }

    applyProfile(user);
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const userId = user.id;

    if (!userId) {
      return;
    }

    let cancelled = false;

    async function loadProfile() {
      try {
        const response = await apiFetch(
          toApiUrl(apiRoutes.accountProfile, { user_id: String(userId) }),
          {
            headers: localStorage.getItem("triwheel_token")
              ? { Authorization: `Bearer ${localStorage.getItem("triwheel_token")}` }
              : undefined,
          },
        );
        const data = (await response.json()) as {
          user?: StoredUser;
          profile_change_limit?: ProfileChangeLimit;
          password_change_limit?: PasswordChangeLimit;
        };

        if (!response.ok || !data.user || cancelled) {
          return;
        }

        applyProfile(data.user, {
          profile: data.profile_change_limit ?? null,
          password: data.password_change_limit ?? null,
        });
        localStorage.setItem("triwheel_user", JSON.stringify(data.user));
        window.dispatchEvent(new Event("triwheel_user_change"));
      } catch {
        // Keep the last known profile snapshot when refresh fails.
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const dashboardHref = useMemo(() => {
    if (user?.role === "driver") {
      return "/driver";
    }

    if (user?.role === "admin") {
      return "/admin";
    }

    return "/passenger";
  }, [user]);

  const displayName =
    [firstName, middleName, lastName].filter(Boolean).join(" ") || user?.name || "User";
  const photoPreview = profilePhotoPreview ?? profilePhotoUrl;

  function handlePhotoChange(file: File | null) {
    if (profilePhotoPreview) {
      URL.revokeObjectURL(profilePhotoPreview);
    }

    setProfilePhotoFile(file);
    setProfilePhotoPreview(file ? URL.createObjectURL(file) : null);
  }

  function handleLogout() {
    void logoutTriWheel();
  }

  async function performSaveProfile() {
    if (!user?.id) {
      return;
    }

    setProfileError("");
    setProfileNotice("");
    setIsSavingProfile(true);

    const previousPhotoUrl = profilePhotoUrl;

    try {
      const token = localStorage.getItem("triwheel_token");
      const payload: Record<string, string | number> = {
        user_id: user.id,
        first_name: firstName.trim(),
        middle_name: middleName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        contact_number: contactNumber.trim(),
        current_address: currentAddress.trim(),
      };

      if (user.role === "driver") {
        payload.phone = driverPhone.trim();
      }

      let uploadedPhoto = false;

      if (profilePhotoFile) {
        const compressedPhoto = await compressImageFile(profilePhotoFile);
        payload.profile_photo_base64 = await fileToBase64(compressedPhoto);
        payload.profile_photo_name = compressedPhoto.name;
        uploadedPhoto = true;
      }

      const response = await apiFetch(apiRoutes.accountProfile, {
        method: uploadedPhoto ? "POST" : "PATCH",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as {
        message?: string;
        user?: StoredUser;
        profile_change_limit?: ProfileChangeLimit;
        errors?: Record<string, string[]>;
      };

      if (!response.ok) {
        const firstError = data.errors ? Object.values(data.errors).flat()[0] : null;
        throw new Error(firstError ?? data.message ?? "Unable to save profile.");
      }

      if (uploadedPhoto) {
        const savedPhotoUrl = resolveMediaUrl(data.user?.profile_photo_url);

        if (!savedPhotoUrl || savedPhotoUrl === previousPhotoUrl) {
          throw new Error(
            "Profile photo could not be saved. Try a smaller JPG or PNG and save again.",
          );
        }
      }

      if (data.user) {
        localStorage.setItem("triwheel_user", JSON.stringify(data.user));
        window.dispatchEvent(new Event("triwheel_user_change"));
        applyProfile(data.user, { profile: data.profile_change_limit ?? null });
        handlePhotoChange(null);
        if (photoInputRef.current) {
          photoInputRef.current.value = "";
        }
      } else if (data.profile_change_limit) {
        setProfileChangeLimit(data.profile_change_limit);
      }

      setShowConfirmSave(false);
      setProfileNotice(data.message ?? "Profile updated.");
    } catch (caughtError) {
      setProfileError(
        caughtError instanceof Error ? caughtError.message : "Unable to save profile.",
      );
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function performPasswordChange() {
    if (!user?.id) {
      return;
    }

    setPasswordError("");
    setPasswordNotice("");
    setIsSavingPassword(true);

    try {
      const token = localStorage.getItem("triwheel_token");
      const response = await apiFetch(apiRoutes.accountPassword, {
        method: "PATCH",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user.id,
          current_password: currentPassword,
          password,
          password_confirmation: passwordConfirmation,
        }),
      });

      const data = (await response.json()) as {
        message?: string;
        password_change_limit?: PasswordChangeLimit;
        errors?: Record<string, string[]>;
      };

      if (!response.ok) {
        const firstError = data.errors ? Object.values(data.errors).flat()[0] : null;
        throw new Error(firstError ?? data.message ?? "Unable to update password.");
      }

      if (data.password_change_limit) {
        setPasswordChangeLimit(data.password_change_limit);
      }

      setShowConfirmPassword(false);
      setPasswordNotice(data.message ?? "Password updated successfully.");
      setCurrentPassword("");
      setPassword("");
      setPasswordConfirmation("");
    } catch (caughtError) {
      setPasswordError(
        caughtError instanceof Error ? caughtError.message : "Unable to update password.",
      );
    } finally {
      setIsSavingPassword(false);
    }
  }

  function handleSaveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user?.id || !baselineProfile) {
      return;
    }

    setProfileError("");
    setProfileNotice("");

    const currentSnapshot = snapshotFromForm({
      firstName,
      middleName,
      lastName,
      email,
      contactNumber,
      currentAddress,
      driverPhone,
    });

    const detailChanges = buildProfileChanges(baselineProfile, currentSnapshot, {
      hasNewPhoto: Boolean(profilePhotoFile),
      includeDriverPhone: user.role === "driver",
    });

    if (detailChanges.length === 0) {
      setProfileError("No profile changes to save.");
      return;
    }

    const limitApplies =
      profileChangeLimit?.applies &&
      (user.role === "driver" || user.role === "passenger");

    if (limitApplies) {
      if ((profileChangeLimit?.changes_remaining ?? 0) <= 0) {
        setProfileError(
          "You have reached the limit of 2 profile detail updates for this month.",
        );
        return;
      }

      setConfirmDescription(
        formatProfileChangeDescription(detailChanges, profileChangeLimit),
      );
      setShowConfirmSave(true);
      return;
    }

    void performSaveProfile();
  }

  function handleSavePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user?.id) {
      return;
    }

    setPasswordError("");
    setPasswordNotice("");

    if (!currentPassword || !password || !passwordConfirmation) {
      setPasswordError("Enter your current password, new password, and confirmation.");
      return;
    }

    if (password !== passwordConfirmation) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    if (password.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }

    if ((passwordChangeLimit?.changes_remaining ?? 0) <= 0) {
      setPasswordError("You have reached the limit of 2 password changes for this month.");
      return;
    }

    if (passwordChangeLimit) {
      setConfirmDescription(formatPasswordChangeConfirmation(passwordChangeLimit));
      setShowConfirmPassword(true);
      return;
    }

    void performPasswordChange();
  }

  if (isChecking || !user) {
    return (
      <TriWheelLoadingScreen
        message="Checking your account session before opening settings."
        title="Opening Account Settings"
      />
    );
  }

  const usesAppShell = user.role === "driver" || user.role === "passenger";
  const shellNavItems = user.role === "driver" ? driverNavItems : passengerNavItems;
  const shellLabel =
    user.role === "driver" ? "Driver Dashboard" : "Passenger Dashboard";
  const canEditPhoto = user.role === "driver" || user.role === "passenger";

  const settingsContent = (
    <section className="mx-auto w-full max-w-6xl min-w-0">
      <header className="overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-orange-500 via-orange-600 to-orange-800 p-5 text-white shadow-xl shadow-orange-200 sm:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-100 sm:text-sm">
              Account Center
            </p>
            <h1 className="mt-3 text-3xl font-black leading-tight sm:text-5xl">
              Account Settings
            </h1>
          </div>
          {!usesAppShell ? (
            <Link
              className="inline-flex w-fit rounded-2xl bg-white px-4 py-2.5 text-sm font-black text-orange-700 sm:px-5 sm:py-3"
              href={dashboardHref}
            >
              Back to Dashboard
            </Link>
          ) : null}
        </div>
      </header>

      {profileError ? (
        <div className="mt-6 rounded-2xl bg-red-50 p-4 font-bold text-red-700">{profileError}</div>
      ) : null}
      {profileNotice ? (
        <div className="mt-6 rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-700">
          {profileNotice}
        </div>
      ) : null}

      <form
        className="mt-6 grid min-w-0 gap-6 lg:grid-cols-[0.8fr_1.2fr]"
        onSubmit={handleSaveProfile}
      >
        <aside className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col items-center text-center">
            {photoPreview ? (
              <img
                alt={`${displayName} profile photo`}
                className="size-28 rounded-[1.75rem] object-cover shadow-lg shadow-orange-500/25 ring-2 ring-orange-100"
                src={photoPreview}
              />
            ) : (
              <div className="grid size-28 place-items-center rounded-[1.75rem] bg-orange-500 text-4xl font-black text-white shadow-lg shadow-orange-500/25">
                {displayName.charAt(0) || "U"}
              </div>
            )}

            {canEditPhoto ? (
              <label className="mt-4 grid w-full gap-2 text-sm font-bold">
                Update profile photo
                <input
                  accept="image/png,image/jpeg,image/jpg"
                  className="rounded-2xl border border-dashed border-slate-300 px-4 py-3 text-xs font-normal file:mr-3 file:rounded-xl file:border-0 file:bg-orange-100 file:px-3 file:py-2 file:font-bold file:text-orange-700"
                  onChange={(event) =>
                    handlePhotoChange(event.target.files?.[0] ?? null)
                  }
                  ref={photoInputRef}
                  type="file"
                />
              </label>
            ) : null}
          </div>

          <div className="mt-6 text-center">
            <div className="text-xl font-black">{displayName}</div>
            <div className="mt-1 text-sm text-slate-500">{email}</div>
          </div>

          <div className="mt-6 grid gap-3 text-sm">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="font-bold text-slate-500">Role</p>
              <p className="mt-1 font-black capitalize">{user.role}</p>
            </div>
          </div>

          {!usesAppShell ? (
            <LogoutConfirmButton
              className="mt-6 w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
              onConfirm={handleLogout}
            />
          ) : null}
        </aside>

        <section className="grid gap-6">
          <article className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-2xl font-black">Personal Information</h2>
            {profileChangeLimit?.applies ? (
              <p className="mt-2 rounded-2xl bg-orange-50 px-4 py-3 text-sm font-semibold leading-6 text-orange-900">
                {formatProfileLimitSummary(profileChangeLimit)}
              </p>
            ) : null}
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-bold">
                First name
                <input
                  className="rounded-2xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  onChange={(event) => setFirstName(event.target.value)}
                  required
                  value={firstName}
                />
              </label>
              <label className="grid gap-2 text-sm font-bold">
                Last name
                <input
                  className="rounded-2xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  onChange={(event) => setLastName(event.target.value)}
                  required
                  value={lastName}
                />
              </label>
              <label className="grid gap-2 text-sm font-bold sm:col-span-2">
                Middle name
                <input
                  className="rounded-2xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  onChange={(event) => setMiddleName(event.target.value)}
                  value={middleName}
                />
              </label>
              <label className="grid gap-2 text-sm font-bold">
                Email address
                <input
                  className="rounded-2xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  type="email"
                  value={email}
                />
              </label>
              <label className="grid gap-2 text-sm font-bold">
                Contact number
                <input
                  className="rounded-2xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  onChange={(event) => setContactNumber(event.target.value)}
                  value={contactNumber}
                />
              </label>
              {user.role === "driver" ? (
                <label className="grid gap-2 text-sm font-bold sm:col-span-2">
                  Driver phone
                  <input
                    className="rounded-2xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    onChange={(event) => setDriverPhone(event.target.value)}
                    value={driverPhone}
                  />
                </label>
              ) : null}
              <label className="grid gap-2 text-sm font-bold sm:col-span-2">
                Current address
                <textarea
                  className="min-h-24 rounded-2xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  onChange={(event) => setCurrentAddress(event.target.value)}
                  value={currentAddress}
                />
              </label>
            </div>

            <button
              className="rounded-2xl bg-orange-500 px-6 py-4 text-sm font-black text-white disabled:bg-slate-300"
              disabled={isSavingProfile}
              type="submit"
            >
              {isSavingProfile ? "Saving..." : "Save Profile Details"}
            </button>
          </article>
        </section>
      </form>

      <section className="mt-10 border-t border-slate-200 pt-10">
        <div className="mb-4">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
            Security & Privacy
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">Password</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Password changes are handled separately from your personal information.
            Your current password is never shown here.
          </p>
        </div>

        {passwordError ? (
          <div className="mb-4 rounded-2xl bg-red-50 p-4 font-bold text-red-700">{passwordError}</div>
        ) : null}
        {passwordNotice ? (
          <div className="mb-4 rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-700">
            {passwordNotice}
          </div>
        ) : null}

        <form
          className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-xl shadow-slate-300 ring-1 ring-slate-800 sm:p-8"
          onSubmit={handleSavePassword}
        >
          {passwordChangeLimit ? (
            <p className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold leading-6 text-slate-100">
              {formatPasswordLimitSummary(passwordChangeLimit)}
            </p>
          ) : null}

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold sm:col-span-2">
              Current password
              <input
                autoComplete="current-password"
                className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 font-normal text-white outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-500/20"
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
                type="password"
                value={currentPassword}
              />
            </label>
            <label className="grid gap-2 text-sm font-bold">
              New password
              <input
                autoComplete="new-password"
                className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 font-normal text-white outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-500/20"
                minLength={6}
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </label>
            <label className="grid gap-2 text-sm font-bold">
              Confirm new password
              <input
                autoComplete="new-password"
                className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 font-normal text-white outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-500/20"
                minLength={6}
                onChange={(event) => setPasswordConfirmation(event.target.value)}
                required
                type="password"
                value={passwordConfirmation}
              />
            </label>
          </div>

          <button
            className="mt-6 rounded-2xl bg-white px-6 py-4 text-sm font-black text-slate-950 disabled:bg-slate-600 disabled:text-slate-300"
            disabled={
              isSavingPassword || (passwordChangeLimit?.changes_remaining ?? 1) <= 0
            }
            type="submit"
          >
            {isSavingPassword ? "Updating..." : "Update Password"}
          </button>
        </form>
      </section>

      <ConfirmDialog
        cancelLabel="Go back"
        confirmLabel="Confirm profile changes"
        description={confirmDescription}
        isConfirming={isSavingProfile}
        onCancel={() => {
          if (isSavingProfile) {
            return;
          }

          setShowConfirmSave(false);
        }}
        onConfirm={() => void performSaveProfile()}
        open={showConfirmSave}
        title="Confirm profile updates"
      />

      <ConfirmDialog
        cancelLabel="Go back"
        confirmLabel="Update password"
        description={confirmDescription}
        isConfirming={isSavingPassword}
        onCancel={() => {
          if (isSavingPassword) {
            return;
          }

          setShowConfirmPassword(false);
        }}
        onConfirm={() => void performPasswordChange()}
        open={showConfirmPassword}
        title="Confirm password change"
        tone="danger"
      />

      {usesAppShell ? (
        <div className="lg:hidden">
          <LogoutConfirmButton
            className="mt-6 w-full rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-black text-white"
            onConfirm={handleLogout}
          />
        </div>
      ) : null}
    </section>
  );

  let page: ReactNode;

  if (usesAppShell) {
    page = (
      <AppShell
        dashboardLabel={shellLabel}
        navItems={shellNavItems}
        onLogout={handleLogout}
        user={user}
      >
        {settingsContent}
      </AppShell>
    );
  } else {
    page = (
      <main className="min-h-screen overflow-x-hidden bg-slate-100 px-4 py-5 text-slate-950 sm:px-6 sm:py-8">
        {settingsContent}
      </main>
    );
  }

  return page;
}
