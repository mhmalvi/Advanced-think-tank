import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, MessageSquare, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth";
import { relativeTime } from "@/lib/utils";
import type { CanvasSession, Story } from "@/types/database";

type SessionWithStory = CanvasSession & { story_title: string };

export function HistorySettings() {
  const [sessions, setSessions] = useState<SessionWithStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmClear, setConfirmClear] = useState(false);
  const user = useAuthStore((s) => s.user);

  async function loadSessions() {
    setLoading(true);
    const { data } = await supabase
      .from("canvas_sessions")
      .select("*, stories(title)")
      .eq("user_id", user!.id)
      .order("updated_at", { ascending: false });

    const results: SessionWithStory[] = (data ?? []).map((row) => ({
      ...row,
      story_title: (row.stories as unknown as Story)?.title ?? "Untitled Story",
    }));

    setSessions(results);
    setLoading(false);
  }

  useEffect(() => {
    if (!user?.id) return;
    loadSessions();
  }, [user?.id]);

  async function clearAllHistory() {
    if (!user?.id) return;
    await supabase.from("canvas_sessions").delete().eq("user_id", user.id);
    setSessions([]);
    setConfirmClear(false);
  }

  if (loading) {
    return <div className="p-6 text-sm text-stone-500">Loading history...</div>;
  }

  if (sessions.length === 0) {
    return (
      <div className="p-6 text-center">
        <Clock className="size-10 text-stone-300 dark:text-stone-700 mx-auto mb-3" />
        <p className="text-sm text-stone-500">No canvas sessions yet. Start exploring stories to build your history.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">Canvas Sessions</h3>
        {confirmClear ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-red-500">Clear all history?</span>
            <button
              onClick={clearAllHistory}
              className="px-3 py-1 text-xs font-medium bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            >
              Confirm
            </button>
            <button
              onClick={() => setConfirmClear(false)}
              className="px-3 py-1 text-xs font-medium text-stone-500 hover:text-stone-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmClear(true)}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-stone-500 hover:text-red-500 transition-colors"
          >
            <Trash2 className="size-3" />
            Clear all
          </button>
        )}
      </div>

      <div className="space-y-2">
        {sessions.map((session) => {
          const messageCount = Array.isArray(session.messages) ? session.messages.length : 0;
          const lastMessage =
            Array.isArray(session.messages) && session.messages.length > 0
              ? session.messages[session.messages.length - 1]
              : null;

          return (
            <Link
              key={session.id}
              to={`/canvas/${session.story_id}?session=${session.id}`}
              className="flex items-center gap-4 p-3 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/50 hover:border-stone-400 dark:hover:border-stone-600 transition-colors"
            >
              <MessageSquare className="size-4 text-stone-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-900 dark:text-white truncate">{session.story_title}</p>
                {lastMessage && (
                  <p className="text-xs text-stone-500 truncate mt-0.5">
                    {(lastMessage as { content?: string }).content?.slice(0, 80)}
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-[11px] text-stone-400">{relativeTime(session.updated_at)}</p>
                <p className="text-[10px] text-stone-400">{messageCount} messages</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
