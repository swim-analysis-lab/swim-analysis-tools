// 추적기 시험: 회전하며 빠르게 움직이는 '다리'(정강이 피부색 + 흰 양말 + 어두운 발)의 발목점을, 물 같은 배경·흐림·밝기 변화·화면 가장자리에서 따라가기
const fs=require('fs'),path=require('path');const html=fs.readFileSync(path.join(__dirname,'../motion/index.html'),'utf8');
const core=html.match(/<script id="core">([\s\S]*?)<\/script>/)[1];const c={};
new Function('c',core+';Object.assign(c,{toGray,cutPatch,matchAround,toFeat,makeTracker})')(c);
let fail=0;
function scene(o){const W=o.W||240,H=o.H||320;let sd=o.seed||9;const rnd=()=>{sd=(sd*16807)%2147483647;return sd/2147483647};
  const bg=new Float32Array(W*H*3);for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=(y*W+x)*3,n=(rnd()-.5)*o.bgNoise;
    bg[i]=o.bg[0]+n+8*Math.sin(x*.07+y*.02);bg[i+1]=o.bg[1]+n+6*Math.sin(y*.05);bg[i+2]=o.bg[2]+n+10*Math.cos(x*.03-y*.04)}
  /* 다리 모양: 발목점(ax,ay)에서 각도 th 방향(위쪽)으로 정강이, 반대쪽 아래로 발 */
  const leg=(x,y,ax,ay,th)=>{const ux=Math.sin(th),uy=-Math.cos(th),dx=x-ax,dy=y-ay,along=dx*ux+dy*uy,across=-dx*uy+dy*ux;
    if(along>-2&&along<90&&Math.abs(across)<9-along*.02)return along<12?o.sock:o.skin; /* 양말 12px, 그 위 정강이 */
    const fx=Math.cos(th),fy=Math.sin(th),fa=dx*fx+dy*fy,fb=-dx*fy+dy*fx;if(fa>-6&&fa<30&&fb>-2&&fb<9-fa*.1)return o.shoe;return null};
  return {W,H,frame(t,dt){const out=new Uint8ClampedArray(W*H*4),acc=new Float32Array(W*H*3),sub=o.blur?3:1;
    for(let s=0;s<sub;s++){const ts=t+(sub>1?(s/(sub-1)-.5)*dt*.6:0),[ax,ay,th]=o.path(ts);
      for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=(y*W+x)*3,col=leg(x,y,ax,ay,th)||[bg[i],bg[i+1],bg[i+2]];acc[i]+=col[0];acc[i+1]+=col[1];acc[i+2]+=col[2]}}
    const k=(1+o.flicker*Math.sin(t*7))/sub;for(let p=0;p<W*H;p++){out[p*4]=acc[p*3]*k+(rnd()-.5)*o.noise;out[p*4+1]=acc[p*3+1]*k+(rnd()-.5)*o.noise;out[p*4+2]=acc[p*3+2]*k+(rnd()-.5)*o.noise;out[p*4+3]=255}
    return out},truth:t=>o.path(t)}}
function runOld(S,fsv,dur,half){const R=Math.max(14,Math.round(half*1.6));let tm,tm0,pos,vel={x:0,y:0},err=[];
  for(let i=0;i<=dur*fsv;i++){const t=i/fsv,g=c.toGray(S.frame(t,1/fsv),S.W,S.H),[tx,ty]=S.truth(t);
    if(i===0){pos={x:tx,y:ty};tm=c.cutPatch(g,S.W,S.H,tx,ty,half);tm0=tm.slice()}
    else{const px=Math.max(half,Math.min(S.W-half-1,pos.x+vel.x)),py=Math.max(half,Math.min(S.H-half-1,pos.y+vel.y));let r=c.matchAround(g,S.W,S.H,tm,half,px,py,R);
      if(r.score<.5){const r0=c.matchAround(g,S.W,S.H,tm0,half,px,py,R);if(r0.score>r.score)r=r0}
      if(r.score>=.3){vel={x:r.x-pos.x,y:r.y-pos.y};pos={x:r.x,y:r.y};if(r.score>.75){const p=c.cutPatch(g,S.W,S.H,r.ix,r.iy,half);for(let q=0;q<tm.length;q++)tm[q]=.9*tm[q]+.1*p[q]}}else vel={x:0,y:0}}
    err.push(Math.hypot(pos.x-tx,pos.y-ty))}return err}
