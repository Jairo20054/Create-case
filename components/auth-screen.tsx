'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getBrowserSupabase } from '@/lib/browser/supabase';

export function AuthScreen({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const client = getBrowserSupabase();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(''); setMessage('');
    if (!client) { setError('El acceso aún no está configurado para ALTER / CASE.'); return; }
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') || '').trim();
    const password = String(form.get('password') || '');
    if (password.length < 8) { setError('Usa al menos 8 caracteres en tu contraseña.'); return; }
    setBusy(true);
    try {
      if (mode === 'register') {
        const result = await client.auth.signUp({ email, password });
        if (result.error) throw result.error;
        setMessage('Revisa tu correo para confirmar la cuenta, si la confirmación está habilitada.');
      } else {
        const result = await client.auth.signInWithPassword({ email, password });
        if (result.error) throw result.error;
        router.replace('/admin');
        router.refresh();
      }
    } catch {
      setError(mode === 'login' ? 'No se pudo iniciar sesión. Verifica las credenciales.' : 'No se pudo crear la cuenta. Verifica los datos.');
    } finally { setBusy(false); }
  }
  return <main className="auth-screen">
    <div className="auth-panel">
      <Link className="auth-return" href="/"><ArrowLeft size={17}/> Volver a la tienda</Link>
      <p className="eyebrow">ALTER / CASE · CUENTA</p>
      <h1>{mode === 'login' ? 'Bienvenido de nuevo.' : 'Tu estilo empieza aquí.'}</h1>
      <p className="muted">{mode === 'login' ? 'Accede de manera segura a tu cuenta.' : 'Crea una cuenta para tu experiencia ALTER.'}</p>
      <form onSubmit={submit} className="auth-form">
        <label>Correo electrónico<input name="email" type="email" required autoComplete="email" placeholder="correo@ejemplo.com"/></label>
        <label>Contraseña<input name="password" type="password" minLength={8} required autoComplete={mode === 'login' ? 'current-password' : 'new-password'}/></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        {message && <p role="status">{message}</p>}
        <button className="button-dark" disabled={busy || !client}>{busy ? 'Procesando…' : mode === 'login' ? 'Ingresar' : 'Crear cuenta'}</button>
      </form>
      <p className="auth-switch">{mode === 'login' ? <>¿No tienes cuenta? <Link href="/register">Regístrate</Link></> : <>¿Ya tienes cuenta? <Link href="/login">Inicia sesión</Link></>}</p>
      {!client && <p role="status" className="form-error">La autenticación se habilitará cuando se conecte Supabase de ALTER / CASE.</p>}
    </div>
  </main>;
}
