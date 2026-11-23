// 고치기·저장 시험: 자세 연결(뼈 방향 기준 차이), 왼·오른쪽 뒤바뀜 막기, 손에 가린 관절(자세 위치 엉뚱 + 무늬 확실) 처리,
// 여러 고침 합치기(blendFix), 추적 결과 저장·불러오기(packTrack/unpackTrack)가 저장할 때 값과 똑같은지
const fs=require('fs'),path=require('path');const html=fs.readFileSync(path.join(__dirname,'../motion/index.html'),'utf8');
const core=html.match(/<script id="core">([\s\S]*?)<\/script>/)[1];const c={};
new Function('c',core+';Object.assign(c,{toFeat,makeTracker,plinkMake,plinkBase,segAng,stepPt,lmMedian,blendFix,quantTrack,packTrack,unpackTrack,encD,decD,LPAIR})')(c);
let fail=0;const ok=(n,cond,info)=>{if(!cond)fail++;console.log((cond?'ok  ':'FAIL')+' '+n+(info!=null?': '+info:''))};
const near=(n,a,b,tol)=>ok(n,Math.abs(a-b)<=tol,(+a.toFixed(3))+' vs '+(+b.toFixed(3))+' (±'+tol+')');
const LMof=o=>{const L=[];for(let i=0;i<33;i++)L.push({x:0,y:0,v:0});Object.keys(o).forEach(i=>L[i]=Object.assign({v:.9},o[i]));return L};
const rot=(p,o,a)=>{const c0=Math.cos(a),s0=Math.sin(a),dx=p.x-o.x,dy=p.y-o.y;return {x:o.x+dx*c0-dy*s0,y:o.y+dx*s0+dy*c0}};

// 1) 무릎 점 = 무릎 관절에서 허벅지 방향 기준으로 (뒤 6px, 바깥 9px). 다리가 엉덩이를 중심으로 90° 돌면 점도 같이 돌아야 함
{const H={x:200,y:100},K={x:200,y:180},p={x:209,y:174};
  const L0=LMof({23:H,25:K,24:{x:230,y:105,v:.2},26:{x:236,y:186,v:.2}}),lk=c.plinkMake(L0,[25,26],p,60);
  ok('link to camera-side knee',lk&&lk.i===25,lk&&lk.i);near('base at link frame x',c.plinkBase(L0,lk,25).x,p.x,1e-9);near('base at link frame y',c.plinkBase(L0,lk,25).y,p.y,1e-9);
  const a=Math.PI/2,K2=rot(K,H,a),L1=LMof({23:H,25:K2}),b=c.plinkBase(L1,lk,25),want=rot(p,H,a);
  near('rotated 90° x',b.x,want.x,1e-6);near('rotated 90° y',b.y,want.y,1e-6);
  /* 예전 방식(화면 기준 차이 고정)이면 얼마나 벗어났는지 */
  const oldx=K2.x+(p.x-K.x),oldy=K2.y+(p.y-K.y);console.log('     (화면 기준 고정 차이였다면 '+Math.hypot(oldx-want.x,oldy-want.y).toFixed(1)+'px 벗어남)');
  /* 허벅지가 카메라 쪽을 향해 아주 짧게 보이면 방향을 믿지 않고 직전 방향 */
  const L2=LMof({23:H,25:{x:203,y:110}}),b2=c.plinkBase(L2,Object.assign({},lk,{ang:lk.ang}),25);near('foreshortened → keep angle x',b2.x,203+(p.x-K.x),1e-6);
  /* 관절이 안 보이면(가시성 0.3 미만) 없음 */
  ok('invisible joint → null',c.plinkBase(LMof({23:H,25:Object.assign({},K,{v:.1})}),lk,25)===null);
  /* 너무 멀면 잇지 않음 */
  ok('too far → no link',c.plinkMake(L0,[25,26],{x:400,y:400},60)===null);
  /* 머리: 귀→코 방향. 오른쪽 귀가 더 잘 보이면 오른쪽 귀 기준 */
  const LH=LMof({0:{x:110,y:60},7:{x:100,y:50,v:.4},8:{x:101,y:51,v:.9}}),lh=c.plinkMake(LH,[7,8,0],{x:96,y:44},60);ok('head link: ear → nose direction',lh&&lh.i===7&&lh.seg.join()==='7,0',JSON.stringify(lh&&lh.seg));
  const ln=c.plinkMake(LH,[7,8,0],{x:113,y:63},60);ok('nose link: more visible ear → nose',ln&&ln.i===0&&ln.seg.join()==='8,0',JSON.stringify(ln&&ln.seg))}

