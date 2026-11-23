import {unstable_cache} from 'next/cache';
import {privateJson} from '@/lib/security/request';
import {publicLandingReviews, readLandingActivity} from '@/lib/saas/landingActivity';
import {key} from '@/lib/saas/store';

export const runtime = 'nodejs';
const cachedActivity = unstable_cache(readLandingActivity, ['scanner-landing-activity'], {revalidate:10});

export async function GET() {
  const activity = await cachedActivity(key('')).catch(() => null);
  return privateJson({activity, reviews: publicLandingReviews()});
}
