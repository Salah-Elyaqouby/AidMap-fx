'use client';

import { Fragment, useState } from 'react';
import Link from 'next/link';
import {
  Toolbar,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/partials/common/toolbar';
import { WelcomeMessageDialog } from '@/partials/dialogs/welcome-message-dialog';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/common/container';

export default function AuthWelcomeMessagePage() {
  const [profileModalOpen, setProfileModalOpen] = useState(true);
  const handleClose = () => {
    setProfileModalOpen(false);
  };

  return (
    <Fragment>
      {/* تم حذف PageNavbar لأنه مفقود */}
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
                <Button mode="link" asChild>
                  <Link href="/account/members/team-info">Personal Info</Link>
                </Button>
              </div>
            </ToolbarDescription>
          </ToolbarHeading>
        </Toolbar>
      </Container>
      <Container>
        {/* تم حذف AccountGetStartedContent لأنه مفقود */}
        <WelcomeMessageDialog
          open={profileModalOpen}
          onOpenChange={handleClose}
        />
      </Container>
    </Fragment>
  );
}