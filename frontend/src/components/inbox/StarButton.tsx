import { Star } from "lucide-react";

export function StarButton({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      aria-label={active ? "Unstar" : "Star"}
      className="rounded p-1 text-gray-400 hover:text-amber-500"
    >
      <Star size={16} className={active ? "fill-amber-400 text-amber-400" : ""} />
    </button>
  );
}
