import { performance } from 'node:perf_hooks';

const REQUEST_COUNT = 10;
const REQUEST_TIMEOUT_MS = 60_000;

async function measureDownload(url) {
  let totalBytes = 0;
  let totalMs = 0;

  for (let attempt = 1; attempt <= REQUEST_COUNT; attempt++) {
    try {
      const start = performance.now();
      const response = await fetch(url, {
        headers: { 'accept-encoding': 'identity' },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!response.ok) {
        await response.body?.cancel();
        throw new Error(`HTTP ${response.status}`);
      }

      // Read each chunk before starting the next request.
      if (response.body) {
        for await (const chunk of response.body) {
          totalBytes += chunk.byteLength;
        }
      }
      totalMs += performance.now() - start;
    } catch (error) {
      const reason = error.cause?.code ?? error.message;
      throw new Error(`Request ${attempt}/${REQUEST_COUNT}: ${reason}`);
    }
  }

  const averageMs = totalMs / REQUEST_COUNT;
  const megabitsPerSecond = (totalBytes * 8) / (totalMs / 1_000) / 1_000_000;

  console.log(`Requests: ${REQUEST_COUNT}`);
  console.log(`Average request time: ${averageMs.toFixed(2)} ms`);
  console.log(`Total downloaded: ${totalBytes} bytes`);
  console.log(`Download speed: ${megabitsPerSecond.toFixed(2)} Mbit/s`);
}

async function main(args) {
  const url = URL.parse(args[0] ?? '');
  if (args.length !== 1 || !url || !['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Usage: node speed.mjs <http-or-https-url>');
  }

  await measureDownload(url);
}

main(process.argv.slice(2)).catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
