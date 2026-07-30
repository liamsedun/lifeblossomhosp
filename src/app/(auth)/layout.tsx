export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-primary-lighter px-4 py-12">
      <div className="mb-8 flex flex-col items-center gap-2">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-xl font-bold tracking-tight text-white shadow-md">
          LB
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-primary">
          Life Blossom Hospital
        </h1>
        <p className="text-sm text-text-secondary">
          Care &amp; Cure Hospital
        </p>
      </div>
      {children}
    </div>
  );
}
