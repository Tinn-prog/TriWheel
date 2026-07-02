type ShadowedStreetBackgroundProps = {
  priority?: boolean;
};

export function ShadowedStreetBackground({
  priority: _priority = false,
}: ShadowedStreetBackgroundProps) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0 bg-[#6b1d1d] bg-cover bg-center brightness-[0.72] contrast-110 saturate-[0.45]"
        style={{ backgroundImage: "url(/triwheel-street-bg.png)" }}
      />
      <div className="absolute inset-0 bg-red-800/75 mix-blend-multiply" />
      <div className="absolute inset-0 bg-red-950/40" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(185,28,28,0.12)_0%,_rgba(69,10,10,0.82)_72%,_rgba(20,0,0,0.95)_100%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/15 to-black/80" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/50" />
    </div>
  );
}
