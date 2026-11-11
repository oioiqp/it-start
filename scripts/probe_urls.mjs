async function probeDirectum() {
  const res = await fetch('https://career.directum.ru/vacancy/');
  const html = await res.text();
  const matches = [...html.matchAll(/href=["'](\/vacancy\/[^"']+)["']/g)].map(m => m[1]);
  console.log('Directum vacancies found:', [...new Set(matches)]);
}

async function probeT1() {
  const res = await fetch('https://career.t1.ru/vacancies');
  const html = await res.text();
  const matches = [...html.matchAll(/href=["'](\/vacancies\/[^"']+)["']/g)].map(m => m[1]);
  console.log('T1 vacancies found:', [...new Set(matches)].slice(0, 10));
}

async function probeAvito() {
  const res = await fetch('https://career.avito.com/vacancies/razrabotka/20803/');
  console.log('Avito 20803 status:', res.status);
  const res2 = await fetch('https://career.avito.com/vacancies/razrabotka/20812/');
  console.log('Avito 20812 status:', res2.status);
  const res3 = await fetch('https://career.avito.com/vacancies/analitika-dannykh/20816/');
  console.log('Avito 20816 status:', res3.status);
}

Promise.all([probeDirectum(), probeT1(), probeAvito()]);
