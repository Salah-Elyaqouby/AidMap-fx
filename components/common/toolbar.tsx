import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface ToolbarActionsProps {
  children?: ReactNode;
}

export interface ToolbarProps {
  children?: ReactNode;
}

export interface ToolbarTitleProps {
  children: ReactNode;
  className?: string;
}

export interface ToolbarHeadingProps {
  /** عنوان التولبار */
  title?: string;
  /** وصف اختياري تحت العنوان */
  description?: string;
  /** لو حابب تستخدم children بدل title */
  children?: ReactNode;
  className?: string;
}

export const Toolbar = ({ children }: ToolbarProps) => {
  return (
    <div className="flex items-center justify-between grow gap-2.5 pb-5">
      {children}
    </div>
  );
};

export const ToolbarHeading = ({
  title,
  description,
  children,
  className,
}: ToolbarHeadingProps) => {
  return (
    <div className={cn('flex flex-col flex-wrap gap-px', className)}>
      {title && (
        <h1 className="font-semibold text-foreground text-lg">
          {title}
        </h1>
      )}

      {description && (
        <p className="text-sm text-muted-foreground">
          {description}
        </p>
      )}

      {children}
    </div>
  );
};

export const ToolbarTitle = ({ className, children }: ToolbarTitleProps) => {
  return (
    <h1 className={cn('font-semibold text-foreground text-lg', className)}>
      {children}
    </h1>
  );
};

export const ToolbarActions = ({ children }: ToolbarActionsProps) => {
  return (
    <div className="flex items-center flex-wrap gap-1.5 lg:gap-3.5">
      {children}
    </div>
  );
};
