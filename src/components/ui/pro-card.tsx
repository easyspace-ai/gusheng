import * as React from 'react';
import { cn } from '@/lib/utils';
import { motion, HTMLMotionProps } from 'framer-motion';

interface ProCardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  className?: string;
  glass?: boolean;
  hoverable?: boolean;
  bordered?: boolean;
  gradientBorder?: boolean;
}

export const ProCard = React.forwardRef<HTMLDivElement, ProCardProps>(
  ({
    children,
    className,
    glass = true,
    hoverable = false,
    bordered = true,
    gradientBorder = false,
    ...props
  }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={cn(
          'relative rounded-xl overflow-hidden',
          glass && 'pro-glass',
          !glass && 'bg-pro-bg-elevated',
          bordered && !gradientBorder && 'border border-pro-border-default',
          hoverable && 'pro-hover-lift cursor-pointer',
          className
        )}
        initial={false}
        whileHover={hoverable ? { y: -2 } : undefined}
        transition={{ duration: 0.2 }}
        {...props}
      >
        {gradientBorder && (
          <div className="absolute inset-0 rounded-xl p-px bg-gradient-to-r from-pro-accent-amber/50 via-pro-accent-blue/50 to-pro-accent-amber/50">
            <div className="absolute inset-px rounded-xl bg-pro-bg-elevated" />
          </div>
        )}
        <div className={cn('relative', gradientBorder && 'p-px')}>
          {children}
        </div>
      </motion.div>
    );
  }
);
ProCard.displayName = 'ProCard';

interface ProCardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const ProCardHeader = React.forwardRef<HTMLDivElement, ProCardHeaderProps>(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center justify-between p-4 border-b border-pro-border-subtle', className)}
      {...props}
    >
      {children}
    </div>
  )
);
ProCardHeader.displayName = 'ProCardHeader';

interface ProCardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
  className?: string;
}

export const ProCardTitle = React.forwardRef<HTMLHeadingElement, ProCardTitleProps>(
  ({ children, className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-sm font-semibold text-pro-fg-primary', className)}
      {...props}
    >
      {children}
    </h3>
  )
);
ProCardTitle.displayName = 'ProCardTitle';

interface ProCardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
  className?: string;
}

export const ProCardDescription = React.forwardRef<HTMLParagraphElement, ProCardDescriptionProps>(
  ({ children, className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-xs text-pro-fg-muted', className)}
      {...props}
    >
      {children}
    </p>
  )
);
ProCardDescription.displayName = 'ProCardDescription';

interface ProCardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const ProCardContent = React.forwardRef<HTMLDivElement, ProCardContentProps>(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('p-4', className)}
      {...props}
    >
      {children}
    </div>
  )
);
ProCardContent.displayName = 'ProCardContent';

interface ProCardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const ProCardFooter = React.forwardRef<HTMLDivElement, ProCardFooterProps>(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center p-4 pt-0 border-t border-pro-border-subtle', className)}
      {...props}
    >
      {children}
    </div>
  )
);
ProCardFooter.displayName = 'ProCardFooter';
