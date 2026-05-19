import {
  AbsoluteFill,
  Sequence,
  Audio,
  staticFile,
  useVideoConfig,
} from "remotion";
import React from "react";
import { Step1Opening } from "./scenes/Step1Opening";
import { Step2Booking } from "./scenes/Step2Booking";
import { Step3Confirm } from "./scenes/Step3Confirm";
import { Step4Complete } from "./scenes/Step4Complete";

/**
 * PikAppoint Demo Video
 *
 * Full end-to-end booking flow demonstration:
 * 1. Provider creates opening
 * 2. Customer books opening
 * 3. Provider confirms reservation
 * 4. Provider completes reservation
 *
 * Duration: ~90-120 seconds (auto-sized from TTS audio)
 * Resolution: 1280×720 @ 30fps
 */

export interface DemoVideoProps {
  sceneDurations: number[];
}

export const DemoVideo: React.FC<DemoVideoProps> = ({ sceneDurations }) => {
  const { fps } = useVideoConfig();

  // Default durations if audio not available (15s per step)
  const [
    step1aDuration = fps * 15,
    step1bDuration = fps * 15,
    step2aDuration = fps * 15,
    step2bDuration = fps * 15,
    step3Duration = fps * 15,
    step4aDuration = fps * 15,
    step4bDuration = fps * 15,
  ] = sceneDurations;

  const step1Duration = step1aDuration + step1bDuration;
  const step2Duration = step2aDuration + step2bDuration;
  const step4Duration = step4aDuration + step4bDuration;

  // Calculate cumulative frame offsets
  let offset = 0;
  const step1Start = offset;
  offset += step1Duration;
  const step2Start = offset;
  offset += step2Duration;
  const step3Start = offset;
  offset += step3Duration;
  const step4Start = offset;

  return (
    <AbsoluteFill style={{ background: "#0f172a" }}>
      {/* Step 1: Provider creates opening (2 audio segments) */}
      <Sequence from={step1Start} durationInFrames={step1Duration}>
        <Step1Opening durationInFrames={step1Duration} />
        <Sequence from={0} durationInFrames={step1aDuration}>
          <Audio src={staticFile("demo/audio/scene1a.wav")} />
        </Sequence>
        <Sequence from={step1aDuration}>
          <Audio src={staticFile("demo/audio/scene1b.wav")} />
        </Sequence>
      </Sequence>

      {/* Step 2: Customer books opening (2 audio segments) */}
      <Sequence from={step2Start} durationInFrames={step2Duration}>
        <Step2Booking durationInFrames={step2Duration} />
        <Sequence from={0} durationInFrames={step2aDuration}>
          <Audio src={staticFile("demo/audio/scene2a.wav")} />
        </Sequence>
        <Sequence from={step2aDuration}>
          <Audio src={staticFile("demo/audio/scene2b.wav")} />
        </Sequence>
      </Sequence>

      {/* Step 3: Provider confirms reservation */}
      <Sequence from={step3Start} durationInFrames={step3Duration}>
        <Step3Confirm durationInFrames={step3Duration} />
        <Audio src={staticFile("demo/audio/scene3.wav")} />
      </Sequence>

      {/* Step 4: Provider completes reservation (2 audio segments) */}
      <Sequence from={step4Start} durationInFrames={step4Duration}>
        <Step4Complete durationInFrames={step4Duration} />
        <Sequence from={0} durationInFrames={step4aDuration}>
          <Audio src={staticFile("demo/audio/scene4a.wav")} />
        </Sequence>
        <Sequence from={step4aDuration}>
          <Audio src={staticFile("demo/audio/scene4b.wav")} />
        </Sequence>
      </Sequence>
    </AbsoluteFill>
  );
};
