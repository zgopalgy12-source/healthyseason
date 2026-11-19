import { requireAccount } from "@/lib/auth";
import { signOut } from "./actions";
import { ProfileForm } from "./profile-form";

export const metadata = { title: "Perfil" };

export default async function Profile({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { id, email, supabase } = await requireAccount();
  const [{ data, error }, query] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", id).maybeSingle(),
    searchParams,
  ]);

  return <section className="card account-card">
    <h1>O meu perfil</h1>
    <p>Consulte e atualize os dados da sua conta.</p>
    {error
      ? <p className="notice" role="alert">Não foi possível carregar o perfil. Atualize a página e tente novamente.</p>
      : <ProfileForm name={data?.full_name ?? ""} email={email ?? ""} />}
    {query.erro === "sair" && <p className="notice" role="alert">Não foi possível terminar a sessão. Tente novamente.</p>}
    <form className="sign-out" action={signOut}><button className="button button-secondary">Terminar sessão</button></form>
  </section>;
}
