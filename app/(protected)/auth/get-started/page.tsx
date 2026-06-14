'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import {
  Toolbar,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/partials/common/toolbar';
import { useSettings } from '@/providers/settings-provider';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/common/container';

export default function AccountGetStartedPage() {
  const { settings } = useSettings();

  return (
    <Fragment>
      {/* تم حذف PageNavbar لأنه مفقود */}
      {settings?.layout === 'demo1' && (
        <Container>
          <Toolbar>
            <ToolbarHeading>
              <ToolbarPageTitle />
              <ToolbarDescription>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span className="text-foreground font-medium">
                    Jayson Tatum
                  </span>
                  <Link
                    href="mailto:jaytatum@ktstudio.com"
                    className="text-secondary-foreground hover:text-primary"
                  >
                    jaytatum@ktstudio.com
                  </Link>
                  <span className="size-0.75 bg-mono/50 rounded-full"></span>
                  <Button mode="link" underlined="dashed" asChild>
                    <Link href="/account/members/team-info">Personal Info</Link>
                  </Button>
                </div>
              </ToolbarDescription>
            </ToolbarHeading>
          </Toolbar>
        </Container>
      )}
      <Container>
        {/* تم حذف AccountGetStartedContent لضمان نجاح الـ Build */}
        <div className="py-10 text-center">
           <p>قيد التطوير أو تم حذف المحتوى</p>
        </div>
      </Container>
    </Fragment>
  );
}