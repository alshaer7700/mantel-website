import { chromium } from 'playwright';
import fs from 'fs';

const OUT = '/home/user/mantel-website/docs/element-map';
const BASE = 'http://localhost:4190';

const MENU = [
  { id: 'c1', name: 'Mantel Latte',   desc: 'House espresso, silky milk',        price: 2.2,  category: 'coffee', image_url: null, is_available: true, sort_order: 1 },
  { id: 'c2', name: 'Flat White',     desc: 'Double ristretto, microfoam',       price: 2.0,  category: 'coffee', image_url: null, is_available: true, sort_order: 2 },
  { id: 'c3', name: 'Filter Brew',    desc: 'Rotating single origin',            price: 1.8,  category: 'coffee', image_url: null, is_available: true, sort_order: 3 },
  { id: 'f1', name: 'Butter Croissant', desc: 'Baked each morning',              price: 1.5,  category: 'food',   image_url: null, is_available: true, sort_order: 1 },
  { id: 'f2', name: 'Date Cake',      desc: 'Bahraini dates, tahini glaze',      price: 1.9,  category: 'food',   image_url: null, is_available: true, sort_order: 2 },
];

// category -> colour
const CAT = {
  A:'#b8006d', B:'#c2185b', C:'#7b1fa2', D:'#512da8', E:'#1565c0', F:'#00838f',
  G:'#2e7d32', H:'#ef6c00', I:'#8d6e63', J:'#455a64', K:'#546e7a', L:'#ad1457', M:'#d84315',
  '—':'#9e9e9e',
};
const CATNAME = {
  A:'Logo', B:'Display', C:'Section', D:'Feature', E:'Nav', F:'Body', G:'Button',
  H:'Input', I:'Helper', J:'Footer', K:'Copyright', L:'UI Label', M:'Numeric', '—':'Icon/Image',
};

