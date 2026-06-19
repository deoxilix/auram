import { useTranscriptions } from "../../hooks/useTranscriptions";
import TranscriptView from "./TranscriptView";

/** LiveKit transcript panel: pulls lines from the room and renders them. */
export default function TranscriptPanel() {
  const lines = useTranscriptions();
  return <TranscriptView lines={lines} />;
}
