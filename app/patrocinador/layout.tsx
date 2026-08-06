import SponsorGuard from "@/components/SponsorGuard";
import AdminShell from "@/components/AdminShell";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SponsorGuard>
      <AdminShell rolDelPanel="sponsor">{children}</AdminShell>
    </SponsorGuard>
  );
}
