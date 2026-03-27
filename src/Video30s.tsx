import React from "react";
import { AbsoluteFill, Audio, staticFile } from "remotion";
import { Opening } from "./Opening";

// First 30 seconds of the course — opening hero with audio
export const Video30s: React.FC = () => {
  return (
    <AbsoluteFill>
      <Opening />
      {/* 講者聲音 — normalized to -16 LUFS */}
      <Audio src={staticFile("audio/0-1_1.1_studio.wav")} volume={1.0} />
      {/* 背景音樂 */}
      <Audio src={staticFile("audio/course_background_music.wav")} volume={0.10} />
    </AbsoluteFill>
  );
};
