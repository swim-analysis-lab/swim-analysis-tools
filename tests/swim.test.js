// 수영 스타트·돌핀킥 분석 시험 (합성 궤적)
const fs=require('fs'),path=require('path');const html=fs.readFileSync(path.join(__dirname,'../motion/index.html'),'utf8');
const core=html.match(/<script id="core">([\s\S]*?)<\/script>/)[1];const c={};
new Function('c',core+';Object.assign(c,{analyze,startReport,dolphinReport,extrema,flightFromBand,G,angleSeries,glideKick,lmTrack})')(c);
let fail=0;const near=(n,a,b,tol)=>{const ok=a!=null&&Math.abs(a-b)<=tol;if(!ok)fail++;console.log((ok?'ok  ':'FAIL')+' '+n+': '+(a==null?a:+a.toFixed(4))+' vs '+(+b.toFixed(4))+' (±'+tol+')')};
const herm=(t,t0,t1,y0,y1,v0,v1)=>{const d=t1-t0,u=(t-t0)/d;return (2*u**3-3*u**2+1)*y0+(u**3-2*u**2+u)*d*v0+(-2*u**3+3*u**2)*y1+(u**3-u**2)*d*v1};
let seed=5;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647-.5};

// ---- 스타트: 신호 0.5초, 이탈 1.2초(블록 0.70초), 이탈 속도 (4.5, 0.5) m/s, 이탈 때 머리 수면 위 0.55m, 벽에서 0.9m
// 입수: 0.55+0.5τ-4.905τ² = 0 → τ=0.38967, 입수 거리 0.9+4.5τ = 2.6535m
const tau=(0.5+Math.sqrt(0.25+4*4.905*0.55))/(2*4.905),entT=1.2+tau,entD=0.9+4.5*tau;
function headAt(t){if(t<0.5)return [0.1,0.75];if(t<1.2)return [herm(t,.5,1.2,.1,.9,0,4.5),herm(t,.5,1.2,.75,.55,0,.5)];
  if(t<entT){const s=t-1.2;return [.9+4.5*s,.55+.5*s-4.905*s*s]}const s=t-entT,vy0=.5-9.81*tau;return [entD+4.5*(1-Math.exp(-s/.8))*.8*1.0+0*s,-(1-Math.exp(-s/.25))*.25*(-vy0)*-1*-1]}
for(const [fsv,noise,tol] of [[60,0,1],[120,.4,1],[240,.4,1],[30,0,1.6]]){const px=150,wallPx=100,ywPx=500,tr={t:[],x:[],y:[],c:[],P:{hip:{x:[],y:[],c:[]}}};
  for(let i=0;i<=2.4*fsv;i++){const t=i/fsv,[X,Y]=headAt(t);tr.t.push(t);tr.x.push(wallPx+X*px+rnd()*noise);tr.y.push(ywPx-Y*px+rnd()*noise);tr.c.push(1);
    const hx=X-.8*Math.cos(Math.PI/6),hy=Y+.8*Math.sin(Math.PI/6);tr.P.hip.x.push(wallPx+hx*px+rnd()*noise);tr.P.hip.y.push(ywPx-hy*px+rnd()*noise);tr.P.hip.c.push(1)}
  const r=c.analyze(tr,{pxPerM:px,slow:1,rate:fsv,win:.03}),hr=c.analyze({t:tr.t,x:tr.P.hip.x,y:tr.P.hip.y,c:tr.P.hip.c},{pxPerM:px,slow:1,rate:fsv,win:.03});
  const wallX=(wallPx-tr.x[0])/px,Yw=-(ywPx-tr.y[0])/px,hipOff={dx:(tr.P.hip.x[0]-tr.x[0])/px,dy:-(tr.P.hip.y[0]-tr.y[0])/px};
  const R=c.startReport(r,{dir:1,wallX,Yw,dep:1.2,hip:hr,hipOff,man:{sig:.5,bo:{t:entT+.9,X:(wallPx+7.0*px-tr.x[0])/px}},dtFrame:1/fsv});
  console.log('start fs'+fsv,'ent',R.ent.toFixed(4),'flight',R.flight.toFixed(3),'entD',R.entD.toFixed(3),'vTo',R.vTo.toFixed(2),'angTo',R.angTo.toFixed(1),'body',R.bodyEnt&&R.bodyEnt.toFixed(1),'angEnt',R.angEnt.toFixed(1),'peakH',R.peakH.toFixed(3));
  near(' start flight fs'+fsv,R.flight,tau,tol/fsv+.002);near(' start entry dist fs'+fsv,R.entD,entD,.04);near(' block time',R.blk,.70,1e-9);
  near(' takeoff speed fs'+fsv,R.vTo,Math.hypot(4.5,.5),.15);near(' takeoff angle fs'+fsv,R.angTo,Math.atan2(.5,4.5)*180/Math.PI,2.5);
  near(' body angle at entry fs'+fsv,R.bodyEnt,30,1.5);near(' entry path angle fs'+fsv,R.angEnt,Math.atan2(9.81*tau-.5,4.5)*180/Math.PI,3);
  near(' peak head height',R.peakH,.55+.5*.5/9.81-4.905*(.5/9.81)**2,.01);near(' breakout dist',R.bo.d,7.0,1e-6);near(' t entry from signal',R.tEnt,entT-.5,tol/fsv+.002)}
