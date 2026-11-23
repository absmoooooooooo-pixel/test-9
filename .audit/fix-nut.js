const fs=require('fs'),os=require('os'),path=require('path'),{execFileSync}=require('child_process');
const STRINGS=[
 "ISO 4017 (metric) size table. Choosing a size fills in its standard dimensions; every filled value can still be edited.",
 "A fully threaded bolt carries thread over its whole length, so no separate thread length is needed.",
 "Hex Bolt, Full Thread — front view and side view, dimensions in millimetres",
 "Hex Bolt, Full Thread, front view and side view, dimensions in millimetres",
 "Enter nominal thread diameter (d)",
 "Enter thread pitch (p)",
 "Enter bolt length (l)",
 "Enter width across flats (s)",
 "Enter head height (k)"
];
const LANGS=['mr','hi','de','es','fr','ja','pt','ar'];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function req(text,tl){const s=process.pid+'-'+Math.random().toString(36).slice(2);
 const i=path.join(os.tmpdir(),'fn-'+s+'.txt'),o=path.join(os.tmpdir(),'fn-'+s+'.json');
 fs.writeFileSync(i,text,'utf8');
 execFileSync('curl',['-sS','--max-time','40','--get','https://clients5.google.com/translate_a/t','--data-urlencode','client=dict-chrome-ex','--data-urlencode','sl=en','--data-urlencode','tl='+tl,'--data-urlencode','q@'+i,'-o',o]);
 const b=fs.readFileSync(o,'utf8');[i,o].forEach(f=>{try{fs.unlinkSync(f)}catch(e){}});
 if(!/^\s*\[/.test(b)) throw new Error('throttled');
 const p=JSON.parse(b);return (Array.isArray(p[0])?p[0].map(x=>x[0]||'').join(''):p.map(x=>(Array.isArray(x)?x[0]:x)||'').join('')).trim();}
(async()=>{ for(const lang of LANGS){ const cf='.audit/cache-'+lang+'.json'; const c=JSON.parse(fs.readFileSync(cf,'utf8')); let added=0;
 for(const key of STRINGS){ if(c[key]) continue; let out; for(let a=1;a<=6;a++){try{out=await req(key,lang);break}catch(e){await sleep(4000*a);}} if(!out){console.log(lang,'FAIL',key.slice(0,30));continue;} c[key]=out; added++; await sleep(120);} fs.writeFileSync(cf,JSON.stringify(c,null,1)); console.log(lang,'added',added); }})();
