const fs=require('fs'),os=require('os'),path=require('path'),{execFileSync}=require('child_process');
const STRINGS=[
 "W = Weight (kg) · R = Inside radius, ID ÷ 2 (mm) · SF = Straight flange (mm) · T = Thickness (mm) · ρ = Density (kg/m³)",
 "Flat plate area: A",
 "plate",
 "= π × R² with R = ID ÷ 2.",
 "= 2π × R × SF, treated as a cylindrical flange of height SF.",
 "Developed blank: Ø = 2 × √((A",
 "The knuckle radius R is the corner radius between the flat crown and the straight flange; the crown diameter is ID − 2R and the crown sits R above the tangent line."
];
const LANGS=['mr','hi','de','es','fr','ja','pt','ar'];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function req(text,tl){const s=process.pid+'-'+Math.random().toString(36).slice(2);
 const i=path.join(os.tmpdir(),'fd-'+s+'.txt'),o=path.join(os.tmpdir(),'fd-'+s+'.json');
 fs.writeFileSync(i,text,'utf8');
 execFileSync('curl',['-sS','--max-time','40','--get','https://clients5.google.com/translate_a/t','--data-urlencode','client=dict-chrome-ex','--data-urlencode','sl=en','--data-urlencode','tl='+tl,'--data-urlencode','q@'+i,'-o',o]);
 const b=fs.readFileSync(o,'utf8');[i,o].forEach(f=>{try{fs.unlinkSync(f)}catch(e){}});
 if(!/^\s*\[/.test(b)) throw new Error('throttled');
 const p=JSON.parse(b);return (Array.isArray(p[0])?p[0].map(x=>x[0]||'').join(''):p.map(x=>(Array.isArray(x)?x[0]:x)||'').join('')).trim();}
(async()=>{
 for(const lang of LANGS){
  const cf='.audit/cache-'+lang+'.json';const c=JSON.parse(fs.readFileSync(cf,'utf8'));
  const todo=STRINGS.filter(k=>!c[k]);
  if(!todo.length){console.log(lang,'skip');continue;}
  for(const key of todo){
   let out; for(let a=1;a<=6;a++){try{out=await req(key,lang);break}catch(e){await sleep(4000*a);}}
   if(!out){console.log(lang,'FAIL',key.slice(0,30));continue;}
   c[key]=out;
   await sleep(150);
  }
  fs.writeFileSync(cf,JSON.stringify(c,null,1));
  console.log(lang,'added',todo.length);
 }
})();
