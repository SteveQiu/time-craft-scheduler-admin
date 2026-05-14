import { Composition, CalculateMetadataFunction, staticFile, registerRoot } from "remotion";
import { getAudioDuration } from "@remotion/media-utils";
import { PremiumProductDemo, PremiumProductDemoProps } from "./templates/premium-product-demo";

const FPS = 30;

/**
 * Calculate composition duration for Premium Product Demo.
 * Measures each scene's audio duration and sets total video length accordingly.
 */
const calculatePremiumMetadata: CalculateMetadataFunction<PremiumProductDemoProps> = async () => {
  const sceneFiles = [
    "audio/premium-product-demo/scene-01-hook.mp3",
    "audio/premium-product-demo/slide-a-features.mp3",
    "audio/premium-product-demo/scene-02-solution.mp3",
    "audio/premium-product-demo/scene-03-benefits.mp3",
    "audio/premium-product-demo/slide-b-stats.mp3",
    "audio/premium-product-demo/slide-c-pricing.mp3",
    "audio/premium-product-demo/scene-04-cta.mp3",
  ];

  try {
    const durations = await Promise.all(
      sceneFiles.map((file) => getAudioDuration(staticFile(file)))
    );

    const sceneDurations = durations.map((durationInSeconds) => {
      return Math.ceil(durationInSeconds * FPS);
    });

    const totalFrames = sceneDurations.reduce((sum, d) => sum + d, 0);

    console.log("Premium Demo - Scene durations (frames):", sceneDurations);
    console.log("Premium Demo - Total duration (frames):", totalFrames);

    return {
      durationInFrames: totalFrames,
      props: { sceneDurations },
    };
  } catch (error) {
    console.warn("Premium audio files not found, using default duration:", error);
    // Fallback: Hook, SlideA, Solution, Benefits, SlideB, SlideC, CTA
    return {
      durationInFrames: 952, // ~31.7 seconds
      props: { sceneDurations: [113, 120, 175, 120, 150, 150, 124] },
    };
  }
};

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="premium-product-demo"
        component={PremiumProductDemo}
        fps={FPS}
        width={1920}
        height={1080}
        calculateMetadata={calculatePremiumMetadata}
        defaultProps={{ sceneDurations: [113, 120, 175, 120, 150, 150, 124] }}
      />
    </>
  );
};

registerRoot(RemotionRoot);
