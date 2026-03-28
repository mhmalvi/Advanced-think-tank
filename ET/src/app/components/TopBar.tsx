import { Link } from "react-router-dom";
import { UserMenu } from "@/app/components/UserMenu";
import { SimStatusDot } from "@/app/components/simulation/SimStatusDot";

export function TopBar() {
  return (
    <div className="flex items-center justify-between px-3 py-2 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-[#0a0a0b] shrink-0">
      <div className="flex items-center gap-2">
        <Link
          to="/dashboard"
          className="relative font-bold text-sm text-stone-900 dark:text-white tracking-tight hover:text-[#E30613] transition-colors group"
        >
          Advanced Think Tank
          <span className="absolute -bottom-0.5 left-0 h-[2px] w-full bg-[#E30613] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-200" />
        </Link>
        <SimStatusDot />
      </div>
      <UserMenu />
    </div>
  );
}
