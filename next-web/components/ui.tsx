import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "md" | "sm";

const variantClass: Record<ButtonVariant, string> = {
  primary: "sp-btn-primary",
  secondary: "sp-btn-secondary",
  ghost: "sp-btn-ghost",
  danger: "sp-btn-danger",
};

const sizeClass: Record<ButtonSize, string> = {
  md: "",
  sm: "min-h-[36px] px-3 py-1.5 text-[13px]",
};

interface ButtonProps extends ComponentProps<"button"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({ variant = "primary", size = "md", className, type = "button", ...props }: ButtonProps) {
  return (
    <button type={type} className={cn("sp-btn", variantClass[variant], sizeClass[size], className)} {...props} />
  );
}

interface ButtonLinkProps extends ComponentProps<typeof Link> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

export function ButtonLink({ variant = "primary", size = "md", className, ...props }: ButtonLinkProps) {
  return <Link className={cn("sp-btn", variantClass[variant], sizeClass[size], className)} {...props} />;
}

export function FieldError({ children }: { children: ReactNode }) {
  return <p className="sp-error-text">{children}</p>;
}

export function FormHint({ children }: { children: ReactNode }) {
  return <p className="sp-hint">{children}</p>;
}
