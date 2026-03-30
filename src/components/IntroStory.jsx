export function IntroStory() {
  return (
    <section className="relative overflow-hidden bg-bg py-32 md:py-44 lg:py-56">
      {/* Glow suave de fondo */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[140px]" />
      </div>

      <div className="relative mx-auto flex w-full max-w-[1400px] flex-col items-center px-6 text-center md:px-12 lg:px-20">

        <h2 className="max-w-4xl text-4xl font-semibold tracking-[-0.04em] text-text md:text-6xl lg:text-7xl">
          Diseñando experiencias
          <span className="block text-primary-soft">de otro planeta</span>
        </h2>

        <p className="mt-8 max-w-2xl text-sm leading-relaxed text-text-muted md:text-base">
          Desarrollo interfaces y experiencias interactivas donde el diseño,
          el frontend y el 3D trabajan juntos para construir algo más inmersivo,
          visual y memorable.
        </p>
      </div>
    </section>
  );
}