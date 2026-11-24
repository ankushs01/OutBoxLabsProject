import { InputHTMLAttributes } from "react";

const variants = {
  filled: "w-full rounded-md bg-gray-100 px-3 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-green-600",
  plain: "w-full bg-transparent py-1.5 text-sm placeholder:text-gray-400 focus:outline-none",
};

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  variant?: keyof typeof variants;
}

export function TextInput({ variant = "filled", className = "", ...rest }: Props) {
  return <input {...rest} className={`${variants[variant]} ${className}`} />;
}
