import { useRef, useState } from "react";
import { useCreateDocument, useUploadDocument } from "../hooks/useDocuments";

type Mode = "url" | "text" | "pdf";

export default function UploadZone() {
  const [mode, setMode] = useState<Mode>("url");
  const [value, setValue] = useState("");
  const [title, setTitle] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const createDoc = useCreateDocument();
  const uploadDoc = useUploadDocument();
  const busy = createDoc.isPending || uploadDoc.isPending;
  const error = createDoc.error || uploadDoc.error;

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

  const tabClass = (m: Mode) =>
    "px-3 py-1.5 rounded-md text-sm font-medium " +
    (mode === m ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600");

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="mb-4 flex gap-2">
        <button className={tabClass("url")} onClick={() => setMode("url")}>
          URL
        </button>
        <button className={tabClass("text")} onClick={() => setMode("text")}>
          Text
        </button>
        <button className={tabClass("pdf")} onClick={() => setMode("pdf")}>
          PDF
        </button>
      </div>

      <input
        className="mb-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        placeholder="Title (optional)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      {mode === "url" && (
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="https://example.com/article"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <button
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            disabled={busy}
            onClick={submitTextOrUrl}
          >
            Ingest
          </button>
        </div>
      )}

      {mode === "text" && (
        <div>
          <textarea
            className="mb-2 h-40 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Paste text content here…"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <button
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            disabled={busy}
            onClick={submitTextOrUrl}
          >
            Ingest
          </button>
        </div>
      )}

      {mode === "pdf" && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) submitFile(file);
          }}
          onClick={() => fileInput.current?.click()}
          className={
            "flex h-40 cursor-pointer items-center justify-center rounded-md border-2 border-dashed text-sm " +
            (dragging ? "border-brand-600 bg-brand-50" : "border-slate-300 text-slate-500")
          }
        >
          {busy ? "Uploading…" : "Drop a PDF here, or click to browse"}
          <input
            ref={fileInput}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) submitFile(file);
            }}
          />
        </div>
      )}

      {error && (
        <p className="mt-3 text-sm text-rose-600">
          {(error as Error).message || "Something went wrong"}
        </p>
      )}
    </div>
  );
}
