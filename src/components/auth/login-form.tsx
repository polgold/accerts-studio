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

export function LoginForm() {
  const router = useRouter();
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const form = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(data: LoginSchema) {
    setError(null);
    if (data.magic_link) {
      const { error: err } = await supabase.auth.signInWithOtp({ email: data.email, options: { emailRedirectTo: `${window.location.origin}/` } });
      if (err) setError(err.message);
      else setMagicLinkSent(true);
      return;
    }
    if (!data.password) {
      setError('Contraseña requerida');
      return;
    }
    const { error: err } = await supabase.auth.signInWithPassword({ email: data.email, password: data.password });
    if (err) setError(err.message);
    else router.push('/');
    router.refresh();
  }

  if (magicLinkSent) {
    return (
      <p className="text-sm text-neutral-600 text-center py-4">
        Revisa tu correo. Te enviamos un enlace para iniciar sesión.
      </p>
    );
  }

  return (
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
      <div className="flex items-center gap-2">
        <input type="checkbox" id="magic" {...form.register('magic_link')} />
        <Label htmlFor="magic" className="font-normal">Enviar enlace mágico</Label>
      </div>
      <Button type="submit" className="w-full">Entrar</Button>
    </form>
  );
}
