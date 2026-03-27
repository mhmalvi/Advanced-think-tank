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
import DOMPurify from "dompurify";
import { useCanvasStore } from "@/stores/canvas";
import { useInteractionsStore } from "@/stores/interactions";
import { useLocaleStore } from "@/stores/locale";
import { StoryLabels } from "@/app/components/StoryLabel";
import { DanishImpactCallout } from "@/app/components/DanishImpactCallout";
import { StoryRenderer } from "@/app/components/StoryRenderer";
import { StoryTimeline } from "@/app/components/StoryTimeline";
import { SourceCarousel } from "@/app/components/SourceCarousel";
import { canvasChatMessage } from "@/lib/api";
import { formatPublicationDate } from "@/lib/utils";
import { Skeleton } from "@/app/components/ui/skeleton";
import { toast } from "sonner";
import type { CanvasSession as _CanvasSession } from "@/types/database";

// ─── Escape HTML entities before markdown processing ───
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ─── Markdown formatting for chat messages ───
function formatChatMarkdown(text: string): string {
  // Escape HTML first to prevent XSS
  const escaped = escapeHtml(text);

  const html = escaped
    // Code blocks (triple backticks) — before other processing
    .replace(/```(\w*)\n?([\s\S]*?)```/g, "<pre><code>$2</code></pre>")
    // Headers
    .replace(/^### (.+)$/gm, "</p><h3>$1</h3><p>")
    .replace(/^## (.+)$/gm, "</p><h2>$1</h2><p>")
    .replace(/^# (.+)$/gm, "</p><h1>$1</h1><p>")
    // Bold + Italic
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Ordered lists — must come before unordered to differentiate
    .replace(/(?:^\d+\. (.+)$\n?)+/gm, (match) => {
      const items = match
        .trim()
        .split("\n")
        .map((line) => `<li>${line.replace(/^\d+\.\s*/, "")}</li>`)
        .join("");
      return `</p><ol>${items}</ol><p>`;
    })
    // Unordered lists
    .replace(/(?:^[-*] (.+)$\n?)+/gm, (match) => {
      const items = match
        .trim()
        .split("\n")
        .map((line) => `<li>${line.replace(/^[-*]\s*/, "")}</li>`)
        .join("");
      return `</p><ul>${items}</ul><p>`;
    })
    // Markdown links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    // Inline code
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    // Paragraphs — double newlines
    .replace(/\n{2,}/g, "</p><p>")
    // Single line breaks
    .replace(/\n/g, "<br>")
    // Wrap in paragraph
    .replace(/^/, "<p>")
    .replace(/$/, "</p>")
    // Clean up empty paragraphs created by block elements
    .replace(/<p>\s*<\/p>/g, "");

  // Sanitize with DOMPurify to prevent XSS
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["p", "br", "strong", "em", "h1", "h2", "h3", "ul", "ol", "li", "code", "pre", "a"],
    ALLOWED_ATTR: ["href", "target", "rel"],
  });
}

// ─── Strip all story_update tags from text (handles multiple/nested) ───
function stripStoryUpdateTags(text: string): string {
  return text.replace(/<story_update>[\s\S]*?<\/story_update>/g, "").trim();
}

// ─── Chat Panel ───
function ChatPanel() {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const t = useLocaleStore((s) => s.t);

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
        const result = await canvasChatMessage(currentStory?.id ?? "", trimmed, currentContent ?? "", historyForApi);

        let responseText = result.response;

        // Check for <story_update> tags — extract ALL occurrences and apply the last one
        const storyUpdateMatches = responseText.match(/<story_update>([\s\S]*?)<\/story_update>/g);
        if (storyUpdateMatches && storyUpdateMatches.length > 0) {
          // Use the last match as the final update content
          const lastMatch = storyUpdateMatches[storyUpdateMatches.length - 1]!;
          const contentMatch = lastMatch.match(/<story_update>([\s\S]*?)<\/story_update>/);
          if (contentMatch?.[1]) {
            updateStoryContent(contentMatch[1].trim());
          }
          // Remove ALL story_update tags from the displayed message
          responseText = stripStoryUpdateTags(responseText);
          if (!responseText) {
            responseText = t.canvas.storyUpdated;
          }
        }

        addAssistantMessage(responseText);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : t.canvas.chatError;
        // Strip any story_update tags that may have leaked into error messages
        addAssistantMessage(stripStoryUpdateTags(errorMsg));
      } finally {
        setChatLoading(false);
        saveSession();
      }
    },
    [
      input,
      chatLoading,
      chatMessages,
      currentStory,
      currentContent,
      addUserMessage,
      addAssistantMessage,
      setChatLoading,
      saveSession,
      updateStoryContent,
      t.canvas.chatError,
      t.canvas.storyUpdated,
    ],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const suggestedPrompts = [t.canvas.suggestSummarize, t.canvas.suggestImpact, t.canvas.suggestBackground];

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
            <option value="">{t.canvas.newConversation}</option>
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
            <p className="text-sm font-medium text-stone-600 dark:text-stone-400 mb-1">{t.canvas.askAnything}</p>
            <p className="text-xs text-stone-400 dark:text-stone-600 mb-4">{t.canvas.canDoDescription}</p>
            <div className="space-y-1.5 w-full">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => setInput(prompt)}
                  className="w-full text-left px-3 py-2 text-xs text-stone-600 dark:text-stone-300 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded hover:border-stone-400 dark:hover:border-stone-600 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {chatMessages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] px-3 py-2 rounded-lg text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-br-sm"
                  : "bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-800 dark:text-stone-200 rounded-bl-sm"
              }`}
            >
              {msg.role === "assistant" ? (
                <div
                  className="prose prose-sm dark:prose-invert prose-stone max-w-none [&>p]:my-1 [&>ul]:my-1 [&>ol]:my-1 [&>h1]:text-base [&>h2]:text-sm [&>h3]:text-sm"
                  dangerouslySetInnerHTML={{ __html: formatChatMarkdown(msg.content) }}
                />
              ) : (
                msg.content
              )}
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
            placeholder={t.canvas.inputPlaceholder}
            rows={2}
            className="w-full resize-y rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 pr-10 text-sm text-stone-800 dark:text-stone-200 placeholder:text-stone-400 focus:outline-none focus:border-stone-400 dark:focus:border-stone-500 transition-colors min-h-[56px] max-h-[200px]"
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
  const navigate = useNavigate();
  const currentStory = useCanvasStore((s) => s.currentStory);
  const currentContent = useCanvasStore((s) => s.currentContent);
  const storyVersions = useCanvasStore((s) => s.storyVersions);
  const undoStoryChange = useCanvasStore((s) => s.undoStoryChange);
  const { locale, t } = useLocaleStore();
  const [exportOpen, setExportOpen] = useState(false);

  const { toggleLike, toggleDislike, toggleBookmark, getInteraction, isBookmarked } = useInteractionsStore();

  if (!currentStory) return null;

  const hasModifications = storyVersions.length > 1;
  const interaction = getInteraction(currentStory.id);
  const bookmarked = isBookmarked(currentStory.id);

  const handleExport = async (format: string) => {
    setExportOpen(false);
    const title = currentStory.title;
    const content = currentContent || currentStory.synthetic_content || "";
    const dateStr = new Date().toISOString().split("T")[0];
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 40);
    const labels = (currentStory.labels || []).map((l: { text: string }) => l.text).join(", ");
    const plainContent = content.replace(/[#*_`[\]]/g, "").replace(/<[^>]+>/g, "");

    if (format === "email") {
      const subject = encodeURIComponent(`${title} — Advanced Think Tank Briefing`);
      const body = encodeURIComponent(
        `${title}\n\n${currentStory.synopsis || ""}\n\n${plainContent}\n\n---\nSources: ${currentStory.source_count} | ${dateStr}\nLabels: ${labels}\n\nExported from Advanced Think Tank`,
      );
      window.open(`mailto:?subject=${subject}&body=${body}`, "_self");
      toast.success("Opening email client");
    } else if (format === "docx") {
      try {
        const { Document, Paragraph, TextRun, HeadingLevel, Packer } = await import("docx");
        const { saveAs } = await import("file-saver");

        const paragraphs: InstanceType<typeof Paragraph>[] = [];

        // Header
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: "Advanced Think Tank — Intelligence Briefing", size: 18, color: "888888" })],
            spacing: { after: 100 },
          }),
        );
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: dateStr, size: 18, color: "888888" })],
            spacing: { after: 300 },
          }),
        );

        // Title
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: title, bold: true, size: 32 })],
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 200 },
          }),
        );

        // Synopsis
        if (currentStory.synopsis) {
          paragraphs.push(
            new Paragraph({
              children: [new TextRun({ text: currentStory.synopsis, italics: true, color: "555555", size: 22 })],
              spacing: { after: 200 },
            }),
          );
        }

        // Labels
        if (labels) {
          paragraphs.push(
            new Paragraph({
              children: [new TextRun({ text: `Labels: ${labels}`, size: 18, color: "888888" })],
              spacing: { after: 200 },
            }),
          );
        }

        // Timeline
        const timelineEntries = currentStory.timeline_entries || [];
        if (timelineEntries.length > 0) {
          paragraphs.push(
            new Paragraph({
              children: [new TextRun({ text: "Timeline", bold: true, size: 24 })],
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 200, after: 100 },
            }),
          );
          for (const entry of timelineEntries) {
            paragraphs.push(
              new Paragraph({
                children: [
                  new TextRun({ text: `${entry.timestamp || ""} — `, bold: true, size: 20 }),
                  new TextRun({ text: entry.summary || "", size: 20 }),
                ],
                spacing: { after: 80 },
              }),
            );
          }
        }

        // Content — parse markdown into paragraphs
        const lines = content.split("\n");
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) {
            paragraphs.push(new Paragraph({ spacing: { after: 100 } }));
            continue;
          }
          if (trimmed.startsWith("## ")) {
            paragraphs.push(
              new Paragraph({
                children: [new TextRun({ text: trimmed.replace(/^##\s*/, ""), bold: true, size: 26 })],
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 200, after: 100 },
              }),
            );
          } else if (trimmed.startsWith("### ")) {
            paragraphs.push(
              new Paragraph({
                children: [new TextRun({ text: trimmed.replace(/^###\s*/, ""), bold: true, size: 22 })],
                heading: HeadingLevel.HEADING_3,
                spacing: { before: 150, after: 80 },
              }),
            );
          } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
            const bulletText = trimmed.replace(/^[-*]\s*/, "");
            const runs: InstanceType<typeof TextRun>[] = [];
            bulletText.split(/(\*\*.*?\*\*)/).forEach((part: string) => {
              if (part.startsWith("**") && part.endsWith("**")) {
                runs.push(new TextRun({ text: part.slice(2, -2), bold: true, size: 20 }));
              } else {
                runs.push(new TextRun({ text: part, size: 20 }));
              }
            });
            paragraphs.push(new Paragraph({ children: runs, bullet: { level: 0 }, spacing: { after: 60 } }));
          } else {
            const runs: InstanceType<typeof TextRun>[] = [];
            trimmed
              .replace(/<[^>]+>/g, "")
              .split(/(\*\*.*?\*\*)/)
              .forEach((part: string) => {
                if (part.startsWith("**") && part.endsWith("**")) {
                  runs.push(new TextRun({ text: part.slice(2, -2), bold: true, size: 20 }));
                } else {
                  runs.push(new TextRun({ text: part, size: 20 }));
                }
              });
            paragraphs.push(new Paragraph({ children: runs, spacing: { after: 100 } }));
          }
        }

        const doc = new Document({
          sections: [{ properties: {}, children: paragraphs }],
          creator: "Advanced Think Tank",
          title: title,
        });

        const blob = await Packer.toBlob(doc);
        saveAs(blob, `${slug}-${dateStr}.docx`);
        toast.success("Exported as Word document");
      } catch (_err) {
        toast.error("Failed to generate Word document");
      }
    } else if (format === "pdf") {
      try {
        const { jsPDF } = await import("jspdf");
        const doc = new jsPDF({ unit: "mm", format: "a4" });
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        const maxWidth = pageWidth - margin * 2;
        let y = margin;

        const addText = (
          text: string,
          fontSize: number,
          opts: { bold?: boolean; color?: string; maxY?: number } = {},
        ) => {
          doc.setFontSize(fontSize);
          if (opts.bold) doc.setFont("helvetica", "bold");
          else doc.setFont("helvetica", "normal");
          if (opts.color) doc.setTextColor(opts.color);
          else doc.setTextColor("#1a1a1a");

          const lines = doc.splitTextToSize(text, maxWidth);
          for (const line of lines) {
            if (y > 270) {
              doc.addPage();
              y = margin;
            }
            doc.text(line, margin, y);
            y += fontSize * 0.45;
          }
          y += 2;
        };

        // Header
        addText("Advanced Think Tank — Intelligence Briefing", 9, { color: "#888888" });
        addText(dateStr, 9, { color: "#888888" });
        y += 4;

        // Title
        addText(title, 16, { bold: true });
        y += 2;

        // Synopsis
        if (currentStory.synopsis) {
          doc.setDrawColor("#cc0000");
          doc.line(margin, y, margin, y + 8);
          addText(currentStory.synopsis, 10, { color: "#555555" });
          y += 4;
        }

        // Labels
        if (labels) {
          addText(`Labels: ${labels}`, 8, { color: "#888888" });
          y += 4;
        }

        // Content
        const contentLines = plainContent.split("\n");
        for (const line of contentLines) {
          const trimmed = line.trim();
          if (!trimmed) {
            y += 3;
            continue;
          }
          if (trimmed.startsWith("## ")) {
            y += 4;
            addText(trimmed.replace(/^##\s*/, ""), 12, { bold: true });
          } else if (trimmed.startsWith("### ")) {
            y += 2;
            addText(trimmed.replace(/^###\s*/, ""), 11, { bold: true });
          } else {
            addText(trimmed, 10);
          }
        }

        doc.save(`${slug}-${dateStr}.pdf`);
        toast.success("Exported as PDF");
      } catch (_err) {
        toast.error("Failed to generate PDF");
      }
    } else if (format === "html") {
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:Georgia,serif;max-width:800px;margin:40px auto;padding:0 20px;color:#1a1a1a;line-height:1.7}h1{font-size:1.8em}h2{font-size:1.3em;border-bottom:1px solid #ddd;padding-bottom:4px}blockquote{border-left:3px solid #c00;padding-left:16px;color:#555;margin:16px 0}.label{display:inline-block;padding:2px 8px;border-radius:12px;font-size:0.75em;background:#f0f0f0;margin:2px}.header{color:#888;font-size:0.85em;margin-bottom:24px}</style></head><body><div class="header">Advanced Think Tank — Intelligence Briefing | ${dateStr}</div><h1>${title}</h1><blockquote>${currentStory.synopsis || ""}</blockquote><p><small>${currentStory.source_count} sources</small></p><div>${(currentStory.labels || []).map((l: { text: string }) => `<span class="label">${l.text}</span>`).join(" ")}</div><hr>${content
        .replace(/^## (.*$)/gm, "<h2>$1</h2>")
        .replace(/^### (.*$)/gm, "<h3>$1</h3>")
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\n/g, "<br>")}</body></html>`;
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slug}-${dateStr}.html`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Exported as HTML");
    }
  };

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
              title={t.canvas.undoChange}
            >
              <Undo2 className="size-4" />
            </button>
          )}
          <button
            onClick={() => toggleBookmark(currentStory.id)}
            className={`p-1.5 rounded transition-colors ${bookmarked ? "text-amber-500 bg-amber-50 dark:bg-amber-900/20" : "text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"}`}
            title={t.common.save}
          >
            <Bookmark className="size-4" fill={bookmarked ? "currentColor" : "none"} />
          </button>
          <button
            onClick={() => toggleLike(currentStory.id)}
            className={`p-1.5 rounded transition-colors ${interaction === "like" ? "text-green-600 bg-green-50 dark:bg-green-900/20" : "text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"}`}
            title={t.common.helpful}
          >
            <ThumbsUp className="size-4" fill={interaction === "like" ? "currentColor" : "none"} />
          </button>
          <button
            onClick={() => toggleDislike(currentStory.id)}
            className={`p-1.5 rounded transition-colors ${interaction === "dislike" ? "text-red-500 bg-red-50 dark:bg-red-900/20" : "text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"}`}
            title={t.common.notHelpful}
          >
            <ThumbsDown className="size-4" fill={interaction === "dislike" ? "currentColor" : "none"} />
          </button>
          <div className="relative">
            <button
              onClick={() => setExportOpen(!exportOpen)}
              className="p-1.5 rounded text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              title={t.canvas.exportMenu}
            >
              <Download className="size-4" />
            </button>
            {exportOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setExportOpen(false)} />
                <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg shadow-lg z-20 py-1">
                  <button
                    onClick={() => navigate("/analyst")}
                    className="w-full text-left px-4 py-2 text-sm text-stone-400 cursor-default"
                    title={t.canvas.comingSoon}
                  >
                    {t.canvas.sendToAnalyst}
                  </button>
                  <div className="border-t border-stone-100 dark:border-stone-700 my-0.5" />
                  <button
                    onClick={() => handleExport("email")}
                    className="w-full text-left px-4 py-2 text-sm text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
                  >
                    {t.canvas.emailExport}
                  </button>
                  <button
                    onClick={() => handleExport("docx")}
                    className="w-full text-left px-4 py-2 text-sm text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
                  >
                    {t.canvas.wordExport}
                  </button>
                  <button
                    onClick={() => handleExport("pdf")}
                    className="w-full text-left px-4 py-2 text-sm text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
                  >
                    {t.canvas.pdfExport}
                  </button>
                  <button
                    onClick={() => handleExport("html")}
                    className="w-full text-left px-4 py-2 text-sm text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
                  >
                    {t.canvas.htmlExport}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Story content */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="max-w-2xl mx-auto">
          {/* Title + Labels */}
          <h1 className="text-2xl md:text-3xl font-bold text-stone-900 dark:text-white mb-3 leading-tight">
            {currentStory.title}
          </h1>

          {currentStory.synopsis && (
            <p className="text-base text-stone-500 dark:text-stone-400 mb-4 leading-relaxed">{currentStory.synopsis}</p>
          )}

          <div className="flex items-center justify-between mb-6">
            <StoryLabels labels={currentStory.labels} max={10} />
            <SourceCarousel story={currentStory} />
          </div>

          <DanishImpactCallout story={currentStory} />

          <StoryTimeline entries={currentStory.timeline_entries} locale={locale} />

          {/* Rich story content with citations */}
          <StoryRenderer content={currentContent ?? ""} sourceArticleIds={currentStory.source_article_ids ?? []} />
        </div>
      </div>
    </div>
  );
}

// ─── Source Articles ───
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
      <div className="flex-1 overflow-hidden">{tab === "story" ? <StoryPanel /> : <ChatPanel />}</div>
    </div>
  );
}

