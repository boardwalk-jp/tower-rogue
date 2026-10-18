// ボス出現の曲「終焉の玉座」ver11（ギター版）。別のチャットで作った曲を、ゲームの音の仕組み（G.Sound）につないで鳴らす
// 元のページ：https://claude.ai/artifact/ESaMfBGLqN6W5fF62hSk6Y （楽譜と音作りはそのまま。画面の部分だけ外した）
'use strict';
var G = window.G = window.G || {};

G.makeBossTheme = function (ctx, OUT) {
/* ===== 楽譜データ ===== */
const A='lead hits arp bass drum', B='lead thick choir heavy arp8 pulse8 drumB';
const SONG=[
 {s:'イントロ：静寂',c:'Dm:24',len:24,v:.35,p:'heart'},
 {c:'Dm:24',len:24,v:.45,p:'heart'},
 {c:'Dm:24',len:24,tick:'A5',v:.6,p:'heart tickq'},
 {c:'D#:24',len:24,tick:'A#5',v:.75,p:'heart tickq'},
 {c:'D#:16',len:16,p:''},
 {s:'イントロ：迫る気配',c:'Dm:16',b:'D2',a:'D5 D#5 A5 D6',v:.6,p:'stabs pulse8 clash hat16 heart2'},
 {c:'Dm:16',b:'D#2',a:'D#5 D5 A5 D#6',v:.7,p:'stabs pulse8 clash hat16 heart2'},
 {c:'Dm:16',b:'E2',a:'D5 E5 A5 D6',v:.8,p:'stabs pulse8 clash hat16 heart2'},
 {c:'Dm:16',b:'F2',a:'D5 F5 A5 D6',v:.9,p:'stabs pulse8 clash hat16 heart2'},
 {c:'A7:20',len:20,p:''},
 {s:'イントロ：高まり',c:'A7:16',b:'A1',run:'A4',v:1,p:'drone pulse8 run roll timproll hat16'},
 {c:'A7:16',b:'A1',run:'A5',v:1,p:'drone pulse8 run roll timproll hat16'},
 {s:'イントロ：一撃',c:'A7:24',len:24,p:'big pick'},
  {s:'戦闘テーマ',c:'Dm:16',m:'D5:6 A5:6 F5:4',h:'F4:6 D4:6 A4:4',p:A+' impact'},
 {c:'A#:16',m:'G5:4 F5:4 D5:4 F5:4',h:'A#3:4 D4:4 F4:4 D4:4',p:A},
 {c:'Gm:16',m:'G5:6 A#5:6 D6:4',h:'D5:6 A#4:6 G4:4',p:A},
 {c:'A7:16',m:'C#6:8 A5:4 E5:4',h:'E4:8 G4:4 C#5:4',p:A},
 {c:'Dm:16',m:'D6:6 C6:2 A5:4 F5:4',h:'F4:6 E4:2 F4:4 A4:4',p:A},
 {c:'A#:16',m:'F5:2 G5:2 A5:4 A#5:4 D6:4',h:'D5:4 C5:4 A#4:4 F4:4',p:A},
 {c:'Gm:16',m:'C6:4 A#5:4 A5:4 G5:4',h:'D4:4 E4:4 F4:4 A#4:4',p:A},
 {c:'A7:16',m:'A5:12 C#6:2 E6:2',h:'C#4:4 E4:4 G4:4 A4:4',p:A+' fill'},
 {s:'反撃',c:'A#add9:16',m:'D6:6 F6:6 A#5:4',h:'F4:6 A4:6 D5:4',p:B+' crash'},
 {c:'Csus4:4 C:12',m:'C6:4 E6:4 G6:8',h:'F4:4 E4:4 C4:8',p:B},
 {c:'Dm:16',m:'F6:6 E6:2 D6:4 A5:4',h:'D4:6 E4:2 F4:4 A4:4',p:B},
 {c:'Dmadd9:16',m:'D6:12 r:4',h:'A4:4 F4:4 E4:4 D4:4',p:B+' timproll'},
 {c:'A#add9:16',m:'D6:6 F6:6 D6:4',h:'F4:6 D4:6 A#3:4',p:B+' crash'},
 {c:'C:16',m:'E6:6 G6:6 E6:4',h:'C5:6 G4:6 E4:4',p:B},
 {c:'Asus4:8 A:8',m:'A6:8 G6:4 E6:4',h:'D5:8 C#5:4 A4:4',p:B},
 {c:'A7:16',m:'C#6:4 E6:4 A6:8',h:'A4:4 G4:4 E4:8',p:B+' roll'},
 {s:'静かな絶望',c:'Dm:16',m:'A5:8 F5:8',h:'F4:8 D4:8',p:'lead choir bass half crash'},
 {c:'D#:16',m:'G5:8 D#5:8',h:'D#4:8 A#3:8',p:'lead choir bass half'},
 {c:'Dm:16',m:'F5:8 D5:8',h:'A3:8 F4:8',p:'lead choir bass arp half'},
 {c:'A7:16',m:'C#5:8 E5:8',h:'E4:8 G4:8',p:'lead choir bass arp timproll roll'},
 {s:'決着',c:'Dm:16',m:'D6:16',p:'lead pad choir end'},
 {c:'Dm:16',p:''}
];
const BPM=168, SD=60/BPM/4, BAR=SD*16;
const LOOP_FROM=SONG.findIndex(b=>b.s==='戦闘テーマ'), LOOP_AFTER=SONG.findIndex(b=>b.s==='決着')-1;
const LEN=b=>b.len||16;
const OFF=[]; SONG.reduce((a,b,i)=>(OFF[i]=a,a+LEN(b)),0);


const NOTE={C:0,'C#':1,D:2,'D#':3,E:4,F:5,'F#':6,G:7,'G#':8,A:9,'A#':10,B:11};
const Q={'':[0,4,7],'m':[0,3,7],'7':[0,4,7,10],'sus4':[0,5,7],'add9':[0,4,7,14],'madd9':[0,3,7,14]};
const midi=n=>{const m=n.match(/^([A-G]#?)(\d)$/);return (+m[2]+1)*12+NOTE[m[1]];};
const hz=m=>440*Math.pow(2,(m-69)/12);
function chords(str){let at=0;return str.split(' ').map(x=>{const [n,l]=x.split(':');const m=n.match(/^([A-G]#?)(.*)$/);const o={root:NOTE[m[1]],q:Q[m[2]],from:at,len:+l};at+=+l;return o;});}
const chordAt=(cs,s)=>cs.find(c=>s>=c.from&&s<c.from+c.len)||cs[cs.length-1];

/* ===== 音を作る部分 ===== */
let IR,punch,master,comp,analyser,noise,P12,P25,P50,bus=null,playing=false,timer=null,barIdx=0,nextT=0,barLog=[],notes=[];
const mute={lead:false,counter:false,harm:false,arp:false,bass:false,drum:false};
function pulse(d){const n=48,re=new Float32Array(n),im=new Float32Array(n);for(let i=1;i<n;i++)re[i]=4/(i*Math.PI)*Math.sin(i*Math.PI*d);return ctx.createPeriodicWave(re,im);}
function init(){
  master=ctx.createGain(); comp=ctx.createDynamicsCompressor(); comp.threshold.value=-12; comp.ratio.value=3; comp.knee.value=12; comp.attack.value=.01; comp.release.value=.25;
  analyser=ctx.createAnalyser(); analyser.fftSize=1024;
  master.connect(comp); comp.connect(analyser);
  // 仕上げ：音割れ防止（リミッター＋やわらかいクリップ）
  const lim=ctx.createDynamicsCompressor(); lim.threshold.value=-4; lim.knee.value=2; lim.ratio.value=20; lim.attack.value=.002; lim.release.value=.12;
  const sc=ctx.createWaveShaper(), cv=new Float32Array(2048); for(let i=0;i<2048;i++){const x=(i/1023.5-1)*1.4; cv[i]=Math.tanh(x);} sc.curve=cv;
  const pre=ctx.createGain(); pre.gain.value=1/1.4;
  analyser.connect(lim); lim.connect(pre); pre.connect(sc); sc.connect(OUT);
  punch=ctx.createGain(); punch.gain.value=volume(); punch.connect(analyser);
  master.gain.value=volume();
  noise=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate); const d=noise.getChannelData(0); for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  P12=pulse(.125); P25=pulse(.25); P50=pulse(.5);
  const len=Math.floor(ctx.sampleRate*2.6); IR=ctx.createBuffer(2,len,ctx.sampleRate); for(let c=0;c<2;c++){const d=IR.getChannelData(c); for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3.4);}
}
function makeBus(){
  const b=ctx.createGain(); b.connect(master);
  const dl=ctx.createDelay(1); dl.delayTime.value=SD*3; const fb=ctx.createGain(); fb.gain.value=.28; const wet=ctx.createGain(); wet.gain.value=.25;
  const lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=2800;
  dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(wet); wet.connect(b);
  const parts={}; Object.keys(mute).forEach(k=>{const g=ctx.createGain(); g.gain.value=mute[k]?0:1; parts[k]=g;});
  // 金管・ドラムの低すぎる成分を削って、ベースの居場所を空ける
  const duck=ctx.createGain(); duck.connect(b);
  const hpH=ctx.createBiquadFilter(); hpH.type='highpass'; hpH.frequency.value=190; parts.harm.connect(hpH); hpH.connect(duck);
  const rv=ctx.createConvolver(); rv.buffer=IR; const rvhp=ctx.createBiquadFilter(); rvhp.type='highpass'; rvhp.frequency.value=260; const rvg=ctx.createGain(); rvg.gain.value=.6; rv.connect(rvhp); rvhp.connect(rvg); rvg.connect(b);
  const send=(node,a)=>{const g=ctx.createGain(); g.gain.value=a; node.connect(g); g.connect(rv);};
  const hpD=ctx.createBiquadFilter(); hpD.type='lowshelf'; hpD.frequency.value=120; hpD.gain.value=-4; const dt=ctx.createGain(); dt.gain.value=.58; parts.drum.connect(hpD); hpD.connect(dt); dt.connect(b);
  const pan=(node,x)=>{if(ctx.createStereoPanner){const p=ctx.createStereoPanner(); p.pan.value=x; node.connect(p); p.connect(b);} else node.connect(b);};
  pan(parts.lead,.22); pan(parts.counter,-.22); parts.arp.connect(duck);
  send(parts.lead,.2); send(parts.counter,.16); send(parts.harm,.32); send(parts.arp,.3); send(parts.drum,.08);
  const sh=ctx.createWaveShaper(), cv=new Float32Array(1024); for(let i=0;i<1024;i++){const x=i/511.5-1; cv[i]=Math.tanh(2.6*x)/Math.tanh(2.6);} sh.curve=cv;
  const bg=ctx.createGain(); bg.gain.value=.95; parts.bass.connect(sh); sh.connect(bg); bg.connect(b);
  parts.bassHi=ctx.createGain(); parts.bassHi.connect(parts.bass);
  const pk=ctx.createGain(); pk.connect(punch);
  parts.lead.connect(dl); parts.arp.connect(dl); parts.counter.connect(dl);
  return {b,parts,pk,duck};
}
function tone(t,f,dur,vol,wave,dest,sus=.65,vib=false){
  const o=ctx.createOscillator(); if(typeof wave==='string')o.type=wave; else o.setPeriodicWave(wave);
  o.frequency.setValueAtTime(f,t);
  const g=ctx.createGain(); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vol,t+.005);
  g.gain.setTargetAtTime(vol*sus,t+.01,.08); g.gain.setTargetAtTime(0,t+dur,.03);
  if(vib&&dur>.3){const l=ctx.createOscillator(),lg=ctx.createGain(); l.frequency.value=6; lg.gain.setValueAtTime(0,t); lg.gain.linearRampToValueAtTime(f*.009,t+.35); l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t+dur+.3);}
  o.connect(g); g.connect(dest); o.start(t); o.stop(t+dur+.3);
}
function env(g,t,vol,a,dec,sus,dur,rel){g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+a);g.gain.setTargetAtTime(vol*sus,t+a,dec);g.gain.setTargetAtTime(0,t+Math.max(dur,a),rel);}
function stack(t,f,dur,dets,type,dest,tail){return dets.map(c=>{const o=ctx.createOscillator();o.type=type;o.frequency.setValueAtTime(f,t);o.detune.value=c;o.connect(dest);o.start(t);o.stop(t+dur+tail);return o;});}
function vibr(t,dur,os,depth){if(dur<.3)return;const l=ctx.createOscillator(),lg=ctx.createGain();l.frequency.value=5.4;lg.gain.setValueAtTime(0,t);lg.gain.linearRampToValueAtTime(depth,t+.45);l.connect(lg);os.forEach(o=>lg.connect(o.detune));l.start(t);l.stop(t+dur+.4);}
/* メイン：スーパーソウ（ずらした のこぎり波5本） */
function lead(t,f,dur,vol,dest){
  const fl=ctx.createBiquadFilter(); fl.type='lowpass'; fl.Q.value=1.2; fl.frequency.setValueAtTime(1500,t); fl.frequency.linearRampToValueAtTime(6000,t+.03); fl.frequency.setTargetAtTime(3400,t+.04,.25);
  const g=ctx.createGain(); env(g,t,vol,.008,.18,.8,dur,.07);
  const os=stack(t,f,dur,[-20,-9,0,9,20],'sawtooth',fl,.5); vibr(t,dur,os,16);
  const sub=ctx.createOscillator(),sg=ctx.createGain(); sub.type='square'; sub.frequency.value=f/2; env(sg,t,vol*.35,.008,.2,.8,dur,.07); sub.connect(sg); sg.connect(dest); sub.start(t); sub.stop(t+dur+.5);
  fl.connect(g); g.connect(dest);
}
/* メイン：エレキギター風（歪ませた音＋アンプのスピーカー風の音作り） */
function inst(t,f,dur,vol,dest){
  const pre=ctx.createGain(); pre.gain.value=7;
  const sh=ctx.createWaveShaper(), cv=new Float32Array(1024); for(let i=0;i<1024;i++){const x=i/511.5-1; cv[i]=Math.tanh(3*x)*.8+Math.tanh(9*x)*.2;} sh.curve=cv; sh.oversample='2x';
  const hp=ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=140;
  const pk=ctx.createBiquadFilter(); pk.type='peaking'; pk.frequency.value=1700; pk.Q.value=.9; pk.gain.value=5;
  const lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=4300; lp.Q.value=.8;
  const g=ctx.createGain(); env(g,t,vol,.004,.25,.85,dur,.07);
  const os=[0,6].map(c=>{const o=ctx.createOscillator(); o.type='sawtooth'; o.detune.value=c;
    o.frequency.setValueAtTime(f*0.9439,t); o.frequency.exponentialRampToValueAtTime(f,t+.055); o.connect(pre); o.start(t); o.stop(t+dur+.3); return o;});
  if(dur>.3){const l=ctx.createOscillator(),lg=ctx.createGain(); l.frequency.value=6.2; lg.gain.setValueAtTime(0,t+.2); lg.gain.linearRampToValueAtTime(26,t+.5); l.connect(lg); os.forEach(o=>lg.connect(o.detune)); l.start(t); l.stop(t+dur+.3);}
  pre.connect(sh); sh.connect(hp); hp.connect(pk); pk.connect(lp); lp.connect(g); g.connect(dest);
}
/* サブメロディ：太いシンセ（のこぎり3本＋四角） */
function ctr(t,f,dur,vol,dest){
  const fl=ctx.createBiquadFilter(); fl.type='lowpass'; fl.Q.value=2.5; fl.frequency.setValueAtTime(900,t); fl.frequency.linearRampToValueAtTime(3200,t+.04); fl.frequency.setTargetAtTime(2000,t+.05,.3);
  const g=ctx.createGain(); env(g,t,vol,.01,.2,.85,dur,.08);
  const os=stack(t,f,dur,[-11,0,11],'sawtooth',fl,.5).concat(stack(t,f,dur,[0],'square',fl,.5)); vibr(t,dur,os,12);
  fl.connect(g); g.connect(dest);
}
/* 和音のつぶ：プラック（はじくような音） */
function pluck(t,f,vol,dest,len=.32){
  const fl=ctx.createBiquadFilter(); fl.type='lowpass'; fl.Q.value=3; fl.frequency.setValueAtTime(5200,t); fl.frequency.exponentialRampToValueAtTime(500,t+len*.6);
  const g=ctx.createGain(); g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(.0005,t+len);
  stack(t,f,len,[-7,7],'sawtooth',fl,.05); fl.connect(g); g.connect(dest);
}
/* 和音：シンセブラス／長い音はストリングス風にゆっくり立ち上がる */
function brass(t,f,dur,vol,dest){
  const slow=dur>1.2, a=slow?.28:.012;
  const fl=ctx.createBiquadFilter(); fl.type='lowpass'; fl.Q.value=1.5;
  if(slow){fl.frequency.setValueAtTime(700,t); fl.frequency.linearRampToValueAtTime(2400,t+dur*.6);}
  else{fl.frequency.setValueAtTime(600,t); fl.frequency.linearRampToValueAtTime(3800,t+.05); fl.frequency.setTargetAtTime(1600,t+.06,.18);}
  const g=ctx.createGain(); env(g,t,vol*.85,a,.2,.75,dur,slow?.25:.06);
  stack(t,f,dur,[-14,-4,6,15],'sawtooth',fl,.6); fl.connect(g); g.connect(dest);
}
/* コーラス風（「アー」という声っぽい音） */
function choir(t,f,dur,vol,dest){
  const mix=ctx.createGain(); const g=ctx.createGain(); env(g,t,vol,.35,.4,.9,dur,.35);
  const os=stack(t,f,dur,[-10,0,10],'sawtooth',mix,.8); vibr(t,dur,os,10);
  [[720,7,1],[1150,8,.7],[2600,9,.25]].forEach(([fr,q,a])=>{const b=ctx.createBiquadFilter(); b.type='bandpass'; b.frequency.value=fr; b.Q.value=q; const bg=ctx.createGain(); bg.gain.value=a*3; mix.connect(b); b.connect(bg); bg.connect(g);});
  g.connect(dest);
}
function bassN(t,m,d,vol){const P=bus.parts;
  const o=ctx.createOscillator(); o.type='sine'; o.frequency.setValueAtTime(hz(m)*1.5,t); o.frequency.exponentialRampToValueAtTime(hz(m),t+.04);
  const g=ctx.createGain(); env(g,t,vol*1.15,.004,.3,.85,d,.04); o.connect(g); g.connect(P.bass); o.start(t); o.stop(t+d+.3);
  const fl=ctx.createBiquadFilter(); fl.type='lowpass'; fl.Q.value=5; fl.frequency.setValueAtTime(1600,t); fl.frequency.exponentialRampToValueAtTime(420,t+.18);
  const g2=ctx.createGain(); env(g2,t,.085,.004,.2,.7,d,.04); stack(t,hz(m),d,[-12,12],'sawtooth',fl,.3); fl.connect(g2); g2.connect(P.bassHi);}
function swell(t,f,dur,vol,dest){choir(t,f,dur,vol*1.6,dest);}
function nz(t,dur,vol,type,freq,dest,q){
  const s=ctx.createBufferSource(); s.buffer=noise; const f=ctx.createBiquadFilter(); f.type=type; f.frequency.value=freq; if(q)f.Q.value=q;
  const g=ctx.createGain(); g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(.0005,t+dur);
  s.connect(f); f.connect(g); g.connect(dest); s.start(t,Math.random()*.5); s.stop(t+dur+.02);
}
function duckAt(t,depth=.45){if(!bus||!bus.duck)return;const d=bus.duck.gain;d.setValueAtTime(depth,t);d.setTargetAtTime(1,t+.02,.09);}
function kick(t,dest,v=1){const o=ctx.createOscillator(); o.frequency.setValueAtTime(180,t); o.frequency.exponentialRampToValueAtTime(46,t+.09);
  const g=ctx.createGain(); g.gain.setValueAtTime(1.0*v,t); g.gain.setValueAtTime(1.0*v,t+.08); g.gain.setTargetAtTime(0,t+.08,.09); o.connect(g); g.connect(dest); o.start(t); o.stop(t+.5);
  nz(t,.012,.35*v,'highpass',3000,dest); duckAt(t);}
function timp(t,f,dest,v=1){
  const o=ctx.createOscillator(); o.type='sine'; o.frequency.setValueAtTime(f*1.6,t); o.frequency.exponentialRampToValueAtTime(f,t+.07);
  const g=ctx.createGain(); g.gain.setValueAtTime(.7*v,t); g.gain.exponentialRampToValueAtTime(.001,t+1.1); o.connect(g); g.connect(dest); o.start(t); o.stop(t+1.2);
  const s=ctx.createOscillator(); s.type='sine'; s.frequency.setValueAtTime(70,t); s.frequency.exponentialRampToValueAtTime(34,t+.9);
  const sg=ctx.createGain(); sg.gain.setValueAtTime(.5*v,t); sg.gain.exponentialRampToValueAtTime(.001,t+1.2); s.connect(sg); sg.connect(dest); s.start(t); s.stop(t+1.3);
  nz(t,.12,.22*v,'lowpass',700,dest); duckAt(t,.55);}
function snare(t,v,dest){
  [0,.011,.023].forEach((d,i)=>nz(t+d,.03,.32*v,'bandpass',1500,dest,1.5));
  nz(t+.023,.24,.3*v,'bandpass',2300,dest,.8);
  const o=ctx.createOscillator(); o.frequency.setValueAtTime(220,t); o.frequency.exponentialRampToValueAtTime(165,t+.06);
  const g=ctx.createGain(); g.gain.setValueAtTime(.32*v,t); g.gain.exponentialRampToValueAtTime(.001,t+.12); o.connect(g); g.connect(dest); o.start(t); o.stop(t+.15);}
const hat=(t,v,dest,open)=>nz(t,open?.25:.03,.13*v,'highpass',9000,dest);
const crash=(t,dest)=>{nz(t,2.4,.25,'highpass',4800,dest); nz(t,.6,.15,'bandpass',3000,dest);};
function log(){}   // 元のページの「音の流れ表示」用。ゲームでは使わない
const triad=(c,lo)=>{let base=lo+((c.root-lo%12)+12)%12; return c.q.slice(0,3).map(i=>base+i);};

function scheduleBar(bar,t0){
  const P=bus.parts, cs=chords(bar.c), has=k=>bar.p.split(' ').includes(k), at=s=>t0+s*SD, D=P.drum;
  if(bar.h){let s=0;bar.h.split(' ').forEach(x=>{const [n,l]=x.split(':');const L=+l;
    if(n!=='r'){const m=midi(n),t=at(s),d=L*SD*.88; const bo=1+Math.max(0,67-m)/12*.45; ctr(t,hz(m),d,.066*bo,P.counter); pluck(t,hz(m+12),.03,P.counter,.2); log(t,d,m,'counter');}
    s+=L;});}
  if(has('impact')){const K=bus.pk;
    kick(t0,K,1.3); kick(t0+.01,K,1); timp(t0,hz(38),K,1.5); timp(t0,hz(50),K,.9); crash(t0,K); crash(t0+.02,K);
    nz(t0,.55,.7,'bandpass',650,K); nz(t0,.25,.5,'lowpass',2200,K);
    [[160,40],[320,80]].forEach(([a,z],j)=>{const o=ctx.createOscillator(),g=ctx.createGain(); o.frequency.setValueAtTime(a,t0); o.frequency.exponentialRampToValueAtTime(z,t0+.6);
      g.gain.setValueAtTime(j?.45:.9,t0); g.gain.exponentialRampToValueAtTime(.001,t0+.9); o.connect(g); g.connect(K); o.start(t0); o.stop(t0+1);});
    [38,50,57,62,69,74].forEach(m=>{brass(t0,hz(m),SD*8,.07,K); log(t0,SD*8,m,'harm');});
    [50,57,62,65,69,74].forEach(m=>brass(t0,hz(m),SD*8,.05,P.harm));}
  if(bar.m&&has('lead')){let s=0;bar.m.split(' ').forEach(x=>{const [n,l]=x.split(':');const L=+l;
    if(n!=='r'){const m=midi(n),t=at(s),d=L*SD*.9;
      inst(t,hz(m),d,.054,P.lead); log(t,d,m,'lead');
      if(has('lowdbl')){tone(t,hz(m-12),d,.08,P50,P.lead,.75,true); log(t,d,m-12,'lead');}}
    s+=L;});}
  cs.forEach(c=>{
    const tr=triad(c,52), t=at(c.from);
    if(has('pad')){tr.forEach(m=>brass(t,hz(m),c.len*SD*.95,.05,P.harm)); tr.forEach(m=>log(t,c.len*SD*.95,m,'harm'));}
    if(has('hits'))[[0,5],[6,5],[12,3]].forEach(([s,l])=>{if(s<c.from||s>=c.from+c.len)return; tr.forEach(m=>{brass(at(s),hz(m),l*SD*.85,.038,P.harm); log(at(s),l*SD*.85,m,'harm');});});
    if(has('stab'))[[0,2],[3,2],[6,2],[12,3]].forEach(([s,l])=>tr.concat([tr[0]-12]).forEach(m=>{brass(at(s),hz(m),l*SD,.06,P.harm); log(at(s),l*SD,m,'harm');}));
    if(has('end'))tr.concat([tr[0]-12,tr[0]+12]).forEach(m=>{brass(t,hz(m),BAR*1.6,.05,P.harm); log(t,BAR*1.6,m,'harm');});
  });
  for(let s=0;s<16;s++){
    const c=chordAt(cs,s);
    if(has('arp')){const tr=triad(c,62), ext=[tr[0],tr[1],tr[2],tr[0]+12]; const pat=[0,1,2,3,2,1,0,1]; const m=ext[pat[s%8]];
      pluck(at(s),hz(m),.06,P.arp); log(at(s),SD*.75,m,'arp');}
  }
  const bassRoot=c=>{let b=36+c.root; if(c.root>=8)b-=12; return b;};
  if(has('bass')){
    if(has('half')){cs.forEach(c=>{const m=bassRoot(c); bassN(at(c.from),m,c.len*SD*.95,.34); log(at(c.from),c.len*SD*.95,m,'bass');});}
    else for(let s=0;s<16;s+=2){const c=chordAt(cs,s), m=bassRoot(c)+(s%4===2?12:0), d=SD*1.7;
      bassN(at(s),m,d,.32); log(at(s),d,m,'bass');}
  }
  const tf=hz(bassRoot(cs[0]));
  if(has('timp'))[0,3,6].forEach((s,i)=>timp(at(s),tf,D,1-i*.15));
  if(has('timproll'))[0,3,6,12,13,14,15].forEach((s,i)=>timp(at(s),tf,D,.6+i*.06));
  if(has('hat'))for(let s=0;s<16;s+=2)hat(at(s),.6,D);
  if(has('crash'))crash(t0,D);
  if(has('drum')){[0,4,7,8,12].forEach(s=>kick(at(s),D)); [4,12].forEach(s=>snare(at(s),1,D)); for(let s=0;s<16;s++)hat(at(s),s%2?.45:.9,D); [14,15].forEach(s=>[1,2].forEach(k=>hat(at(s)+SD*k/3,.4,D)));}
  if(has('drum2')){[0,3,6,8,10,11,14].forEach(s=>kick(at(s),D,.9)); [4,12].forEach(s=>snare(at(s),1.1,D)); for(let s=0;s<16;s+=2)hat(at(s),1,D,s%4===2);}
  if(has('half')){[0,10].forEach(s=>kick(at(s),D,.8)); snare(at(8),.9,D); for(let s=0;s<16;s+=4)hat(at(s),.5,D);}
  if(has('fill')){[0,4,8].forEach(s=>kick(at(s),D)); [12,13,14,15].forEach((s,i)=>snare(at(s),.6+i*.15,D));}
  if(has('roll'))for(let s=8;s<16;s++)snare(at(s),.35+(s-8)*.09,D);
  if(has('end')){kick(t0,D); crash(t0,D); timp(t0,hz(38),D,1.1);}
  /* --- イントロ用の緊張感パーツ --- */
  const v=bar.v||1;
  if(has('drone'))triad(cs[0],50).concat([triad(cs[0],50)[0]-12]).forEach(m=>{swell(t0,hz(m),BAR,.045*v,P.harm); log(t0,BAR,m,'harm');});
  if(has('heart'))[[0,1],[3,.6]].forEach(([s,k])=>timp(at(s),hz(bassRoot(cs[0])),D,v*k+.25));
  if(has('heart2'))[[0,1],[3,.6],[8,1],[11,.6]].forEach(([s,k])=>timp(at(s),hz(bassRoot(cs[0])),D,v*k));
  if(has('tickq'))for(let s=8;s<16;s+=4){const m=midi(bar.tick); pluck(at(s),hz(m),.06*v,P.arp,.6); log(at(s),SD*.45,m,'arp');}
  if(has('heavy'))cs.forEach(c=>{const r=triad(c,40)[0], tn=[r,r+7,r+12,triad(c,52)[1]];
    [[0,6],[6,6],[12,4]].forEach(([s,l])=>{if(s<c.from||s>=c.from+c.len)return; tn.forEach(m=>{brass(at(s),hz(m),l*SD*.9,.04,P.harm); log(at(s),l*SD*.9,m,'harm');});});});
  if(has('drumH')){[0,6,8,14].forEach(s=>kick(at(s),D)); [4,12].forEach(s=>snare(at(s),1.1,D)); [0,8].forEach(s=>timp(at(s),hz(bassRoot(chordAt(cs,s))),D,.8)); for(let s=0;s<16;s+=2)hat(at(s),.45,D);}
  if(has('choir'))cs.forEach(c=>{const tr=triad(c,57); tr.concat([tr[0]-12]).forEach(m=>{choir(at(c.from),hz(m),c.len*SD*.98,.05,P.harm); log(at(c.from),c.len*SD*.98,m,'harm');});});
  if(has('thick'))cs.forEach(c=>{const r=triad(c,40)[0], vs=[r,r+7].concat(c.q.map(i=>r+12+i)).concat([r+24+c.q[1]]);
    vs.forEach(m=>{brass(at(c.from),hz(m),c.len*SD*.97,.021,P.harm); log(at(c.from),c.len*SD*.97,m,'harm');});});
  if(has('arp8'))for(let s=0;s<16;s+=2){const c=chordAt(cs,s), tr=triad(c,55), ext=[tr[0],tr[1],tr[2],tr[0]+12], m=ext[[0,1,2,3,2,1,2,1][s/2]];
    pluck(at(s),hz(m),.06,P.arp,.45); log(at(s),SD*1.6,m,'arp');}
  if(has('drumB')){[0,8,10].forEach(s=>kick(at(s),D)); [4,12].forEach(s=>snare(at(s),1.1,D)); timp(t0,hz(bassRoot(cs[0])),D,.75); for(let s=0;s<16;s+=2)hat(at(s),.4,D); [12,13,14,15].forEach(s=>[0,.5].forEach(k=>hat(at(s)+SD*k,.35+.1*(s-12),D)));}
  if(has('pulse8'))for(let s=0;s<16;s+=2){const m=bar.b?midi(bar.b):bassRoot(chordAt(cs,s)); bassN(at(s),m,SD*1.5,.32); log(at(s),SD*1.5,m,'bass');}
  if(has('clash')){const ns=bar.a.split(' ').map(midi),pat=[0,1,2,3,2,1,0,1]; for(let s=0;s<16;s++){const m=ns[pat[s%8]]; pluck(at(s),hz(m),.055,P.arp); log(at(s),SD*.75,m,'arp');}}
  if(has('stabs')){const tr=triad(cs[0],52); [2,6,10,14].forEach(s=>tr.forEach(m=>{brass(at(s),hz(m),SD*1.4,.045*v,P.harm); log(at(s),SD*1.4,m,'harm');}));}
  if(has('hat16'))for(let s=0;s<16;s++)hat(at(s),(.2+.6*s/15)*v,D);
  if(has('run')){const r=midi(bar.run); for(let s=0;s<16;s++){const m=r+s; inst(at(s),hz(m),SD*.85,.043,P.lead); log(at(s),SD*.85,m,'lead');}}
  if(has('big')){const tr=triad(cs[0],52); tr.concat([tr[0]-12,tr[0]+12,tr[1]+12]).forEach(m=>{brass(t0,hz(m),SD*3,.07,P.harm); log(t0,SD*3,m,'harm');});
    bassN(t0,45,SD*3,.35); kick(t0,D); crash(t0,D); timp(t0,hz(45),D,1.2);}
  if(has('pick')){const L=LEN(bar); [[L-5,.6],[L-4,.8],[L-3,1],[L-2,1.1]].forEach(([s,k])=>snare(at(s),k,D));
    const rs=ctx.createBufferSource(); rs.buffer=noise; rs.loop=true; const bf=ctx.createBiquadFilter(); bf.type='bandpass'; bf.Q.value=1.2;
    const ts=at(L-9), te=at(L-1); bf.frequency.setValueAtTime(300,ts); bf.frequency.exponentialRampToValueAtTime(7000,te);
    const rg=ctx.createGain(); rg.gain.setValueAtTime(.001,ts); rg.gain.exponentialRampToValueAtTime(.35,te-.01); rg.gain.linearRampToValueAtTime(0,te);
    rs.connect(bf); bf.connect(rg); rg.connect(D); rs.start(ts); rs.stop(te+.05);}
}

function tick(){
  while(playing&&nextT<ctx.currentTime+.4){
    if(barIdx>=SONG.length){stopAt(nextT);break;}
    scheduleBar(SONG[barIdx],nextT); barLog.push({i:barIdx,t:nextT});
    nextT+=LEN(SONG[barIdx])*SD;
    if(loopOn&&barIdx===LOOP_AFTER)barIdx=LOOP_FROM; else barIdx++;
  }
}
let stopTimer=null;
function stopAt(t){playing=false;clearInterval(timer);stopTimer=setTimeout(()=>finish(),Math.max(0,(t-ctx.currentTime)*1000)+300);}
function start(from=0){
  if(bus)finish();
  if(!master)init();
  bus=makeBus(); playing=true; barIdx=from; barLog=[]; notes=[]; nextT=ctx.currentTime+.12;
  timer=setInterval(tick,40); tick();
}
function finish(){
  playing=false; clearInterval(timer); clearTimeout(stopTimer);
  if(bus){const b=bus.b,pk=bus.pk; b.gain.setTargetAtTime(0,ctx.currentTime,.05); pk.gain.setTargetAtTime(0,ctx.currentTime,.05); setTimeout(()=>{b.disconnect();pk.disconnect();},400); bus=null;}
}

let loopOn=true;
function volume(){return .7*.7*.85;}
const startAt=SONG.findIndex(b=>b.s==='戦闘テーマ');
return { start: function () { start(startAt); }, stop: function () { if (bus) finish(); }, get playing() { return !!bus; } };
};
