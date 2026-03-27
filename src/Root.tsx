import React from "react";
import { Composition } from "remotion";
import { Video30s } from "./Video30s";
import { Intro2s } from "./Intro2s";

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
      {/* 課程開場 — 30 秒 */}
      <Composition
        id="Video30s"
        component={Video30s}
        fps={FPS}
        durationInFrames={FPS * 30}
        width={1920}
        height={1080}
      />
    </>
  );
};
