import { useState, useRef, useCallback } from "react";
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Camera, X, Upload, CheckCircle2, Bell, BellOff, Bookmark, Trash2 } from "lucide-react";
import { useLocaleStore } from "@/stores/locale";
import { useSettingsStore } from "@/stores/settings";

function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number) {
  return centerCrop(makeAspectCrop({ unit: "%", width: 90 }, aspect, mediaWidth, mediaHeight), mediaWidth, mediaHeight);
}

function TagInput({
  label,
  description,
  tags,
  setTags,
  placeholder,
}: {
  label: string;
  description: string;
  tags: string[];
  setTags: React.Dispatch<React.SetStateAction<string[]>>;
  placeholder: string;
}) {
  const [inputValue, setInputValue] = useState("");

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = inputValue.trim().replace(",", "");
      if (val && !tags.includes(val)) {
        setTags([...tags, val]);
      }
      setInputValue("");
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-stone-900 dark:text-stone-100">{label}</label>
      <p className="text-xs text-stone-500">{description}</p>

      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-sm bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700"
          >
            {tag}
            <button
              onClick={() => setTags(tags.filter((t) => t !== tag))}
              className="text-stone-500 hover:text-red-500 focus:outline-none"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>

      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-500 focus:border-transparent dark:text-white"
      />
    </div>
  );
}

function AutoSaveInput({
  label,
  type = "text",
  defaultValue,
  placeholder,
}: {
  label: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  const [value, setValue] = useState(defaultValue || "");
  const [isSaving, setIsSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  const handleBlur = () => {
    if (value !== defaultValue) {
      setIsSaving(true);
      setTimeout(() => {
        setIsSaving(false);
        setShowSaved(true);
        setTimeout(() => setShowSaved(false), 2000);
      }, 600);
    }
  };

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">{label}</label>
      <div className="relative flex items-center">
        <input
          type={type}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleBlur}
          placeholder={placeholder}
          className="w-full px-3 py-2 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-md shadow-sm focus:outline-none focus:ring-stone-500 focus:border-stone-500 sm:text-sm dark:text-white pr-10"
        />
        {isSaving && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border-2 border-stone-300 border-t-stone-600 animate-spin" />
        )}
        {showSaved && (
          <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500 animate-in fade-in zoom-in duration-300" />
        )}
      </div>
    </div>
  );
}

