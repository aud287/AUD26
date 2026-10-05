/* ================= SETTINGS — edited from Blogger > Layout (no code needed) ================= */
const G=k=>String((window.SITE||{})[k]||'').trim();
const LN=k=>G(k).split(/\n+/).map(x=>x.trim()).filter(Boolean);
const KV=k=>{const o={};LN(k).forEach(x=>{const i=x.indexOf('=');if(i>0)o[x.slice(0,i).trim().toLowerCase()]=x.slice(i+1).trim()});return o};
const PP=k=>LN(k).map(x=>x.split('|').map(t=>t.trim()));
const DR=(u,img)=>{const m=/drive\.google\.com.*?(?:\/d\/|[?&]id=)([\w-]+)/.exec(u||'');return m?(img?'https://lh3.googleusercontent.com/d/'+m[1]+'=w800':'https://drive.google.com/uc?export=download&id='+m[1]):u};
const CONFIG={className:G('name')||"CLASS OF 2026",graduationDate:G('date')||"2026-12-19T13:00:00",logo:DR(G('logo'),1),frame:DR(G('frame'),1),frameOpens:G('frameOpens'),backgroundMusic:DR(G('music')),graduationSound:DR(G('gradsound')),socials:KV('social')};
const BU=G('backend'),BACKEND={enabled:/^https:\/\/script\.google\.com\//i.test(BU),apiUrl:BU};
const MS=KV('milestones'),COUNTDOWN_MILESTONES={};Object.keys(MS).forEach(k=>COUNTDOWN_MILESTONES[+k]={sound:DR(MS[k])});
const EVENTS=PP('events').filter(a=>a.length>2).map(a=>({e:a[0],t:a[1],d:a[2].replace(' ','T'),l:a[3]||'',x:a[4]||''}));
const POLLS=PP('polls').filter(a=>a.length>2).map(a=>({q:a[0],o:a.slice(1).map(x=>[x,0])}));
const ANNOUNCEMENTS=PP('announce').filter(a=>a.length>3).map(a=>({title:a[0],text:a[1],image:DR(a[2],1),start:a[3],end:a[4]||'2099-12-31'}));
/* Board items. url = full photo, thumb = small photo (used on board), e = emoji shown until you add a photo, ev:1 = event note */
const MEMORIES=[
{cat:"FIRST DAY",title:"Day one. White coats!",date:"2020-10-04",e:"🎒",url:"",thumb:""},
{ev:1,cat:"SENIOR JACKET",title:"Senior Jacket Day",date:"2026-10-12",e:"🧥",cap:"The jackets are finally here."},
{cat:"FRIENDS",title:"The study squad",date:"2022-03-14",e:"📚"},
{cat:"OSCE",title:"Survived the OSCE",date:"2023-06-20",e:"🩺"},
{cat:"HOSPITAL",title:"Night shift snacks",date:"2025-01-09",e:"🍕"},
{ev:1,cat:"GRADUATION",title:"Last Lecture",date:"2026-11-28",e:"🎤",cap:"One more time, doctors."},
{cat:"TRIPS",title:"Sunset trip",date:"2023-08-18",e:"🌅"},
{cat:"PARTIES",title:"Party time",date:"2024-02-02",e:"🎉"},
{cat:"FUNNY MOMENTS",title:"Caught mid-yawn",date:"2024-11-11",e:"😴"},
{ev:1,cat:"EVENTS",title:"Photo Session",date:"2026-12-05",e:"📸",cap:"Smile. It's the last one."},
{cat:"CLINICAL YEARS",title:"First real patient",date:"2025-05-05",e:"🏥"},
{cat:"LECTURES",title:"Back row legends",date:"2021-04-21",e:"🎓"},
{cat:"FRIENDS",title:"Coffee run",date:"2025-09-15",e:"☕"},
{ev:1,cat:"PARTIES",title:"Graduation Party",date:"2026-12-17",e:"🥳",cap:"Dress up. Dance."},
{cat:"GRADUATION",title:"Almost there",date:"2026-09-20",e:"🏁"},
{cat:"FIRST DAY",title:"Lost in the anatomy lab",date:"2020-10-06",e:"🦴"}
];
const MESSAGES=[
{name:"Dr. Sleepy",message:"We came in as strangers and we leave as a family. 💛",status:"approved",date:"2026-09-19T21:40:00"},
{name:"Anonymous",message:"Thank you for every 3 AM study call.",status:"approved",date:"2026-09-17T02:15:00"},
{name:"Coffee Addict",message:"Still can't believe we actually made it!",status:"approved",date:"2026-09-12T18:05:00"},
{name:"Last Row",message:"Best chaos of my life. Never change.",status:"approved",date:"2026-09-05T14:30:00"},
{name:"Pending",message:"This one is waiting for approval.",status:"pending",date:"2026-09-20T09:00:00"}
];
/* ================= ENGINE ================= */
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const el=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e};
const ok=u=>!!u&&!/^YOUR_/i.test(u),safe=u=>/^(https?:\/\/|data:image\/|\.{0,2}\/|assets\/)/i.test(u||"");
const clean=(s,n)=>String(s||"").replace(/[<>]/g,"").replace(/javascript:/gi,"").trim().slice(0,n);
const fmt=d=>d?new Date(d).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):"";
const ic=(v,c)=>{v=String(v||'');if(/^[a-z0-9_-]+$/.test(v)){const i=new Image();i.src='assets/icons/'+v+'.png';i.alt='';i.loading='lazy';i.decoding='async';i.className='i3 '+(c||'');return i}return el('span',c||'',v)};
const RM=matchMedia('(prefers-reduced-motion:reduce)').matches,GT=new Date(CONFIG.graduationDate).getTime(),gd=new Date(GT);
document.documentElement.classList.add('js');
function toast(t,ms){const x=$('#toast');x.textContent=t;x.classList.add('on');clearTimeout(x._t);x._t=setTimeout(()=>x.classList.remove('on'),ms||3200)}
$$('.cn').forEach(e=>e.textContent=CONFIG.className);
$$('.gd').forEach(e=>e.textContent=gd.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}).toUpperCase());
$$('.gs').forEach(e=>e.textContent=gd.toLocaleDateString('en-GB').replace(/\//g,'.'));
$$('.class-logo').forEach(d=>{if(ok(CONFIG.logo)){const i=new Image();i.decoding='async';i.src=CONFIG.logo;i.alt='Class logo';d.append(i)}else{d.textContent='YOUR LOGO';d.classList.add('placeholder')}});

/* ---- audio + cinematic intro (runs on EVERY load; music starts automatically, or on the first tap if the browser blocks it) ---- */
const bg=new Audio();bg.loop=true;bg.volume=.55;const HM=ok(CONFIG.backgroundMusic);if(HM)bg.src=CONFIG.backgroundMusic;
const LINES=G('intro').split(/\n+/).map(x=>x.trim()).filter(Boolean);
let started=0,gone=0;
function snd(v){$('#sb').textContent=v?'🔊':'🔇';$('#sb').setAttribute('aria-pressed',v?'true':'false');if(v)bg.play().catch(()=>snd(0));else bg.pause()}
function enter(){if(gone)return;gone=1;const i=$('#intro');i.classList.add('out');document.body.classList.remove('lock');setTimeout(()=>{i.remove();mile()},450)}
function begin(){if(started)return;started=1;let i=0;const box=$('#il');
 (function next(){if(gone)return;if(i>=LINES.length){setTimeout(enter,300);return}const last=i==LINES.length-1;box.replaceChildren(el('div','il-line'+(last?' last':''),LINES[i++]));setTimeout(next,last?1500:950)})()}
$('#skip').onclick=enter;$('#sb').onclick=()=>snd(bg.paused);
if(HM)bg.play().then(()=>snd(1)).catch(()=>{});
begin();

/* ---- effects ---- */
function burst(n){if(RM)return;const c=$('#cf'),col=['#8f2440','#c8a25a','#e58a50','#f3cfd0','#6b1a2e'];
 for(let i=0;i<n;i++){const e=el('i');e.style.cssText='left:'+Math.random()*100+'vw;animation-duration:'+(2.4+Math.random()*2.4)+'s;animation-delay:'+Math.random()*.8+'s;background:'+col[i%5];if(i%12==0){e.textContent='🎓';e.style.cssText+=';background:none;font-size:24px;width:auto;height:auto'}c.append(e)}
 setTimeout(()=>c.replaceChildren(),6500)}
if(!RM){const f=$('#fx'),n=innerWidth<700?9:18;for(let i=0;i<n;i++){const s=el('i','sp',['✦','✧','✦','🎓'][i%4]);s.style.cssText='left:'+Math.random()*100+'%;top:'+Math.random()*100+'%;font-size:'+(10+Math.random()*14)+'px;animation-delay:'+Math.random()*6+'s;animation-duration:'+(5+Math.random()*5)+'s';f.append(s)}}

/* ---- countdown + graduation mode ---- */
let grad=0;
function tick(){const ms=GT-Date.now(),t=Math.max(0,Math.floor(ms/1e3));
 [['d',Math.floor(t/86400)],['h',Math.floor(t/3600)%24],['m',Math.floor(t/60)%60],['s',t%60]].forEach(([k,v])=>$('#'+k).textContent=k=='d'?v:String(v).padStart(2,'0'));
 if(ms<=0&&!grad){grad=1;document.body.classList.add('grad');$('#ht').textContent='WE DID IT.';$('#hs').textContent=gd.toLocaleDateString('en-GB').replace(/\//g,'.')+' · THE CHAPTER IS COMPLETE.'}}
tick();setInterval(tick,1000);
/* ---- exam roadmap: horizontal path of stops, auto-checked once each exam day passes 2:00 PM ---- */
function examRoad(){const wrap=$('#stops');if(!wrap)return;
 const EX=PP('exams').filter(a=>a.length>2).map(a=>({icon:a[0],name:a[1],date:a[2]}));
 const now=Date.now();wrap.replaceChildren();let nextSet=0;
 EX.forEach(x=>{const end=new Date(x.date+'T14:00:00').getTime(),done=now>=end,isNext=!done&&!nextSet&&(nextSet=1);
  const s=el('div','stop'+(done?' done':isNext?' next':'')),b=el('div','badge');
  b.append(ic(x.icon));if(done)b.append(el('span','chk','✓'));
  s.append(b,el('b','',x.name),el('small','',fmt(x.date)));wrap.append(s)});
 const gdone=now>=GT,gs=el('div','stop grad'+(gdone?' done':'')),gb=el('div','badge');
 gb.append(ic('grad_cap_flat'));if(gdone)gb.append(el('span','chk','✓'));
 gs.append(gb,el('b','','Graduation'),el('small','',fmt(CONFIG.graduationDate)));wrap.append(gs)}
examRoad();setInterval(examRoad,60000);
/* ---- milestones: every 10 days 100→40, then every day 30→0; once per device ---- */
function mile(){const d=Math.max(0,Math.ceil((GT-Date.now())/864e5));
 if(!(d<=30||(d<=100&&d%10==0)))return;
 try{if(localStorage.getItem('ms'+d))return;localStorage.setItem('ms'+d,'1')}catch(e){}
 const m=COUNTDOWN_MILESTONES[d]||{},o=$('#ov');
 $('#ot').textContent=m.title||(d==0?'WE DID IT!':d==1?'TOMORROW!':d+' DAYS TO GO!');
 $('#op').textContent=m.message||(d==0?'THE CHAPTER IS COMPLETE.':'THE FINAL CHAPTER IS GETTING CLOSER.');
 o.classList.add('on');burst(d?80:220);
 const u=m.sound||(d==0?CONFIG.graduationSound:"");if(ok(u)){try{new Audio(u).play().catch(()=>{})}catch(e){}}
 setTimeout(()=>o.classList.remove('on'),d?4500:7000)}
$('#ov').onclick=e=>e.currentTarget.classList.remove('on');

/* ---- nav / share ---- */
$('#mb').onclick=()=>{const o=$('#nv').classList.toggle('open');$('#mb').setAttribute('aria-expanded',String(o))};
$('#nv').onclick=()=>$('#nv').classList.remove('open');
$('#sh').onclick=()=>{const u={title:document.title,url:location.href};if(navigator.share)navigator.share(u).catch(()=>{});else if(navigator.clipboard)navigator.clipboard.writeText(u.url).then(()=>toast('Link copied!'))};

/* ---- CORKBOARD: photos + events pinned with string; board shows a fixed set, "more" opens a flip-through gallery ---- */
let MEM=MEMORIES,cat='ALL',sortDir='new',LIKES={},CC={},NOTES=[],PC={};const BOARD_N=12;
/* every photo needs a stable id (comments + loves are saved against it). Backend photos already have one; config/demo photos get one from a hash of url+title+date */
const h32=t=>{let h=2166136261;for(let i=0;i<t.length;i++){h^=t.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0).toString(36)};
const pidOf=m=>m.pid||(m.pid=m.id||('c'+h32(String(m.url||m.thumb||'')+'|'+(m.title||'')+'|'+(m.date||''))));
function counts(m){const s=el('span','cc');paintCounts(s,pidOf(m));return s}
function paintCounts(s,id){const l=LIKES[id]||0,c=CC[id]||0;s.replaceChildren();if(l)s.append(el('i','h','♥ '+l));if(c)s.append(el('i','c','💬 '+c))}
function syncCounts(id){$$('[data-pid="'+CSS.escape(id)+'"] .cc').forEach(x=>paintCounts(x,id))}
function goPost(m){if(!window.PV){if(m)openLB([m],0);return}history.pushState({in:1},'','#/posts'+(m?'/'+pidOf(m):''));PV.route()}
function setCat(t){cat=t;$$('.chip').forEach(x=>x.classList.toggle('on',x.dataset.cat==t));board();window.PV&&PV.refresh()}
function setSort(v){sortDir=v;$('#psort').value=v;$('#vsort').value=v;board();window.PV&&PV.refresh()}
function openAdd(){window.PV&&PV.prepAdd();$('#am').showModal()}
/* small promise-based confirm (replaces the browser confirm box) */
function ask(t,p,okLabel){return new Promise(res=>{const d=$('#ask');$('#askt').textContent=t;$('#askp').textContent=p||'';d.querySelector('.dng').textContent=okLabel||'DELETE';d.returnValue='';d.onclose=()=>res(d.returnValue==='ok');d.showModal()})}
$$('dialog.sheet').forEach(d=>d.addEventListener('click',e=>{if(e.target===d)d.close()}));
const byDate=(a,b)=>{const A=String(a.date||''),B=String(b.date||'');return sortDir=='new'?(A<B?1:A>B?-1:0):(A<B?-1:A>B?1:0)};
const list=()=>MEM.filter(m=>cat=='ALL'||(m.cat||'').toUpperCase()==cat).slice().sort(byDate);
function pic(m,i,big){const u=big?m.url:(m.thumb||m.url);
 if(safe(u)){const g=new Image();g.src=u;g.alt=m.title||'Memory photo';if(!big)g.loading='lazy';g.decoding='async';return g}
 const s=el('span','em',m.e||'📷'),h=(i*47)%360;s.style.background='linear-gradient(135deg,hsl('+h+' 70% 84%),hsl('+(h+40)%360+' 65% 72%))';return s}
function slot(m,i,L){const s=el('div','slot'),b=el('button',m.ev?'note':'pol');b.type='button';
 b.style.setProperty('--r',(((i*53)%9)-4)*.9+'deg');s.style.animationDelay=(i%BOARD_N)*.09+'s';
 b.setAttribute('aria-label',(m.ev?'Event: ':'Photo: ')+m.title);
 if(m.ev)b.append(ic(m.e||'📌','em'),el('small','',fmt(m.date)),el('b','',m.title));
 else{const p=el('div','ph'),r=el('div','mrow');p.append(pic(m,i));r.append(el('span','dt',fmt(m.date)),counts(m));b.append(el('span','tag',m.cat||''),p,el('div','cap',m.title),r);s.dataset.pid=pidOf(m)}
 b.onclick=()=>m.ev?openLB([m],0):goPost(m);s.append(el('i','pin'),b);if(m.id){const d=el('button','del','✕');d.type='button';d.setAttribute('aria-label','Delete photo');d.onclick=ev=>{ev.stopPropagation();del('photo',m.id)};s.append(d)}return s}
function strings(){const B=$('#board'),r=B.getBoundingClientRect(),P=$$('#grid .pin').map(p=>{const q=p.getBoundingClientRect();return[q.left+q.width/2-r.left-B.clientLeft,q.top+q.height/2-r.top-B.clientTop]});let h='';
 const ln=(a,b,c)=>{h+='<path pathLength="1" stroke="'+c+'" d="M'+a[0]+' '+a[1]+'Q'+(a[0]+b[0])/2+' '+((a[1]+b[1])/2+Math.hypot(a[0]-b[0],a[1]-b[1])*.12+14)+' '+b[0]+' '+b[1]+'"/>'};
 P.forEach((p,i)=>{if(P[i+1])ln(p,P[i+1],'#b3202e');if(i%2==0&&P[i+2])ln(p,P[i+2],'#2f6b45')});$('#str').innerHTML=h}
function board(){const L=list(),n=Math.min(BOARD_N,L.length),g=$('#grid');g.replaceChildren();
 L.slice(0,n).forEach((m,i)=>g.append(slot(m,i,L)));
 $('#cnt').textContent=n+' / '+L.length+' memories';$('#more').hidden=!L.some(m=>!m.ev);requestAnimationFrame(strings)}
$('#more').onclick=()=>goPost();
$('#psort').onchange=e=>setSort(e.target.value);$('#vsort').onchange=e=>setSort(e.target.value);
function chipsR(){const c=$('#chips'),pc=$('#pchips'),p=$('#pc');[c,pc,p].forEach(x=>x.replaceChildren());
 const cs=[...new Set([...G('cats').split(/[,\n]/).map(x=>x.trim().toUpperCase()),...MEM.map(m=>(m.cat||'').toUpperCase())].filter(Boolean))];
 ['ALL',...cs].forEach(t=>{[c,pc].forEach(box=>{const b=el('button','chip'+(t==cat?' on':''),t);b.type='button';b.dataset.cat=t;b.onclick=()=>setCat(t);box.append(b)});if(t!='ALL')p.append(new Option(t,t))})}
let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(strings,200)});addEventListener('load',strings);
/* flip-through photo gallery: used both by "show more" and by clicking any single photo */
let GAL=[],GI=0;
function buildStrip(){const s=$('#lbstrip');s.replaceChildren();
 GAL.forEach((m,i)=>{const b=el('button');b.type='button';b.setAttribute('aria-label','Go to photo '+(i+1));
  b.append(m.ev?ic(m.e||'📌','em'):pic(m,i));b.onclick=()=>{GI=i;fillLB()};s.append(b)})}
function markStrip(){$$('#lbstrip button').forEach((b,i)=>{const on=i===GI;b.classList.toggle('on',on);if(on)b.scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'})})}
function fillLB(){const m=GAL[GI],b=$('#lbc'),p=el('div','ph big');b.replaceChildren();
 const media=m.ev?ic(m.e||'📌','em'):pic(m,GI,1);media.classList.add('fade-in');p.append(media);
 requestAnimationFrame(()=>requestAnimationFrame(()=>media.classList.add('show')));
 b.append(p,el('h3','',m.title),el('p','',m.cap||''),el('small','',[m.cat,fmt(m.date)].filter(Boolean).join(' · ')));$('#lbidx').textContent=(GI+1)+' / '+GAL.length;markStrip();preloadNeighbors()}
function preloadNeighbors(){[1,-1].forEach(d=>{const n=GAL[(GI+d+GAL.length)%GAL.length],u=n&&!n.ev&&(n.url||n.thumb);if(safe(u))new Image().src=u})}
function openLB(L,i){if(!L.length)return;$('#lb').classList.toggle('single',L.length<2);GAL=L;GI=((i%L.length)+L.length)%L.length;buildStrip();fillLB();if(!$('#lb').open)$('#lb').showModal()}
$('#lbp').onclick=()=>{GI=(GI-1+GAL.length)%GAL.length;fillLB()};$('#lbn').onclick=()=>{GI=(GI+1)%GAL.length;fillLB()};
$('#lb').onclick=e=>{if(e.target===e.currentTarget)e.currentTarget.close()};
$('#mr').onclick=e=>{if(e.target===e.currentTarget)e.currentTarget.close()};
$$('.cl,.x').forEach(b=>b.onclick=()=>b.closest('dialog').close());
/* swipe left/right on the enlarged photo or message to move to the next/previous one */
function swipeNav(sel,prevSel,nextSel){const t=$(sel);if(!t)return;let sx=0,sy=0,on=0;
 t.addEventListener('touchstart',e=>{const p=e.touches[0];sx=p.clientX;sy=p.clientY;on=1},{passive:true});
 t.addEventListener('touchend',e=>{if(!on)return;on=0;const p=e.changedTouches[0],dx=p.clientX-sx,dy=p.clientY-sy;
  if(Math.abs(dx)>40&&Math.abs(dx)>Math.abs(dy))$(dx<0?nextSel:prevSel).click()},{passive:true})}
swipeNav('#lbc','#lbp','#lbn');swipeNav('#mrc','#mrp','#mrn');
addEventListener('keydown',e=>{if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight')return;
 if($('#lb').open)$('#'+(e.key=='ArrowLeft'?'lbp':'lbn')).click();else if($('#mr').open)$('#'+(e.key=='ArrowLeft'?'mrp':'mrn')).click()});
$('#add').onclick=openAdd;
$('#af').onsubmit=async e=>{e.preventDefault();const f=$('#pf').files[0];if(!f||!/^image\//.test(f.type))return toast('Choose an image.');
 const btn=$('#afbtn'),spin=$('#afspin'),btxt=$('#afbtxt');btn.disabled=true;spin.hidden=false;btxt.textContent='UPLOADING…';let bad='';
 try{const img=await shrink(f),nm=clean($('#pn').value,30),cp=clean($('#pp').value,140),idp=window.PV?PV.idp():{},
   r=await api({action:'photo',name:nm,category:$('#pc').value,caption:cp,image:img,...idp});
  if(!r.ok&&!r.demo){bad=r.error;throw 0}
  const mine=window.PV?PV.me():{};
  MEM.unshift(r.item?vp(r.item):{pid:'l'+Date.now().toString(36),cat:$('#pc').value,title:cp||'Memory',cp:cp,name:nm,uid:mine.uid||'',cap:'By '+nm,date:new Date().toISOString(),thumb:img,mid:img,url:img});
  setCat('ALL');$('#am').close();e.target.reset();
  toast(r.demo?'Added (demo: connect the Backend link to keep it).':'✅ تم رفع الصورة بنجاح',10000)}catch(x){toast(window.PV&&bad?PV.err(bad):'Could not send. Try again.')}
 finally{btn.disabled=false;spin.hidden=true;btxt.textContent='SUBMIT MEMORY'}};

/* ---- frame tool: drag/pinch your photo to fit under the class frame, download as one PNG ---- */
(function(){
 const stage=$('#frameStage'),canvas=$('#frameCanvas');if(!stage||!canvas)return;
 const hint=$('#frameHint'),fileInp=$('#frameFile'),zoomRow=$('#zoomRow'),zoomSlider=$('#frameZoom'),dlBtn=$('#frameDownload');
 const ctx=canvas.getContext('2d'),S=canvas.width;
 const frameImg=new Image();frameImg.crossOrigin='anonymous';let frameReady=false;
 if(ok(CONFIG.frame)){frameImg.onload=()=>{frameReady=true;draw()};
  if('IntersectionObserver' in window){const io=new IntersectionObserver(es=>{if(es[0].isIntersecting){frameImg.src=CONFIG.frame;io.disconnect()}},{rootMargin:'600px'});io.observe(stage)}
  else frameImg.src=CONFIG.frame}
 let img=null,baseScale=1,zoom=1,offX=0,offY=0,drag=null,pinchDist=0,pinchZoom=1,pinchAt=[0,0];
 const pointers=new Map();
 function clampOff(){const dw=img.width*baseScale*zoom,dh=img.height*baseScale*zoom;
  offX=Math.min(0,Math.max(S-dw,offX));offY=Math.min(0,Math.max(S-dh,offY))}
 function draw(){ctx.clearRect(0,0,S,S);
  if(img){const dw=img.width*baseScale*zoom,dh=img.height*baseScale*zoom;ctx.drawImage(img,offX,offY,dw,dh)}
  else{ctx.fillStyle='#f4e6d2';ctx.fillRect(0,0,S,S)}
  if(frameReady)ctx.drawImage(frameImg,0,0,S,S)}
 function loadPhoto(file){if(!file||!/^image\//.test(file.type))return;
  const url=URL.createObjectURL(file),i=new Image();
  i.onload=()=>{img=i;baseScale=Math.max(S/i.width,S/i.height);zoom=1;
   offX=(S-i.width*baseScale)/2;offY=(S-i.height*baseScale)/2;
   hint.hidden=true;zoomRow.hidden=false;dlBtn.hidden=false;zoomSlider.value=1;
   URL.revokeObjectURL(url);draw()};
  i.src=url}
 fileInp.onchange=()=>loadPhoto(fileInp.files[0]);
 zoomSlider.oninput=()=>{if(!img)return;setZoom(+zoomSlider.value,S/2,S/2)};
 function setZoom(nz,cx,cy){nz=Math.min(3,Math.max(1,nz));const oldScale=baseScale*zoom,
  ix=(cx-offX)/oldScale,iy=(cy-offY)/oldScale,newScale=baseScale*nz;
  offX=cx-ix*newScale;offY=cy-iy*newScale;zoom=nz;clampOff();draw()}
 function toCanvasXY(clientX,clientY){const r=canvas.getBoundingClientRect();
  return[(clientX-r.left)*(S/r.width),(clientY-r.top)*(S/r.height)]}
 stage.addEventListener('pointerdown',e=>{if(!img)return;stage.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId,[e.clientX,e.clientY]);
  if(pointers.size===1){const[x,y]=toCanvasXY(e.clientX,e.clientY);drag={x,y,offX,offY}}
  else if(pointers.size===2){drag=null;const pts=[...pointers.values()];
   pinchDist=Math.hypot(pts[0][0]-pts[1][0],pts[0][1]-pts[1][1]);pinchZoom=zoom;
   const mx=(pts[0][0]+pts[1][0])/2,my=(pts[0][1]+pts[1][1])/2;pinchAt=toCanvasXY(mx,my)}});
 stage.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;
  pointers.set(e.pointerId,[e.clientX,e.clientY]);
  if(pointers.size===2){const pts=[...pointers.values()],
   d=Math.hypot(pts[0][0]-pts[1][0],pts[0][1]-pts[1][1]),
   mx=(pts[0][0]+pts[1][0])/2,my=(pts[0][1]+pts[1][1])/2;
   zoomSlider.value=Math.min(3,Math.max(1,pinchZoom*(d/pinchDist)));
   setZoom(+zoomSlider.value,pinchAt[0],pinchAt[1])}
  else if(pointers.size===1&&drag){const[x,y]=toCanvasXY(e.clientX,e.clientY);
   offX=drag.offX+(x-drag.x);offY=drag.offY+(y-drag.y);clampOff();draw()}});
 function endPointer(e){pointers.delete(e.pointerId);if(pointers.size<2)pinchDist=0;if(pointers.size===0)drag=null}
 ['pointerup','pointercancel','pointerleave'].forEach(ev=>stage.addEventListener(ev,endPointer));
 dlBtn.onclick=()=>{if(!img)return;const a=el('a');a.href=canvas.toDataURL('image/png');
  a.download=(CONFIG.className||'class').toLowerCase().replace(/[^a-z0-9]+/g,'-')+'-frame.png';a.click()};
 draw();
})();

/* ---- frame lock: keep Frame Your Photo behind a "coming soon" overlay until the configured date ---- */
(function(){
 const wrap=$('#frameWrap'),lock=$('#frameLock');if(!wrap||!lock)return;
 const has=ok(CONFIG.frameOpens),openAt=has?new Date(CONFIG.frameOpens).getTime():0;
 if(has)$('#frameLockDate').textContent=fmt(CONFIG.frameOpens);
 function check(){const locked=has&&Date.now()<openAt;
  lock.hidden=!locked;wrap.classList.toggle('locked',locked);
  if(locked)wrap.setAttribute('inert','');else wrap.removeAttribute('inert')}
 check();if(has)setInterval(check,30000);
})();

/* ---- by the numbers: days since the start date (live) + infinity stats from the Layout gadget ---- */
const SINCE=new Date(G('since')||'2021-10-10').getTime();
(function(){const d=Math.max(0,Math.floor((Date.now()-SINCE)/864e5)),tot=Math.max(0,Math.round((GT-SINCE)/864e5)),n=x=>x.toLocaleString('en');
 $('#sd').dataset.v=d;$('#sd').textContent=n(d);$('#sn').textContent=n(tot)+' days from day one to graduation';
 $('#sy').textContent='SINCE '+new Date(SINCE).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}).toUpperCase();
 PP('stats').filter(a=>a.length>1).forEach(a=>{const c=el('div','card glass sc');const e=el('div','ei');e.append(ic(a[0]));c.append(e,el('b','nb',a[2]||'∞'),el('small','',a[1]));$('#sg').append(c)})})();
function count(){const e=$('#sd'),v=+e.dataset.v,t0=performance.now();if(RM)return;(function f(t){const k=Math.min(1,(t-t0)/1800);e.textContent=Math.round(v*(1-Math.pow(1-k,3))).toLocaleString('en');if(k<1)requestAnimationFrame(f)})(t0)}

/* ---- polls ---- */
function pollsR(P){const w=$('#pl');w.replaceChildren();P.forEach((p,pi)=>{const c=el('div','card glass'),v=p.o.map(o=>o[1]),bs=[],m=el('small','pm');let done=0;c.append(el('h3','',p.q));
 const paint=()=>{const t=v.reduce((a,b)=>a+b,0)||1;bs.forEach((b,i)=>{const r=Math.round(v[i]/t*100);b.f.style.width=r+'%';b.r.textContent=r+'% · '+v[i]})};
 p.o.forEach((o,i)=>{const b=el('button','opt'),f=el('i'),s=el('span'),r=el('em');b.type='button';s.append(el('em','',o[0]),r);b.append(f,s);b.f=f;b.r=r;bs.push(b);
  b.onclick=()=>{if(done)return;done=1;v[i]++;b.classList.add('sel');bs.forEach(x=>x.disabled=true);paint();m.textContent='Your vote has been recorded.';api({action:'vote',poll:pi,option:i})};c.append(b)});
 c.append(m);w.append(c)})}

/* ---- messages: shown right away (no approval step); wall caps at MSG_N, "more" opens a flip-through reader ---- */
let msgSort='new';const MSG_N=12;
const sortedMsgs=M=>M.filter(m=>m.status!=='pending').slice().sort((a,b)=>{const A=String(a.date||''),B=String(b.date||'');return msgSort=='new'?(A<B?1:A>B?-1:0):(A<B?-1:A>B?1:0)});
function msgs(M){const all=sortedMsgs(M),n=Math.min(MSG_N,all.length),w=$('#wall');w.replaceChildren();
 all.slice(0,n).forEach((m,i)=>{const c=el('article','msg');c.tabIndex=0;c.setAttribute('role','button');c.setAttribute('aria-label','Read message from '+clean(m.name,30));
  c.style.setProperty('--r',(((i*47)%7)-3)*1.1+'deg');c.append(el('p','',clean(m.message,240)),el('small','','— '+clean(m.name,30)));
  c.onclick=()=>openMR(all,i);c.onkeydown=e=>{if(e.key=='Enter'||e.key==' '){e.preventDefault();openMR(all,i)}};
  if(m.id){const d=el('button','del','✕');d.type='button';d.setAttribute('aria-label','Delete message');d.onclick=ev=>{ev.stopPropagation();del('message',m.id)};c.append(d)}
  w.append(c)});
 $('#mcnt').textContent=n+' / '+all.length+' messages';$('#mmore').hidden=all.length<=n}
$('#mmore').onclick=()=>{const all=sortedMsgs(MSG);if(all.length)openMR(all,Math.min(MSG_N,all.length))};
$('#msort').onchange=e=>{msgSort=e.target.value;msgs(MSG)};
let MGAL=[],MGI=0;
function fillMR(){const m=MGAL[MGI],b=$('#mrc');b.replaceChildren();
 const c=el('article','msg mrcard');c.append(el('p','',clean(m.message,240)),el('small','','— '+clean(m.name,30)+(m.date?' · '+fmt(m.date):'')));
 b.append(c);$('#mridx').textContent=(MGI+1)+' / '+MGAL.length}
function openMR(L,i){if(!L.length)return;MGAL=L;MGI=((i%L.length)+L.length)%L.length;fillMR();if(!$('#mr').open)$('#mr').showModal()}
$('#mrp').onclick=()=>{MGI=(MGI-1+MGAL.length)%MGAL.length;fillMR()};$('#mrn').onclick=()=>{MGI=(MGI+1)%MGAL.length;fillMR()};
$('#mf').onsubmit=async e=>{e.preventDefault();const n=clean($('#mn').value,30),t=clean($('#mt').value,240);if(!n||!t)return;
 const r=await api({action:'message',name:n,message:t});if(!r.ok&&!r.demo)return toast('Could not send. Try again.');
 MSG.unshift(r.item||{name:n,message:t,date:new Date().toISOString()});msgs(MSG);e.target.reset();toast(r.demo?'Posted (demo: connect the Backend link to keep it).':'Your message is live!')};

/* ---- events ---- */
(function(){const z=n=>String(n).padStart(2,'0'),f=t=>''+t.getFullYear()+z(t.getMonth()+1)+z(t.getDate())+'T'+z(t.getHours())+z(t.getMinutes())+'00';
 EVENTS.slice().sort((a,b)=>a.d<b.d?-1:1).forEach(x=>{const d=new Date(x.d),c=el('article','card glass'),i=el('p','',x.x||''),b=el('button','btn g','MORE INFO'),a=el('a','btn','ADD TO CALENDAR'),bt=el('div','btns');
  i.hidden=true;b.type='button';b.setAttribute('aria-expanded','false');b.onclick=()=>{i.hidden=!i.hidden;b.setAttribute('aria-expanded',String(!i.hidden))};
  a.href='https://calendar.google.com/calendar/render?action=TEMPLATE&text='+encodeURIComponent(x.t)+'&dates='+f(d)+'/'+f(new Date(d.getTime()+72e5))+'&location='+encodeURIComponent(x.l||'')+'&details='+encodeURIComponent(x.x||'');a.target='_blank';a.rel='noopener';
  bt.append(b,a);const ie=el('div','ei');ie.append(ic(x.e));c.append(ie,el('h3','',x.t),el('p','meta','📅 '+fmt(x.d)+' · '+x.d.slice(11,16)),el('p','meta','📍 '+(x.l||'')),i,bt);$('#ev').append(c)})})();

/* ---- socials + announcements ---- */

[
  ['instagram', 'fa-brands fa-instagram', 'Instagram'],
  ['facebook', 'fa-brands fa-facebook-f', 'Facebook'],
  ['x', 'fa-brands fa-x-twitter', 'X'],
  ['telegram', 'fa-brands fa-telegram', 'Telegram']
].forEach(([k, icon, name]) => {

  const a = el('a', 'card glass soc');

  a.href = safe(CONFIG.socials[k])
    ? CONFIG.socials[k]
    : '#';

  a.target = '_blank';
  a.rel = 'noopener noreferrer';

  const iconElement = el('i', icon);

  iconElement.setAttribute(
    'aria-hidden',
    'true'
  );

  a.append(
    iconElement,
    el('b', '', name)
  );

  $('#soc').append(a);
});


ANNOUNCEMENTS.forEach(a => {

  const n = Date.now();

  if (
    n < new Date(a.start) ||
    n > new Date(a.end).getTime() + 864e5
  ) return;

  const d = el('div', 'an');

  const x = el(
    'button',
    '',
    '✕'
  );

  if (safe(a.image)) {

    const i = new Image();

    i.loading = 'lazy';
    i.decoding = 'async';
    i.src = a.image;
    i.alt = '';

    d.append(i);
  }

  x.setAttribute(
    'aria-label',
    'Dismiss'
  );

  x.onclick = () => d.remove();

  d.append(
    el('b', '', a.title),
    el('span', '', a.text),
    x
  );

  $('#an').append(d);
});

/* ---- fun: ticker, years timeline, clickable 3D icons ---- */
(function(){const b=el('div','tkin');for(let k=0;k<2;k++)PP('ticker').forEach(a=>{const s=el('span');s.append(ic(a[0]),document.createTextNode(a[1]||''));b.append(s)});$('#tk').append(b);
 PP('years').filter(a=>a.length>2).forEach(a=>{const c=el('article','yr card glass'),h=el('div','yh');h.append(ic(a[0]),el('small','',a[1]));c.append(h,el('h3','',a[2]),el('p','',a[3]||''));$('#tl').append(c)});
 $$('.cut').forEach(i=>i.onclick=()=>burst(36))})();

/* ---- reveal + scroll-spy ---- */
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);if(e.target.id=='stats')count()}}),{threshold:.12});$$('.rv').forEach(e=>io.observe(e));
const sp=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)$$('nav a').forEach(a=>a.classList.toggle('on',a.hash=='#'+e.target.id))}),{rootMargin:'-45% 0px -50% 0px'});$$('section[id]').forEach(s=>sp.observe(s));