// 2) 왼·오른쪽 뒤바뀜: 무늬가 없는 화면(무늬로는 못 찾음)에서 자세 인식이 몇 프레임 동안 왼·오른쪽 무릎을 바꿔 붙여도 원래 다리를 따라가야 함
{const W=200,H=200,flat=new Uint8ClampedArray(W*H*4).fill(128);for(let i=3;i<flat.length;i+=4)flat[i]=255;const F=c.toFeat(flat,W,H);
  const K=t=>({x:80+t*1.5,y:100}),Ko=t=>({x:118+t*1.5,y:104}),Hp=t=>({x:80+t*1.5,y:40}),Ho=t=>({x:115+t*1.5,y:42});
  const s={trk:c.makeTracker(F,K(0).x+4,K(0).y-3,16)};s.lk=c.plinkMake(LMof({23:Hp(0),25:K(0),24:Ho(0),26:Ko(0)}),[25,26],{x:K(0).x+4,y:K(0).y-3},60);
  let maxe=0;for(let t=1;t<=12;t++){const sw=t>=4&&t<=8,L=LMof(sw?{23:Ho(t),25:Ko(t),24:Hp(t),26:K(t)}:{23:Hp(t),25:K(t),24:Ho(t),26:Ko(t)});const r=c.stepPt(s,F,L,{});maxe=Math.max(maxe,Math.hypot(r.x-(K(t).x+4),r.y-(K(t).y-3)))}
  ok('left/right swap guarded',maxe<1.5,'max error '+maxe.toFixed(2)+'px, switches '+(s.swaps||0));
  /* 원래 쪽 무릎이 잠깐 안 보이고(가시성 0.1) 반대쪽 무릎만 38px 떨어져 보이면 옮겨 타지 않음(점프 금지) */
  const s2={trk:c.makeTracker(F,K(0).x+4,K(0).y-3,16)};s2.lk=c.plinkMake(LMof({23:Hp(0),25:K(0),24:Ho(0),26:Ko(0)}),[25,26],{x:K(0).x+4,y:K(0).y-3},60);
  let mx2=0;for(let t=1;t<=4;t++){const L=LMof({23:Hp(t),25:Object.assign({},K(t),{v:t===2||t===3?.1:.9}),24:Ho(t),26:Ko(t)});const r=c.stepPt(s2,F,L,{});mx2=Math.max(mx2,Math.hypot(r.x-(K(t).x+4),r.y-(K(t).y-3)))}
  ok('hidden own side, far other side → no jump',mx2<6&&!(s2.swaps),'max error '+mx2.toFixed(2)+'px, switches '+(s2.swaps||0))}

// 3) 손에 가린 발목: 자세 인식이 25px 엉뚱한 곳을 찍어도, 멈춰 있는 발목 무늬가 예측 자리에서 아주 잘 맞으면 무늬를 믿음
{const W=200,H=160;let sd=3;const rnd=()=>{sd=(sd*16807)%2147483647;return sd/2147483647};const img=new Uint8ClampedArray(W*H*4);for(let i=0;i<W*H;i++){const v=40+180*rnd();img[4*i]=img[4*i+1]=img[4*i+2]=v;img[4*i+3]=255}
  const F=c.toFeat(img,W,H),A={x:100,y:80},s={trk:c.makeTracker(F,A.x,A.y,12)};s.lk=c.plinkMake(LMof({25:{x:95,y:40},27:{x:101,y:82}}),[27,28],A,60);
  let maxe=0,tm=0;for(let t=1;t<=6;t++){const L=LMof({25:{x:95,y:40},27:t<=4?{x:126,y:86}:{x:101,y:82}});const r=c.stepPt(s,F,L,{});if(r.src==='tmpl')tm++;maxe=Math.max(maxe,Math.hypot(r.x-A.x,r.y-A.y))}
  ok('wrong pose under hands → texture wins',maxe<1,'max error '+maxe.toFixed(2)+'px, texture frames '+tm)}