/* ── in-page annotator ───────────────────────────────────────────── */
const ANNOTATE = ({ specs, CAT, CATNAME, title }) => {
  document.querySelectorAll('.__mapLayer').forEach(n => n.remove());
  const layer = document.createElement('div');
  layer.className = '__mapLayer';
  Object.assign(layer.style, {
    position:'fixed', inset:'0', zIndex:'2147483647', pointerEvents:'none',
    font:'600 11px ui-monospace,SFMono-Regular,Menlo,monospace',
  });
  document.body.appendChild(layer);

  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  Object.assign(svg.style,{position:'fixed',inset:'0',width:'100%',height:'100%'});
  layer.appendChild(svg);

  const LEGEND_H = 34;
  const blockers = [{x:0,y:innerHeight-LEGEND_H,w:innerWidth,h:LEGEND_H}];
  const chips = [];
  const overlap=(a,b,pad=4)=> a.x < b.x+b.w+pad && a.x+a.w+pad > b.x && a.y < b.y+b.h+pad && a.y+a.h+pad > b.y;
  const free = (c) => !blockers.some(b=>overlap(c,b)) && !chips.some(b=>overlap(c,b));

  // resolve everything first so chips can avoid *all* target boxes
  const items = [];
  const missing = [];
  for (const s of specs) {
    let el=null; try { el = eval(s.find); } catch(e){}
    if (!el || !el.getBoundingClientRect) { missing.push(s.id); continue; }
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) { missing.push(s.id); continue; }
    items.push({ ...s, r });
  }
  items.forEach(i => blockers.push({x:i.r.left-2,y:i.r.top-2,w:i.r.width+4,h:i.r.height+4}));
  // label denser/smaller elements first — they have the least room
  items.sort((a,b)=>(a.r.width*a.r.height)-(b.r.width*b.r.height));

  const cats = new Set();
  for (const it of items) {
    const colour = CAT[it.cat] || '#9e9e9e';
    cats.add(it.cat);
    const r = it.r;

    const box = document.createElement('div');
    Object.assign(box.style,{
      position:'fixed', left:`${r.left-2}px`, top:`${r.top-2}px`,
      width:`${r.width+4}px`, height:`${r.height+4}px`,
      border:`1.5px solid ${colour}`, borderRadius:'3px', background:`${colour}14`,
    });
    layer.appendChild(box);

    const chip = document.createElement('div');
    chip.textContent = it.id;
    Object.assign(chip.style,{
      position:'fixed', background:colour, color:'#fff', padding:'2px 6px',
      borderRadius:'3px', whiteSpace:'nowrap', boxShadow:'0 1px 4px rgba(0,0,0,.4)',
    });
    layer.appendChild(chip);
    const w = chip.offsetWidth, h = chip.offsetHeight;
    const cx = r.left + r.width/2, cy = r.top + r.height/2;

    // search outward for a free slot
    let best=null;
    for (const d of [10,26,46,72,104,142,186,236]) {
      const ring = [
        [r.right+d, cy-h/2], [r.left-w-d, cy-h/2],
        [cx-w/2, r.top-h-d], [cx-w/2, r.bottom+d],
        [r.right+d, r.top-h-d], [r.left-w-d, r.top-h-d],
        [r.right+d, r.bottom+d], [r.left-w-d, r.bottom+d],
      ];
      for (const [x,y] of ring) {
        if (x<3||y<3||x+w>innerWidth-3||y+h>innerHeight-3) continue;
        const c={x,y,w,h};
        if (free(c)) { best=c; break; }
      }
      if (best) break;
    }
    if (!best) {                       // grid scan, nearest free slot to the element
      let bd = Infinity;
      for (let y=3; y<=innerHeight-h-3; y+=10)
        for (let x=3; x<=innerWidth-w-3; x+=10) {
          const c={x,y,w,h};
          if (!free(c)) continue;
          const d=Math.hypot(x+w/2-cx, y+h/2-cy);
          if (d<bd) { bd=d; best=c; }
        }
    }
    if (!best) best = { x:3, y:3, w, h };
    chip.style.left=`${best.x}px`; chip.style.top=`${best.y}px`;
    chips.push(best);

    // leader line from chip edge to element edge
    const chipCx = best.x+w/2, chipCy = best.y+h/2;
    const gap = Math.hypot(chipCx-cx, chipCy-cy) - r.width/2 - w/2;
    if (gap > 6) {
      const ln = document.createElementNS('http://www.w3.org/2000/svg','line');
      const ex = Math.max(r.left, Math.min(chipCx, r.right));
      const ey = Math.max(r.top,  Math.min(chipCy, r.bottom));
      ln.setAttribute('x1',chipCx); ln.setAttribute('y1',chipCy);
      ln.setAttribute('x2',ex);     ln.setAttribute('y2',ey);
      ln.setAttribute('stroke',colour); ln.setAttribute('stroke-width','1.2');
      ln.setAttribute('stroke-dasharray','3,2'); ln.setAttribute('opacity','.85');
      svg.appendChild(ln);
    }
  }

  const leg = document.createElement('div');
  Object.assign(leg.style,{position:'fixed',left:'0',right:'0',bottom:'0',height:`${LEGEND_H}px`,
    background:'rgba(255,255,255,.98)',borderTop:'1px solid #ddd',padding:'0 12px',
    display:'flex',alignItems:'center',flexWrap:'wrap',gap:'12px',
    font:'600 10px ui-monospace,Menlo,monospace',color:'#222'});
  const t=document.createElement('span');
  t.textContent=title;
  t.style.cssText='background:#111;color:#fff;padding:3px 9px;border-radius:3px;letter-spacing:.05em;font-size:10px';
  leg.appendChild(t);
  const sep=document.createElement('span');
  sep.style.cssText='width:1px;height:14px;background:#ccc';
  leg.appendChild(sep);
  [...cats].sort().forEach(c=>{
    const i=document.createElement('span');
    i.style.cssText='display:inline-flex;align-items:center;gap:4px';
    i.innerHTML=`<span style="width:9px;height:9px;border-radius:2px;background:${CAT[c]||'#9e9e9e'};display:inline-block"></span>${c} ${CATNAME[c]||''}`;
    leg.appendChild(i);
  });
  layer.appendChild(leg);

  return { found: items.map(i=>i.id), missing };
};

