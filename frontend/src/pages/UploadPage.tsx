import UploadZone from "../components/UploadZone";
import DocumentCard from "../components/DocumentCard";
import { useDocuments } from "../hooks/useDocuments";

export default function UploadPage() {
  const { data: documents, isLoading } = useDocuments();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-1 text-2xl font-bold">Add content</h1>
        <p className="mb-4 text-sm text-slate-500">
          Ingest a URL, paste text, or upload a PDF to turn it into a podcast.
        </p>
        <UploadZone />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Your documents</h2>
        {isLoading && <p className="text-sm text-slate-500">Loading…</p>}
        {documents && documents.length === 0 && (
          <p className="text-sm text-slate-500">No documents yet.</p>
        )}
        <div className="space-y-2">
          {documents?.map((doc) => (
            <DocumentCard key={doc.id} doc={doc} />
          ))}
        </div>
      </div>
    </div>
  );
}
