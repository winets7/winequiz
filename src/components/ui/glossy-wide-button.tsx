import Link from "next/link";
import type { ComponentProps } from "react";

type GlossyWideButtonProps = Omit<ComponentProps<typeof Link>, "className"> & {
  className?: string;
};

const baseClass = "btn-pink-glossy-wide";

export function GlossyWideButton({
  className = "",
  children,
  ...props
}: GlossyWideButtonProps) {
  return (
    <Link className={`${baseClass} ${className}`.trim()} {...props}>
      {children}
    </Link>
  );
}

type GlossyWideButtonNativeProps = ComponentProps<"button"> & {
  className?: string;
};

export function GlossyWideButtonNative({
  className = "",
  type = "button",
  children,
  ...props
}: GlossyWideButtonNativeProps) {
  return (
    <button type={type} className={`${baseClass} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}
