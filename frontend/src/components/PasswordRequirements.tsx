import {
  getPasswordRequirementStatus,
  PASSWORD_MIN_LENGTH,
} from "@/lib/passwordRequirements";

function RequirementItem({
  met,
  pending,
  text,
  tone,
}: {
  met: boolean;
  pending?: boolean;
  text: string;
  tone: "light" | "dark";
}) {
  const icon = met ? "✓" : pending ? "○" : "○";
  const color = met
    ? tone === "dark"
      ? "text-emerald-300"
      : "text-emerald-700"
    : tone === "dark"
      ? "text-slate-400"
      : "text-slate-500";

  return (
    <li className={`flex items-start gap-2 text-sm leading-6 ${color}`}>
      <span aria-hidden="true" className="mt-0.5 font-black">
        {icon}
      </span>
      <span>{text}</span>
    </li>
  );
}

export function PasswordRequirements({
  confirmPassword,
  password = "",
  showMatchRequirement = true,
  tone = "light",
}: {
  confirmPassword?: string;
  password?: string;
  showMatchRequirement?: boolean;
  tone?: "light" | "dark";
}) {
  const status = getPasswordRequirementStatus(password, confirmPassword);

  const boxClass =
    tone === "dark"
      ? "rounded-2xl border border-slate-700 bg-slate-900/80 p-4"
      : "rounded-2xl border border-slate-200 bg-slate-50 p-4";
  const titleClass =
    tone === "dark"
      ? "text-xs font-black uppercase tracking-[0.16em] text-slate-300"
      : "text-xs font-black uppercase tracking-[0.16em] text-slate-500";

  return (
    <div className={boxClass}>
      <p className={titleClass}>Password requirements</p>
      <ul className="mt-3 space-y-1">
        <RequirementItem
          met={status.minLength}
          pending={password.length > 0 && !status.minLength}
          text={`At least ${PASSWORD_MIN_LENGTH} characters`}
          tone={tone}
        />
        {showMatchRequirement ? (
          <RequirementItem
            met={status.matches === true}
            pending={Boolean(confirmPassword) && status.matches === false}
            text="Password and confirmation must match"
            tone={tone}
          />
        ) : null}
      </ul>
    </div>
  );
}
