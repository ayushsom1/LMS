import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  showWordmark?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: { icon: 'w-6 h-6', text: 'text-sm' },
  md: { icon: 'w-7 h-7', text: 'text-base' },
  lg: { icon: 'w-9 h-9', text: 'text-xl' },
};

export default function Logo({ className, showWordmark = true, size = 'md' }: LogoProps) {
  const s = sizes[size];
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className={cn(
          s.icon,
          'relative rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-sm ring-1 ring-primary/20'
        )}
      >
        <svg viewBox="0 0 24 24" className="w-3/5 h-3/5 text-primary-foreground" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 7h14" />
          <path d="M12 7v12" />
          <path d="M8 19h8" />
          <circle cx="19" cy="5" r="2" fill="currentColor" stroke="none" />
        </svg>
      </div>
      {showWordmark && (
        <span className={cn(s.text, 'font-semibold tracking-tight text-foreground')}>
          Testrainer<span className="text-primary">.</span>
        </span>
      )}
    </div>
  );
}
