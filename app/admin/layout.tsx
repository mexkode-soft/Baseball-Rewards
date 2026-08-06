import AdminGuard from "@/components/AdminGuard";
import AdminShell from "@/components/AdminShell";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({
  children,
}: AdminLayoutProps) {
  return (
    <AdminGuard requiredRole="admin">
      <AdminShell rolDelPanel="admin">
        {children}
      </AdminShell>
    </AdminGuard>
  );
}
