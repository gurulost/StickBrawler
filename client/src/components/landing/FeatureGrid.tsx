import { landingFeatureCards } from "../../data/landingContent";

const accentColors = ['#00f0ff', '#ff2d7b', '#39ff14', '#b347ff'];

export function FeatureGrid() {
  return (
    <section className="grid gap-4 md:grid-cols-2">
      {landingFeatureCards.map((feature, index) => {
        const accent = accentColors[index % accentColors.length];
        return (
          <div
            key={feature.title}
            className="relative overflow-hidden noise-overlay group animate-[slideUp_0.5s_ease-out_both]"
            style={{
              background: 'linear-gradient(135deg, rgba(26, 26, 46, 0.6), rgba(10, 10, 15, 0.9))',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))',
              padding: '1.25rem',
              animationDelay: `${index * 0.1}s`,
            }}
          >
            {/* Top accent line */}
            <div
              className="absolute top-0 left-0 right-4 h-[2px] transition-all duration-500 group-hover:right-0"
              style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }}
            />

            <div className="relative z-10">
              <div className="flex items-center gap-3">
                <div
                  className="clip-angular-sm p-2.5"
                  style={{
                    background: `${accent}10`,
                    border: `1px solid ${accent}20`,
                    color: accent,
                  }}
                >
                  <feature.icon className="h-5 w-5" />
                </div>
                <div>
                  <p
                    className="text-[9px] font-tech font-bold uppercase tracking-[0.3em]"
                    style={{ color: accent }}
                  >
                    {feature.accent}
                  </p>
                  <h3 className="text-lg font-tech font-bold text-white">{feature.title}</h3>
                </div>
              </div>
              <p className="mt-3 text-xs text-white/55 leading-relaxed">{feature.description}</p>
              <div
                className="mt-4 overflow-hidden border border-white/[0.03]"
                style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))' }}
              >
                {feature.image ? (
                  <img
                    src={feature.image}
                    alt={feature.title}
                    className="h-36 w-full object-cover opacity-60 transition-opacity group-hover:opacity-80"
                  />
                ) : (
                  <div className="flex h-36 items-center justify-center text-white/20 font-tech text-xs uppercase tracking-widest">Coming soon</div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
