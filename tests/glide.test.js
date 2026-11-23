// 스트림라인(벽 푸시·글라이드) 감속 맞춤, 한 프레임 자세, 자세 인식 뒤집힘 판정 시험 (합성 값)
const fs=require('fs'),path=require('path');const html=fs.readFileSync(path.join(__dirname,'../motion/index.html'),'utf8');
const core=html.match(/<script id="core">([\s\S]*?)<\/script>/)[1];const c={};
new Function('c',core+';Object.assign(c,{analyze,glideReport,streamlinePose,slFromLM,lmFlipped,lmAxis,lmNear})')(c);
let fail=0;const near=(n,a,b,tol)=>{const ok=a!=null&&isFinite(a)&&Math.abs(a-b)<=tol;if(!ok)fail++;console.log((ok?'ok  ':'FAIL')+' '+n+': '+(a==null?a:+(+a).toFixed(4))+' vs '+(+b.toFixed(4))+' (±'+tol+')')};
const is=(n,ok)=>{if(!ok)fail++;console.log((ok?'ok  ':'FAIL')+' '+n)};
let seed=7;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647-.5};

// ---- 글라이드: 2차 항력 v=1/(1/v0+k t). x = ln(1+k v0 t)/k. 왼쪽→오른쪽(dir +1), 오른쪽→왼쪽(dir −1), 끝에 킥으로 다시 빨라짐
function glide({fsv=60,v0=2.3,k=.24,T=2.0,dir=1,noise=0,kick=0,px=190,rise=.05}){const tr={t:[],x:[],y:[],c:[]},X=t=>Math.log(1+k*v0*t)/k;
  for(let i=0;i<=(T+kick)*fsv;i++){const t=i/fsv;let x=X(Math.min(t,T));if(t>T){const s=t-T,vT=1/(1/v0+k*T);x+=vT*s+.6*s*s}
    tr.t.push(t);tr.x.push(300+dir*x*px+noise*rnd());tr.y.push(200-rise*(t/T)*px+noise*rnd());tr.c.push(1)}return {tr,px,X}}
for(const [fsv,noise,dir] of [[60,0,1],[60,.6,1],[120,.6,-1],[240,.8,1],[30,0,-1]]){
  const {tr,px,X}=glide({fsv,noise,dir}),r=c.analyze(tr,{pxPerM:px,slow:1,rate:fsv,win:.08}),R=c.glideReport(r,{});const tag=fsv+'fps noise '+noise+' dir '+dir+': ';
  near(tag+'k',R.k,.24,.012);near(tag+'half-speed distance',R.halfD,Math.LN2/.24,.15);is(tag+'direction',R.dir===dir);is(tag+'R² > 0.97',R.r2>.97);
  const vB=1/(1/2.3+.24*R.tB);near(tag+'end speed',R.vB,vB,.03);near(tag+'distance',R.dist,X(R.tB)-X(R.tA),.02);near(tag+'depth change',R.dY,.05*(R.tB-R.tA)/2,.01)}
// 끝에 킥(다시 빨라짐): 자동 구간은 킥 전에서 멈춤
{const {tr,px}=glide({kick:.6,noise:.4}),r=c.analyze(tr,{pxPerM:px,slow:1,rate:60,win:.08}),R=c.glideReport(r,{});
  is('kick: window ends before kick (tB ≤ 2.05)',R.tB<=2.05&&R.tB>1.7);near('kick: k',R.k,.24,.015)}
// 추적이 출렁여도(주기 0.15초, ±3px) 잠깐 빨라진 것을 킥으로 보고 일찍 끊지 않음
{const {tr,px}=glide({});tr.x=tr.x.map((x,i)=>x+3*Math.sin(2*Math.PI*tr.t[i]/.15));const r=c.analyze(tr,{pxPerM:px,slow:1,rate:60,win:.08}),R=c.glideReport(r,{});
  is('wobble: window covers ≥ 1.5 s',R.tB-R.tA>=1.5);near('wobble: k',R.k,.24,.03)}
// 직접 지정 구간
{const {tr,px}=glide({}),r=c.analyze(tr,{pxPerM:px,slow:1,rate:60,win:.08}),R=c.glideReport(r,{tA:.5,tB:1.5});
  is('manual: src',R.src==='manual');near('manual: tA',R.tA,.5,.02);near('manual: tB',R.tB,1.5,.02);near('manual: k',R.k,.24,.012)}
// 너무 짧은 구간
{const {tr,px}=glide({T:.25}),r=c.analyze(tr,{pxPerM:px,slow:1,rate:60,win:.08}),R=c.glideReport(r,{});is('short glide flagged',!R||R.short)}
// 기준 길이가 2배로 틀리면 k는 1/2, 감소율은 그대로
{const {tr,px}=glide({}),r1=c.analyze(tr,{pxPerM:px,slow:1,rate:60,win:.08}),r2=c.analyze(tr,{pxPerM:px*2,slow:1,rate:60,win:.08}),A=c.glideReport(r1,{}),B=c.glideReport(r2,{});
  near('calibration ×2: k doubles',B.k/A.k,2,.02);near('calibration ×2: loss same',B.loss,A.loss,.3)}

