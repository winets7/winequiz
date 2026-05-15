import Link from "next/link";
import type { ComponentProps } from "react";

const baseClass = "btn-pink-flat-wide";

type PinkFlatWideButtonProps = Omit<ComponentProps<typeof Link>, "className"> & {
  className?: string;
};

export function PinkFlatWideButton({
  className = "",
  children,
  ...props
}: PinkFlatWideButtonProps) {
  return (
    <Link className={`${baseClass} ${className}`.trim()} {...props}>
      {children}
    </Link>
  );
}

type PinkFlatWideButtonNativeProps = ComponentProps<"button"> & {
  className?: string;
};

export function PinkFlatWideButtonNative({
  className = "",
  type = "button",
  children,
  ...props
}: PinkFlatWideButtonNativeProps) {
  return (
    <button type={type} className={`${baseClass} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}
