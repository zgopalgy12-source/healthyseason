import { AuthPage } from "@/components/auth-page";

export const metadata = { title: "Criar conta" };

export default function Register({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  return <AuthPage register searchParams={searchParams} />;
}
