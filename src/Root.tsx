import React from "react";
import { Composition } from "remotion";
import { Video30s } from "./Video30s";
import { Intro2s } from "./Intro2s";
import { FullVideo, TOTAL_FRAMES } from "./FullVideo";
import { FullVideo02, TOTAL_FRAMES_02 } from "./FullVideo02";

const FPS = 30;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* 品牌片頭 — 3.5 秒 4K */}
      <Composition
        id="Intro2s"
        component={Intro2s}
        fps={FPS}
        durationInFrames={120}
        width={3840}
        height={2160}
      />
      {/* 課程開場 — 30 秒 sample */}
      <Composition
        id="Video30s"
        component={Video30s}
        fps={FPS}
        durationInFrames={FPS * 30}
        width={1920}
        height={1080}
      />
      {/* CH 0-1 完整影片 — 14 個音頻段落 (~15.2 分鐘) */}
      <Composition
        id="FullVideo"
        component={FullVideo}
        fps={FPS}
        durationInFrames={TOTAL_FRAMES}
        width={1920}
        height={1080}
      />
      {/* CH 0-2 完整影片 — 11 個音頻段落 (~8 分鐘) */}
      <Composition
        id="FullVideo02"
        component={FullVideo02}
        fps={FPS}
        durationInFrames={TOTAL_FRAMES_02}
        width={1920}
        height={1080}
      />
    </>
  );
};
