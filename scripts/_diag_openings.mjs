import fs from 'fs';
const sec=Object.fromEntries(fs.readFileSync('.secret','utf8').split(/\r?\n/).filter(l=>l&&!l.startsWith('#')&&l.includes('=')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(),l.slice(i+1).trim()];}));
const KEY=sec.SUPABASE_KEY,URL='https://dbabjfydcllqbjpolhym.supabase.co';
async function q(p){const r=await fetch(`${URL}/rest/v1/${p}`,{headers:{apikey:KEY,Authorization:`Bearer ${KEY}`}});if(!r.ok)throw new Error(`${p} -> ${r.status} ${await r.text()}`);return r.json();}
async function rpc(fn,body){const r=await fetch(`${URL}/rest/v1/rpc/${fn}`,{method:'POST',headers:{apikey:KEY,Authorization:`Bearer ${KEY}`,'Content-Type':'application/json'},body:JSON.stringify(body||{})});const t=await r.text();return {ok:r.ok,status:r.status,body:t};}

// 1) verify new RPC
const r1=await rpc('get_active_listing_providers',{p_province:'British Columbia',p_country:'Canada'});
console.log('=== get_active_listing_providers(BC,Canada) ===',r1.status);
console.log(r1.body,'\n');

// 2) openings: who owns what vs worker text
const today=new Date().toISOString().split('T')[0];
const ops=await q(`openings?select=user_id,worker,service,date,is_available&date=gte.${today}&is_available=eq.true&limit=1000`);
// group by user_id -> distinct worker names
const byOwner={};
for(const o of ops){(byOwner[o.user_id]=byOwner[o.user_id]||new Set()).add(o.worker);}
console.log('=== future available openings: owner user_id -> distinct worker text ===');
for(const [uid,set] of Object.entries(byOwner)){
  const n=(await q(`profiles?select=full_name&id=eq.${uid}`))[0]?.full_name||'?';
  console.log(`  owner ${n} (${uid}): workers=${JSON.stringify([...set])}`);
}
