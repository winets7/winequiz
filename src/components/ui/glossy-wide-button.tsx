import Link from "next/link";
import type { ComponentProps } from "react";

type GlossyWideButtonProps = Omit<ComponentProps<typeof Link>, "className"> & {
  className?: string;
};

export function GlossyWideButton({
  className = "",
  children,
  ...props
}: GlossyWideButtonProps) {
  return (
    <Link className={`btn-pink-glossy-wide ${className}`.trim()} {...props}>
      {children}
    </Link>
  );
}
