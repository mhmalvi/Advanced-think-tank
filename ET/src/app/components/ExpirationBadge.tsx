import { Clock } from "lucide-react";

interface ExpirationBadgeProps {
  expiresAt: string;
  compact?: boolean;
}

export function ExpirationBadge({ expiresAt, compact = false }: ExpirationBadgeProps) {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffMs = expiry.getTime() - now.getTime();

  if (diffMs <= 0) {
    return (
      <div className={`flex items-center gap-1 rounded font-bold uppercase tracking-wider bg-stone-100 dark:bg-stone-900 text-stone-400 dark:text-stone-600 border border-stone-200 dark:border-stone-800 ${compact ? 'text-[9px] px-1 py-0.5' : 'text-[10px] px-1.5 py-0.5'}`}>
        {!compact && <Clock className="size-3" />}
        Expired
      </div>
    );
  }

  const totalMinutes = Math.floor(diffMs / 1000 / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const isCritical = totalMinutes < 60;

  const timeString = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  return (
    <div className={`flex items-center gap-1 rounded font-mono font-bold border transition-colors ${
      isCritical
        ? 'bg-[#E94E3D]/10 text-[#E94E3D] border-[#E94E3D]/30'
        : 'bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-500/30'
    } ${compact ? 'text-[10px] px-1 py-0.5' : 'text-xs px-2 py-0.5'}`}>
      {!compact && <Clock className="size-3.5" />}
      {timeString}
    </div>
  );
}
