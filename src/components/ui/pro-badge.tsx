import * as React from 'react';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const proBadgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full text-xs font-medium border transition-colors',
  {
    variants: {
      variant: {
        default:
          'bg-pro-bg-tertiary/60 text-pro-fg-secondary border-pro-border-default',
        amber:
          'bg-pro-accent-amber-bg text-pro-accent-amber-light border-pro-accent-amber/30',
        blue:
          'bg-pro-accent-blue-bg text-pro-accent-blue-light border-pro-accent-blue/30',
        success:
          'bg-pro-success-bg text-pro-success-light border-pro-success/30',
        danger:
          'bg-pro-danger-bg text-pro-danger-light border-pro-danger/30',
        outline:
          'bg-transparent text-pro-fg-secondary border-pro-border-default',
      },
      size: {
        sm: 'px-2 py-0.5 text-[10px]',
        md: 'px-2.5 py-1 text-xs',
        lg: 'px-3 py-1.5 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

interface ProBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof proBadgeVariants> {
  dot?: boolean;
  dotColor?: 'amber' | 'blue' | 'success' | 'danger';
}

const ProBadge = React.forwardRef<HTMLDivElement, ProBadgeProps>(
  ({ className, variant, size, dot = false, dotColor, children, ...props }, ref) => {
    const dotColors = {
      amber: 'bg-pro-accent-amber',
      blue: 'bg-pro-accent-blue',
      success: 'bg-pro-success',
      danger: 'bg-pro-danger',
    };

    const defaultDotColor = dotColor ||
      (variant === 'amber' ? 'amber' :
       variant === 'blue' ? 'blue' :
       variant === 'success' ? 'success' :
       variant === 'danger' ? 'danger' : 'amber');

    return (
      <div
        ref={ref}
        className={cn(proBadgeVariants({ variant, size }), className)}
        {...props}
      >
        {dot && (
          <span className={cn('relative flex h-1.5 w-1.5')}>
            <span className={cn('absolute inline-flex h-full w-full rounded-full', dotColors[defaultDotColor], 'opacity-40 animate-ping')} />
            <span className={cn('relative inline-flex rounded-full h-1.5 w-1.5', dotColors[defaultDotColor])} />
          </span>
        )}
        {children}
      </div>
    );
  }
);
ProBadge.displayName = 'ProBadge';

export { ProBadge, proBadgeVariants };