// ---- 자세: 손끝–발목 선 기준. 수평으로 누운 몸, 골반 5cm 처짐(아래), 머리 2cm 위, ppm 200
{const ppm=200,P={hand:{x:600,y:200},ear:{x:470,y:200-.02*ppm},shoulder:{x:450,y:200},hip:{x:340,y:200+.05*ppm},knee:{x:250,y:200},ankle:{x:160,y:200}},S=c.streamlinePose(P,ppm);
  near('pose: body length',S.len,440/ppm,1e-6);near('pose: hip deviation (−5cm)',S.dev.hip,-.05,1e-6);near('pose: ear deviation (+2cm)',S.dev.ear,.02,1e-6);is('pose: worst = hip',S.worst==='hip');near('pose: tilt 0',S.tilt,0,1e-6);
  near('pose: shoulder angle',S.ang.sh,180-Math.atan2(10,110)*180/Math.PI,.01);near('pose: knee angle',S.ang.knee,180-Math.atan2(10,90)*180/Math.PI,.01);
  // 같은 몸을 좌우로 뒤집어도(오른쪽→왼쪽으로 헤엄) 편차 부호는 같음(위 = 수면 쪽)
  const M={};Object.keys(P).forEach(k=>M[k]={x:800-P[k].x,y:P[k].y});const S2=c.streamlinePose(M,ppm);near('pose mirrored: hip deviation',S2.dev.hip,-.05,1e-6);near('pose mirrored: ear deviation',S2.dev.ear,.02,1e-6);
  // 앞이 5° 들린 몸: 기울기 +5°, 편차는 같음
  const a=5*Math.PI/180,R={};Object.keys(P).forEach(k=>{const dx=P[k].x-160,dy=P[k].y-200;R[k]={x:160+dx*Math.cos(a)+dy*Math.sin(a),y:200-dx*Math.sin(a)+dy*Math.cos(a)}});
  const S3=c.streamlinePose(R,ppm);near('pose tilted: tilt +5°',S3.tilt,5,1e-6);near('pose tilted: hip deviation',S3.dev.hip,-.05,1e-6);
  // 머리(귀)는 모은 팔 아래라 많이 아래로 나와도 일직선 편차·가장 벗어난 곳에 넣지 않음
  const E=Object.assign({},P,{ear:{x:470,y:200+.10*ppm}}),SE=c.streamlinePose(E,ppm);is('pose: ear excluded from worst',SE.worst==='hip');near('pose: ear excluded from RMS',SE.rms,S.rms,1e-9);
  is('pose: missing point → null',c.streamlinePose({hand:P.hand,ankle:P.ankle},ppm)===null);
  const S4=c.streamlinePose(P,null);is('pose: no calibration → % only',S4.dev.hip===null&&Math.abs(S4.rel.hip+.05*ppm/440)<1e-9)}

// ---- 자세 인식 관절 → 자세 점, 뒤집힘 판정
{const L=Array.from({length:33},()=>({x:0,y:0,v:.01}));const put=(i,x,y,v)=>L[i]={x,y,v:v==null?.9:v};
  put(11,450,200);put(12,452,203,.3);put(23,340,205);put(24,342,207,.3);put(25,250,200);put(26,252,202,.3);put(27,160,200);put(28,162,202,.3);put(7,470,197,.5);put(8,472,199,.2);
  put(15,560,200);put(16,555,200);put(19,600,200);put(20,590,201);
  const P=c.slFromLM(L,1);is('slFromLM: camera side (left) used',P&&P.shoulder[0]===450&&P.hip[0]===340);is('slFromLM: hand = forward-most',P&&P.hand[0]===600);
  is('slFromLM: wrong swim direction → null',c.slFromLM(L,-1)===null);is('slFromLM: unknown direction accepted',!!c.slFromLM(L,0));
  // 머리↔발 뒤집혀 인식: 손이 발목 쪽 → 몸 축 순서가 어긋나 null
  const F=L.map(q=>({x:q.x,y:q.y,v:q.v}));F[19]={x:120,y:200,v:.9};F[20]={x:120,y:200,v:.9};F[15]={x:130,y:200,v:.9};F[16]={x:130,y:200,v:.9};is('slFromLM: hand behind feet → null',c.slFromLM(F,0)===null);
  // lmFlipped: 찍은 점(골반·발목) 방향과 인식된 관절 방향이 반대면 뒤집힘
  const ref=[{ids:[23,24],x:340,y:205},{ids:[27,28],x:160,y:200}];is('lmFlipped: same direction',c.lmFlipped(L,ref,null)===false);
  const ref2=[{ids:[23,24],x:160,y:205},{ids:[27,28],x:340,y:200}];is('lmFlipped: reversed',c.lmFlipped(L,ref2,null)===true);
  // lmNear: 따라가는 점들 근처의 몸만 받아들임(다른 사람으로 옮겨 가기 막기). 뒤집혀 인식돼도 가운데는 같아 통과
  is('lmNear: same body',c.lmNear(L,ref,100)===true);is('lmNear: flipped body still near',c.lmNear(L,ref2,100)===true);
  is('lmNear: other person 400px away rejected',c.lmNear(L,ref.map(r=>({ids:r.ids,x:r.x+400,y:r.y})),100)===false);is('lmNear: no refs → accept',c.lmNear(L,[],100)===true);
  const ax=c.lmAxis(L);is('lmAxis: hip→shoulder points right',ax&&ax.x>.99);is('lmFlipped: single point uses previous axis',c.lmFlipped(L,[ref[0]],{x:-1,y:0})===true&&c.lmFlipped(L,[ref[0]],{x:1,y:0})===false)}

console.log(fail?fail+' FAILED':'all passed');process.exit(fail?1:0);
