import Image from "next/image";
import LoginForm from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <main className="login-page">
      <section className="login-brand-panel">
        <div className="login-brand-content">
          <Image src="/home-run-rewards-logo.jpg" alt="Home Run Rewards" width={500} height={340} priority />
          <p>La pasión se vive.<br />La participación se recompensa.</p>
        </div>
      </section>
      <section className="login-form-panel"><LoginForm /></section>
    </main>
  );
}
