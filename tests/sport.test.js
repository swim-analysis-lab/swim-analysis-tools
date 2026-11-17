const fs=require('fs'),path=require('path');const html=fs.readFileSync(path.join(__dirname,'../motion/index.html'),'utf8');
const core=html.match(/<script id="core">([\s\S]*?)<\/script>/)[1];const c={};
new Function('c',core+';Object.assign(c,{analyze,pullupReport,cmjReport,flightFromToe,flightFromDiff,flightFromBand,median,G})')(c);
let fail=0;const near=(n,a,b,tol)=>{const ok=a!=null&&Math.abs(a-b)<=tol;if(!ok)fail++;console.log((ok?'ok  ':'FAIL')+' '+n+': '+(a==null?a:+a.toFixed(4))+' vs '+(+b.toFixed(4))+' (±'+tol+')')};
const sm=u=>u<=0?0:u>=1?1:u*u*u*(u*(6*u-15)+10);
// ---- 풀업: 3회, 이동 0.55/0.53/0.50m, 올림 0.75/0.85/1.0초, 바 0.52m
{const fsv=60,px=300,R=[[.3,.75,.55],[2.0,.85,.53],[3.75,1.0,.50]],tr={t:[],x:[],y:[],c:[]};
  const Yf=t=>{let Y=0;R.forEach(([s0,d,rom])=>{if(t>=s0&&t<s0+d)Y+=rom*sm((t-s0)/d);else if(t>=s0+d&&t<s0+d+.25)Y+=rom;else if(t>=s0+d+.25)Y+=rom*(1-sm((t-s0-d-.25)/.6))});return Y};
  for(let i=0;i<=6*fsv;i++){const t=i/fsv;tr.t.push(t);tr.x.push(200);tr.y.push(560-Yf(t)*px);tr.c.push(1)}
  const r=c.analyze(tr,{pxPerM:px,slow:1,mass:100,rate:60}),P=c.pullupReport(r,{mass:100,barY:.52});
  console.log('pull reps',P.reps.map(q=>[q.i,+q.rom.toFixed(3),+q.T.toFixed(2),+q.mean.toFixed(3),q.margin&&+q.margin.toFixed(3),q.short]));
  near('n reps',P.sum.n,3,0);R.forEach(([s0,d,rom],k)=>{near(' rom'+k,P.reps[k].rom,rom,.03);near(' mean'+k,P.reps[k].mean,rom/d,.05*rom/d)});
  near('chin ok count',P.sum.chinOk,2,0);near('loss %',P.sum.loss,(1-(.5/1.0)/(.55/.75))*100,3);near('pMean',P.reps[0].pMean,100*9.81*P.reps[0].rom/P.reps[0].T,1e-6)}
// ---- CMJ: 반동 -0.30m, 이륙속도 2.6 m/s, 체공 0.530초 → 체공 높이 0.3445m
function cmjTrack(fsv,vto){const tr={t:[],x:[],y:[],c:[],P:{toe:{x:[],y:[],c:[]}}},px=300,T=2*vto/9.81;const herm=(t,t0,t1,y0,y1,v0,v1)=>{const d=t1-t0,u=(t-t0)/d,h00=2*u**3-3*u**2+1,h10=u**3-2*u**2+u,h01=-2*u**3+3*u**2,h11=u**3-u**2;return h00*y0+h10*d*v0+h01*y1+h11*d*v1};
  const tTo=1.15,tLd=tTo+T,yTo=.10;const Y=t=>t<.4?0:t<.85?-.30*sm((t-.4)/.45):t<tTo?herm(t,.85,tTo,-.30,yTo,0,vto):t<tLd?yTo+vto*(t-tTo)-4.905*(t-tTo)**2:t<tLd+.3?herm(t,tLd,tLd+.3,yTo,-.15,-vto,0):-.15+.15*sm((t-tLd-.3)/.5);
  for(let i=0;i<=(tLd+1)*fsv;i++){const t=i/fsv,y=Y(t);tr.t.push(t);tr.x.push(200);tr.y.push(420-y*px);tr.c.push(1);const rise=t>tTo&&t<tLd?y-yTo:0;tr.P.toe.x.push(230);tr.P.toe.y.push(650-rise*px);tr.P.toe.c.push(1)}
  return {tr,px,T,tTo,tLd}}
