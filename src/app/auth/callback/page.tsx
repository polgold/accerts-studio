import { Suspense } from 'react';
import { AuthCallbackClient } from './auth-callback-client';

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-neutral-50"><p className="text-neutral-600">Cargando...</p></div>}>
      <AuthCallbackClient />
    </Suspense>
  );
}
