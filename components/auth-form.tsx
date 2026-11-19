"use client";

import { useState, type FormEvent } from "react";
import { hasSupabase } from "@/lib/supabase/config";
import { browserClient } from "@/lib/supabase/browser";

function authError(code: string | undefined, register: boolean) {
  switch (code) {
    case "invalid_credentials": return "O email ou a palavra-passe estão incorretos.";
    case "email_not_confirmed": return "Confirme o email antes de entrar.";
    case "email_address_invalid": return "Introduza um endereço de email válido.";
    case "weak_password": return "Escolha uma palavra-passe mais forte.";
    case "user_already_exists": return "Já existe uma conta associada a este email.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit": return "Foram feitas demasiadas tentativas. Aguarde um pouco e tente novamente.";
    default: return register ? "Não foi possível criar a conta. Tente novamente." : "Não foi possível entrar. Tente novamente.";
  }
}

export function AuthForm({ register, callbackFailed }: { register: boolean; callbackFailed: boolean }) {
  const [busy, setBusy] = useState<"email" | "google" | null>(null);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState(callbackFailed ? "Não foi possível concluir a autenticação. O link pode ter expirado. Tente novamente." : "");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("email");
    setMessage(undefined);
    setError("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email")).trim();
    const password = String(form.get("password"));
    const name = String(form.get("name") ?? "").trim();

    try {
      if (register && !name) {
        setError("Introduza o seu nome.");
        return;
      }

      const supabase = browserClient();
      const result = register
        ? await supabase.auth.signUp({
            email, password,
            options: { data: { full_name: name }, emailRedirectTo: new URL("/auth/callback", location.origin).href },
          })
        : await supabase.auth.signInWithPassword({ email, password });

      if (result.error) {
        setError(authError(result.error.code, register));
        return;
      }
      if (result.data.session) {
        location.assign("/criar-plano");
        return;
      }
      setMessage("Se o email puder ser registado, receberá uma ligação de confirmação. Abra a ligação para concluir o registo.");
    } catch {
      setError("Não foi possível ligar ao serviço de autenticação. Tente novamente.");
    } finally {
      setBusy(null);
    }
  }

  async function google() {
    setBusy("google");
    setMessage(undefined);
    setError("");
    try {
      const { data, error } = await browserClient().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: new URL("/auth/callback", location.origin).href, skipBrowserRedirect: true },
      });
      if (error || !data?.url) throw new Error("Google indisponível.");
      location.assign(data.url);
    } catch {
      setError("Não foi possível continuar com o Google. Tente novamente ou use o email.");
      setBusy(null);
    }
  }

  const disabled = Boolean(busy) || !hasSupabase;
  return <>
    {!hasSupabase && <p className="notice" role="alert">A autenticação está indisponível. Falta configurar o Supabase.</p>}
    {error && <p className="notice" role="alert">{error}</p>}
    {message && <p className="notice" role="status">{message}</p>}
    <form className="form" method="post" onSubmit={submit}>
      {register && <label>Nome<input name="name" autoComplete="name" maxLength={120} required /></label>}
      <label>Email<input name="email" type="email" autoComplete="email" required /></label>
      <label>Palavra-passe<input name="password" type="password" autoComplete={register ? "new-password" : "current-password"} minLength={register ? 8 : undefined} required /></label>
      {register && <small>Use pelo menos 8 caracteres.</small>}
      <button className="button" disabled={disabled}>{busy === "email" ? "A aguardar…" : register ? "Criar conta" : "Entrar"}</button>
    </form>
    <div className="form-divider">ou</div>
    <button type="button" className="button button-secondary button-full" onClick={google} disabled={disabled}>
      {busy === "google" ? "A abrir o Google…" : "Continuar com Google"}
    </button>
  </>;
}
