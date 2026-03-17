import { Users, Key } from 'lucide-react';
import { useLocaleStore } from '@/stores/locale';

function PlaceholderSection({
  icon: Icon,
  title,
  description,
  comingSoon,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  comingSoon: string;
}) {
  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-6 flex items-start gap-4">
      <div className="rounded-lg bg-stone-100 dark:bg-stone-800 p-2.5 shrink-0">
        <Icon className="size-5 text-stone-500 dark:text-stone-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-medium text-stone-900 dark:text-stone-100">{title}</h3>
          <span className="text-[11px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 border border-stone-200 dark:border-stone-700">
            {comingSoon}
          </span>
        </div>
        <p className="mt-1 text-sm text-stone-500">{description}</p>
      </div>
    </div>
  );
}

export function CompanySettings() {
  const { t } = useLocaleStore();

  return (
    <div className="space-y-6">
      <div className="border-b border-stone-200 dark:border-stone-800 pb-5">
        <h2 className="text-xl font-bold text-black dark:text-white">{t.org.title}</h2>
        <p className="mt-1 text-sm text-stone-500">{t.org.subtitle}</p>
      </div>

      <div className="space-y-4">
        <PlaceholderSection
          icon={Users}
          title={t.org.teamMembers}
          description={t.org.teamDesc}
          comingSoon={t.org.comingSoon}
        />
        <PlaceholderSection
          icon={Key}
          title={t.org.apiKeys}
          description={t.org.apiDesc}
          comingSoon={t.org.comingSoon}
        />
      </div>
    </div>
  );
}
