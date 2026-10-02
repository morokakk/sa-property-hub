'use client';

import React from 'react';
import Link from 'next/link';
import { Cloud } from 'lucide-react';

export interface PublishLinkGuidanceBannerProps {
  action?: string | null;
  returnTo?: string | null;
  currentUser?: { id: string; email?: string } | null;
}

export default function PublishLinkGuidanceBanner({
  action,
  returnTo,
  currentUser,
}: PublishLinkGuidanceBannerProps) {
  if (action !== 'publish_link') {
    return null;
  }

  return (
    <div
      data-testid="publish-link-guidance-banner"
      className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 sm:p-5 text-xs text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in"
    >
      <div className="flex items-start sm:items-center gap-3">
        <div className="p-2 bg-amber-500/20 text-amber-700 rounded-lg shrink-0">
          <Cloud className="w-5 h-5" />
        </div>
        <div className="space-y-0.5">
          <h3 className="font-bold text-sm text-amber-950">
            Cloud Statement Publishing
          </h3>
          <p className="text-amber-800">
            Sign in or create your account below to publish your rental property statement link online.
          </p>
        </div>
      </div>

      {currentUser && (
        <Link
          href={
            returnTo && !returnTo.startsWith('//') && !returnTo.includes('://')
              ? (returnTo.startsWith('/') ? returnTo : `/${returnTo}`)
              : '/rentals'
          }
          data-testid="return-to-rentals-btn"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shrink-0 shadow-xs transition-colors text-center"
        >
          <span>← Return to Rental Statements</span>
        </Link>
      )}
    </div>
  );
}
