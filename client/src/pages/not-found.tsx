import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0a0a0f, #12121a)' }}>
      <div
        className="w-full max-w-md mx-4 p-8 border border-white/[0.06] bg-ink-dark/60 text-center"
        style={{ clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))' }}
      >
        <div className="flex items-center justify-center gap-3 mb-4">
          <AlertCircle className="h-8 w-8 text-[#ff2d7b]" />
          <h1 className="text-2xl font-display text-white">404</h1>
        </div>
        <p className="text-sm font-tech text-white/40 uppercase tracking-wider">
          Page Not Found
        </p>
        <p className="mt-4 text-xs font-tech text-white/25">
          Did you forget to add the page to the router?
        </p>
      </div>
    </div>
  );
}
