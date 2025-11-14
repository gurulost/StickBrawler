import { landingFeatureCards } from "../../data/landingContent";

export function FeatureGrid() {
  return (
    <section className="grid gap-6 md:grid-cols-2">
      {landingFeatureCards.map((feature) => (
        <div
          key={feature.title}
          className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white shadow-[0_10px_60px_rgba(0,0,0,0.35)] backdrop-blur"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white/10 p-3 text-indigo-100">
              <feature.icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-200">
                {feature.accent}
              </p>
              <h3 className="text-2xl font-bold">{feature.title}</h3>
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-200/80">{feature.description}</p>
          <div className="mt-4 overflow-hidden rounded-xl border border-white/5 bg-black/30">
            {feature.image ? (
              <img
                src={feature.image}
                alt={feature.title}
                className="h-40 w-full object-cover opacity-90"
              />
            ) : (
              <div className="flex h-40 items-center justify-center text-white/30">Coming soon</div>
            )}
          </div>
        </div>
      ))}
    </section>
  );
}
