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
  const [provider, setProvider] = useState("vapi");
  const { data: manifest } = useAudioManifest(id, audioRequested);
  const generateAudio = useGenerateAudio();

  if (isLoading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (!podcast)
    return (
      <p className="text-sm text-slate-500">
        Podcast not found.{" "}
        <Link to="/library" className="text-brand-500 underline">
          Back to library
        </Link>
      </p>
    );

  const onGenerateAudio = () => {
    setAudioRequested(true);
    generateAudio.mutate(podcast.id);
  };

  const speakerName = (id: string) =>
    podcast.speakers.find((s) => s.id === id)?.name ?? id;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link to="/library" className="text-sm text-brand-500 underline hover:text-brand-600">
            ← Library
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-[#0b1c30]">{podcast.title}</h1>
          <div className="mt-1 flex items-center gap-3 text-sm text-[#565e74]">
            <StatusBadge status={podcast.status} />
            {podcast.estimated_duration_sec > 0 && (
              <span>~{Math.round(podcast.estimated_duration_sec / 60)} min</span>
            )}
            <span>{podcast.speakers.filter((s) => !s.is_user).length} hosts</span>
          </div>
          {podcast.overview && (
            <p className="mt-3 text-sm text-slate-600 max-w-2xl">{podcast.overview}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <select
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-[#565e74] outline-none"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
          >
            <option value="vapi">Vapi</option>
            <option value="livekit">LiveKit</option>
          </select>
          <button
            className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 active:scale-[0.98] disabled:opacity-40"
            disabled={podcast.status !== "ready"}
            onClick={() => navigate(`/podcasts/${podcast.id}/live?provider=${provider}`)}
          >
            <span>▶</span>
            Go Live
          </button>
        </div>
      </div>

      {/* Audio generation */}
      {!manifest?.ready && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-card">
          <p className="mb-3 text-sm font-medium text-[#0b1c30]">
            Audio not yet generated
          </p>
          <button
            className="rounded-lg bg-brand-400 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-500 active:scale-[0.98] disabled:opacity-50"
            disabled={audioRequested && !manifest}
            onClick={onGenerateAudio}
          >
            {audioRequested ? "Synthesizing audio…" : "Generate audio"}
          </button>
          {manifest && !manifest.ready && (
            <span className="ml-3 text-sm text-[#565e74]">
              {manifest.segments.filter((s) => s.ready).length} /{" "}
              {manifest.segments.length} segments ready
            </span>
          )}
        </div>
      )}

      {/* Audio player */}
      {manifest?.ready && podcast && (
        <AudioPlayer podcast={podcast} manifest={manifest} />
      )}

      {/* Segment transcript */}
      {!manifest?.ready && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-[#0b1c30]">Script</h2>
          {podcast.segments.map((seg) => (
            <div
              key={seg.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-card"
            >
              <span className="mr-2 text-sm font-semibold text-brand-500">
                {speakerName(seg.speaker_id)}:
              </span>
              <span className="text-sm text-slate-700">{seg.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
