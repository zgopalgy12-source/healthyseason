import Link from "next/link";
import { Brand } from "@/components/brand";
import { AppNav } from "@/components/app-nav";
import { requireAccount } from "@/lib/auth";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  await requireAccount();
  return <>
    <header className="site-header"><div className="shell header-inner">
      <Brand /><nav aria-label="Conta"><Link className="button button-secondary" href="/perfil">Perfil</Link></nav>
    </div></header>
    <main className="shell account-main">{children}</main>
    <AppNav />
  </>;
}
