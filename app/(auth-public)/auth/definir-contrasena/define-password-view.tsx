"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { createClient } from "@/lib/supabase/client";

import styles from "./define-password.module.css";

export default function DefinePasswordView() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 8 || password.length > 72) {
      setError("La contraseña debe tener entre 8 y 72 caracteres.");
      return;
    }

    if (password !== confirmation) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setIsSaving(true);
    const supabase = createClient();
    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      setError("El enlace venció o ya fue usado. Solicita una nueva invitación.");
      setIsSaving(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError("No pudimos guardar la contraseña. Solicita una nueva invitación.");
      setIsSaving(false);
      return;
    }

    router.replace("/activacion");
    router.refresh();
  }

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="define-password-title">
        <p className={styles.eyebrow}>VENTORA · ACTIVACIÓN SEGURA</p>
        <h1 id="define-password-title">Define tu contraseña</h1>
        <p className={styles.copy}>
          Este enlace es de un solo uso. Crea tu contraseña para terminar de activar la cuenta.
        </p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label>
            Nueva contraseña
            <input
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <label>
            Repite la contraseña
            <input
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              required
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
            />
          </label>

          {error ? <p className={styles.error} role="alert">{error}</p> : null}

          <button type="submit" disabled={isSaving}>
            {isSaving ? "Guardando…" : "Activar cuenta"}
          </button>
        </form>
      </section>
    </main>
  );
}