for(const fsv of [60,120,240]){const {tr,px,T,tTo,tLd}=cmjTrack(fsv,2.6);const r=c.analyze(tr,{pxPerM:px,slow:1,mass:75,rate:fsv,win:.03});
  const base=c.median(tr.P.toe.y.filter((_,i)=>tr.t[i]<.25)),toe={t:tr.t,rise:tr.P.toe.y.map(y=>(base-y)/px)};
  const R=c.cmjReport(r,{toe,mass:75,dtFrame:1/fsv});
  console.log('cmj fs'+fsv,'to',R.to.toFixed(4),'ld',R.ld.toFixed(4),'T',R.T.toFixed(4),'h',(R.hFlight*100).toFixed(1),'cm  hVel',(R.hVel*100).toFixed(1),'hDisp',(R.hDisp*100).toFixed(1),'depth',(R.depth*100).toFixed(1),'vTo',R.vTo.toFixed(2),'ttt',R.ttt.toFixed(3),'rsi',R.rsi.toFixed(3),'err ±',(R.err*100).toFixed(1),'cm');
  near(' takeoff fs'+fsv,R.to,tTo,1/fsv);near(' landing',R.ld,tLd,1/fsv);near(' flight h',R.hFlight,9.81*T*T/8,.012);near(' depth',R.depth,.30,.01);near(' vTo',R.vTo,2.6,.15)}
{const {tr,px}=cmjTrack(120,2.6);const r=c.analyze(tr,{pxPerM:px,slow:1,mass:75,rate:120,win:.03});const R=c.cmjReport(r,{manual:{to:1.15,ld:1.15+2*2.6/9.81},mass:75});near('manual h',R.hFlight,2.6*2.6/(2*9.81),.002);near('sayers',R.sayers,60.7*R.hFlight*100+45.3*75-2055,1e-6);
  const R2=c.cmjReport(r,{mass:75});console.log('no toe: hSrc',R2.hSrc,'h',(R2.h*100).toFixed(1));if(R2.hSrc!=='vel')fail++}
// 발끝 띠 차이: 신발이 3cm 띠를 떠나는 정도를 흉내 (띠 높이 3cm, 들림에 비례해 0→40)
for(const fsv of [60,120,240]){const {tr,px,T,tTo,tLd}=cmjTrack(fsv,2.6);const r=c.analyze(tr,{pxPerM:px,slow:1,mass:75,rate:fsv,win:.03});
  const v=tr.P.toe.y.map(y=>{const rise=(655-y)/px;return 2+40*Math.min(1,rise/.03)});const R=c.cmjReport(r,{foot:{t:tr.t,v},mass:75});
  near(' diff takeoff fs'+fsv,R.to,tTo,1/fsv);near(' diff landing fs'+fsv,R.ld,tLd,1/fsv);near(' diff h fs'+fsv,R.hFlight,9.81*T*T/8,.012)}
// 빈 바닥 기준 띠: 반동 중 발이 4px 밀리고(선 자세 기준이 틀어지는 경우), 노출 시간 동안 흐려지는 실제 영상에 가깝게 만든 띠 화면
{const H=10,W=33,ppm=250,dz=H/ppm,g=9.81;let seed=11;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647};
  const floor=[],shoe=[];for(let q=0;q<H*W;q++)floor.push(80+60*rnd());for(let q=0;q<H*(W+12);q++)shoe.push(20+40*rnd());
  const pix=(z,xs,r,cc)=>{const hr=(H-1-r+.5)/ppm;return hr>=z&&cc>=xs?shoe[r*(W+12)+(cc-xs+6)]:floor[r*W+cc]};
  for(const [fsv,vto,ph,tol] of [[30,2.6,0,.015],[30,2.6,.4,.015],[30,3.1,.7,.015],[60,2.6,.3,.01],[120,2.6,.5,.006],[240,2.6,.2,.004]]){
    const to=1.0+ph/fsv,T=2*vto/g,tLow=to-.25,tAp=to+T/2,z=t=>t<=to||t>=to+T?0:vto*(t-to)-g/2*(t-to)**2,xs=t=>t<tLow-.3?8:t<tLow?8-4*(t-tLow+.3)/.3:4;
    const ts=[],B=[];for(let i=0;i<=2.2*fsv;i++){const t=i/fsv,b=new Uint8Array(H*W);for(let r=0;r<H;r++)for(let cc=0;cc<W;cc++){let s=0;for(let k=0;k<4;k++){const tt=t+(k/4-.25)/fsv/2;s+=pix(z(tt),Math.round(xs(tt)),r,cc)}b[r*W+cc]=Math.round(s/4)}ts.push(t);B.push(b)}
    const f=c.flightFromBand(ts,B,tLow,tAp,dz),h=f?g*(f.ld-f.to)**2/8:null;near('band h fs'+fsv+' v'+vto+' ph'+ph,h,vto*vto/(2*g),tol);
    if(fsv===30&&ph===0){const ref=B[0],v=B.map(b=>{let s=0;for(let q=0;q<b.length;q++)s+=Math.abs(b[q]-ref[q]);return s/b.length});const o=c.flightFromDiff({t:ts,v},tLow,tAp);console.log('     (선 자세 기준 방식:',o?'h '+(g*(o.ld-o.to)**2/8*100).toFixed(1)+'cm':'검출 실패',')')}}}
console.log(fail?fail+' FAILED':'ALL PASS');process.exit(fail?1:0)
