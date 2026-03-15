import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      position="top-right"
      theme="light"
      className="toaster group"
      toastOptions={{
        duration: 3000,
        classNames: {
          toast:
            "group toast !bg-gradient-to-r !from-white !to-slate-50 !text-foreground !border-0 !rounded-xl !shadow-[0_4px_24px_rgba(0,0,0,0.12)] !px-4 !py-3 !gap-3 !items-start",
          title: "!text-[13px] !font-semibold !text-gray-900 !leading-snug",
          description: "!text-xs !text-gray-500 !mt-0.5 !leading-relaxed",
          success:
            "!bg-gradient-to-r !from-emerald-50 !to-white !shadow-[0_4px_24px_rgba(16,185,129,0.15)]",
          error:
            "!bg-gradient-to-r !from-red-50 !to-white !shadow-[0_4px_24px_rgba(239,68,68,0.15)]",
          info:
            "!bg-gradient-to-r !from-indigo-50 !to-white !shadow-[0_4px_24px_rgba(99,102,241,0.15)]",
          warning:
            "!bg-gradient-to-r !from-amber-50 !to-white !shadow-[0_4px_24px_rgba(245,158,11,0.15)]",
          actionButton: "!bg-primary !text-primary-foreground !rounded-lg !text-xs !font-medium",
          cancelButton: "!bg-transparent !text-gray-500 !rounded-lg !text-xs",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