/* ---- data: your Blogger posts (photos) + backend (visitor photos, messages, votes) ---- */
const FID=(id,w)=>'https://lh3.googleusercontent.com/d/'+id+'=w'+w;
let MSG=MESSAGES;
const CID=(()=>{try{let c=sessionStorage.getItem('cid');if(!c){c=Math.random().toString(36).slice(2);sessionStorage.setItem('cid',c)}return c}catch(e){return'x'}})();
async function api(b){if(!BACKEND.enabled)return{ok:0,demo:1};try{return await(await fetch(BACKEND.apiUrl,{method:'POST',body:JSON.stringify({...b,cid:CID}),headers:{'Content-Type':'text/plain;charset=utf-8'}})).json()}catch(e){return{ok:0}}}
async function posts(){return PP('photos').filter(a=>a[0]).map(a=>({cat:a[2]||'',title:a[1]||'Memory',cp:a[1]||'',date:a[3]||'',thumb:DR(a[0],1),url:DR(a[0],1)}))}
async function remote(){const z={messages:[],photos:[],votes:{}};if(!BACKEND.enabled)return z;try{return await(await fetch(BACKEND.apiUrl+'?t='+Date.now())).json()}catch(e){return z}}
const vp=p=>({id:p.id,pid:p.id,uid:p.uid||'',name:p.name,cat:p.category,title:p.caption||'Memory',cp:p.caption||'',cap:'By '+p.name,date:p.date,thumb:FID(p.fileId,500),mid:FID(p.fileId,1000),url:FID(p.fileId,1600)});
function build(px,rp){const ph=[...rp.map(vp),...px];if(!ph.length)ph.push(...MEMORIES.filter(m=>!m.ev));
 ph.sort((a,b)=>String(a.date)<String(b.date)?1:-1);
 const ev=EVENTS.slice().sort((a,b)=>a.d<b.d?-1:1).map(x=>({ev:1,cat:'EVENTS',title:x.t,date:x.d,e:x.e,cap:x.x})),o=[];
 ph.forEach((p,i)=>{o.push(p);if(i%3==2&&ev.length)o.push(ev.shift())});return o.concat(ev)}
