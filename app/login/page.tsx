import { AuthPage } from "@/components/auth-page";

export const metadata = { title: "Entrar" };

export default function Login({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  return <AuthPage register={false} searchParams={searchParams} />;
}
