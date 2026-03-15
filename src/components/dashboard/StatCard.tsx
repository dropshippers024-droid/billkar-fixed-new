import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  value: string;
  change: string;
  changeType: "up" | "down";
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  delay?: number;
  sparkData?: number[];
}

const MiniSparkline = ({ data, color }: { data: number[]; color: string }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const h = 32;
  const w = 80;
  const points = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`)
    .join(" ");

  return (
    <svg width={w} height={h} className="opacity-60">
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={points} />
    </svg>
  );
};

const StatCard = ({ title, value, change, changeType, icon: Icon, iconColor, iconBg, delay = 0, sparkData }: Props) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="bg-background rounded-2xl border border-border shadow-sm p-4 sm:p-5 flex flex-col gap-3 min-w-0 overflow-hidden"
  >
    <div className="flex items-center justify-between">
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", iconBg)}>
        <Icon size={20} className={iconColor} />
      </div>
      {sparkData && <MiniSparkline data={sparkData} color={changeType === "up" ? "#10B981" : "#EF4444"} />}
    </div>
    <div className="min-w-0">
      <p className="text-sm text-muted-foreground truncate">{title}</p>
      <p className="text-xl sm:text-2xl font-extrabold mt-1 truncate">{value}</p>
    </div>
    <span
      className={cn(
        "inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full w-fit",
        changeType === "up" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
      )}
    >
      {changeType === "up" ? "↑" : "↓"} {change}
    </span>
  </motion.div>
);

export default StatCard;
