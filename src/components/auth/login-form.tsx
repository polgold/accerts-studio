'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginSchema } from '@/lib/validations';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const SITE_URL =
  typeof process.env.NEXT_PUBLIC_SITE_URL === 'string' && process.env.NEXT_PUBLIC_SITE_URL
    ? process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
    : '';

export function LoginForm({ next }: { next?: string | null }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const supabase = createClient();
  const redirectTo = next && next.startsWith('/') ? next : '/';

  const form = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  async function handleGoogleLogin() {
    setError(null);
    setGoogleLoading(true);
    const baseUrl = SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
    const { data, error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${baseUrl}/auth/callback` },
    });
    if (err) {
      setError(err.message);
      setGoogleLoading(false);
      return;
    }
    if (data?.url) window.location.href = data.url;
    else setGoogleLoading(false);
  }

  async function onSubmit(data: LoginSchema) {
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

  return (
    <div className="space-y-4">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleGoogleLogin}
        disabled={googleLoading}
      >
        {googleLoading ? 'Redirigiendo...' : 'Continuar con Google'}
      </Button>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-neutral-200" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white px-2 text-neutral-500">o con email</span>
        </div>
      </div>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>}
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...form.register('email')} className="mt-1" />
          {form.formState.errors.email && <p className="text-xs text-red-600 mt-1">{form.formState.errors.email.message}</p>}
        </div>
        <div>
          <Label htmlFor="password">Contraseña</Label>
          <Input id="password" type="password" {...form.register('password')} className="mt-1" />
          {form.formState.errors.password && <p className="text-xs text-red-600 mt-1">{form.formState.errors.password.message}</p>}
        </div>
        <Button type="submit" className="w-full">Entrar</Button>
      </form>
    </div>
  );
}
