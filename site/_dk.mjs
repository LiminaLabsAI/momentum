import { chromium } from 'playwright';
const [,, url, out, mode] = process.argv;
const b = await chromium.launch();
const ctx = await b.newContext();
const p = await ctx.newPage({ viewport:{width:1280,height:820}, deviceScaleFactor:2 });
await p.addInitScript(()=>{ try{ localStorage.setItem('mm-theme','dark'); }catch(e){} });
await p.goto(url, { waitUntil:'networkidle' });
if (mode === 'cards') {
  for (const h of await p.$$('h2')) { if((await h.innerText()).includes('Better context in')){ await h.scrollIntoViewIfNeeded(); break; } }
  await p.evaluate(()=>window.scrollBy(0,120));
} else if (mode === 'diagram') {
  const svg = await p.$('.doc svg[aria-roledescription]');
  if (svg) await svg.scrollIntoViewIfNeeded();
  await p.evaluate(()=>window.scrollBy(0,-120));
}
await p.waitForTimeout(500);
await p.screenshot({ path: out });
await b.close();
console.log('ok', out);
