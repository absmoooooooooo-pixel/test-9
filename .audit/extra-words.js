const fs=require('fs'),os=require('os'),path=require('path'),{execFileSync}=require('child_process');
const WORDS=['Open','tools','tool'];
const LANGS=['mr','hi','de','es','fr','ja','pt','ar'];
const cache=JSON.parse(fs.readFileSync('.audit/cache-de.json','utf8')); // placeholder to ensure file exists
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function req(text,tl){const s=process.pid+'-'+Math.random().toString(36).slice(2);
 const i=path.join(os.tmpdir(),'w-'+s+'.txt'),o=path.join(os.tmpdir(),'w-'+s+'.json');
 fs.writeFileSync(i,text,'utf8');
 execFileSync('curl',['-sS','--max-time','30','--get','https://clients5.google.com/translate_a/t','--data-urlencode','client=dict-chrome-ex','--data-urlencode','sl=en','--data-urlencode','tl='+tl,'--data-urlencode','q@'+i,'-o',o]);
 const b=fs.readFileSync(o,'utf8');[i,o].forEach(f=>{try{fs.unlinkSync(f)}catch(e){}});
 if(!/^\s*\[/.test(b)) throw new Error('throttled');
 const p=JSON.parse(b);const flat=Array.isArray(p[0])?p[0].map(x=>x[0]||'').join(''):p.map(x=>(Array.isArray(x)?x[0]:x)||'').join('');
 if(!flat) throw new Error('empty');return flat;}
(async()=>{for(const l of LANGS){let out;for(let a=1;a<=6;a++){try{out=await req(WORDS.join(' ||| '),l);break}catch(e){await sleep(5000*a)}}
 if(!out){console.log(l,'FAIL');continue}
 const parts=out.split(/\s*\|\|\|\s*/);const cf='.audit/cache-'+l+'.json';const c=JSON.parse(fs.readFileSync(cf,'utf8'));
 WORDS.forEach((w,i)=>{c[w]=(parts[i]||w).trim()});
 fs.writeFileSync(cf,JSON.stringify(c,null,1));console.log(l,WORDS.map(w=>c[w]).join(' | '));
 await sleep(200);} })();
