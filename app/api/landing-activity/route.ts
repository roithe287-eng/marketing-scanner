import {privateJson} from '@/lib/security/request';
import {publicLandingReviews, readLandingActivity} from '@/lib/saas/landingActivity';

export const runtime = 'nodejs';

export async function GET() {
  const activity = await readLandingActivity().catch(() => null);
  return privateJson({activity, reviews: publicLandingReviews()});
}
