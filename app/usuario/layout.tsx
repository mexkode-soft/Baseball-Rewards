import AdminGuard from "@/components/AdminGuard";
import AdminShell from "@/components/AdminShell";

interface UserLayoutProps {
  children: React.ReactNode;
}

export default function UserLayout({
  children,
}: UserLayoutProps) {
  return (
    <AdminGuard requiredRole="usuario">
      <AdminShell>
        {children}
      </AdminShell>
    </AdminGuard>
  );
}
