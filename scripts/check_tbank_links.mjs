process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function checkEducationLinks() {
  const res = await fetch('https://education.tbank.ru/start/', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    }
  });
  const html = await res.text();
  const matches = [...html.matchAll(/href=["']([^"']+)["']/g)].map(m => m[1]);
  const startLinks = [...new Set(matches.filter(l => l.includes('start') || l.includes('career') || l.includes('fintech') || l.includes('vacanc') || l.includes('course') || l.includes('programs')))];
  console.log('Links on education.tbank.ru/start/:', startLinks);
}
checkEducationLinks();