// ─── Resizable Divider ───
function ResizeHandle({ onDrag }: { onDrag: (deltaX: number) => void }) {
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const onMouseMove = (ev: MouseEvent) => {
        onDrag(ev.clientX - startX);
      };
      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [onDrag],
  );

  return (
    <div
      onMouseDown={handleMouseDown}
      className="w-1 hover:w-1.5 cursor-col-resize bg-stone-200 dark:bg-stone-800 hover:bg-stone-400 dark:hover:bg-stone-600 transition-colors shrink-0"
    />
  );
}

// ─── Main Canvas Page ───
export function CanvasPage() {
  const { storyId } = useParams<{ storyId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [chatWidth, setChatWidth] = useState(384); // default ~w-96

  const loadStory = useCanvasStore((s) => s.loadStory);
  const loadSession = useCanvasStore((s) => s.loadSession);
  const storyLoading = useCanvasStore((s) => s.storyLoading);
  const storyError = useCanvasStore((s) => s.storyError);
  const currentStory = useCanvasStore((s) => s.currentStory);
  const resetCanvas = useCanvasStore((s) => s.resetCanvas);

  const baseWidth = useRef(chatWidth);
  const handleDrag = useCallback((deltaX: number) => {
    setChatWidth(Math.max(280, Math.min(600, baseWidth.current + deltaX)));
  }, []);

  useEffect(() => {
    baseWidth.current = chatWidth;
  }, [chatWidth]);

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
      {/* Desktop: side-by-side with resizable chat */}
      <div className="hidden md:flex h-full">
        <div className="shrink-0" style={{ width: chatWidth }}>
          <ChatPanel />
        </div>
        <ResizeHandle onDrag={handleDrag} />
        <StoryPanel />
      </div>

      {/* Mobile: tabbed */}
      <div className="md:hidden h-full">
        <MobileCanvas />
      </div>
    </>
  );
}