// 왼쪽으로 뛰는 경우(진행 방향 −): 벽이 오른쪽
{const fsv=120,px=150,wallPx=900,ywPx=500,tr={t:[],x:[],y:[],c:[]};for(let i=0;i<=2.4*fsv;i++){const t=i/fsv,[X,Y]=headAt(t);tr.t.push(t);tr.x.push(wallPx-X*px);tr.y.push(ywPx-Y*px);tr.c.push(1)}
  const r=c.analyze(tr,{pxPerM:px,slow:1,rate:fsv,win:.03}),R=c.startReport(r,{dir:-1,wallX:(wallPx-tr.x[0])/px,Yw:-(ywPx-tr.y[0])/px,man:{dep:1.2}});
  near('start leftward entry dist',R.entD,entD,.04);near('start leftward takeoff angle (head)',R.angTo,Math.atan2(.5,4.5)*180/Math.PI,3)}
// 이탈을 지정하지 않으면 머리 수평 속도 최고 시각을 참고값으로
{const fsv=120,px=150,tr={t:[],x:[],y:[],c:[]};for(let i=0;i<=2.4*fsv;i++){const t=i/fsv,[X,Y]=headAt(t);tr.t.push(t);tr.x.push(100+X*px);tr.y.push(500-Y*px);tr.c.push(1)}
  const r=c.analyze(tr,{pxPerM:px,slow:1,rate:fsv,win:.03}),R=c.startReport(r,{dir:1,wallX:(100-tr.x[0])/px,Yw:-(500-tr.y[0])/px});
  console.log('  no departure given → src',R.depSrc,'dep',R.dep.toFixed(3));if(R.depSrc!=='vel')fail++}
// 출발대 이탈: 발끝 띠(빈 바닥 기준)를 그대로 씀 — 착지가 없으므로 ld는 null
{const H=10,W=33,ppm=250,dz=H/ppm;let sd=3;const rn=()=>{sd=(sd*16807)%2147483647;return sd/2147483647};const bg=[],sh=[];for(let q=0;q<H*W;q++){bg.push(70+80*rn());sh.push(15+40*rn())}
  for(const fsv of [60,120,240]){const dep=1.2+.37/fsv,z=t=>t<=dep?0:Math.min(5,1.2*(t-dep)+2*(t-dep)**2),ts=[],B=[];
    for(let i=0;i<=2*fsv;i++){const t=i/fsv,b=new Uint8Array(H*W);for(let rr=0;rr<H;rr++)for(let cc=0;cc<W;cc++){let s=0;for(let k=0;k<4;k++){const tt=t+(k/4-.25)/fsv/2,hr=(H-1-rr+.5)/ppm;s+=hr>=z(tt)?sh[rr*W+cc]:bg[rr*W+cc]}b[rr*W+cc]=Math.round(s/4)}ts.push(t);B.push(b)}
    const f=c.flightFromBand(ts,B,.3,entT,dz,1.5);near('block departure (toe band) fs'+fsv,f&&f.to,dep,Math.max(.006,1/fsv));if(f&&f.ld!=null){fail++;console.log('FAIL ld should be null')}}}

// ---- 돌핀킥: 골반 1.8 m/s 전진, 발목 상하(골반 기준) 진폭 45cm, 2.2Hz, 업 0.55 / 다운 0.45 비율
function dk(fsv,noise,f,A,v,dur,downFrac){const tr={t:[],x:[],y:[],c:[],P:{hip:{x:[],y:[],c:[]}}},px=120;
  const s=t=>{const ph=(t*f)%1;/* 0: 꼭대기 → downFrac에서 바닥 → 1에서 다시 꼭대기 */return ph<downFrac?A/2*Math.cos(Math.PI*ph/downFrac):-A/2*Math.cos(Math.PI*(ph-downFrac)/(1-downFrac))};
  for(let i=0;i<=dur*fsv;i++){const t=i/fsv,hx=v*t,hy=-.6+.03*Math.sin(2*Math.PI*f*t+1),ax=hx-.95,ay=hy+s(t+.1);
    tr.t.push(t);tr.x.push(100+ax*px+rnd()*noise);tr.y.push(400-ay*px+rnd()*noise);tr.c.push(1);tr.P.hip.x.push(100+hx*px+rnd()*noise);tr.P.hip.y.push(400-hy*px+rnd()*noise);tr.P.hip.c.push(1)}
  return {tr,px}}
