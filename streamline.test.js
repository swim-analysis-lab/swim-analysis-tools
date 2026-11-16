const fs=require('fs');const html=fs.readFileSync(require('path').join(__dirname,'../streamline/index.html'),'utf8');
const core=html.match(/<script id="core">([\s\S]*?)<\/script>/)[1];
const ctx={};new Function('ctx',core+';Object.assign(ctx,{computeMetrics,rate,rateAll,verdict,normSkeleton,recommend,EX,METRICS,PTS});')(ctx);
const {computeMetrics,rateAll,recommend,verdict,EX}=ctx;
let fail=0;const near=(n,a,b,t=0.6)=>{const ok=Math.abs(a-b)<=t;if(!ok)fail++;console.log((ok?'ok  ':'FAIL')+' '+n+': '+a.toFixed(2)+' vs '+b)};
// 좌표: W=H=1000, 배가 오른쪽. 완전 일자(수직)
const st={finger:[.5,.05],wrist:[.5,.12],elbow:[.5,.24],shoulder:[.5,.36],ear:[.5,.30],hip:[.5,.6],knee:[.5,.78],ankle:[.5,.94]};
let m=computeMetrics(st,1000,1000,'right');
['shoulder','elbow','wrist','head','hip','knee','line','tilt'].forEach(k=>near('straight '+k,m[k],0));
// 팔만 어깨에서 앞으로 20° (오른쪽=앞)
const rot=(p,c,d)=>{const r=d*Math.PI/180,x=p[0]-c[0],y=p[1]-c[1];return [c[0]+x*Math.cos(r)-y*Math.sin(r),c[1]+x*Math.sin(r)+y*Math.cos(r)]};
const a20={...st};['finger','wrist','elbow'].forEach(k=>a20[k]=rot(st[k],st.shoulder,20));
m=computeMetrics(a20,1000,1000,'right');near('arm fwd20 shoulder',m.shoulder,20);near('arm fwd20 elbow',m.elbow,0);
// 같은 자세를 좌우 반전 + 배 왼쪽 → 같은 값
const flip=Object.fromEntries(Object.entries(a20).map(([k,p])=>[k,[1-p[0],p[1]]]));
near('mirror shoulder',computeMetrics(flip,1000,1000,'left').shoulder,20);
// 사진 전체를 7° 회전해도 각도 불변
const r7=Object.fromEntries(Object.entries(a20).map(([k,p])=>[k,rot(p,[.5,.5],7)]));
m=computeMetrics(r7,1000,1000,'right');near('rotated shoulder',m.shoulder,20);near('rotated tilt>0',m.tilt>3?1:0,1);
// 누운 자세(90° 회전, 배가 위): 팔이 배 쪽으로 20°
const lie=Object.fromEntries(Object.entries(a20).map(([k,p])=>[k,rot(p,[.5,.5],-90)]));
m=computeMetrics(lie,1000,1000,'up');near('lying shoulder',m.shoulder,20);near('lying flag',m.lying?1:0,1);
// 팔이 뒤로 10° → 음수
const b10={...st};['finger','wrist','elbow'].forEach(k=>b10[k]=rot(st[k],st.shoulder,-10));near('arm back10',computeMetrics(b10,1000,1000,'right').shoulder,-10);
// 팔꿈치 15° 굽힘
const e15={...st};['finger','wrist'].forEach(k=>e15[k]=rot(st[k],st.elbow,15));near('elbow 15',computeMetrics(e15,1000,1000,'right').elbow,15);
// 상체 앞으로 10° 숙임(골반 축) → hip +10
const h10={...st};['finger','wrist','elbow','shoulder','ear'].forEach(k=>h10[k]=rot(st[k],st.hip,10));m=computeMetrics(h10,1000,1000,'right');near('hip fwd10',m.hip,10);near('hip fwd10 shoulder stays',m.shoulder,0);
// 무릎 굽힘 12°: 무릎 위쪽 전체를 무릎 축으로 뒤로 회전(무릎이 앞)
const k12={...st};['finger','wrist','elbow','shoulder','ear','hip'].forEach(k=>k12[k]=rot(st[k],st.knee,-12));near('knee flex12',computeMetrics(k12,1000,1000,'right').knee,12);
// 귀가 앞으로 trunk의 10%
const hd={...st,ear:[.524,.30]};near('head 10%',computeMetrics(hd,1000,1000,'right').head,10);
// 허리 아치: back(0.42,0.40), butt(0.42,0.62), lumbar 0.022 앞 → 10%
const ar={...st,back:[.42,.40],butt:[.42,.62],lumbar:[.442,.51],rib:[.6,.47]};m=computeMetrics(ar,1000,1000,'right');near('arch 10%',m.arch,10);near('rib',m.rib,100*0.1/0.24,0.6);
// 비정사각 이미지: W=600,H=1000 에서 팔 앞으로 20°(픽셀 기준)
const toN=(P,W,H)=>Object.fromEntries(Object.entries(P).map(([k,p])=>[k,[p[0]/W,p[1]/H]]));
const px=Object.fromEntries(Object.entries(st).map(([k,p])=>[k,[p[0]*600,p[1]*1000]]));['finger','wrist','elbow'].forEach(k=>px[k]=rot(px[k],px.shoulder,20));
near('aspect shoulder',computeMetrics(toN(px,600,1000),600,1000,'right').shoulder,20);
// 누락/방향 없음
console.log('missing ->',computeMetrics({finger:[.5,.1]},10,10,'right').missing.length===7?'ok':(fail++,'FAIL'));
console.log('nofront ->',computeMetrics(st,10,10,null).ok===false?'ok':(fail++,'FAIL'));
// 예시 데이터 수치
const exm=html.match(/const EXP=(\[[\s\S]*?\n\]);/)[1];const EXP=eval(exm);
EXP.forEach(e=>{const mm=computeMetrics(e.pts,600,1000,'right');console.log(e.id,Object.fromEntries(['line','shoulder','elbow','wrist','head','hip','knee','arch','rib','tilt'].map(k=>[k,+mm[k].toFixed(1)])),JSON.stringify(rateAll(mm)));
  [{},{supine:'fail'},{supine:'pass',wall:'arch'},{wall:'pass',supine:'pass',trot:'limited',elbow:'fail'}].forEach(t=>{const r=recommend(mm,t);r.routine.forEach(x=>{if(!EX[x.id]){fail++;console.log('FAIL missing ex',x.id)}});console.log('   ',JSON.stringify(t),'->',r.cause,'|',r.findings.map(f=>f.title).join(' / '),'|',r.routine.map(x=>x.id).join(','))})});
const A=computeMetrics(EXP[0].pts,600,1000,'right'),B=computeMetrics(EXP[1].pts,600,1000,'right');console.log('verdicts',['line','shoulder','elbow','head','hip','arch'].map(k=>k+':'+verdict(k,A[k],B[k])).join(' '));
// 완전 일자 → 유지 추천
console.log('straight rec:',recommend(computeMetrics(st,1000,1000,'right'),{}).findings[0].title);
console.log(fail?('\n'+fail+' FAILED'):'\nALL PASS');process.exit(fail?1:0);
