import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { productionEnvironmentChecks } from '../lib/env/production';

const checks = productionEnvironmentChecks();
for (const check of checks) {
  console.log(`${check.configured ? 'OK' : 'MISSING'}  ${check.name} — ${check.purpose}`);
}
if (checks.some((check) => !check.configured)) process.exitCode = 1;
