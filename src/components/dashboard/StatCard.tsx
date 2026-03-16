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
  const h = 36;
  const w = 80;
  const points = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`)
    .join(" ");

  return (
    <svg width={w} height={h} className="opacity-70">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};

const StatCard = ({
  title,
  value,
  change,
  changeType,
  icon: Icon,
  iconColor,
  iconBg,
  delay = 0,
  sparkData,
}: Props) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -4, boxShadow: "0 16px 40px rgba(0,0,0,0.10)" }}
    transition={{ delay, duration: 0.2 }}
    className="bg-white rounded-2xl border border-border p-5 flex flex-col gap-4 min-w-0 overflow-hidden cursor-pointer"
    style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
  >
    <div className="flex items-start justify-between">
      <div
        className={cn("w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0", iconBg)}
        style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
      >
        <Icon size={22} className={iconColor} />
      </div>
      {sparkData && (
        <MiniSparkline data={sparkData} color={changeType === "up" ? "#10B981" : "#EF4444"} />
      )}
    </div>

    <div className="min-w-0">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">{title}</p>
      <p className="text-2xl sm:text-3xl font-extrabold mt-1.5 truncate tracking-tight">{value}</p>
    </div>

    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full w-fit",
        changeType === "up"
          ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
          : "bg-red-50 text-red-700 border border-red-100"
      )}
    >
      {changeType === "up" ? "↑" : "↓"} {change}
    </span>
  </motion.div>
);

export default StatCard;