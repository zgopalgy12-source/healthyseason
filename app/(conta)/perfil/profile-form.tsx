"use client";

import { useActionState } from "react";
import { saveProfile } from "./actions";

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const [state, action, pending] = useActionState(saveProfile, { success: false, message: "" });

  return <form className="form" action={action}>
    <label>Nome<input name="name" defaultValue={name} maxLength={120} required /></label>
    <label>Email<input type="email" value={email} readOnly /></label>
    {state.message && <p className="notice" role={state.success ? "status" : "alert"}>{state.message}</p>}
    <button className="button" disabled={pending}>{pending ? "A guardar…" : "Guardar alterações"}</button>
  </form>;
}