for(const [fsv,noise,f,A,v,dur,df] of [[60,0,2.2,.45,1.8,3,.45],[30,.5,2.2,.45,1.8,3,.45],[60,.6,2.6,.38,1.6,2.5,.4],[120,.6,1.9,.5,1.9,3,.5]]){const {tr,px}=dk(fsv,noise,f,A,v,dur,df);
  const r=c.analyze(tr,{pxPerM:px,slow:1,rate:fsv,win:.04}),hr=c.analyze({t:tr.t,x:tr.P.hip.x,y:tr.P.hip.y,c:tr.P.hip.c},{pxPerM:px,slow:1,rate:fsv,win:.04});
  const R=c.dolphinReport(r,{hip:hr,hipOff:{dx:(tr.P.hip.x[0]-tr.x[0])/px,dy:-(tr.P.hip.y[0]-tr.y[0])/px}});
  let expN=0;for(let k=0;k<20;k++){const tl=(k+df)/f-.1;if(tl>.1&&tl<dur-.1)expN++}console.log('dolphin fs'+fsv,'n',R.n,'full',R.nFull,'f',R.f&&R.f.toFixed(3),'amp',R.amp.toFixed(3),'v',R.v&&R.v.toFixed(3),'dpk',R.dpk&&R.dpk.toFixed(3),'down/T',R.ratio&&R.ratio.toFixed(2),'vDown',R.vDown.toFixed(2));
  near(' kick count fs'+fsv+' f'+f,R.n,expN,1);near(' tempo',R.f,f,.03*f);near(' amplitude',R.amp,A,fsv<=30?.06:.035);near(' forward speed',R.v,v,.05);near(' distance per kick',R.dpk,v/f,.05);near(' down share',R.ratio,df,fsv<=30?.08:.05)}
// 골반 없이 발목만: 템포·횟수는 맞아야 함
{const {tr,px}=dk(60,.5,2.2,.45,1.8,3,.45);const r=c.analyze(tr,{pxPerM:px,slow:1,rate:60,win:.04}),R=c.dolphinReport(r,{});near('ankle only tempo',R.f,2.2,.07);near('ankle only count',R.n,6,1)}
// 골반이 중간에 화면 밖으로 나감(추적이 가장자리에 붙어 멈춤): 킥 횟수·템포·진폭은 그대로, 전진 속도는 발목으로 이어서
{const {tr,px}=dk(60,.5,2.2,.45,1.8,3,.45),n0=tr.t.length,cut=Math.round(n0*.55),edge=tr.P.hip.x[cut],ey=tr.P.hip.y[cut];for(let i=cut;i<n0;i++){tr.P.hip.x[i]=edge;tr.P.hip.y[i]=ey}
  const r=c.analyze(tr,{pxPerM:px,slow:1,rate:60,win:.04}),hr=c.analyze({t:tr.t,x:tr.P.hip.x,y:tr.P.hip.y,c:tr.P.hip.c},{pxPerM:px,slow:1,rate:60,win:.04}),n=r.t.length,hipOk=r.t.map(t=>t<tr.t[cut]-.02);
  const R=c.dolphinReport(r,{hip:hr,hipOff:{dx:(tr.P.hip.x[0]-tr.x[0])/px,dy:-(tr.P.hip.y[0]-tr.y[0])/px},hipOk});
  console.log('hip leaves at',tr.t[cut].toFixed(2),'n',R.n,'f',R.f&&R.f.toFixed(3),'amp',R.amp.toFixed(3),'v',R.v&&R.v.toFixed(3),'hipOutT',R.hipOutT);
  near('hip leaves: count',R.n,6,1);near('hip leaves: tempo',R.f,2.2,.07);near('hip leaves: amplitude',R.amp,.45,.06);near('hip leaves: speed',R.v,1.8,.12);if(!R.hipPart){fail++;console.log('FAIL hipPart flag')}
  const Rp=c.dolphinReport(r,{hip:hr,hipOff:{dx:0,dy:-(tr.P.hip.y[0]-tr.y[0])/px},hipOk,pan:true});if(Rp.v!=null||Rp.dpk!=null){fail++;console.log('FAIL pan should hide speed')}else console.log('ok   pan hides speed')}
