import SponsorGuard from "@/components/SponsorGuard";
import SponsorShell from "@/components/SponsorShell";
export default function Layout({children}:{children:React.ReactNode}){return <SponsorGuard><SponsorShell>{children}</SponsorShell></SponsorGuard>}
