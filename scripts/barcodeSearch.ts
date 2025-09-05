// scripts/barcodeSearch.ts
// Simple CLI to resolve a product name/size from a barcode via web search.
// Optionally also look up an SDS URL using the discovered name/size.
// Usage:
//   npm run scan:barcode -- --code 4045989470754 [--sds] [--fresh] [--json]

import { searchItemByBarcode, fetchSdsByName } from '../server/utils/scraper.js';

type Args = {
  code?: string;
  sds?: boolean;
  fresh?: boolean;
  json?: boolean;
};

function parseArgs(argv: string[]): Args {
  const out: Args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if ((a === '--code' || a === '--barcode') && argv[i + 1]) out.code = argv[++i];
    else if (a === '--sds') out.sds = true;
    else if (a === '--fresh' || a === '--force' || a === '--no-cache') out.fresh = true;
    else if (a === '--json') out.json = true;
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.code) {
    console.error('Usage: npm run scan:barcode -- --code <barcode> [--sds] [--fresh] [--json]');
    process.exit(1);
  }

  try {
    const info = await searchItemByBarcode(args.code);
    if (!info) {
      if (args.json) {
        console.log(JSON.stringify({ code: args.code, found: false }, null, 2));
      } else {
        console.log('No product info found for barcode:', args.code);
      }
      process.exit(0);
    }

    let sdsUrl: string | undefined;
    let topLinks: string[] | undefined;
    if (args.sds) {
      const sds = await fetchSdsByName(info.name, info.contents_size_weight, false, !!args.fresh);
      sdsUrl = sds.sdsUrl;
      topLinks = sds.topLinks;
    }

    if (args.json) {
      console.log(
        JSON.stringify(
          {
            code: args.code,
            found: true,
            name: info.name,
            size: info.contents_size_weight || '',
            sdsUrl: sdsUrl || '',
            topLinks: topLinks || [],
          },
          null,
          2,
        ),
      );
    } else {
      console.log('Barcode:', args.code);
      console.log('Name:', info.name);
      if (info.contents_size_weight) console.log('Size:', info.contents_size_weight);
      if (sdsUrl) {
        console.log('SDS URL:', sdsUrl);
        if (topLinks?.length) {
          console.log('\nTop candidate links:');
          for (const l of topLinks) console.log(' -', l);
        }
      }
    }
  } catch (err) {
    console.error('Barcode search failed:', err);
    process.exit(2);
  }
}

if (process.argv[1] && /barcodeSearch\.(ts|js)$/.test(process.argv[1])) {
  main();
}

export {};

