import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AudioPlayer from "../components/AudioPlayer";
import StatusBadge from "../components/StatusBadge";
import {
  useAudioManifest,
  useGenerateAudio,
  usePodcast,
} from "../hooks/usePodcasts";

export default function PlayerPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: podcast, isLoading } = usePodcast(id);
  const [audioRequested, setAudioRequested] = useState(false);
  const { data: manifest } = useAudioManifest(id, audioRequested);
  const generateAudio = useGenerateAudio();

  if (isLoading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (!podcast)
    return (
      <p className="text-sm text-slate-500">
        Podcast not found.{" "}
        <Link to="/library" className="text-brand-600 underline">
          Back to library
        </Link>
      </p>
    );

  const onGenerateAudio = () => {
    setAudioRequested(true);
    generateAudio.mutate(podcast.id);
  };

  return (
    <div>
      <Link to="/library" className="text-sm text-brand-600 underline">
        ← Library
      </Link>
      <div className="mb-2 mt-2 flex items-center gap-3">
        <h1 className="text-2xl font-bold">{podcast.title}</h1>
        <StatusBadge status={podcast.status} />
        <button
          className="ml-auto rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          disabled={podcast.status !== "ready"}
          onClick={() => navigate(`/podcasts/${podcast.id}/live`)}
        >
          Go Live
        </button>
      </div>
      <p className="mb-6 text-sm text-slate-600">{podcast.overview}</p>

      {!manifest?.ready && (
        <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
          <button
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            disabled={audioRequested && !manifest}
            onClick={onGenerateAudio}
          >
            {audioRequested ? "Synthesizing audio…" : "Generate audio"}
          </button>
          {manifest && !manifest.ready && (
            <span className="ml-3 text-sm text-slate-500">
              {manifest.segments.filter((s) => s.ready).length} /{" "}
              {manifest.segments.length} segments ready
            </span>
          )}
        </div>
      )}

      {manifest?.ready ? (
        <AudioPlayer podcast={podcast} manifest={manifest} />
      ) : (
        <div className="space-y-2">
          {podcast.segments.map((seg) => (
            <div
              key={seg.id}
              className="rounded-lg border border-slate-200 bg-white p-3 text-sm"
            >
              <span className="mr-2 font-semibold text-brand-700">
                {podcast.speakers.find((s) => s.id === seg.speaker_id)?.name ??
                  seg.speaker_id}
                :
              </span>
              <span className="text-slate-700">{seg.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
