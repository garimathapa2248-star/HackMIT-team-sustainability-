import { useEffect, useRef } from "react";
import type { AnimationItem } from "lottie-web";
import lottie from "lottie-web/build/player/lottie_light";

/**
 * Shows a Lordicon / Lottie file as a still image: its last frame, fully drawn.
 * It never plays: no autoplay, no hover, no replay.
 */
export default function StillIcon({ data, className }: { data: object; className?: string }) {
  const box = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!box.current) return;
    const item: AnimationItem = lottie.loadAnimation({
      container: box.current,
      renderer: "svg",
      loop: false,
      autoplay: false,
      // lottie mutates the data it is given, so hand it a copy (React StrictMode mounts twice in dev)
      animationData: JSON.parse(JSON.stringify(data)),
      rendererSettings: { preserveAspectRatio: "xMidYMid meet" },
    });
    item.goToAndStop(item.totalFrames - 1, true);
    return () => item.destroy();
  }, [data]);

  return <span className={className} ref={box} aria-hidden />;
}
