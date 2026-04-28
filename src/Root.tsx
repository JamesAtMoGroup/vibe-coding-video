import React from "react";
import { Composition } from "remotion";
import { Video30s } from "./Video30s";
import { Intro2s } from "./Intro2s";
import { FullVideo, TOTAL_FRAMES } from "./FullVideo";
import { FullVideo02, TOTAL_FRAMES_02 } from "./FullVideo02";
import { FullVideo03, TOTAL_FRAMES_03 } from "./FullVideo03";
import { FullVideo04, TOTAL_FRAMES_04 } from "./FullVideo04";
import { FullVideo05, TOTAL_FRAMES_05 } from "./FullVideo05";
import { FullVideo06, TOTAL_FRAMES_06 } from "./FullVideo06";
import { FullVideo07, TOTAL_FRAMES_07 } from "./FullVideo07";
import { FullVideo08, TOTAL_FRAMES_08 } from "./FullVideo08";

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
      {/* CH 0-3 完整影片 — 20 個音頻段落 (~22.8 分鐘) */}
      <Composition
        id="FullVideo03"
        component={FullVideo03}
        fps={FPS}
        durationInFrames={TOTAL_FRAMES_03}
        width={3840}
        height={2160}
      />
      {/* CH 1-1 完整影片 — 11 個音頻段落 (~13.7 分鐘) */}
      <Composition
        id="FullVideo04"
        component={FullVideo04}
        fps={FPS}
        durationInFrames={TOTAL_FRAMES_04}
        width={3840}
        height={2160}
      />
      {/* CH 1-2 完整影片 — 12 個音頻段落 (~14.3 分鐘) */}
      <Composition
        id="FullVideo05"
        component={FullVideo05}
        fps={FPS}
        durationInFrames={TOTAL_FRAMES_05}
        width={3840}
        height={2160}
      />
      {/* CH 1-3 完整影片 — 9 個音頻段落 (~16 分鐘) */}
      <Composition
        id="FullVideo06"
        component={FullVideo06}
        fps={FPS}
        durationInFrames={TOTAL_FRAMES_06}
        width={3840}
        height={2160}
      />
      {/* CH 1-4 完整影片 — 11 個音頻段落 (~13.9 分鐘) */}
      <Composition
        id="FullVideo07"
        component={FullVideo07}
        fps={FPS}
        durationInFrames={TOTAL_FRAMES_07}
        width={3840}
        height={2160}
      />
      {/* CH 2-1 完整影片 — 6 個音頻段落 (~10.4 分鐘) */}
      <Composition
        id="FullVideo08"
        component={FullVideo08}
        fps={FPS}
        durationInFrames={TOTAL_FRAMES_08}
        width={3840}
        height={2160}
      />
    </>
  );
};