function runNew(S,fsv,dur,half){let T,err=[];for(let i=0;i<=dur*fsv;i++){const t=i/fsv,F=c.toFeat(S.frame(t,1/fsv),S.W,S.H),[tx,ty]=S.truth(t);
    if(i===0){T=c.makeTracker(F,tx,ty,half);err.push(0);continue}const r=T.step(F);err.push(Math.hypot(r.x-tx,r.y-ty))}return err}
const stat=e=>{const s=e.slice().sort((a,b)=>a-b);return {med:s[Math.floor(s.length/2)],p90:s[Math.floor(s.length*.9)],lost:e.filter(v=>v>12).length/e.length,last:e[e.length-1]}};
const fmt=s=>'중앙 '+s.med.toFixed(1)+'px, 90% '+s.p90.toFixed(1)+'px, 12px 넘게 벗어난 비율 '+(s.lost*100).toFixed(0)+'%, 끝 '+s.last.toFixed(1)+'px';
const cases=[
  ['돌핀킥(물 배경, 피부 밝기≈물 밝기), 60fps',{bg:[70,140,175],bgNoise:14,skin:[205,140,120],sock:[225,225,230],shoe:[60,55,60],noise:10,flicker:.12,blur:true,
     path:t=>[120+70*t,170+55*Math.sin(2*Math.PI*2.2*t),.65*Math.sin(2*Math.PI*2.2*t-1.2)]},60,1.6],
  ['돌핀킥 30fps',null,30,1.6],
  ['CMJ처럼 빠른 상하 + 화면 아래 가장자리, 60fps',{H:300,bg:[120,118,112],bgNoise:30,skin:[190,150,130],sock:[230,230,230],shoe:[40,40,45],noise:8,flicker:.1,blur:true,
     path:t=>{const y=t<.5?286:t<1.2?286-Math.max(0,2.6*100*(t-.5)-4.905*100*(t-.5)**2)*.9:286;return [110+8*Math.sin(t*3),Math.min(296,y),.15*Math.sin(t*5)]}},60,1.6],
  ['물과 밝기가 거의 같은 피부, 60fps',{bg:[60,150,190],bgNoise:6,skin:[200,128,100],sock:[200,128,100],shoe:[150,140,95],noise:6,flicker:.1,blur:true,path:t=>[120+60*t,170+50*Math.sin(2*Math.PI*2*t),.5*Math.sin(2*Math.PI*2*t-1.2)]},60,1.6],
  ['밝기만 비슷한 무늬 없는 피부(정강이) 회전, 60fps',{bg:[150,150,150],bgNoise:6,skin:[175,140,125],sock:[175,140,125],shoe:[120,95,85],noise:6,flicker:.15,blur:true,
     path:t=>[120+40*Math.sin(2*Math.PI*1.1*t),170+50*Math.sin(2*Math.PI*2.2*t),.8*Math.sin(2*Math.PI*1.1*t)]},60,1.8]];
let prev=null;for(const [name,o0,fsv,dur] of cases){const o=o0||prev;prev=o;const S=scene(o),half=16;
  const eo=stat(runOld(S,fsv,dur,half)),en=stat(runNew(S,fsv,dur,half));
  console.log(name+'\n   이전: '+fmt(eo)+'\n   새것: '+fmt(en));
  const ok=en.med<=Math.max(2.5,eo.med+1)&&en.lost<=eo.lost+.04&&en.lost<.1&&en.last<=Math.max(8,eo.last+1);if(!ok){fail++;console.log('FAIL 새 추적기가 더 나쁘거나 많이 놓침')}}
console.log(fail?fail+' FAILED':'ALL PASS');process.exit(fail?1:0)
