import { supabase } from "./supabase";

/**
 * Recuperación de contraseña sin correo.
 *
 * El plan gratis de Supabase no manda emails, así que la app genera un CÓDIGO
 * DE RECUPERACIÓN para cada cuenta: la persona lo ve una sola vez (al crear la
 * cuenta, o entrando a "Mi código de recuperación") y lo guarda. Si después
 * olvidó la contraseña, escribe su correo + ese código y elige una nueva.
 *
 * En Supabase solo se guarda el SHA-256 del código, nunca el código en claro.
 */

const TABLE = "recovery_codes";
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sin I, L, O, 0 y 1 (evita confusiones)

/** Código nuevo con formato XXXX-XXXX-XXXX. */
export function generateRecoveryCode(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]);
  return [0, 1, 2]
    .map((i) => chars.slice(i * 4, i * 4 + 4).join(""))
    .join("-");
}

function normalize(code: string): string {
  return code.trim().toUpperCase().replace(/[\s-]/g, "");
}

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Genera un código nuevo para la cuenta que está iniciada y lo guarda (hasheado).
 * Devuelve el código en claro para mostrárselo una vez a la persona.
 */
export async function createRecoveryCode(userId: string): Promise<string | null> {
  if (!supabase) return null;
  const code = generateRecoveryCode();
  const code_hash = await sha256Hex(normalize(code));
  const { error } = await supabase
    .from(TABLE)
    .upsert({ user_id: userId, code_hash, created_at: new Date().toISOString() });
  return error ? null : code;
}

/** Cambia la contraseña usando el código de recuperación. */
export async function resetPasswordWithCode(
  email: string,
  code: string,
  newPassword: string
): Promise<{ ok: boolean; message: string }> {
  if (!supabase) return { ok: false, message: "Supabase no está configurado en esta app." };
  const { data, error } = await supabase.rpc("reset_password_with_code", {
    p_email: email.trim(),
    p_code: normalize(code),
    p_new_password: newPassword,
  });
  if (error) {
    // La función se crea corriendo supabase/schema.sql; si falta, esto es lo que se ve.
    if (/not found|does not exist|schema|function/i.test(error.message)) {
      return {
        ok: false,
        message:
          "La función de recuperación todavía no está creada. Corré supabase/schema.sql en el SQL Editor de Supabase.",
      };
    }
    return { ok: false, message: error.message };
  }
  return data === true
    ? { ok: true, message: "Listo: tu contraseña ya es la nueva. Ya podés entrar." }
    : { ok: false, message: "El correo o el código de recuperación no coinciden." };
}
