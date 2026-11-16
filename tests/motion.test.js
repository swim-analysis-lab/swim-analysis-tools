const fs=require('fs');const html=fs.readFileSync(require('path').join(__dirname,'../motion/index.html'),'utf8');
const sc=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)];sc.forEach((x,i)=>{try{new Function(x[1]);}catch(e){console.log('script',i,'SYNTAX',e.message);process.exit(1)}});
const core=html.match(/<script id="core">([\s\S]*?)<\/script>/)[1];const c={};
new Function('c',core+';Object.assign(c,{toGray,cutPatch,znccAt,matchAround,resample,sg,kinematics,phases,summarize,analyze,fromRecord,G})')(c);
let fail=0;const near=(n,a,b,tol)=>{const ok=Math.abs(a-b)<=tol;if(!ok)fail++;console.log((ok?'ok  ':'FAIL')+' '+n+': '+(+a.toFixed(4))+' vs '+b+' (±'+tol+')')};
// 1) SG: y=3+2t-0.5t^2 → 기울기 정확
{const fsr=60,dt=1/fsr,y=[];for(let i=0;i<120;i++){const t=i*dt;y.push(3+2*t-.5*t*t)}const r=c.sg(y,4,dt);near('sg slope mid',r.d[60],2-1*1,1e-6);near('sg slope edge',r.d[0],2,1e-6);near('sg value',r.s[60],y[60],1e-9)}
// 2) 알려진 동작: 1.0m 상승, smootherstep 0.8초 → 최고 속도 = 1.875*1.0/0.8
const sm=u=>u<=0?0:u>=1?1:u*u*u*(u*(6*u-15)+10);
function mk(fsv,pxm,noise,slow){const t=[],x=[],y=[],cf=[];let seed=7;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647-.5};
  for(let i=0;i<=2.0*fsv*slow;i++){const tv=i/fsv,tr=tv/slow,Y=1.0*sm((tr-.4)/.8);t.push(tv+3);x.push(200+rnd()*noise);y.push(600-Y*pxm+rnd()*noise);cf.push(1)}return {t,x,y,c:cf}}
for(const [fsv,noise,slow,tol] of [[30,0,1,.03],[60,0,1,.02],[30,.6,1,.08],[60,.6,1,.08],[30,0,4,.02],[120,.6,1,.1]]){const r=c.analyze(mk(fsv,280,noise,slow),{pxPerM:280,slow,mass:40});
  near('peak v fs'+fsv+' noise'+noise+' slow'+slow,r.sum.vPeak,1.875/0.8,2.34375*tol);near('  rom',r.sum.rom,1.0,.02);near('  tPeak',r.sum.tPeak,.8,.05);
  if(noise===0){near('  mean asc',r.sum.meanAsc,1.0/0.8,.25);near('  simple P',r.sum.pSimple,40*9.81*r.sum.vPeak,1e-6);console.log('     fs',r.fs,'phases',r.phases.map(p=>(p.dir>0?'up':'dn')+' '+p.t0.toFixed(2)+'-'+p.t1.toFixed(2)+' dy'+p.dy.toFixed(2)).join(' | '),'pPeak',Math.round(r.sum.pPeak))}}
// 3) 추적기: 무늬 있는 배경 위에서 무늬 원판을 알려진 소수점 위치로 이동
function frame(w,h,cx,cy){const d=new Uint8ClampedArray(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++){let v=110+30*Math.sin(x*.05)+25*Math.cos(y*.07);const dx=x-cx,dy=y-cy,r=Math.hypot(dx,dy);
    if(r<22){const a=Math.max(0,Math.min(1,22-r));const disc=r<6?230:(40+60*(Math.floor(r/5)%2)+20*Math.cos(Math.atan2(dy,dx)*3));v=v*(1-a)+disc*a}const i=(y*w+x)*4;d[i]=d[i+1]=d[i+2]=v;d[i+3]=255}return d}
{const w=200,h=300,half=16;let g=c.toGray(frame(w,h,100,250),w,h),tm=c.cutPatch(g,w,h,100,250,half),pos={x:100,y:250},maxe=0;
  for(let k=1;k<=30;k++){const tx=100+3*Math.sin(k*.3),ty=250-k*6.37;g=c.toGray(frame(w,h,tx,ty),w,h);const r=c.matchAround(g,w,h,tm,half,pos.x,pos.y,26);pos={x:r.x,y:r.y};maxe=Math.max(maxe,Math.hypot(r.x-tx,r.y-ty));if(r.score<.8){fail++;console.log('FAIL low score',k,r.score)}}
  near('tracker max err px',maxe,0,.35)}
// 4) 저장 기록 재계산
{const r=c.analyze(mk(60,280,0,1),{pxPerM:280,slow:1,mass:40});const rec={X:r.X,Y:r.Y,fs:r.fs,mass:40};const k=c.fromRecord(rec);near('fromRecord vPeak',k.sum.vPeak,r.sum.vPeak,.03)}
console.log(fail?fail+' FAILED':'ALL PASS');process.exit(fail?1:0)