/* ── surface definitions ─────────────────────────────────────────── */
const DRW = `document.querySelector('button[aria-label="Close cart"]').closest('div[class*="fixed"]')`;
const DT  = (sel, txt) => `[...${DRW}.querySelectorAll('${sel}')].find(e=>e.textContent.trim()===${JSON.stringify(txt)})`;
const DTC = (sel, txt) => `[...${DRW}.querySelectorAll('${sel}')].find(e=>e.textContent.trim().startsWith(${JSON.stringify(txt)}))`;
const T = (sel, txt) => `[...document.querySelectorAll('${sel}')].find(e=>e.textContent.trim()===${JSON.stringify(txt)})`;
const TC = (sel, txt) => `[...document.querySelectorAll('${sel}')].find(e=>e.textContent.trim().startsWith(${JSON.stringify(txt)}))`;

const NAV = [
  { id:'NAV-01', cat:'—', find:`document.querySelector('nav button[aria-label="Open navigation"]')` },
  { id:'NAV-02', cat:'A', find:`document.querySelector('nav img[alt="Mantel"]')` },
  { id:'NAV-03', cat:'—', find:`document.querySelector('nav button[aria-label="Country and language"] span')` },
  { id:'NAV-04', cat:'E', find:`document.querySelectorAll('nav button[aria-label="Country and language"] span')[1]` },
  { id:'NAV-05', cat:'—', find:`document.querySelector('nav button[aria-label="Country and language"] svg')` },
  { id:'NAV-06', cat:'—', find:`document.querySelector('nav button[aria-label="Search"]')` },
  { id:'NAV-07', cat:'—', find:`document.querySelector('nav button[aria-label="Account"]')` },
  { id:'NAV-08', cat:'—', find:`document.querySelector('nav button[aria-label="Cart"]')` },
  { id:'NAV-09', cat:'M', find:`document.querySelector('nav button[aria-label="Cart"] span')` },
];
const FOOT = [
  { id:'FOOT-01', cat:'—', find:`document.querySelector('footer a[aria-label="Instagram"]')` },
  { id:'FOOT-03', cat:'J', find:`${T('footer button','Terms and Policies')}` },
  { id:'FOOT-04', cat:'K', find:`${TC('footer p','© 2026')}` },
];