// 4) 여러 고침 합치기
{const n=30,old={x:[],y:[],c:[]};for(let j=0;j<n;j++){old.x.push(j);old.y.push(0);old.c.push(1)}
  const js=[10,20],P0=[{x:10,y:5},{x:20,y:7}],seq=(a,b,y,cc)=>{const o=[];if(a<=b)for(let j=a;j<=b;j++)o.push({j,x:j,y,c:cc});else for(let j=a;j>=b;j--)o.push({j,x:j,y,c:cc});return o};
  /* 첫 고침: 뒤로는 6에서 기존과 만나 멈춤(7~9만), 앞으로는 19까지 y=5. 둘째: 뒤로 11까지 y=7, 앞으로 25에서 멈춤(21~25) */
  const R=c.blendFix(js,P0,[seq(11,19,5,1),seq(21,25,7,1)],[seq(9,7,5,1),seq(19,11,7,1)],old);
  ok('fix frames exact',R[10].y===5&&R[20].y===7&&R[10].c===1);near('between: near first',R[11].y,5+.1*2,1e-9);near('between: middle',R[15].y,6,1e-9);near('between: near second',R[19].y,5+.9*2,1e-9);
  ok('before first fix: backward pass',R[7].y===5&&R[9].y===5);ok('outside passes untouched',R[6]===undefined&&R[26]===undefined);ok('after last fix: forward pass',R[25].y===7);
  /* 한쪽이 기존 경로와 만나 일찍 멈췄으면, 그 뒤로는 기존 값이 그쪽 몫 */
  const R2=c.blendFix(js,P0,[seq(11,13,5,1),[]],[[],seq(19,11,7,1)],old);near('stopped pass → old value share',R2[15].y,.5*0+.5*7,1e-9)}

// 5) 저장 → 불러오기: 값이 그대로(같은 영상), 화면 크기가 다르면 비율만큼
{let sd=11;const rnd=()=>{sd=(sd*16807)%2147483647;return sd/2147483647};const n=97,tr={t:[],x:[],y:[],c:[],P:{hip:{x:[],y:[],c:[]},knee:{x:[],y:[],c:[]}},fd:[],fdBox:{x0:10,x1:42,y0:300,y1:303},fbp:[],sil:1,pose:['main','hip'],chain:['hip','main','knee'],parent:{main:'hip',knee:'hip'},fixLog:[{k:'knee',t:.7167,x:511.3,y:315.3}]};
  for(let i=0;i<n;i++){tr.t.push(.05+i/30+(rnd()-.5)*1e-4);['main','hip','knee'].forEach(k=>{const s=k==='main'?tr:tr.P[k];s.x.push(100+300*rnd());s.y.push(50+400*rnd());s.c.push(rnd())});tr.fd.push(60*rnd());const b=new Uint8Array(33*4);for(let q=0;q<b.length;q++)b[q]=255*rnd();tr.fbp.push(b)}
  c.quantTrack(tr);const o=JSON.parse(JSON.stringify(c.packTrack(tr))),u=c.unpackTrack(o,1,1);
  const eq=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);
  ok('times identical',eq(u.t,tr.t));ok('points identical',['main','hip','knee'].every(k=>{const a=k==='main'?u:u.P[k],b=k==='main'?tr:tr.P[k];return eq(a.x,b.x)&&eq(a.y,b.y)&&eq(a.c,b.c)}));
  ok('band diff identical',eq(u.fd,tr.fd));ok('band pixels identical',u.fbp&&u.fbp.length===n&&u.fbp.every((b,i)=>eq(Array.from(b),Array.from(tr.fbp[i]))));
  ok('meta kept',u.sil===1&&u.pose.join()==='main,hip'&&u.chain.join()==='hip,main,knee'&&u.parent.knee==='hip'&&u.fixLog.length===1);
  const o2=c.packTrack(tr,{fbpMax:0}),size=JSON.stringify(o2).length;ok('band pixels dropped when too big',!o2.fbp&&!!o2.fdBox);
  ok('compact (random jumps, no band pixels)',size<8000,size+' chars for '+n+' frames × 3 points');
  const u2=c.unpackTrack(o,2,2);near('scaled x',u2.x[5],tr.x[5]*2,1e-9);ok('scaled: band pixels not reused',!u2.fbp&&u2.fdBox.x1===84);
  ok('NaN safe',c.decD(c.encD([1,NaN,3],100),100).join()==='1,1,3');ok('broken data → null',c.unpackTrack({k:{main:{x:'1,2',y:'1',c:'1'}},t:'1,2'})===null)}

// 6) 관절 중앙값: 한 장만 튄 프레임을 거름
{const a=LMof({25:{x:100,y:100}}),b=LMof({25:{x:140,y:90}}),d=LMof({25:{x:102,y:101}}),m=c.lmMedian([a,b,d]);ok('median rejects one-frame glitch',m[25].x===102&&m[25].y===100)}
console.log(fail?fail+' FAILED':'ALL PASS');process.exit(fail?1:0)
