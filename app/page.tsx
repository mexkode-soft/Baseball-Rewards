import CampaignSection from "@/components/CampaignSection";
import AboutSection from "@/components/AboutSection";
import HeroExperience from "@/components/HeroExperience";
import PromoTicker from "@/components/PromoTicker";
import PublicFooter from "@/components/PublicFooter";
import PublicHeader from "@/components/PublicHeader";

export default function Home() {
  return (
    <>
      <PublicHeader />
      <PromoTicker />

      <main>
        <HeroExperience />
        <CampaignSection />
        <AboutSection />
      </main>

      <PublicFooter />
    </>
  );
}