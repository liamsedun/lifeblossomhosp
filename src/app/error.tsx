"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-5 text-center">
      <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-2xl bg-danger-light text-4xl font-bold text-danger">
        !
      </div>
      <h1 className="mt-6 text-3xl font-bold text-[#1F2D3D]">Something Went Wrong</h1>
      <p className="mt-3 max-w-md text-[#6B7A90] leading-relaxed">
        An unexpected error occurred. Please try again or contact us if the
        problem persists.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <button
          onClick={reset}
          className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary-light active:scale-[0.97]"
        >
          Try Again
        </button>
        <a
          href="/"
          className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-[#1F2D3D] card-shadow transition-all hover:card-shadow-hover active:scale-[0.97]"
        >
          Go Home
        </a>
      </div>
    </div>
  );
}
