import {getRedisClient} from '../lib/redisClient';
import {migrateReportRetention} from '../lib/reportRetentionStore';
async function main() {
 if(['production','preview'].includes(process.env.VERCEL_ENV||'')) {
  if(!getRedisClient())throw new Error('Report retention migration needs the configured report store.');
  const result=await migrateReportRetention();
  console.log('[report-retention] 7-day policy applied',result);
 } else console.log('[report-retention] Local build: deployment migration skipped.');
}
main().catch(()=>{console.error('[report-retention] Migration failed; deployment stopped. Check report-store access.');process.exitCode=1;});
