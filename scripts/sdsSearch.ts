// scripts/sdsSearch.ts
// Simple CLI to search for an SDS URL by product name and optional size
// Usage:
//   npm run sds:search -- --name "Wurth Active Glass Cleaner" --size "500ml" [--fresh] [--json]

import { fetchSdsByName } from '../server/utils/scraper.js';

type Args = {
  name?: string;
  size?: string;
  fresh?: boolean;
  json?: boolean;
};

function parseArgs(argv: string[]): Args {
  const out: Args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--name' && argv[i + 1]) out.name = argv[++i];
    else if (a === '--size' && argv[i + 1]) out.size = argv[++i];
    else if (a === '--fresh' || a === '--force' || a === '--no-cache') out.fresh = true;
    else if (a === '--json') out.json = true;
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.name) {
    console.error('Usage: npm run sds:search -- --name "<product name>" [--size "<size>"] [--fresh] [--json]');
    process.exit(1);
  }

  try {
    const { sdsUrl, topLinks } = await fetchSdsByName(args.name, args.size, true, !!args.fresh);

    if (args.json) {
      console.log(JSON.stringify({ name: args.name, size: args.size || '', sdsUrl, topLinks }, null, 2));
    } else {
      console.log('Search query:', args.name, args.size ? `(${args.size})` : '');
      if (sdsUrl) {
        console.log('SDS URL:', sdsUrl);
      } else {
        console.log('No SDS found');
      }
      if (topLinks?.length) {
        console.log('\nTop candidate links:');
        for (const l of topLinks) console.log(' -', l);
      }
    }
  } catch (err) {
    console.error('Search failed:', err);
    process.exit(2);
  }
}

// Execute when run directly
if (process.argv[1] && /sdsSearch\.(ts|js)$/.test(process.argv[1])) {
  main();
}

export {};