const SURFACES = [
  {
    file: '01-home.png', title: 'HOME  ·  NAV-*  HOME-*  FOOT-*',
    setup: async () => {},
    specs: [...NAV, ...FOOT,
      { id:'HOME-01', cat:'—', find:`document.querySelector('main img[alt="Mantel heart"]')` },
      { id:'HOME-02', cat:'G', find:`${T('main button','Our Story')}` },
      { id:'HOME-03', cat:'G', find:`${T('main button','Menu')}` },
    ],
  },
  {
    file: '02-header-locale.png', title: 'HEADER · locale popover  ·  NAV-10  NAV-11',
    setup: async (p) => { await p.click('nav button[aria-label="Country and language"]'); await p.waitForTimeout(250); },
    specs: [...NAV,
      { id:'NAV-10', cat:'F', find:`${TC('nav p','🇧🇭 Bahrain')}` },
      { id:'NAV-11', cat:'I', find:`${TC('nav p','More regions')}` },
    ],
  },
  {
    file: '03-sidebar.png', title: 'SIDEBAR DRAWER  ·  SIDE-*',
    setup: async (p) => { await p.click('nav button[aria-label="Open navigation"]'); await p.waitForTimeout(450); },
    specs: [
      { id:'SIDE-01', cat:'—', find:`document.querySelector('button[aria-label="Close"]')` },
      { id:'SIDE-02', cat:'A', find:`[...document.querySelectorAll('img[alt="Mantel"]')].pop()` },
      { id:'SIDE-03', cat:'E', find:`${T('nav button','Menu')}` },
      { id:'SIDE-04', cat:'E', find:`${T('nav button','Contact')}` },
      { id:'SIDE-05', cat:'E', find:`${T('nav button','Our Story')}` },
      { id:'SIDE-06', cat:'E', find:`${T('nav span','Pick Up')}` },
      { id:'SIDE-07', cat:'I', find:`${T('nav span','order before you reach')}` },
      { id:'SIDE-08', cat:'E', find:`${T('nav button','FAQ')}` },
      { id:'SIDE-09', cat:'—', find:`[...document.querySelectorAll('a[href*="instagram"]')][0]` },
    ],
  },
  {
    file: '04-search.png', title: 'SEARCH PANEL  ·  SRCH-*',
    setup: async (p) => {
      await p.click('nav button[aria-label="Search"]'); await p.waitForTimeout(250);
      await p.fill('input[placeholder="Search the menu…"]', 'latte'); await p.waitForTimeout(300);
    },
    specs: [...NAV,
      { id:'SRCH-01', cat:'H', find:`document.querySelector('input[placeholder="Search the menu…"]')` },
      { id:'SRCH-02', cat:'—', find:`document.querySelector('button[aria-label="Close search"]')` },
      { id:'SRCH-04', cat:'F', find:`${T('span','Mantel Latte')}` },
      { id:'SRCH-05', cat:'L', find:`${T('span','Coffee & Espresso')}` },
      { id:'SRCH-06', cat:'M', find:`${TC('span','BD 2.200')}` },
    ],
  },
  {
    file: '05-account.png', title: 'ACCOUNT PANEL (signed out)  ·  ACCT-05 … ACCT-09',
    setup: async (p) => { await p.click('nav button[aria-label="Account"]'); await p.waitForTimeout(250); },
    specs: [...NAV,
      { id:'ACCT-05', cat:'C', find:`${T('p','Your details')}` },
      { id:'ACCT-06', cat:'H', find:`document.querySelector('input[placeholder="Name"]')` },
      { id:'ACCT-07', cat:'H', find:`document.querySelector('input[placeholder="Email"]')` },
      { id:'ACCT-08', cat:'G', find:`${T('button','Save')}` },
      { id:'ACCT-09', cat:'I', find:`${TC('p','Saved on this device only')}` },
    ],
  },
  {
    file: '06-cart-drawer.png', title: 'CART DRAWER  ·  CART-*  LINE-*',
    setup: async (p) => { await p.click('nav button[aria-label="Cart"]'); await p.waitForTimeout(450); },
    specs: [...NAV,
      { id:'CART-01', cat:'C', find:`${DT('p','Your Bag')}` },
      { id:'CART-02', cat:'—', find:`document.querySelector('button[aria-label="Close cart"]')` },
      { id:'CART-05', cat:'F', find:`${DT('span','Subtotal')}` },
      { id:'CART-06', cat:'M', find:`${DT('span','Subtotal')}.nextElementSibling` },
      { id:'CART-07', cat:'G', find:`${DT('button','Go to Order Before Reach')}` },
      { id:'LINE-01', cat:'F', find:`${DT('p','Mantel Latte')}` },
      { id:'LINE-02', cat:'M', find:`${DT('p','BD 2.200')}` },
      { id:'LINE-03', cat:'—', find:`${DRW}.querySelector('button[aria-label^="Remove one"]')` },
      { id:'LINE-04', cat:'M', find:`${DRW}.querySelector('button[aria-label^="Remove one"]').nextElementSibling` },
      { id:'LINE-05', cat:'—', find:`${DRW}.querySelector('button[aria-label^="Add one"]')` },
    ],
  },
  {
    file: '07-menu-categories.png', title: 'MENU · category select  ·  MENU-03  MENU-04',
    setup: async (p) => { await p.evaluate(() => window.__go('menu')); await p.waitForTimeout(400); },
    specs: [...NAV, ...FOOT,
      { id:'MENU-03', cat:'G', find:`${T('main button','Coffee & Espresso')}` },
      { id:'MENU-04', cat:'G', find:`${T('main button','Food & Pastries')}` },
    ],
  },
  {
    file: '08-menu-list.png', title: 'MENU · item list  ·  MENU-05  MENU-06  MITEM-*',
    setup: async (p) => {
      await p.evaluate(() => window.__go('menu')); await p.waitForTimeout(350);
      await p.getByRole('button', { name: 'Coffee & Espresso', exact: true }).click(); await p.waitForTimeout(350);
    },
    specs: [...NAV,
      { id:'MENU-05', cat:'L', find:`${TC('main button','← Back')}` },
      { id:'MENU-06', cat:'C', find:`document.querySelector('main h2')` },
      { id:'MITEM-01', cat:'F', find:`${T('main p','Mantel Latte')}` },
      { id:'MITEM-02', cat:'F', find:`${T('main p','House espresso, silky milk')}` },
      { id:'MITEM-03', cat:'M', find:`${T('main span','BD 2.200')}` },
    ],
  },
  {
    file: '09-order.png', title: 'ORDER BEFORE REACH  ·  ORD-*  OITEM-*',
    setup: async (p) => { await p.evaluate(() => window.__go('order')); await p.waitForTimeout(450); },
    specs: [...NAV,
      { id:'ORD-01', cat:'B', find:`document.querySelector('main h1')` },
      { id:'ORD-02', cat:'I', find:`${T('main p','order before you reach')}` },
      { id:'ORD-05', cat:'C', find:`document.querySelectorAll('main h2')[0]` },
      { id:'OITEM-01', cat:'F', find:`${T('main p','Mantel Latte')}` },
      { id:'OITEM-02', cat:'F', find:`${T('main p','House espresso, silky milk')}` },
      { id:'OITEM-03', cat:'M', find:`${T('main span','BD 2.200')}` },
      { id:'OITEM-04', cat:'—', find:`document.querySelector('button[aria-label^="Add Mantel Latte"]')` },
    ],
  },
  {
    file: '10-order-bag.png', title: 'ORDER BEFORE REACH · bag + checkout  ·  ORD-07 … ORD-16',
    setup: async (p) => {
      await p.evaluate(() => window.__go('order')); await p.waitForTimeout(400);
      await p.evaluate(() => { const h=[...document.querySelectorAll('h2')].find(e=>e.textContent.trim()==='Your Bag'); h&&h.scrollIntoView({block:'start'}); window.scrollBy(0,-90); });
      await p.waitForTimeout(400);
    },
    specs: [
      { id:'ORD-07', cat:'C', find:`${T('main h2','Your Bag')}` },
      { id:'ORD-10', cat:'F', find:`${T('main span','Subtotal')}` },
      { id:'ORD-11', cat:'M', find:`${T('main span','Subtotal')}.nextElementSibling` },
      { id:'ORD-12', cat:'L', find:`${T('main span','Payment')}` },
      { id:'ORD-13', cat:'G', find:`${TC('main button','Card — Coming Soon')}` },
      { id:'ORD-15', cat:'G', find:`${T('main button','Ordering Opens Soon')}` },
      { id:'ORD-16', cat:'I', find:`${TC('main p','Online ordering is launching')}` },
      { id:'LINE-01', cat:'F', find:`[...document.querySelectorAll('main p')].filter(e=>e.textContent.trim()==='Mantel Latte').pop()` },
      { id:'LINE-02', cat:'M', find:`${T('main p','BD 2.200')}` },
      { id:'LINE-04', cat:'M', find:`document.querySelector('main button[aria-label^="Remove one"]').nextElementSibling` },
    ],
  },
  {
    file: '11-contact.png', title: 'CONTACT  ·  CONT-*',
    setup: async (p) => { await p.evaluate(() => window.__go('contact')); await p.waitForTimeout(450); },
    specs: [...NAV,
      { id:'CONT-01', cat:'B', find:`document.querySelector('main h1')` },
      { id:'CONT-03', cat:'H', find:`document.querySelector('input[placeholder="Name"]')` },
      { id:'CONT-04', cat:'H', find:`document.querySelector('input[placeholder="Email *"]')` },
      { id:'CONT-05', cat:'H', find:`document.querySelector('input[placeholder="Phone number"]')` },
      { id:'CONT-06', cat:'H', find:`document.querySelector('textarea[placeholder="Comment"]')` },
      { id:'CONT-08', cat:'G', find:`${T('button','Send')}` },
    ],
  },
  {
    file: '12-faq.png', title: 'FAQ  ·  FAQ-*',
    setup: async (p) => {
      await p.evaluate(() => window.__go('faq')); await p.waitForTimeout(400);
      await p.getByRole('button', { name: /What is Order Before Reach/i }).click(); await p.waitForTimeout(350);
    },
    specs: [...NAV,
      { id:'FAQ-01', cat:'B', find:`document.querySelector('main h1')` },
      { id:'FAQ-02', cat:'L', find:`${TC('span','What is Order Before Reach')}` },
      { id:'FAQ-03', cat:'—', find:`document.querySelector('main [aria-expanded="true"] svg')` },
      { id:'FAQ-04', cat:'F', find:`${TC('p',"It's our pick-up ordering")}` },
    ],
  },
  {
    file: '13-newsletter.png', title: 'NEWSLETTER  ·  NEWS-*',
    setup: async (p) => {
      await p.evaluate(() => window.__go('faq')); await p.waitForTimeout(400);
      await p.evaluate(() => { const h=[...document.querySelectorAll('h2')].find(e=>e.textContent.includes('New Sips')); h&&h.scrollIntoView({block:'center'}); });
      await p.waitForTimeout(400);
    },
    specs: [
      { id:'NEWS-01', cat:'D', find:`${TC('h2','New Sips')}` },
      { id:'NEWS-02', cat:'F', find:`${TC('p','Be the first to know')}` },
      { id:'NEWS-04', cat:'H', find:`document.querySelector('input[placeholder="Email address"]')` },
      { id:'NEWS-05', cat:'—', find:`document.querySelector('button[aria-label="Sign up"]')` },
    ],
  },
  {
    file: '14-policy.png', title: 'POLICY PAGES  ·  POL-*',
    setup: async (p) => { await p.evaluate(() => window.__go('privacy')); await p.waitForTimeout(450); },
    specs: [...NAV,
      { id:'POL-01', cat:'B', find:`document.querySelector('main h1')` },
      { id:'POL-02', cat:'L', find:`${TC('main p','Last updated')}` },
      { id:'POL-03', cat:'L', find:`${T('main h2','What we collect')}` },
      { id:'POL-04', cat:'F', find:`document.querySelector('main section p')` },
    ],
  },
];

