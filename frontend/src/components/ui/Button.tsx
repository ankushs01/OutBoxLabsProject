import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "outline";
const styles: Record<Variant, string> = {
  primary: "bg-green-600 text-white hover:bg-green-700 disabled:bg-green-300",
  secondary: "border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 disabled:opacity-50",
  ghost: "text-gray-600 hover:bg-gray-100",
  outline: "border border-green-600 text-green-700 hover:bg-green-50 disabled:opacity-50",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

export function Button({ variant = "primary", loading, children, disabled, className = "", ...rest }: Props) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${styles[variant]} ${className}`}
    >
      {loading && <Spinner small />}
      {children}
    </button>
  );
}

export function Spinner({ small }: { small?: boolean }) {
  const size = small ? "h-4 w-4" : "h-8 w-8";
  return <span className={`inline-block ${size} animate-spin rounded-full border-2 border-current border-t-transparent`} />;
}

export function FullPageSpinner() {
  return (
    <div className="flex h-screen items-center justify-center text-green-600">
      <Spinner />
    </div>
  );
}
