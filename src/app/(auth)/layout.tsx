import Logo from "@/components/ui/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12"
      style={{
        background: "radial-gradient(ellipse at 50% 40%, #12203050, transparent 60%), #0c1420",
      }}
    >
      <div className="mb-10 flex flex-col items-center gap-2">
        <Logo
          variant="full"
          iconSize={56}
          textClass="text-2xl font-bold !text-[#eef1f5]"
          subtitleClass="text-sm text-[#8fa0b3]"
        />
      </div>
      {children}
    </div>
  );
}
