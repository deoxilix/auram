import { useState, useRef } from "react";
import DocumentCard from "../components/DocumentCard";
import { useDocuments, useCreateDocument, useUploadDocument } from "../hooks/useDocuments";

type Mode = "file" | "url" | "text";

export default function UploadPage() {
  const [mode, setMode] = useState<Mode>("file");
  const [value, setValue] = useState("");
  const [title, setTitle] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const createDoc = useCreateDocument();
  const uploadDoc = useUploadDocument();
  const { data: documents, isLoading } = useDocuments();
  const busy = createDoc.isPending || uploadDoc.isPending;

  const reset = () => {
    setValue("");
    setTitle("");
  };

  const submitTextOrUrl = () => {
    if (!value.trim()) return;
    createDoc.mutate(
      { type: mode === "url" ? "url" : "text", source: value, title: title || undefined },
      { onSuccess: reset },
    );
  };

  const submitFile = (file: File) => {
    uploadDoc.mutate({ file, title: title || undefined }, { onSuccess: reset });
  };

  return (
    <div className="space-y-8">
      {/* Create New Podcast Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-card">
        <h1 className="mb-1 text-2xl font-bold text-[#0b1c30]">Create New Podcast</h1>
        <p className="mb-6 text-sm text-[#565e74]">
          Upload a document, paste a URL, or enter text to turn into a conversational podcast.
        </p>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-lg bg-surface p-1">
          {(["file", "url", "text"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={
                "flex-1 rounded-md px-4 py-2 text-sm font-medium transition " +
                (mode === m
                  ? "bg-white text-brand-500 shadow-sm"
                  : "text-[#565e74] hover:text-[#0b1c30]")
              }
            >
              {m === "file" ? "File Upload" : m === "url" ? "URL" : "Text"}
            </button>
          ))}
        </div>

        {/* File upload zone */}
        {mode === "file" && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) submitFile(file);
            }}
            onClick={() => fileInput.current?.click()}
            className={
              "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-16 transition " +
              (dragging
                ? "border-brand-400 bg-brand-50"
                : "border-slate-300 bg-surface hover:border-brand-300 hover:bg-brand-50/50")
            }
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white shadow-sm">
              <span className="text-2xl text-brand-400">↑</span>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-[#0b1c30]">
                Drag & drop PDF, TXT, MD, DOCX
              </p>
              <p className="mt-1 text-xs text-[#565e74]">
                or <span className="text-brand-500 underline">browse files</span>
              </p>
            </div>
            <p className="text-xs text-slate-400">Max 50MB</p>
            <input
              ref={fileInput}
              type="file"
              accept=".pdf,.txt,.md,.docx,application/pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) submitFile(file);
              }}
            />
          </div>
        )}

        {/* URL input */}
        {mode === "url" && (
          <div className="space-y-3">
            <input
              className="w-full rounded-xl border border-slate-200 bg-surface px-4 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-50"
              placeholder="https://example.com/article"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
        )}

        {/* Text input */}
        {mode === "text" && (
          <div className="space-y-3">
            <textarea
              className="h-32 w-full rounded-xl border border-slate-200 bg-surface px-4 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-50"
              placeholder="Paste text content here…"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
        )}

        {/* Title + Generate */}
        <div className="mt-4 space-y-3">
          <input
            className="w-full rounded-xl border border-slate-200 bg-surface px-4 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-50"
            placeholder="Title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <button
            disabled={busy || (mode !== "file" && !value.trim())}
            onClick={submitTextOrUrl}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-400 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-500 active:scale-[0.98] disabled:opacity-40"
          >
            <span>✦</span>
            {busy ? "Processing…" : "Generate Podcast"}
          </button>
        </div>

        {createDoc.error && (
          <p className="mt-3 text-sm text-rose-600">
            {(createDoc.error as Error).message || "Something went wrong"}
          </p>
        )}
      </div>

      {/* Process Timeline */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-card">
        <h2 className="mb-4 text-xs font-semibold text-[#565e74] uppercase tracking-wide">How it works</h2>
        <div className="flex items-center justify-between">
          {[
            { icon: "📄", label: "Extract" },
            { icon: "🧹", label: "Clean" },
            { icon: "⬛", label: "Chunk" },
            { icon: "</>", label: "Embed" },
            { icon: "📝", label: "Script" },
            { icon: "🔊", label: "Audio" },
            { icon: "🔔", label: "Notify" },
          ].map((step, i) => (
            <div key={step.label} className="flex flex-col items-center gap-1.5">
              <div className={
                "flex h-10 w-10 items-center justify-center rounded-xl text-sm font-medium " +
                (i === 0
                  ? "bg-brand-400 text-white"
                  : "bg-surface text-slate-400")
              }>
                {step.icon}
              </div>
              <span className="text-xs font-medium text-slate-500">{step.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Documents */}
      <div>
        <h2 className="mb-4 text-lg font-bold text-[#0b1c30]">Your documents</h2>
        {isLoading && <p className="text-sm text-slate-500">Loading…</p>}
        {documents && documents.length === 0 && (
          <p className="text-sm text-slate-500">No documents yet. Upload something above.</p>
        )}
        <div className="space-y-3">
          {documents?.map((doc) => (
            <DocumentCard key={doc.id} doc={doc} />
          ))}
        </div>
      </div>
    </div>
  );
}
