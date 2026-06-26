import { ReactNode } from "react";

export function Card({ children, className = "", onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={`bg-white/[0.02] border border-white/[0.05] rounded-2xl shadow-xl backdrop-blur-sm overflow-hidden ${className}`}>
      {children}
    </div>
  );
}


export function CardHeader({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`p-5 border-b border-white/[0.05] ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <h3 className={`text-lg font-semibold text-white ${className}`}>{children}</h3>;
}

export function CardContent({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`p-5 ${className}`}>{children}</div>;
}

export function Badge({ children, variant = "neutral", className = "" }: { children: ReactNode; variant?: "favorable" | "unfavorable" | "neutral" | "brand"; className?: string }) {
  const variants = {
    favorable: "bg-green-500/10 text-green-400 border-green-500/20",
    unfavorable: "bg-red-500/10 text-red-400 border-red-500/20",
    neutral: "bg-slate-500/10 text-slate-300 border-slate-500/20",
    brand: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-white/[0.05] rounded-xl ${className}`} />;
}
