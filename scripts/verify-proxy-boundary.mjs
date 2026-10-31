import { chromium } from 'playwright';

const baseUrl = new URL(process.argv[2] || 'http://localhost:3000');
const browser = await chromium.launch();
const page = await browser.newPage();
const requests = [];

page.on('request', (request) => {
  const url = new URL(request.url());
  requests.push({ origin: url.origin, path: url.pathname });
});

await page.goto(new URL('/pricing', baseUrl).toString(), { waitUntil: 'networkidle' });
await page.waitForTimeout(500);

const external = requests.filter((request) => request.origin !== baseUrl.origin);
const directProvider = external.filter((request) =>
  /supabase|googleapis|generativelanguage|brevo/i.test(request.origin),
);
const proxyCalls = [...new Set(
  requests
    .filter((request) => request.origin === baseUrl.origin && request.path.startsWith('/api/'))
    .map((request) => request.path),
)];

console.log(`Same-origin proxy calls: ${proxyCalls.join(', ') || 'none'}`);
console.log(`Direct provider requests: ${directProvider.length}`);

await browser.close();

if (directProvider.length > 0) {
  console.error(directProvider);
  process.exit(1);
}