/* admin: open  yoursite/#admin  and enter the key. The key is checked by the backend; nothing is unlocked on a wrong key.
   AS = who the admin posts as: 'official' (the site's own page) or 'me' (this device's normal visitor profile) — the two never mix. */
let ADM=false,ADK='',AS='official';try{AS=sessionStorage.getItem('aud_as')=='me'?'me':'official'}catch(e){}
async function del(type,id){const what=type=='photo'?'photo':type=='note'?'post':'message';
 if(!await ask('Delete this '+what+'?','It disappears for everyone'+(type=='message'?'.':', along with its comments and loves.')))return;
 const r=await api({action:'delete',type,id,key:ADK});if(!r.ok){toast('Not deleted. Check the admin key.');return}
 if(type=='photo'){MEM=MEM.filter(m=>m.id!=id);board()}else if(type=='note')NOTES=NOTES.filter(n=>n.id!=id);else{MSG=MSG.filter(m=>m.id!=id);msgs(MSG)}
 if(type!='message'&&window.PV)PV.refresh(1);toast('Deleted.')}
async function adminInit(){let k='';try{k=sessionStorage.getItem('adk')||''}catch(e){}
 if(location.hash=='#admin'&&!k)k=prompt('Admin key')||'';if(!k)return;
 const r=await api({action:'auth',key:k});
 if(r.ok||r.demo){ADM=true;ADK=k;try{sessionStorage.setItem('adk',k)}catch(e){}document.body.classList.add('adm');toast(r.demo?'Admin mode (demo: connect the Backend link).':'Admin mode is on.');window.PV&&PV.admin()}
 else{try{sessionStorage.removeItem('adk')}catch(e){}toast(r.error=='unset'?'Change ADMIN_KEY in Code.gs first.':'Admin key not accepted.')}}
adminInit();
function shrink(f){return new Promise((res,rej)=>{const i=new Image(),u=URL.createObjectURL(f);i.onload=()=>{const s=Math.min(1,1200/Math.max(i.width,i.height)),c=document.createElement('canvas');c.width=Math.round(i.width*s);c.height=Math.round(i.height*s);c.getContext('2d').drawImage(i,0,0,c.width,c.height);URL.revokeObjectURL(u);res(c.toDataURL('image/jpeg',.82))};i.onerror=rej;i.src=u})}
(async()=>{const[px,rp]=await Promise.all([posts(),remote()]);MEM=build(px,rp.photos||[]);LIKES=rp.likes||{};CC=rp.cc||{};NOTES=rp.notes||[];PC=rp.pc||{};chipsR();board();
 MSG=BACKEND.enabled?(rp.messages||[]):MESSAGES;msgs(MSG);
 const v=rp.votes||{};POLLS.forEach((p,i)=>p.o.forEach((o,j)=>o[1]=v[i+'_'+j]||0));pollsR(POLLS);window.DATA_READY=1;window.PV&&PV.ready()})();