/* ── run ─────────────────────────────────────────────────────────── */
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const report = [];

for (const s of SURFACES) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 2 });
  await ctx.route('**/rest/v1/menu_items*', r =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MENU) }));
  const p = await ctx.newPage();
  await p.addInitScript((cart) => {
    localStorage.setItem('mantel-cart-v2', JSON.stringify(cart));
  }, [{ id:'c1', name:'Mantel Latte', price:2.2, qty:2 }, { id:'f1', name:'Butter Croissant', price:1.5, qty:1 }]);

  await p.goto(BASE, { waitUntil: 'networkidle' });
  // expose the page router so surfaces can navigate without clicking through
  await p.evaluate(() => {
    window.__go = (target) => {
      const open = document.querySelector('nav button[aria-label="Open navigation"]');
      open && open.click();
      const map = { menu:'Menu', contact:'Contact', order:'Pick Up', faq:'FAQ' };
      setTimeout(() => {
        if (target === 'privacy') {
          [...document.querySelectorAll('footer button')].find(b=>b.textContent.trim()==='Terms and Policies')?.click();
          setTimeout(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Privacy policy')?.click(), 120);
          return;
        }
        const label = map[target];
        const btn = [...document.querySelectorAll('nav button, nav span')].find(e => e.textContent.trim() === label);
        (btn?.closest('button') || btn)?.click();
      }, 120);
    };
  });

  try { await s.setup(p); } catch (e) { console.log(`  setup warn [${s.file}]: ${e.message.split('\n')[0]}`); }
  await p.waitForTimeout(350);

  const res = await p.evaluate(ANNOTATE, { specs: s.specs, CAT, CATNAME, title: s.title });
  await p.screenshot({ path: `${OUT}/${s.file}` });
  report.push({ file: s.file, found: res.found.length, total: s.specs.length, missing: res.missing });
  console.log(`${s.file.padEnd(28)} ${res.found.length}/${s.specs.length}` + (res.missing.length ? `  MISSING: ${res.missing.join(', ')}` : ''));
  await ctx.close();
}

await browser.close();
fs.writeFileSync(`${OUT}/_report.json`, JSON.stringify(report, null, 2));
console.log('\ndone');
