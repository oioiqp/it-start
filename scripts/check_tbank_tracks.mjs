process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function checkTracks() {
  const res = await fetch('https://education.tbank.ru/start/', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    }
  });
  const html = await res.text();
  // Find all links on the page
  const allHrefs = [...html.matchAll(/href=["']([^"']+)["']/g)].map(m => m[1]);
  console.log('All hrefs on /start/:', [...new Set(allHrefs)]);
}
checkTracks();
