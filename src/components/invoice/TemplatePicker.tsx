import { getCurrentPlan, isTrialActive, isPro } from "@/lib/planStore";
import { cn } from "@/lib/utils";
import { TEMPLATES } from "./types";
import { getCurrentPlan, getTemplateAccess } from "@/lib/planStore";

interface Props {
  selected: string;
  onSelect: (id: string) => void;
  onLockedClick?: () => void;
}

const templateStyles: Record<string, { bg: string; accent: string; dot: string; lines: string }> = {
  modern: { bg: "bg-gradient-to-br from-indigo-50 to-blue-50", accent: "bg-indigo-600", dot: "bg-indigo-600", lines: "bg-indigo-200" },
  classic: { bg: "bg-gradient-to-br from-gray-100 to-gray-50", accent: "bg-gray-800", dot: "bg-gray-800", lines: "bg-gray-300" },
  minimal: { bg: "bg-white", accent: "bg-gray-400", dot: "bg-gray-400", lines: "bg-gray-200" },
  bold: { bg: "bg-gradient-to-br from-red-50 to-pink-50", accent: "bg-red-600", dot: "bg-red-600", lines: "bg-red-200" },
  professional: { bg: "bg-gradient-to-br from-emerald-50 to-teal-50", accent: "bg-emerald-700", dot: "bg-emerald-700", lines: "bg-emerald-200" },
  elegant: { bg: "bg-gradient-to-br from-purple-50 to-violet-50", accent: "bg-violet-600", dot: "bg-violet-600", lines: "bg-violet-200" },
  startup: { bg: "bg-gradient-to-br from-blue-50 to-sky-50", accent: "bg-blue-600", dot: "bg-blue-600", lines: "bg-blue-200" },
  compact: { bg: "bg-gradient-to-br from-slate-100 to-gray-50", accent: "bg-gray-600", dot: "bg-gray-600", lines: "bg-gray-300" },
};

const TemplatePicker = ({ selected, onSelect, onLockedClick }: Props) => {
  const isFree = getCurrentPlan() === "free";
  const accessible = getTemplateAccess();

  const handleSelect = (id: string) => {
    if (isFree && !accessible.includes(id)) {
      onLockedClick?.();
      return;
    }
    onSelect(id);
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
      {TEMPLATES.map((t) => {
        const style = templateStyles[t.id] || templateStyles.modern;
        const locked = isFree && !accessible.includes(t.id);
        return (
          <button
            key={t.id}
            onClick={() => handleSelect(t.id)}
            className={cn(
              "flex-shrink-0 w-24 rounded-xl border-2 transition-all overflow-hidden relative",
              selected === t.id
                ? "ring-2 ring-primary border-primary shadow-md"
                : "border-border hover:border-primary/40"
            )}
          >
            <div className={cn("h-16 relative", style.bg)}>
              {locked && (
                <div className="absolute top-1 right-1 z-10">
                  <span className="text-[8px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded">PRO</span>
                </div>
              )}
              <div className="p-2 space-y-1">
                <div className={cn("w-full h-1.5 rounded-sm", style.accent)} />
                <div className={cn("w-8 h-0.5 rounded-full", style.lines)} />
                <div className={cn("w-11 h-0.5 rounded-full", style.lines)} />
                <div className={cn("w-6 h-0.5 rounded-full", style.lines)} />
              </div>
              <div className={cn("absolute bottom-1.5 right-1.5 w-2.5 h-2.5 rounded-full ring-1 ring-white", style.dot)} />
            </div>
            <div className="py-1.5 text-center">
              <span className="text-[10px] font-semibold">{t.label}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default TemplatePicker;
