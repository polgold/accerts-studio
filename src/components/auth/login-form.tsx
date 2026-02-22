'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { loginSchema, signUpSchema, emailSchema, type LoginSchema } from '@/lib/validations';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const SITE_URL =
  typeof process.env.NEXT_PUBLIC_SITE_URL === 'string' && process.env.NEXT_PUBLIC_SITE_URL
    ? process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
    : '';

type Mode = 'login' | 'signup' | 'forgot' | 'recovery';

export function LoginForm({ next }: { next?: string | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [mode, setMode] = useState<Mode>('login');
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSentTo, setForgotSentTo] = useState<string | null>(null);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const supabase = createClient();
  const redirectTo = next && next.startsWith('/') ? next : '/';

  const loginForm = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });
  const signupForm = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: '', password: '', full_name: '' },
  });
  const forgotForm = useForm<{ email: string }>({
    resolver: zodResolver(z.object({ email: emailSchema })),
    defaultValues: { email: '' },
  });
  const recoveryForm = useForm<{ password: string }>({
    resolver: zodResolver(signUpSchema.pick({ password: true })),
    defaultValues: { password: '' },
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace('#', ''));
    const typeRecovery = params.get('type') === 'recovery' || searchParams.get('type') === 'recovery';
    const code = searchParams.get('code');
    if (!typeRecovery && !code) return;
    if (typeRecovery && !code) {
      setMode('recovery');
      setRecoveryReady(true);
      return;
    }
    if (code) {
      setMode('recovery');
      createClient().auth
        .exchangeCodeForSession(code)
        .then(({ error: err }) => {
          if (err) setError(err.message);
          else setRecoveryReady(true);
        })
        .catch((e) => setError(e?.message ?? 'Error al verificar el enlace'));
    }
  }, [searchParams]);

  async function handleGoogleLogin() {
    setError(null);
    setGoogleLoading(true);
    const baseUrl = SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout. Probá de nuevo.')), 8000)
      );
      const { data, error: err } = await Promise.race([
        supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: `${baseUrl}/auth/callback` },
        }),
        timeout,
      ]);
      if (err) {
        setError(err.message);
        return;
      }
      if (data?.url) {
        window.location.replace(data.url);
      } else {
        setError('No se obtuvo la URL de Google. Probá de nuevo.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al conectar con Google');
    } finally {
      setGoogleLoading(false);
    }
  }

  async function onLoginSubmit(data: LoginSchema) {
    setError(null);
    if (!data.password) {
      setError('Contraseña requerida');
      return;
    }
    const { error: err } = await supabase.auth.signInWithPassword({ email: data.email, password: data.password });
    if (err) setError(err.message);
    else {
      router.push(redirectTo);
      router.refresh();
    }
  }

  async function onSignupSubmit(data: z.infer<typeof signUpSchema>) {
    setError(null);
    const { error: err } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: { data: { full_name: data.full_name } },
    });
    if (err) setError(err.message);
    else {
      setSuccessMsg('Cuenta creada. Revisá tu correo para confirmar (o entrá directo si el auto-confirm está activo).');
      setMode('login');
    }
  }

  async function onForgotSubmit(data: { email: string }) {
    setError(null);
    setSuccessMsg(null);
    setForgotSentTo(null);
    setForgotLoading(true);
    const baseUrl = SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
    const { error: err } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${baseUrl}/login`,
    });
    setForgotLoading(false);
    if (err) {
      setError(err.message);
    } else {
      setForgotSentTo(data.email);
      setSuccessMsg('Listo. Revisá tu correo (y la carpeta de spam).');
    }
  }

  async function onRecoverySubmit(data: { password: string }) {
    setError(null);
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) {
      setError('No se detectó la sesión. Volvé a hacer clic en el enlace del correo o pedí uno nuevo en "Olvidé mi contraseña".');
      return;
    }
    setRecoveryLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password: data.password });
    setRecoveryLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSuccessMsg('Contraseña actualizada. Ya podés entrar.');
    setMode('login');
    window.history.replaceState(null, '', window.location.pathname);
  }

  if (mode === 'recovery' && recoveryReady) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-neutral-600">Elegí una nueva contraseña (mínimo 8 caracteres):</p>
        <form
          onSubmit={recoveryForm.handleSubmit(onRecoverySubmit, (errors) => {
            setError(errors.password?.message ?? 'Revisá los datos');
          })}
          className="space-y-4"
        >
          {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>}
          {successMsg && <p className="text-sm text-green-600 bg-green-50 p-2 rounded">{successMsg}</p>}
          <div>
            <Label htmlFor="recovery-password">Nueva contraseña</Label>
            <Input
              id="recovery-password"
              type="password"
              autoComplete="new-password"
              {...recoveryForm.register('password')}
              className="mt-1"
            />
            {recoveryForm.formState.errors.password && (
              <p className="text-xs text-red-600 mt-1">{recoveryForm.formState.errors.password.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={recoveryLoading}>
            {recoveryLoading ? 'Guardando...' : 'Guardar contraseña'}
          </Button>
        </form>
      </div>
    );
  }

  if (mode === 'forgot') {
    if (forgotSentTo) {
      return (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-green-50 border border-green-200">
            <p className="text-sm font-medium text-green-800">Enlace enviado</p>
            <p className="text-sm text-green-700 mt-1">
              Enviamos el enlace para resetear la contraseña a <strong>{forgotSentTo}</strong>.
            </p>
            <p className="text-sm text-green-600 mt-2">Revisá tu correo y la carpeta de spam.</p>
          </div>
          <button
            type="button"
            className="w-full py-2 text-sm text-neutral-600 hover:underline"
            onClick={() => setMode('login')}
          >
            Volver a iniciar sesión
          </button>
          <button
            type="button"
            className="w-full py-2 text-sm text-neutral-500 hover:underline"
            onClick={() => { setForgotSentTo(null); setSuccessMsg(null); setError(null); }}
          >
            Enviar a otro correo
          </button>
        </div>
      );
    }
    return (
      <div className="space-y-4">
        <p className="text-sm text-neutral-600">Ingresá tu email y te enviamos un enlace para resetear la contraseña.</p>
        <form onSubmit={forgotForm.handleSubmit(onForgotSubmit)} className="space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>}
          <div>
            <Label htmlFor="forgot-email">Email</Label>
            <Input id="forgot-email" type="email" {...forgotForm.register('email')} className="mt-1" />
            {forgotForm.formState.errors.email && (
              <p className="text-xs text-red-600 mt-1">{forgotForm.formState.errors.email.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={forgotLoading}>
            {forgotLoading ? 'Enviando...' : 'Enviar enlace'}
          </Button>
          <button type="button" className="text-sm text-neutral-500 hover:underline w-full" onClick={() => setMode('login')}>
            Volver a iniciar sesión
          </button>
        </form>
      </div>
    );
  }

  if (mode === 'signup') {
    return (
      <div className="space-y-4">
        <Button type="button" variant="outline" className="w-full" onClick={handleGoogleLogin} disabled={googleLoading}>
          {googleLoading ? 'Redirigiendo...' : 'Continuar con Google'}
        </Button>
        <div className="relative">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-neutral-200" /></div>
          <div className="relative flex justify-center text-xs"><span className="bg-white px-2 text-neutral-500">o crear con email</span></div>
        </div>
        <form onSubmit={signupForm.handleSubmit(onSignupSubmit)} className="space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>}
          {successMsg && <p className="text-sm text-green-600 bg-green-50 p-2 rounded">{successMsg}</p>}
          <div>
            <Label htmlFor="signup-email">Email</Label>
            <Input id="signup-email" type="email" {...signupForm.register('email')} className="mt-1" />
            {signupForm.formState.errors.email && <p className="text-xs text-red-600 mt-1">{signupForm.formState.errors.email.message}</p>}
          </div>
          <div>
            <Label htmlFor="signup-password">Contraseña</Label>
            <Input id="signup-password" type="password" {...signupForm.register('password')} className="mt-1" />
            {signupForm.formState.errors.password && <p className="text-xs text-red-600 mt-1">{signupForm.formState.errors.password.message}</p>}
          </div>
          <Button type="submit" className="w-full">Crear cuenta</Button>
          <button type="button" className="text-sm text-neutral-500 hover:underline w-full" onClick={() => { setMode('login'); setError(null); setSuccessMsg(null); }}>
            Ya tengo cuenta
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button type="button" variant="outline" className="w-full" onClick={handleGoogleLogin} disabled={googleLoading}>
        {googleLoading ? 'Redirigiendo...' : 'Continuar con Google'}
      </Button>
      <div className="relative">
        <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-neutral-200" /></div>
        <div className="relative flex justify-center text-xs"><span className="bg-white px-2 text-neutral-500">o con email</span></div>
      </div>
      <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
        {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>}
        {successMsg && <p className="text-sm text-green-600 bg-green-50 p-2 rounded">{successMsg}</p>}
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...loginForm.register('email')} className="mt-1" />
          {loginForm.formState.errors.email && <p className="text-xs text-red-600 mt-1">{loginForm.formState.errors.email.message}</p>}
        </div>
        <div>
          <Label htmlFor="password">Contraseña</Label>
          <Input id="password" type="password" {...loginForm.register('password')} className="mt-1" />
          {loginForm.formState.errors.password && <p className="text-xs text-red-600 mt-1">{loginForm.formState.errors.password.message}</p>}
        </div>
        <Button type="submit" className="w-full">Entrar</Button>
        <div className="flex flex-col gap-1 text-center">
          <button type="button" className="text-sm text-neutral-500 hover:underline" onClick={() => setMode('forgot')}>
            Olvidé mi contraseña
          </button>
          <button type="button" className="text-sm text-neutral-500 hover:underline" onClick={() => setMode('signup')}>
            Crear cuenta
          </button>
        </div>
      </form>
    </div>
  );
}
