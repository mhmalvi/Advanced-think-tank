import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  Send,
  Loader2,
  Undo2,
  Bookmark,
  ThumbsUp,
  ThumbsDown,
  Download,
  MessageSquare,
  FileText,
  Newspaper,
} from "lucide-react";
import { useCanvasStore } from "@/stores/canvas";
import { useLocaleStore } from "@/stores/locale";
import { StoryLabels } from "@/app/components/StoryLabel";
import { StoryRenderer } from "@/app/components/StoryRenderer";
import { StoryTimeline } from "@/app/components/StoryTimeline";
import { canvasChatMessage } from "@/lib/api";
import { formatPublicationDate } from "@/lib/utils";
import { Skeleton } from "@/app/components/ui/skeleton";
import { toast } from "sonner";
import type { CanvasSession } from "@/types/database";

// ─── Chat Panel ───
function ChatPanel() {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const chatMessages = useCanvasStore((s) => s.chatMessages);
  const chatLoading = useCanvasStore((s) => s.chatLoading);
  const addUserMessage = useCanvasStore((s) => s.addUserMessage);
  const addAssistantMessage = useCanvasStore((s) => s.addAssistantMessage);
  const setChatLoading = useCanvasStore((s) => s.setChatLoading);
  const saveSession = useCanvasStore((s) => s.saveSession);
  const previousSessions = useCanvasStore((s) => s.previousSessions);
  const loadSession = useCanvasStore((s) => s.loadSession);
  const sessionId = useCanvasStore((s) => s.sessionId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const currentStory = useCanvasStore((s) => s.currentStory);
  const currentContent = useCanvasStore((s) => s.currentContent);
  const updateStoryContent = useCanvasStore((s) => s.updateStoryContent);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = input.trim();
      if (!trimmed || chatLoading) return;

      setInput("");
      addUserMessage(trimmed);
      setChatLoading(true);

      try {
        const historyForApi = chatMessages.map((m) => ({ role: m.role, content: m.content }));
        const result = await canvasChatMessage(
          currentStory?.id ?? "",
          trimmed,
          currentContent ?? "",
          historyForApi,
        );

        let responseText = result.response;

        // Check for <story_update> tags — extract and apply
        const storyUpdateMatch = responseText.match(/<story_update>([\s\S]*?)<\/story_update>/);
        if (storyUpdateMatch) {
          const updatedContent = storyUpdateMatch[1].trim();
          updateStoryContent(updatedContent);
          // Remove the tag from the displayed message
          responseText = responseText.replace(/<story_update>[\s\S]*?<\/story_update>/, "").trim();
          if (!responseText) {
            responseText = "I've updated the story with those changes. You can undo with the button in the toolbar.";
          }
        }

        addAssistantMessage(responseText);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Something went wrong. Your conversation is saved — try again.";
        addAssistantMessage(errorMsg);
      } finally {
        setChatLoading(false);
        saveSession();
      }
    },
    [input, chatLoading, chatMessages, currentStory, currentContent, addUserMessage, addAssistantMessage, setChatLoading, saveSession, updateStoryContent],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const suggestedPrompts = [
    "Summarize the key developments",
    "What's the Danish business impact?",
    "Give me more background context",
  ];

  return (
    <div className="flex flex-col h-full border-r border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950">
      {/* Session selector */}
      {previousSessions.length > 0 && (
        <div className="p-2 border-b border-stone-200 dark:border-stone-800">
          <select
            value={sessionId ?? ""}
            onChange={(e) => {
              if (e.target.value) loadSession(e.target.value);
            }}
            className="w-full text-xs bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded px-2 py-1.5 text-stone-700 dark:text-stone-300"
          >
            <option value="">New conversation</option>
            {previousSessions.map((s) => (
              <option key={s.id} value={s.id}>
                {formatPublicationDate(s.updated_at)} — {s.messages.length} messages
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {chatMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <MessageSquare className="size-8 text-stone-300 dark:text-stone-700 mb-3" />
            <p className="text-sm font-medium text-stone-600 dark:text-stone-400 mb-1">
              Ask me anything about this story
            </p>
            <p className="text-xs text-stone-400 dark:text-stone-600 mb-4">
              I can summarize, expand, analyze impact, or find connections.
            </p>
            <div className="space-y-1.5 w-full">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => setInput(prompt)}
                  className="w-full text-left px-3 py-2 text-xs text-stone-600 dark:text-stone-400 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded hover:border-stone-400 dark:hover:border-stone-600 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {chatMessages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] px-3 py-2 rounded-lg text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-br-sm"
                  : "bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-800 dark:text-stone-200 rounded-bl-sm"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {chatLoading && (
          <div className="flex justify-start">
            <div className="px-3 py-2 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-bl-sm">
              <Loader2 className="size-4 animate-spin text-stone-400" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-stone-200 dark:border-stone-800">
        <div className="relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about this story..."
            rows={2}
            className="w-full resize-none rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 pr-10 text-sm text-stone-800 dark:text-stone-200 placeholder:text-stone-400 focus:outline-none focus:border-stone-400 dark:focus:border-stone-500 transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim() || chatLoading}
            className="absolute right-2 bottom-2 p-1.5 rounded text-stone-400 hover:text-stone-900 dark:hover:text-white disabled:opacity-30 transition-colors"
          >
            <Send className="size-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Story Panel ───
function StoryPanel() {
  const currentStory = useCanvasStore((s) => s.currentStory);
  const currentContent = useCanvasStore((s) => s.currentContent);
  const storyVersions = useCanvasStore((s) => s.storyVersions);
  const undoStoryChange = useCanvasStore((s) => s.undoStoryChange);
  const locale = useLocaleStore((s) => s.locale);

  if (!currentStory) return null;

  const hasModifications = storyVersions.length > 1;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/50 shrink-0">
        <div className="flex items-center gap-2">
          <Newspaper className="size-4 text-stone-400" />
          <span className="text-xs text-stone-500">
            {currentStory.source_count} sources — {formatPublicationDate(currentStory.created_at, locale)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {hasModifications && (
            <button
              onClick={undoStoryChange}
              className="p-1.5 rounded text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              title="Undo last change"
            >
              <Undo2 className="size-4" />
            </button>
          )}
          <button
            className="p-1.5 rounded text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            title="Bookmark"
          >
            <Bookmark className="size-4" />
          </button>
          <button
            className="p-1.5 rounded text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            title="Like"
          >
            <ThumbsUp className="size-4" />
          </button>
          <button
            className="p-1.5 rounded text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            title="Dislike"
          >
            <ThumbsDown className="size-4" />
          </button>
          <button
            className="p-1.5 rounded text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            title="Export"
          >
            <Download className="size-4" />
          </button>
        </div>
      </div>

      {/* Story content */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="max-w-3xl mx-auto">
          {/* Title + Labels */}
          <h1 className="text-2xl md:text-3xl font-bold text-stone-900 dark:text-white mb-3 leading-tight">
            {currentStory.title}
          </h1>

          {currentStory.synopsis && (
            <p className="text-base text-stone-500 dark:text-stone-400 mb-4 leading-relaxed">
              {currentStory.synopsis}
            </p>
          )}

          <div className="mb-6">
            <StoryLabels labels={currentStory.labels} max={10} />
          </div>

          <StoryTimeline entries={currentStory.timeline_entries} locale={locale} />

          {/* Rich story content */}
          <StoryRenderer content={currentContent ?? ""} />
        </div>
      </div>
    </div>
  );
}

// ─── Loading State ───
function CanvasLoading() {
  return (
    <div className="flex h-full">
      <div className="w-80 border-r border-stone-200 dark:border-stone-800 p-4">
        <Skeleton className="h-8 w-full mb-4" />
        <Skeleton className="h-20 w-full mb-2" />
        <Skeleton className="h-20 w-full" />
      </div>
      <div className="flex-1 p-8">
        <Skeleton className="h-10 w-3/4 mb-4" />
        <Skeleton className="h-5 w-full mb-2" />
        <Skeleton className="h-5 w-full mb-2" />
        <Skeleton className="h-5 w-2/3 mb-6" />
        <Skeleton className="h-40 w-full" />
      </div>
    </div>
  );
}

// ─── Mobile Tabs ───
function MobileCanvas() {
  const [tab, setTab] = useState<"chat" | "story">("story");

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shrink-0">
        <button
          onClick={() => setTab("story")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
            tab === "story"
              ? "text-stone-900 dark:text-white border-b-2 border-stone-900 dark:border-white"
              : "text-stone-500"
          }`}
        >
          <FileText className="size-3.5" />
          Story
        </button>
        <button
          onClick={() => setTab("chat")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
            tab === "chat"
              ? "text-stone-900 dark:text-white border-b-2 border-stone-900 dark:border-white"
              : "text-stone-500"
          }`}
        >
          <MessageSquare className="size-3.5" />
          Chat
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        {tab === "story" ? <StoryPanel /> : <ChatPanel />}
      </div>
    </div>
  );
}

// ─── Main Canvas Page ───
export function CanvasPage() {
  const { storyId } = useParams<{ storyId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const loadStory = useCanvasStore((s) => s.loadStory);
  const loadSession = useCanvasStore((s) => s.loadSession);
  const storyLoading = useCanvasStore((s) => s.storyLoading);
  const storyError = useCanvasStore((s) => s.storyError);
  const currentStory = useCanvasStore((s) => s.currentStory);
  const resetCanvas = useCanvasStore((s) => s.resetCanvas);

  useEffect(() => {
    if (!storyId) {
      navigate("/dashboard", { replace: true });
      return;
    }

    resetCanvas();
    loadStory(storyId).then(() => {
      const sessionParam = searchParams.get("session");
      if (sessionParam) {
        loadSession(sessionParam);
      }
    });
  }, [storyId, searchParams, loadStory, loadSession, resetCanvas, navigate]);

  // Error — redirect
  useEffect(() => {
    if (storyError && !storyLoading) {
      toast.error(storyError);
      navigate("/dashboard", { replace: true });
    }
  }, [storyError, storyLoading, navigate]);

  if (storyLoading || !currentStory) {
    return <CanvasLoading />;
  }

  return (
    <>
      {/* Desktop: side-by-side */}
      <div className="hidden md:flex h-full">
        <div className="w-80 lg:w-96 shrink-0">
          <ChatPanel />
        </div>
        <StoryPanel />
      </div>

      {/* Mobile: tabbed */}
      <div className="md:hidden h-full">
        <MobileCanvas />
      </div>
    </>
  );
}