// 각도: 세 점 중 하나가 화면 밖이면 그 프레임은 각도에서 뺌
{const tr={t:[],x:[],y:[],c:[],P:{a:{x:[],y:[],c:[]},b:{x:[],y:[],c:[]}}};for(let i=0;i<=60;i++){const t=i/60;tr.t.push(t);tr.x.push(200);tr.y.push(300);tr.c.push(1);tr.P.b.x.push(200);tr.P.b.y.push(200);tr.P.b.c.push(1);
    const out=i>40;tr.P.a.x.push(out?404:300);tr.P.a.y.push(out?120:200);tr.P.a.c.push(1)}
  const A=c.angleSeries(tr,[{n:'x',pts:['a','b','main']}],1,60,.04,405,720)[0];near('angle masked min',A.min,90,1);near('angle coverage',A.cov,37/61,.06)}
// 글라이드(1초, v0 2.6, k 0.25) 뒤 돌핀(평균 1.8 m/s): 권장 킥 시작 = (1/1.8−1/2.6)/0.25 ≈ 0.684초 → 실제 1.0초 시작은 약 0.32초 늦음
{const fsv=120,px=120,v0=2.6,k=.25,tk=1,f=2.2,A=.45,tr={t:[],x:[],y:[],c:[],P:{hip:{x:[],y:[],c:[]}}},Xg=t=>Math.log(1+k*v0*t)/k;
  for(let i=0;i<=3.2*fsv;i++){const t=i/fsv,hx=t<tk?Xg(t):Xg(tk)+1.8*(t-tk)+.02*Math.sin(2*Math.PI*f*(t-tk)),hy=-.6,ph=t<tk?0:(t-tk)*f,s=t<tk?0:A/2*(1-Math.cos(2*Math.PI*ph));
    tr.t.push(t);tr.x.push(100+(hx-.95)*px);tr.y.push(400-(hy+s)*px);tr.c.push(1);tr.P.hip.x.push(100+hx*px);tr.P.hip.y.push(400-hy*px);tr.P.hip.c.push(1)}
  const r=c.analyze(tr,{pxPerM:px,slow:1,rate:fsv,win:.04}),hr=c.analyze({t:tr.t,x:tr.P.hip.x,y:tr.P.hip.y,c:tr.P.hip.c},{pxPerM:px,slow:1,rate:fsv,win:.04});
  const R=c.dolphinReport(r,{hip:hr,hipOff:{dx:-.95,dy:0}}),Gk=c.glideKick(hr,R,{});
  console.log('glide→kick',Gk&&{k:Gk.G&&Gk.G.k,tB:Gk.tB,tK:Gk.tK,vK:Gk.vK,tStar:Gk.tStar,dt:Gk.dt});
  near('glide k',Gk.G.k,.25,.03);near('glide end',Gk.tB,.95,.06);near('dolphin avg',Gk.vK,1.8,.06);near('kick start late by',Gk.dt,.32,.1)}
// 각도를 모델 관절로: 추적한 무릎 점이 엉뚱해도(90px 튐) 모델 관절로 계산한 무릎 각은 맞아야 함(골반(0,0)–무릎(100,0)–발목(100,100) = 90°)
{const n=60,tr={t:[],x:[],y:[],c:[],P:{hip:{x:[],y:[],c:[]},knee:{x:[],y:[],c:[]}},lm:[]};for(let i=0;i<n;i++){tr.t.push(i/60);tr.x.push(300);tr.y.push(300);tr.c.push(1);tr.P.hip.x.push(200);tr.P.hip.y.push(200);tr.P.hip.c.push(1);
    tr.P.knee.x.push(i%10===0?390:300);tr.P.knee.y.push(i%10===0?110:200);tr.P.knee.c.push(1);const F=new Float32Array(33*3).fill(NaN);[[23,200,200],[25,300,200],[27,300,300]].forEach(([j,x,y])=>{F[3*j]=x;F[3*j+1]=y;F[3*j+2]=.5});tr.lm.push(F)}
  const defs=[{n:'무릎',pts:['hip','knee','main']}],o={pxPerM:100,slow:1,rate:60,win:.04,angles:defs,W:720,H:405};
  const raw=c.analyze(tr,o).angles[0],lm=c.analyze(tr,Object.assign({},o,{angLM:{hip:[23,24],knee:[25,26],main:[27,28]},lmLim:200})).angles[0];
  const sd=a=>{const m=a.reduce((x,y)=>x+y,0)/a.length;return Math.sqrt(a.reduce((x,y)=>x+(y-m)**2,0)/a.length)};
  console.log('knee from track sd',sd(raw.a).toFixed(1),'from model sd',sd(lm.a).toFixed(2),'model mean',(lm.a.reduce((x,y)=>x+y,0)/lm.a.length).toFixed(1),'share',lm.lmShare);
  near('lm knee angle',lm.a[30],90,1);near('lm knee angle steady',sd(lm.a),0,.5);if(lm.src!=='lm'){fail++;console.log('FAIL src')}}
console.log(fail?fail+' FAILED':'ALL PASS');process.exit(fail?1:0)
