/**
 * ReportViewer — modal overlay displaying a Claude-generated intelligence report.
 *
 * Renders markdown content from the Aether report generation endpoint.
 * Shown when the user clicks "Generate Report" in MetricStrip.
 */

import { X, FileText, Download } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface ReportViewerProps {
  /** Markdown report content. */
  content: string;
  /** Associated simulation run ID. */
  runId: string;
  /** Close handler. */
  onClose: () => void;
}

export function ReportViewer({ content, runId, onClose }: ReportViewerProps) {
  const handleDownload = () => {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aether-report-${runId.slice(0, 8)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-stone-900 rounded-lg shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col m-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-700 shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="size-5 text-[#E30613]" />
            <h2 className="text-sm font-bold text-stone-900 dark:text-white">
              Intelligence Report
            </h2>
            <span className="text-[10px] text-stone-400 font-mono">
              {runId.slice(0, 8)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="p-1.5 rounded hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 transition-colors"
              title="Download as Markdown"
            >
              <Download className="size-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Report content */}
        <div className="overflow-y-auto px-6 py-5 flex-1">
          <article className="prose prose-sm dark:prose-invert prose-stone max-w-none prose-headings:text-stone-900 dark:prose-headings:text-white prose-strong:text-stone-900 dark:prose-strong:text-white">
            <ReactMarkdown>{content}</ReactMarkdown>
          </article>
        </div>
      </div>
    </div>
  );
}
