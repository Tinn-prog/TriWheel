import Image from "next/image";
import Link from "next/link";

const sizeClasses = {
  sm: {
    box: "size-8 rounded-xl",
    text: "text-lg",
    imagePadding: "p-0.5",
    imageSizes: "32px",
    pixels: 32,
  },
  md: {
    box: "size-10 rounded-xl",
    text: "text-2xl",
    imagePadding: "p-0.5",
    imageSizes: "40px",
    pixels: 40,
  },
  lg: {
    box: "size-12 rounded-2xl",
    text: "text-2xl",
    imagePadding: "p-1",
    imageSizes: "48px",
    pixels: 48,
  },
  xl: {
    box: "size-16 rounded-2xl",
    text: "text-3xl",
    imagePadding: "p-1.5",
    imageSizes: "64px",
    pixels: 64,
  },
  "2xl": {
    box: "size-44 rounded-[1.5rem]",
    text: "text-3xl",
    imagePadding: "p-2",
    imageSizes: "176px",
    pixels: 176,
  },
  "3xl": {
    box: "size-72 max-w-full rounded-[1.75rem]",
    text: "text-3xl",
    imagePadding: "p-3",
    imageSizes: "288px",
    pixels: 288,
  },
} as const;

type TriWheelLogoProps = {
  className?: string;
  href?: string;
  showWordmark?: boolean;
  size?: keyof typeof sizeClasses;
  wordmarkClassName?: string;
};

export function TriWheelLogo({
  className = "",
  href,
  showWordmark = true,
  size = "md",
  wordmarkClassName = "",
}: TriWheelLogoProps) {
  const styles = sizeClasses[size];

  const content = (
    <>
      <span
        className={`inline-block shrink-0 overflow-hidden bg-black shadow-sm ${styles.box}`}
      >
        <Image
          alt={showWordmark ? "" : "TriWheel logo"}
          aria-hidden={showWordmark}
          className={`h-full w-full object-contain ${styles.imagePadding}`}
          height={styles.pixels}
          sizes={styles.imageSizes}
          src="/triwheel-brand-logo-v2.png"
          width={styles.pixels}
        />
      </span>
      {showWordmark ? (
        <span className={`truncate font-black ${styles.text} ${wordmarkClassName}`}>
          TriWheel
        </span>
      ) : null}
    </>
  );

  const rootClassName = `inline-flex min-w-0 items-center gap-2.5 ${className}`;

  if (href) {
    return (
      <Link className={rootClassName} href={href}>
        {content}
      </Link>
    );
  }

  return <span className={rootClassName}>{content}</span>;
}

export function TriWheelLogoMark({
  className = "",
  size = "lg",
}: {
  className?: string;
  size?: keyof typeof sizeClasses;
}) {
  const styles = sizeClasses[size];

  return (
    <span
      className={`inline-block shrink-0 overflow-hidden bg-black shadow-sm ${styles.box} ${className}`}
    >
      <Image
        alt="TriWheel logo"
        className={`h-full w-full object-contain ${styles.imagePadding}`}
        height={styles.pixels}
        sizes={styles.imageSizes}
        src="/triwheel-brand-logo-v2.png"
        width={styles.pixels}
      />
    </span>
  );
}
