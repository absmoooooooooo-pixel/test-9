/* Fill strings that only exist after the page scripts run (concatenations). */
const fs=require('fs'),os=require('os'),path=require('path'),{execFileSync}=require('child_process');
const LIST=[
 'Constant thickness, inside-surface dimensions, no forming thinning, mill tolerance, weld bevels, openings or trimming allowance.',
 'W = Weight (kg)',
 'R = Inside radius, ID \u00f7 2 (mm)',
 'SF = Straight flange (mm)',
 'T = Thickness (mm)',
 '\u03c1 = Density (kg/m\u00b3)',
 'C.R = Crown radius = ID (mm)',
 'K.R = Knuckle radius (mm)',
 '\u03b8k, \u03b8c = Knuckle and crown arc angles',
 'Material density ({d} kg/m\u00b3) is multiplied in this step.'
];
const LANGS=['mr','hi','de','es','fr','ja','pt','ar'];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function req(text,tl){const s=process.pid+'-'+Math.random().toString(36).slice(2);
 const i=path.join(os.tmpdir(),'rx-'+s+'.txt'),o=path.join(os.tmpdir(),'rx-'+s+'.json');
 fs.writeFileSync(i,text,'utf8');
 execFileSync('curl',['-sS','--max-time','40','--get','https://clients5.google.com/translate_a/t','--data-urlencode','client=dict-chrome-ex','--data-urlencode','sl=en','--data-urlencode','tl='+tl,'--data-urlencode','q@'+i,'-o',o]);
 const b=fs.readFileSync(o,'utf8');[i,o].forEach(f=>{try{fs.unlinkSync(f)}catch(e){}});
 if(!/^\s*\[/.test(b)) throw new Error('throttled');
 const p=JSON.parse(b);const flat=Array.isArray(p[0])?p[0].map(x=>x[0]||'').join(''):p.map(x=>(Array.isArray(x)?x[0]:x)||'').join('');
 if(!flat) throw new Error('empty');return flat;}
(async()=>{
 for(const lang of LANGS){
  const cf='.audit/cache-'+lang+'.json';const c=JSON.parse(fs.readFileSync(cf,'utf8'));
  const todo=LIST.filter(k=>!c[k]);
  if(!todo.length){console.log(lang,'nothing to do');continue;}
  let out;
  for(let a=1;a<=6;a++){try{out=await req(todo.join(' ||| '),lang);break}catch(e){await sleep(5000*a)}}
  if(!out){console.log(lang,'FAIL');continue;}
  const parts=out.split(/\s*\|\|\|\s*/);
  if(parts.length!==todo.length){console.log(lang,'split mismatch',parts.length,todo.length);continue;}
  todo.forEach((k,i)=>{c[k]=parts[i].trim();});
  fs.writeFileSync(cf,JSON.stringify(c,null,1));
  console.log(lang,'added',todo.length);
  await sleep(200);
 }
})();
