import type { PlaceSuggestion } from "@/lib/mapTypes";

export function PlaceSuggestionOption({
  onSelect,
  suggestion,
}: {
  onSelect: (suggestion: PlaceSuggestion) => void;
  suggestion: PlaceSuggestion;
}) {
  return (
    <button
      className="rounded-xl px-3 py-2.5 text-left transition hover:bg-orange-50 hover:text-orange-700"
      onClick={() => onSelect(suggestion)}
      type="button"
    >
      <span className="block text-xs font-bold text-slate-800">
        {suggestion.display_name}
      </span>
      {suggestion.secondary_text ? (
        <span className="mt-0.5 block text-[0.7rem] font-normal leading-5 text-slate-500">
          {suggestion.secondary_text}
        </span>
      ) : null}
    </button>
  );
}
