import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';

const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement> & { asChild?: boolean }>(
  ({ className, asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : 'label';
    return <Comp ref={ref} className={cn('text-sm font-medium text-[var(--foreground)]', className)} {...props} />;
  }
);
Label.displayName = 'Label';

export { Label };
