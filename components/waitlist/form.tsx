"use client";

import { useActionState } from "react";
import { joinWaitlist } from "./actions";

export function WaitlistForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(joinWaitlist, { error: "", joined: false });

  if (state.joined) return <p className="notice" role="status">Já estás na lista de espera.</p>;

  return <form className="form" action={action}>
    <label>Email<input type="email" name="email" maxLength={254} defaultValue={email} autoComplete="email" required /></label>
    {state.error && <p className="notice" role="alert">{state.error}</p>}
    <button className="button" disabled={pending}>{pending ? "A guardar…" : "Entrar na lista de espera"}</button>
  </form>;
}
