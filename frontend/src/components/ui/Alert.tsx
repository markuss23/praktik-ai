import { type ReactNode } from "react";
import {
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  XCircle,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

const variants = {
  warning: {
    container: "bg-amber-50 border-amber-200",
    icon: <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />,
  },
  tip: {
    container: "bg-purple-50 border-purple-200",
    icon: <Lightbulb className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />,
  },
  success: {
    container: "bg-green-50 border-green-200",
    icon: <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />,
  },
  error: {
    container: "bg-red-50 border-red-200",
    icon: <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />,
  },
  info: {
    container: "bg-gray-100 border-gray-200",
    icon: <MessageSquare className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />,
  },
} as const;

export type AlertVariant = keyof typeof variants;

interface AlertProps {
  variant: AlertVariant;
  title?: string;
  children?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function Alert({ variant, title, children, icon, className }: AlertProps) {
  const config = variants[variant];

  return (
    <div
      className={cn(
        "flex gap-3 rounded-lg border px-4 py-3",
        config.container,
        className,
      )}
    >
      {icon !== undefined ? icon : config.icon}
      <div className="min-w-0">
        {title && <p className="font-semibold text-gray-900">{title}</p>}
        {children && <div className="text-sm text-gray-700">{children}</div>}
      </div>
    </div>
  );
}
