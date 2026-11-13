import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import type { Metadata } from 'next';
import DealRoomViewer from '@/components/developments/DealRoomViewer';
import { PublicDealRoomPayload } from '@/types/dealRoom';
import { INITIAL_DEVELOPMENTS, INITIAL_INVESTOR_PROFILE } from '@/lib/store/initialData';
import {
  isDemoDevelopment,
  maskDevelopmentForPublicDealRoom,
  mergeProjectComments,
} from '@/lib/calculations/commentsLedger';
import { getExternalDevelopmentComments } from '@/app/actions/submitDevelopmentComment';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{
    token: string;
  }>;
}

function getServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function fetchDealRoomData(token: string): Promise<PublicDealRoomPayload | null> {
  const cleanToken = typeof token === 'string' ? token.trim() : '';
  if (!cleanToken) return null;

  const supabase = getServerSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.rpc('get_public_development_deal_room', {
        p_token: cleanToken,
      });

      if (!error && data && typeof data === 'object' && (data as any).development) {
        const rawPayload = data as unknown as PublicDealRoomPayload;
        const externalRes = await getExternalDevelopmentComments({
          developmentId: rawPayload.development.id,
          shareToken: cleanToken,
        });
        const mergedLedger = mergeProjectComments(
          externalRes.success ? externalRes.comments : [],
          rawPayload.development.commentsLedger
        );
        const maskedDev = maskDevelopmentForPublicDealRoom({
          ...rawPayload.development,
          commentsLedger: mergedLedger,
        });
        return {
          development: maskedDev,
          sponsor: rawPayload.sponsor || {
            entityName:
              rawPayload.development.seniorJvPartnerName || 'Private Development Sponsor',
          },
          isDemo: false,
        };
      }
    } catch {
      // Fall through to demo lookup
    }
  }

  // Demo fallback for initial portfolio projects (e.g. dev-1, dev-2)
  const demoDev = INITIAL_DEVELOPMENTS.find(
    (d) => isDemoDevelopment(d.id) && (d.id === cleanToken || d.shareToken === cleanToken)
  );

  if (demoDev) {
    const externalRes = await getExternalDevelopmentComments({
      developmentId: demoDev.id,
      shareToken: cleanToken,
    });
    const mergedLedger = mergeProjectComments(
      externalRes.success ? externalRes.comments : [],
      demoDev.commentsLedger
    );
    const maskedDemo = maskDevelopmentForPublicDealRoom({
      ...demoDev,
      commentsLedger: mergedLedger,
    });

    return {
      development: maskedDemo,
      sponsor: {
        entityName:
          INITIAL_INVESTOR_PROFILE.entityName ||
          demoDev.seniorJvPartnerName ||
          'Moremela Development Sponsor',
        registrationNumber: INITIAL_INVESTOR_PROFILE.registrationOrId,
      },
      isDemo: true,
    };
  }

  return null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;
  if (!token) {
    return {
      title: 'External Deal Room | Moremela Property Hub',
      robots: { index: false, follow: false },
    };
  }

  try {
    const payload = await fetchDealRoomData(token);
    if (payload?.development) {
      return {
        title: `Deal Room: ${payload.development.title} | Moremela Property Hub`,
        description: 'POPIA-masked external development feasibility & team ledger.',
        robots: {
          index: false,
          follow: false,
        },
      };
    }
  } catch {
    // Fall back to default metadata
  }

  return {
    title: 'External Deal Room | Moremela Property Hub',
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function PublicDealRoomPage({ params }: PageProps) {
  const { token } = await params;
  if (!token || typeof token !== 'string') {
    notFound();
  }

  const dealRoomData = await fetchDealRoomData(token);
  if (!dealRoomData || !dealRoomData.development) {
    notFound();
  }

  return <DealRoomViewer dealRoomData={dealRoomData} token={token.trim()} />;
}
