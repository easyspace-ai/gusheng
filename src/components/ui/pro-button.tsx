import * as React from 'react';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import { motion, HTMLMotionProps } from 'framer-motion';
import { Loader2 } from 'lucide-react';

const proButtonVariants = cva(
  'relative inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-all duration-200 select-none whitespace-nowrap overflow-hidden',
  {
    variants: {
      variant: {
        primary:
          'bg-gradient-to-r from-pro-accent-amber to-pro-accent-amber-dark text-black shadow-lg shadow-pro-accent-amber/20 hover:from-pro-accent-amber-light hover:to-pro-accent-amber hover:shadow-pro-accent-amber/30 active:scale-[0.98]',
        secondary:
          'bg-pro-bg-tertiary/60 text-pro-fg-secondary border border-pro-border-default hover:bg-pro-bg-tertiary hover:text-pro-fg-primary hover:border-pro-border-strong active:scale-[0.98]',
        ghost:
          'text-pro-fg-muted hover:text-pro-fg-primary hover:bg-pro-bg-tertiary/60 active:scale-[0.98]',
        outline:
          'border border-pro-border-default text-pro-fg-secondary hover:bg-pro-bg-tertiary/60 hover:text-pro-fg-primary hover:border-pro-border-strong active:scale-[0.98] bg-transparent',
        destructive:
          'bg-pro-danger text-white hover:bg-pro-danger-light shadow-lg shadow-pro-danger/20 active:scale-[0.98]',
        success:
          'bg-pro-success text-black hover:bg-pro-success-light shadow-lg shadow-pro-success/20 active:scale-[0.98]',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8',
        'icon-lg': 'h-12 w-12',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

interface ProButtonProps
  extends Omit<HTMLMotionProps<'button'>, 'size'>,
    VariantProps<typeof proButtonVariants> {
  asChild?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const ProButton = React.forwardRef<HTMLButtonElement, ProButtonProps>(
  ({
    className,
    variant,
    size,
    asChild = false,
    loading = false,
    disabled = false,
    leftIcon,
    rightIcon,
    children,
    ...props
  }, ref) => {
    const isDisabled = disabled || loading;

    return (
      <motion.button
        ref={ref}
        className={cn(
          proButtonVariants({ variant, size }),
          isDisabled && 'opacity-50 cursor-not-allowed pointer-events-none',
          className
        )}
        disabled={isDisabled}
        whileHover={!isDisabled ? { scale: 1.02 } : undefined}
        whileTap={!isDisabled ? { scale: 0.98 } : undefined}
        {...props}
      >
        {loading && (
          <Loader2 className="w-4 h-4 animate-spin" />
        )}
        {!loading && leftIcon && (
          <span className="flex-shrink-0">{leftIcon}</span>
        )}
        {children}
        {!loading && rightIcon && (
          <span className="flex-shrink-0">{rightIcon}</span>
        )}

        {/* 波纹效果层 */}
        {variant === 'primary' && (
          <span className="absolute inset-0 overflow-hidden rounded-lg">
            <span className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300">
              <span className="absolute -inset-1 bg-gradient-to-r from-white/20 via-transparent to-white/20 -skew-x-12 translate-x-[-100%] hover:animate-[shimmer_1.5s_infinite]" />
            </span>
          </span>
        )}
      </motion.button>
    );
  }
);
ProButton.displayName = 'ProButton';

export { ProButton, proButtonVariants };
