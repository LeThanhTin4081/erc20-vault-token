import type { CSSProperties } from "react";
import type { StarPoint } from "./types";

function StarLayer({
  layer,
  stars,
}: {
  layer: "far" | "mid" | "near";
  stars: StarPoint[];
}) {
  return (
    <>
      {stars.map((star, index) => (
        <span
          key={`${layer}-${star.left}-${star.top}-${index}`}
          className={`home-star home-star--${layer}`}
          style={
            {
              left: `${star.left}%`,
              top: `${star.top}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              animationDelay: `${star.delay}s`,
              animationDuration: `${star.duration}s`,
              "--dx": `${star.dx}vw`,
              "--dy": `${star.dy}vh`,
            } as CSSProperties
          }
        />
      ))}
    </>
  );
}

export function AppBackdrop({
  farStars,
  midStars,
  nearStars,
}: {
  farStars: StarPoint[];
  midStars: StarPoint[];
  nearStars: StarPoint[];
}) {
  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-0 bg-black" />
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <StarLayer layer="far" stars={farStars} />
        <StarLayer layer="mid" stars={midStars} />
        <StarLayer layer="near" stars={nearStars} />
      </div>
    </>
  );
}

export function AppLoader() {
  return (
    <div className="app-loader fixed inset-0 z-50 flex items-center justify-center bg-black/92 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-5">
        <div className="app-loader__orb" />
        <div className="text-center">
          <p className="text-sm font-semibold text-violet-100">
            Loading VaultToken
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Preparing interface...
          </p>
        </div>
      </div>
    </div>
  );
}