export function UserProfileSettings() {
  const [imgSrc, setImgSrc] = useState("");
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const { t } = useLocaleStore();

  // Wire to settings store for persistence
  const settingsTopics = useSettingsStore((s) => s.topics);
  const addTopic = useSettingsStore((s) => s.addTopic);
  const removeTopic = useSettingsStore((s) => s.removeTopic);
  const settingsGeo = useSettingsStore((s) => s.geographies);
  const addGeography = useSettingsStore((s) => s.addGeography);
  const removeGeography = useSettingsStore((s) => s.removeGeography);
  const settingsIndustries = useSettingsStore((s) => s.industries);
  const addIndustry = useSettingsStore((s) => s.addIndustry);
  const removeIndustry = useSettingsStore((s) => s.removeIndustry);
  const settingsSources = useSettingsStore((s) => s.preferredSources);
  const addPreferredSource = useSettingsStore((s) => s.addPreferredSource);
  const removePreferredSource = useSettingsStore((s) => s.removePreferredSource);

  // Notification preferences
  const notificationsEnabled = useSettingsStore((s) => s.notificationsEnabled);
  const notifyBreakingNews = useSettingsStore((s) => s.notifyBreakingNews);
  const notifyWeeklySummary = useSettingsStore((s) => s.notifyWeeklySummary);
  const toggleNotifications = useSettingsStore((s) => s.toggleNotifications);
  const toggleBreakingNews = useSettingsStore((s) => s.toggleBreakingNews);
  const toggleWeeklySummary = useSettingsStore((s) => s.toggleWeeklySummary);

  // Saved prompts
  const savedPrompts = useSettingsStore((s) => s.savedPrompts);
  const addSavedPrompt = useSettingsStore((s) => s.addSavedPrompt);
  const removeSavedPrompt = useSettingsStore((s) => s.removeSavedPrompt);
  const [newPrompt, setNewPrompt] = useState("");

  // Adapter: TagInput expects setTags(string[]), but we use add/remove
  const setTopics = useCallback(
    (updater: React.SetStateAction<string[]>) => {
      const next = typeof updater === "function" ? updater(settingsTopics) : updater;
      const added = next.filter((t) => !settingsTopics.includes(t));
      const removed = settingsTopics.filter((t) => !next.includes(t));
      added.forEach(addTopic);
      removed.forEach(removeTopic);
    },
    [settingsTopics, addTopic, removeTopic],
  );

  const setAreas = useCallback(
    (updater: React.SetStateAction<string[]>) => {
      const next = typeof updater === "function" ? updater(settingsGeo) : updater;
      const added = next.filter((g) => !settingsGeo.includes(g));
      const removed = settingsGeo.filter((g) => !next.includes(g));
      added.forEach(addGeography);
      removed.forEach(removeGeography);
    },
    [settingsGeo, addGeography, removeGeography],
  );

  const setIndustries = useCallback(
    (updater: React.SetStateAction<string[]>) => {
      const next = typeof updater === "function" ? updater(settingsIndustries) : updater;
      const added = next.filter((i) => !settingsIndustries.includes(i));
      const removed = settingsIndustries.filter((i) => !next.includes(i));
      added.forEach(addIndustry);
      removed.forEach(removeIndustry);
    },
    [settingsIndustries, addIndustry, removeIndustry],
  );

  const setSources = useCallback(
    (updater: React.SetStateAction<string[]>) => {
      const next = typeof updater === "function" ? updater(settingsSources) : updater;
      const added = next.filter((s) => !settingsSources.includes(s));
      const removed = settingsSources.filter((s) => !next.includes(s));
      added.forEach(addPreferredSource);
      removed.forEach(removePreferredSource);
    },
    [settingsSources, addPreferredSource, removePreferredSource],
  );

  function onSelectFile(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      setCrop(undefined);
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setImgSrc(reader.result?.toString() || "");
        setIsCropModalOpen(true);
      });
      reader.readAsDataURL(e.target.files[0]);
    }
  }

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, 1));
  }

  function generateCropPreview() {
    if (!completedCrop || !imgRef.current) return;
    setAvatarPreview(imgSrc);
    setIsCropModalOpen(false);
  }

  return (
    <div className="space-y-10 pb-10">
      {/* Header */}
      <div className="border-b border-stone-200 dark:border-stone-800 pb-5">
        <h2 className="text-xl font-bold text-black dark:text-white">{t.profile.title}</h2>
        <p className="mt-1 text-sm text-stone-500">{t.profile.subtitle}</p>
      </div>

      {/* Avatar */}
      <section className="flex items-center gap-6">
        <div className="relative h-24 w-24 rounded-full overflow-hidden border-2 border-stone-200 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 flex items-center justify-center shrink-0">
          {avatarPreview ? (
            <img src={avatarPreview} alt={t.profile.avatar} className="h-full w-full object-cover" />
          ) : (
            <Camera className="h-8 w-8 text-stone-400" />
          )}
        </div>
        <div>
          <label
            htmlFor="avatar-upload"
            className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border border-stone-300 dark:border-stone-600 rounded-md shadow-sm text-sm font-medium text-stone-700 dark:text-stone-200 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-stone-500"
          >
            <Upload className="h-4 w-4" />
            {t.profile.uploadPhoto}
          </label>
          <input id="avatar-upload" type="file" accept="image/*" className="sr-only" onChange={onSelectFile} />
          <p className="mt-2 text-xs text-stone-500">{t.profile.photoHint}</p>
        </div>
      </section>

      {/* Account Info + SSO */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-stone-200 dark:border-stone-800">
        <div className="space-y-4">
          <h3 className="text-base font-medium text-stone-900 dark:text-stone-100">{t.profile.accountInfo}</h3>

          <AutoSaveInput label={t.profile.name} defaultValue="Simon" />
          <AutoSaveInput label={t.profile.email} type="email" defaultValue="simon@et.dk" />

          <div className="pt-2">
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
              {t.profile.newPassword}
            </label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full px-3 py-2 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-md shadow-sm focus:outline-none focus:ring-stone-500 focus:border-stone-500 sm:text-sm dark:text-white mb-2"
            />
            <div className="text-xs text-stone-500 space-y-1">
              <p className="flex items-center gap-1.5 text-stone-400">
                <span className="w-1 h-1 rounded-full bg-stone-400" /> {t.profile.passwordHint1}
              </p>
              <p className="flex items-center gap-1.5 text-stone-400">
                <span className="w-1 h-1 rounded-full bg-stone-400" /> {t.profile.passwordHint2}
              </p>
              <p className="flex items-center gap-1.5 text-stone-400">
                <span className="w-1 h-1 rounded-full bg-stone-400" /> {t.profile.passwordHint3}
              </p>
            </div>
            <button className="mt-3 px-4 py-2 border border-stone-300 dark:border-stone-600 rounded-md text-sm font-medium hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">
              {t.profile.updatePassword}
            </button>
          </div>
        </div>

        <div className="space-y-4 mt-8 md:mt-0">
          <h3 className="text-base font-medium text-stone-900 dark:text-stone-100">{t.profile.connectedAccounts}</h3>
          <p className="text-sm text-stone-500 mb-4">{t.profile.connectHint}</p>

          <div className="space-y-3">
            <button className="w-full flex items-center justify-center gap-3 px-4 py-2 border border-stone-300 dark:border-stone-600 rounded-md text-sm font-medium bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.01v2.84C3.82 20.53 7.6 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.01C1.26 8.56.83 10.23.83 12s.43 3.44 1.18 4.93l3.83-2.84z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.6 1 3.82 3.47 2.01 7.07l3.83 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              {t.profile.connectGoogle}
            </button>
            <button className="w-full flex items-center justify-center gap-3 px-4 py-2 border border-stone-300 dark:border-stone-600 rounded-md text-sm font-medium bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 21 21">
                <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
              </svg>
              {t.profile.connectMicrosoft}
            </button>
          </div>
        </div>
      </section>

      {/* Content Preferences */}
      <section className="space-y-6 pt-6 border-t border-stone-200 dark:border-stone-800">
        <div>
          <h3 className="text-base font-medium text-stone-900 dark:text-stone-100">{t.profile.contentPrefs}</h3>
          <p className="text-sm text-stone-500 mb-4">{t.profile.contentPrefsDesc}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          <TagInput
            label={t.profile.topics}
            description={t.profile.topicsDesc}
            tags={settingsTopics}
            setTags={setTopics}
            placeholder={t.profile.addTag}
          />
          <TagInput
            label={t.profile.areas}
            description={t.profile.areasDesc}
            tags={settingsGeo}
            setTags={setAreas}
            placeholder={t.profile.addTag}
          />
          <TagInput
            label={t.profile.industries}
            description={t.profile.industriesDesc}
            tags={settingsIndustries}
            setTags={setIndustries}
            placeholder={t.profile.addTag}
          />
          <TagInput
            label={t.profile.newsSources}
            description={t.profile.newsSourcesDesc}
            tags={settingsSources}
            setTags={setSources}
            placeholder={t.profile.addTag}
          />
        </div>
      </section>

      {/* Saved Prompts */}
      <section className="space-y-4 pt-6 border-t border-stone-200 dark:border-stone-800">
        <div>
          <h3 className="text-base font-medium text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Bookmark className="size-4" />
            {t.profile.savedPrompts}
          </h3>
          <p className="text-sm text-stone-500 mb-4">{t.profile.savedPromptsDesc}</p>
        </div>

        <div className="space-y-2">
          {savedPrompts.length === 0 && (
            <p className="text-sm text-stone-400 dark:text-stone-500 italic">{t.profile.noSavedPrompts}</p>
          )}
          {savedPrompts.map((prompt) => (
            <div
              key={prompt}
              className="flex items-center justify-between gap-3 px-3 py-2 rounded-md bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700"
            >
              <span className="text-sm text-stone-700 dark:text-stone-300 truncate">{prompt}</span>
              <button
                onClick={() => removeSavedPrompt(prompt)}
                className="shrink-0 text-stone-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={newPrompt}
            onChange={(e) => setNewPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newPrompt.trim()) {
                addSavedPrompt(newPrompt);
                setNewPrompt("");
              }
            }}
            placeholder={t.profile.addPromptPlaceholder}
            className="flex-1 px-3 py-2 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-500 focus:border-transparent dark:text-white"
          />
          <button
            onClick={() => {
              if (newPrompt.trim()) {
                addSavedPrompt(newPrompt);
                setNewPrompt("");
              }
            }}
            className="px-4 py-2 text-sm font-medium border border-stone-300 dark:border-stone-600 rounded-md hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
          >
            {t.common.save}
          </button>
        </div>
      </section>

      {/* Notification Preferences */}
      <section className="space-y-4 pt-6 border-t border-stone-200 dark:border-stone-800">
        <div>
          <h3 className="text-base font-medium text-stone-900 dark:text-stone-100 flex items-center gap-2">
            {notificationsEnabled ? <Bell className="size-4" /> : <BellOff className="size-4" />}
            {t.profile.notifications}
          </h3>
          <p className="text-sm text-stone-500 mb-4">{t.profile.notificationsDesc}</p>
        </div>

        <div className="space-y-3">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="text-sm font-medium text-stone-800 dark:text-stone-200">
                {t.profile.enableNotifications}
              </span>
              <p className="text-xs text-stone-500">{t.profile.enableNotificationsDesc}</p>
            </div>
            <button
              onClick={toggleNotifications}
              className={`relative w-11 h-6 rounded-full transition-colors ${notificationsEnabled ? "bg-green-500" : "bg-stone-300 dark:bg-stone-600"}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${notificationsEnabled ? "translate-x-5" : ""}`}
              />
            </button>
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="text-sm font-medium text-stone-800 dark:text-stone-200">{t.profile.breakingNews}</span>
              <p className="text-xs text-stone-500">{t.profile.breakingNewsDesc}</p>
            </div>
            <button
              onClick={toggleBreakingNews}
              disabled={!notificationsEnabled}
              className={`relative w-11 h-6 rounded-full transition-colors ${notifyBreakingNews && notificationsEnabled ? "bg-green-500" : "bg-stone-300 dark:bg-stone-600"} ${!notificationsEnabled ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${notifyBreakingNews && notificationsEnabled ? "translate-x-5" : ""}`}
              />
            </button>
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="text-sm font-medium text-stone-800 dark:text-stone-200">{t.profile.weeklySummary}</span>
              <p className="text-xs text-stone-500">{t.profile.weeklySummaryDesc}</p>
            </div>
            <button
              onClick={toggleWeeklySummary}
              disabled={!notificationsEnabled}
              className={`relative w-11 h-6 rounded-full transition-colors ${notifyWeeklySummary && notificationsEnabled ? "bg-green-500" : "bg-stone-300 dark:bg-stone-600"} ${!notificationsEnabled ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${notifyWeeklySummary && notificationsEnabled ? "translate-x-5" : ""}`}
              />
            </button>
          </label>
        </div>
      </section>

      {/* Danger Zone */}
      <section className="pt-6 border-t border-red-200 dark:border-red-900/30">
        <h3 className="text-base font-medium text-red-600 dark:text-red-400">{t.profile.dangerZone}</h3>
        <p className="text-sm text-stone-500 mb-4">{t.profile.dangerDesc}</p>
        <button className="px-4 py-2 border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 rounded-md text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors">
          {t.profile.deleteAccount}
        </button>
      </section>

      {/* Crop Modal */}
      {isCropModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-stone-900 rounded-lg shadow-xl w-full max-w-lg overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-stone-200 dark:border-stone-800">
              <h3 className="text-lg font-medium text-stone-900 dark:text-stone-100">{t.profile.cropImage}</h3>
              <button onClick={() => setIsCropModalOpen(false)} className="text-stone-400 hover:text-stone-500">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 flex justify-center bg-stone-100 dark:bg-stone-950 max-h-[60vh] overflow-auto">
              {!!imgSrc && (
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={(c: PixelCrop) => setCompletedCrop(c)}
                  aspect={1}
                  circularCrop
                >
                  <img ref={imgRef} alt={t.profile.cropAlt} src={imgSrc} onLoad={onImageLoad} className="max-w-full" />
                </ReactCrop>
              )}
            </div>

            <div className="p-4 border-t border-stone-200 dark:border-stone-800 flex justify-end gap-3">
              <button
                onClick={() => setIsCropModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-md"
              >
                {t.profile.cancel}
              </button>
              <button
                onClick={generateCropPreview}
                className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-md"
              >
                {t.profile.confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
