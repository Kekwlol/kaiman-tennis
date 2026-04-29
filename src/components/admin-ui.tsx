// Admin-UI Komponenten - hell, modern, einladend
import Link from "next/link";

export function PageHeader({
  title,
  desc,
  action,
}: {
  title: string;
  desc?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-8 pb-5 border-b border-stone-200 flex items-end justify-between gap-4 flex-wrap">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900">{title}</h1>
        {desc && <p className="text-sm text-stone-500 mt-1">{desc}</p>}
      </div>
      {action}
    </header>
  );
}

export function Btn({
  children,
  variant = "primary",
  href,
  ...rest
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger";
  href?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const styles = {
    primary: "bg-stone-900 text-white hover:bg-stone-700 shadow-sm",
    secondary: "bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 hover:border-stone-300",
    danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
  } as const;
  const cls = `inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant]}`;
  if (href) return <Link href={href} className={cls}>{children}</Link>;
  return <button {...rest} className={cls}>{children}</button>;
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white border border-stone-200 rounded-xl shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function Stat({ label, value, hint, accent = "neutral" }: {
  label: string;
  value: string;
  hint?: string;
  accent?: "neutral" | "green" | "amber" | "red";
}) {
  const colors = {
    neutral: "bg-white",
    green: "bg-green-50",
    amber: "bg-amber-50",
    red: "bg-red-50",
  };
  return (
    <div className={`border border-stone-200 rounded-xl p-5 shadow-sm ${colors[accent]}`}>
      <div className="text-xs text-stone-500 uppercase tracking-wider font-medium">{label}</div>
      <div className="text-3xl font-semibold mt-1.5 tabular-nums text-stone-900">{value}</div>
      {hint && <div className="text-xs text-stone-500 mt-1">{hint}</div>}
    </div>
  );
}

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">{children}</table>
      </div>
    </div>
  );
}

export function Th({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={`text-left px-4 py-3 bg-stone-50 font-medium text-stone-600 text-xs uppercase tracking-wider border-b border-stone-200 ${className}`}>
      {children}
    </th>
  );
}

export function Td({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 border-b border-stone-100 text-stone-800 ${className}`}>{children}</td>;
}

export function FormField({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-stone-600 mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-xs text-stone-400 mt-1">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:ring-2 focus:ring-stone-900/10 outline-none transition-all";

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "green" | "amber" | "red" | "blue" }) {
  const tones = {
    neutral: "bg-stone-100 text-stone-700",
    green: "bg-green-100 text-green-800",
    amber: "bg-amber-100 text-amber-800",
    red: "bg-red-100 text-red-800",
    blue: "bg-blue-100 text-blue-800",
  };
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${tones[tone]}`}>{children}</span>;
}
