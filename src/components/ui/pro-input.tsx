import * as React from 'react';
import { cn } from '@/lib/utils';
import { Search, Loader2 } from 'lucide-react';

interface ProInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loading?: boolean;
  error?: string;
}

const ProInput = React.forwardRef<HTMLInputElement, ProInputProps>(
  ({
    className,
    type = 'text',
    leftIcon,
    rightIcon,
    loading = false,
    error,
    ...props
  }, ref) => {
    return (
      <div className="space-y-1.5">
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-pro-fg-muted">
              {leftIcon}
            </div>
          )}

          <input
            type={type}
            className={cn(
              'w-full h-10 px-4 text-sm text-pro-fg-primary bg-pro-input-bg border border-pro-input-border rounded-lg',
              'placeholder:text-pro-fg-subtle',
              'focus:outline-none focus:border-pro-input-focus-border focus:ring-2 focus:ring-pro-input-focus-ring',
              'transition-all duration-200',
              leftIcon && 'pl-9',
              (rightIcon || loading) && 'pr-9',
              error && 'border-pro-danger focus:border-pro-danger focus:ring-pro-danger/20',
              className
            )}
            ref={ref}
            {...props}
          />

          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {loading && (
              <Loader2 className="w-4 h-4 text-pro-fg-muted animate-spin" />
            )}
            {!loading && rightIcon && (
              <div className="text-pro-fg-muted">{rightIcon}</div>
            )}
          </div>
        </div>

        {error && (
          <p className="text-xs text-pro-danger">{error}</p>
        )}
      </div>
    );
  }
);
ProInput.displayName = 'ProInput';

interface ProSearchInputProps extends Omit<ProInputProps, 'leftIcon'> {
  onSearch?: (value: string) => void;
}

const ProSearchInput = React.forwardRef<HTMLInputElement, ProSearchInputProps>(
  ({ className, onSearch, ...props }, ref) => {
    return (
      <ProInput
        ref={ref}
        leftIcon={<Search size={16} />}
        className={cn(className)}
        {...props}
      />
    );
  }
);
ProSearchInput.displayName = 'ProSearchInput';

export { ProInput, ProSearchInput };
