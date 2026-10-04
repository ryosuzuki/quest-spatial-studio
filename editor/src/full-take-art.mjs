// Fifty deterministic, whole-take visual grammars. All events are authored, not inferred.
const TAU=Math.PI*2;
const modes=['agent','attention','dinner','pantry','departure','music','sketch','story','ecosystem','origami','physics','circuit','motion','measure','optics','breath','stretch','water','evening','focus','find','sort','clean','robot','boundaries','museum','language','treasure','space','seasons','memory','message','remote','conversation','narrative','energy','cycle','weather','sound','causal','machine','map','ideas','time','explain','glow','ocean','ribbon','geometry','celebration'];
const palette=['#bcebd8','#a5d9ff','#ffe2a8','#edc9ff','#ffd1bb'];
const sat=v=>Math.max(0,Math.min(1,v));
function hash(n){return (Math.sin(n*127.1+311.7)*43758.5453)%1+1;}
export function paintTheme(x,c,surface,t,state={}){
 const W=x.canvas.width;x.clearRect(0,0,W,W);x.save();x.scale(W/1024,W/1024);
 const si=['table','fridge','shelf','wall','window','drawer','floor'].indexOf(surface),phase=Math.min(3,Math.floor(t/24)),u=t/95.2;
 const fade=Math.min(sat(t/1.8),sat((95.2-t)/3));
 x.globalAlpha=fade*.94;x.lineCap='round';x.lineJoin='round';x.lineWidth=7;x.strokeStyle=palette[c.id%5];x.fillStyle=x.strokeStyle;
 const accent=x.strokeStyle,white='#ffffff',cx=512,cy=590,r=225,clock=t+si*.7;
 const line=(pts,close=false)=>{x.beginPath();pts.forEach((p,i)=>i?x.lineTo(...p):x.moveTo(...p));if(close)x.closePath();x.stroke();};
 const circle=(a,b,r)=>{x.beginPath();x.arc(a,b,Math.max(.1,r),0,TAU);x.stroke();};
 const dot=(a,b,r=9)=>{x.beginPath();x.arc(a,b,r,0,TAU);x.fill();};
 const text=(s,a,b,size=42)=>{x.font=`500 ${size}px Arial`;x.fillStyle=white;x.fillText(s,a,b);x.fillStyle=accent;};
 const arrow=(a,b,d,e)=>{line([[a,b],[d,e]]);const q=Math.atan2(e-b,d-a);line([[d-22*Math.cos(q-.5),e-22*Math.sin(q-.5)],[d,e],[d-22*Math.cos(q+.5),e-22*Math.sin(q+.5)]]);};
 const wave=(y,amp=40,freq=2,offset=0)=>{line(Array.from({length:81},(_,j)=>[120+j*9.8,y+amp*Math.sin(j/80*TAU*freq-clock*1.5+offset)]));};
 const node=(j,n=7,rr=r)=>[cx+Math.cos(j/n*TAU-.5*Math.PI)*rr,cy+Math.sin(j/n*TAU-.5*Math.PI)*rr];
 const network=(n=7,hub=false)=>{for(let j=0;j<n;j++){const p=node(j,n);circle(...p,24);line(hub?[[cx,cy],p]:[p,node((j+1)%n,n)]);const q=node((j+1)%n,n),v=(clock*.3+j/n)%1;dot(p[0]+(q[0]-p[0])*v,p[1]+(q[1]-p[1])*v,6);}if(hub)circle(cx,cy,35);};
 const particles=(n=22,drift=1)=>{for(let j=0;j<n;j++){const a=150+(hash(j+c.id)%1)*720,b=340+((hash(j+40)%1)*510+clock*drift*20)%510;dot(a,b,3+hash(j+8)%1*5);}};
 const grid=(cols=4,rows=3)=>{for(let i=0;i<=cols;i++)line([[180+i*650/cols,380],[180+i*650/cols,800]]);for(let j=0;j<=rows;j++)line([[180,380+j*420/rows],[830,380+j*420/rows]]);};
 // Surface-specific roles preserve a single theme without copying one graphic everywhere.
 let roleMode=c.mode;
 if(c.mode==='music' && surface==='table')roleMode='music-keys';
 if(c.mode==='music' && surface==='shelf')roleMode='music-levels';
 if(c.mode==='music' && surface==='floor')roleMode='music-steps';
 if(['ecosystem','glow','seasons'].includes(c.mode)&&surface==='floor')roleMode='roots';
 if(c.mode==='dinner'&&surface==='fridge')roleMode='pantry';
 if(c.mode==='dinner'&&surface==='floor')roleMode='departure';
 if(c.mode==='robot'&&surface!=='floor')roleMode='map';
 if(c.mode==='departure'&&surface==='shelf')roleMode='find';
 if(c.mode==='departure'&&surface==='table')roleMode='attention';
 if(c.mode==='water'&&surface==='fridge')roleMode='cycle';
 if(c.mode==='pantry'&&surface==='shelf')roleMode='sort';
 if(c.mode==='conversation'&&surface==='table')roleMode='ideas';
 if(c.mode==='treasure'&&surface==='shelf')roleMode='find';
 if(c.mode==='treasure'&&surface==='wall')roleMode='map';
 if(c.mode==='space'&&surface==='shelf')roleMode='constellation';
 if(c.mode==='memory'&&surface==='wall')roleMode='constellation';
 if(c.mode==='energy'&&surface==='floor')roleMode='circuit';
 if(c.mode==='ocean'&&surface==='window')roleMode='water';
 if(c.mode==='clean'&&surface==='floor')roleMode='robot';
 if(c.mode==='language'&&surface==='floor')roleMode='departure';
 switch(roleMode){
 case 'music-keys':{for(let j=0;j<12;j++){const a=145+j*61;line([[a,430],[a+56,430],[a+56,810],[a,810]],true);if(j%7!==2&&j%7!==6){x.fillRect(a+42,430,24,210);}if(j===Math.floor(clock*2)%12){x.globalAlpha=fade*.3;x.fillRect(a,650,56,155);x.globalAlpha=fade*.94;}}break;}
 case 'music-levels':{for(let j=0;j<12;j++){const a=150+j*60,h=50+250*Math.sin(clock*1.4+j*.7)**2;line([[a,810],[a,810-h],[a+33,810-h],[a+33,810]]);}break;}
 case 'music-steps':{for(let j=0;j<8;j++){const a=260+j%2*380,b=390+Math.floor(j/2)*130;circle(a,b,j===Math.floor(clock*2)%8?48:22);}break;}
 case 'roots':{for(let j=0;j<8;j++)line(Array.from({length:50},(_,k)=>{const v=k/49;return[cx+Math.sin(j*TAU/8)*v*330+Math.sin(v*12+clock*.4)*14,cy+Math.cos(j*TAU/8)*v*260];}));circle(cx,cy,25);break;}
 case 'constellation':{const pts=Array.from({length:9},(_,j)=>[170+(hash(j+si)%1)*660,390+(hash(j+30)%1)*430]);line(pts);pts.forEach((p,j)=>{dot(...p,6);circle(...p,10+5*Math.sin(clock+j)**2);});break;}

 case 'agent':{network(4,true);const k=Math.floor(t/8)%4;circle(...node(k,4),40+6*Math.sin(clock*2));text(['Notice','Prepare','Connect','Done'][phase],cx-80,cy+12);break;}
 case 'attention':{for(let j=0;j<3;j++){const v=sat((Math.sin(clock*.35-j)+.2)*2);circle(300+j*205,cy,10+55*v);}line([[210,760],[810,760]]);dot(210+600*u,760);break;}
 case 'dinner':{for(const a of [310,710]){circle(a,cy,125);circle(a,cy,98);line([[a-165,cy-100],[a-165,cy+100]]);line([[a+160,cy-100],[a+160,cy+100]]);for(let j=0;j<3;j++)line([[a-178+j*13,cy-100],[a-178+j*13,cy-50]]);}for(let j=0;j<6;j++)dot(390+j*45,830,4+4*Math.sin(clock+j)**2);break;}
 case 'pantry':{for(let j=0;j<5;j++){const a=220+j*145,b=690-70*Math.sin(j);circle(a,b,45);line([[a,b-45],[a+15,b-75],[a+35,b-60]]);arrow(a,b+85,a,800);}text('Use → share → renew',230,390);break;}
 case 'departure':{for(let j=0;j<5;j++){const b=810-j*92,a=510+Math.sin(j)*80;arrow(a-30,b+20,a,b-25);}dot(510+Math.sin(clock*.4)*60,810-(clock*90)%400,15);break;}
 case 'music':{for(let j=0;j<5;j++)line([[150,430+j*75],[880,430+j*75]]);for(let j=0;j<12;j++){const a=150+(j*73+clock*58)%720,b=430+75*((j*3+c.id)%5);dot(a,b,14);line([[a+12,b],[a+12,b-70]]);}break;}
 case 'sketch':{for(let j=0;j<3;j++){line(Array.from({length:140},(_,k)=>{const z=k/139*Math.min(1,(t+10)/35)*TAU*2;return[cx+220*Math.sin(z*2+j*.3),cy+180*Math.sin(z*3+clock*.2+j*.3)];}));}break;}
 case 'story':{const a=200+(clock*38)%620,b=cy+40*Math.sin(clock*3);circle(a,b-65,28);line([[a,b-35],[a,b+55],[a-35,b+90],[a,b+55],[a+35,b+90]]);line([[a-45,b+10],[a,b-10],[a+45,b+10]]);for(let j=0;j<7;j++)dot(160+j*110,810+20*Math.sin(j),6);circle(790,410,48);break;}
 case 'ecosystem':{for(let j=0;j<9;j++){const a=190+j*80,h=65+110*sat(u*2)+40*Math.sin(j);line([[a,820],[a+20*Math.sin(clock*.5+j),820-h]]);for(let k=1;k<4;k++){x.beginPath();x.ellipse(a+(k%2?20:-20),820-h*k/4,30,12,k%2?-.6:.6,0,TAU);x.stroke();}}circle(760,380,45);break;}
 case 'origami':{for(let j=0;j<7;j++){const a=220+(j*110+clock*12)%600,b=430+j%3*140;const flap=45+30*Math.sin(clock*2+j);line([[a-65,b-flap],[a,b+20],[a+65,b-flap],[a+15,b+45],[a,b+20],[a-15,b+45]],true);line([[a,b+20],[a+7,b-25]]);}break;}
 case 'physics':{line([[200,420],[820,800],[160,800]]);const q=(clock*.25)%1,a=200+620*q,b=420+380*q-90*Math.abs(Math.sin(q*TAU*3));circle(a,b-20,22);arrow(a,b-65,a+40,b-40);for(let j=0;j<5;j++)line([[180+j*45,830],[180+j*45,830-(1-q)*120]]);break;}
 case 'circuit':{grid(3,2);for(let j=0;j<6;j++){const a=180+(j%3)*216,b=380+Math.floor(j/3)*210;circle(a,b,22);const v=(clock*.5+j*.2)%1;dot(a+v*210,b,12);}break;}
 case 'motion':{line([[180,360],[180,810],[850,810]]);for(let j=0;j<3;j++)wave(480+j*100,45+j*10,1.5+j*.5,j);dot(180+650*u,790,10);text('time →',660,880);break;}
 case 'measure':{arrow(220,460,800,460);arrow(800,460,220,460);arrow(220,460,220,790);for(let j=0;j<=10;j++)line([[220+j*58,475],[220+j*58,495+j%2*15]]);line([[350,610],[700,610],[700,790],[350,790]],true);circle(525,700,55+20*Math.sin(clock));break;}
 case 'optics':{const a=510+50*Math.sin(clock*.4);line([[a,390],[a-125,760],[a+155,760]],true);for(let j=0;j<5;j++){x.strokeStyle=palette[j];line([[130,550+j*7],[a-60,550+j*7],[a+60,580+j*15],[870,480+j*65]]);}break;}
 case 'breath':{const q=(1-Math.cos(clock*TAU/10))/2;for(let j=0;j<5;j++){circle(cx,cy,65+q*135+j*22);}text(q>.5?'Breathe out':'Breathe in',cx-105,cy+15);break;}
 case 'stretch':{circle(cx,425,38);line([[cx,465],[cx,665],[cx-90,800],[cx,665],[cx+90,800]]);const a=.7+.5*Math.sin(clock*.6);line([[cx-150*Math.cos(a),550-150*Math.sin(a)],[cx,520],[cx+150*Math.cos(a),550-150*Math.sin(a)]]);circle(cx,cy,240);break;}
 case 'water':{for(let j=0;j<6;j++){const rr=((clock*30+j*48)%280);x.globalAlpha=fade*(1-rr/310);x.beginPath();x.ellipse(cx,cy,rr,rr*.55,0,0,TAU);x.stroke();}break;}
 case 'evening':{for(let j=0;j<15;j++){const a=180+(hash(j)%1)*650,b=380+(hash(j+20)%1)*410;x.globalAlpha=fade*(.25+.55*(1-u));circle(a,b,8+15*(1-u));}x.globalAlpha=fade*.8; x.beginPath();x.arc(cx,cy,120,-1.2,1.2);x.bezierCurveTo(cx+25,cy+45,cx+25,cy-45,cx+43,cy-112);x.stroke();break;}
 case 'focus':{circle(cx,cy,170);x.lineWidth=10;x.beginPath();x.arc(cx,cy,170,-Math.PI/2,-Math.PI/2+TAU*u);x.stroke();dot(cx,cy,12);for(let j=0;j<12;j++){const a=j*TAU/12;line([[cx+200*Math.cos(a),cy+200*Math.sin(a)],[cx+215*Math.cos(a),cy+215*Math.sin(a)]]);}break;}
 case 'find':{grid();const k=Math.floor(clock*.35)%12,a=180+(k%4+.5)*650/4,b=380+(Math.floor(k/4)+.5)*140;circle(a,b,50);arrow(a-70,b,a-20,b);break;}
 case 'sort':{for(let j=0;j<12;j++){const group=j%3,a=230+group*280,b=410+Math.floor(j/3)*100;circle(a,b,20);const v=(clock*.2+j*.07)%1;line([[a,b],[230+group*280,820]]);dot(a+70*Math.sin(v*Math.PI),b+(820-b)*v,7);}break;}
 case 'clean':{for(let j=0;j<6;j++){line([[180,390+j*75],[840,390+j*75]]);}const a=180+(clock*90)%660,b=390+Math.floor(clock/7)%6*75;circle(a,b,35);for(let j=0;j<16;j++)dot(190+(hash(j)%1)*630,410+(hash(j+20)%1)*350,3);break;}
 case 'robot':{const pts=[[200,780],[200,430],[380,430],[380,760],[560,760],[560,430],[780,430],[780,780]];line(pts);const q=(clock*.3)%7,k=Math.floor(q),v=q-k;circle(pts[k][0]+(pts[k+1][0]-pts[k][0])*v,pts[k][1]+(pts[k+1][1]-pts[k][1])*v,30);break;}
 case 'boundaries':{x.setLineDash([18,16]);circle(cx,cy,130);x.setLineDash([]);line([[160,800],[280,800],[300,420],[720,420],[760,800],[860,800]]);for(let j=0;j<4;j++)arrow(310+j*130,390,370+j*130,390);break;}
 case 'museum':{for(let j=0;j<3;j++){const a=280+j*235;line([[a-65,730],[a+65,730],[a+45,810],[a-45,810]],true);circle(a,550,60);arrow(a,630,a,700);text(['Form','Use','Story'][j],a-50,410,32);}break;}
 case 'language':{const words=surface==='table'?['table','desk','surface']:surface==='fridge'?['cool','keep','fresh']:['here','near','together'];for(let j=0;j<3;j++){text(words[j],220+j*220,470+j%2*180,48);if(j<2)arrow(300+j*220,520+j%2*180,390+j*220,570-(j%2)*40);}wave(790,15,2);break;}
 case 'treasure':{const pts=Array.from({length:7},(_,j)=>[200+j*100,590+150*Math.sin(j)]);x.setLineDash([10,18]);line(pts);x.setLineDash([]);for(let j=0;j<7;j++)circle(...pts[j],18);const j=Math.floor(clock*.4)%7;circle(...pts[j],42);line([[795,425],[845,475],[795,475],[845,425]]);break;}
 case 'space':{for(let j=0;j<4;j++){x.beginPath();x.ellipse(cx,cy,85+j*58,40+j*33,-.3,0,TAU);x.stroke();const a=clock/(j+2)+j;dot(cx+Math.cos(a)*(85+j*58),cy+Math.sin(a)*(40+j*33),10+j*3);}dot(cx,cy,23);break;}
 case 'seasons':{line([[cx,830],[cx,530],[cx-90,440],[cx,530],[cx+90,410]]);for(let j=0;j<25;j++){const a=cx+Math.cos(j*2.4)*130,b=450+Math.sin(j*2.4)*110+(phase>1?(clock*15+j*10)%250:0);circle(a,b,9+7*Math.sin(j)**2);}break;}
 case 'memory':{for(let j=0;j<5;j++){const a=230+j*135,b=550+90*Math.sin(j);circle(a,b,38);line([[a,b+38],[a,800]]);text(String(j+1),a-10,b+12,30);}line([[200,800],[850,800]]);circle(230+Math.floor(clock*.2)%5*135,cy,120);break;}
 case 'message':{line([[260,440],[760,440],[760,750],[260,750]],true);line([[260,440],[510,630],[760,440]]);for(let j=0;j<5;j++)dot(300+j*100,820,3+5*Math.sin(clock-j)**2);break;}
 case 'remote':{const a=.5+.5*Math.sin(clock*.4);circle(330,cy,100);circle(700,cy,100);line([[430,cy],[600,cy]]);dot(430+170*a,cy,14);for(let j=0;j<3;j++)circle(cx,cy,30+j*18);break;}
 case 'conversation':{network(6,true);for(let j=0;j<3;j++){const p=node(j*2,6,310);text(['Why?','What if?','Together'][j],p[0]-50,p[1],30);}break;}
 case 'narrative':{for(let j=0;j<3;j++){const a=290+j*225;circle(a,cy,70);text(['1','2','3'][j],a-12,cy+15,42);if(j<2)arrow(a+80,cy,a+135,cy);}x.beginPath();x.arc(cx,cy,260,Math.PI,Math.PI+Math.PI*u);x.stroke();break;}
 case 'energy':{for(let j=0;j<8;j++){const a=220+j*82,h=90+170*(.5+.5*Math.sin(clock*.5+j*.5));line([[a,810],[a,810-h],[a+45,810-h],[a+45,810]]);}wave(450,30,2);break;}
 case 'cycle':{for(let j=0;j<4;j++){const p=node(j,4),q=node(j+.75,4);circle(...p,40);arrow(...p,...q);}for(let j=0;j<5;j++){const a=clock*.5+j*TAU/5;dot(cx+225*Math.cos(a),cy+225*Math.sin(a),8);}break;}
 case 'weather':{for(let j=0;j<4;j++)circle(370+j*90,440+20*Math.sin(j),70);for(let j=0;j<15;j++){const a=260+j*35,b=550+(clock*80+j*25)%240;line([[a,b],[a-12,b+25]]);}wave(830,12,3);break;}
 case 'sound':{for(let j=0;j<5;j++)wave(450+j*70,25+30*Math.sin(clock*.3+j)**2,j+1,j);break;}
 case 'causal':{const pts=[[210,cy],[450,430],[450,740],[790,cy]];pts.forEach(p=>circle(...p,45));for(const [a,b] of [[0,1],[0,2],[1,3],[2,3]]){line([pts[a],pts[b]]);const v=(clock*.3+a*.2)%1;dot(pts[a][0]+(pts[b][0]-pts[a][0])*v,pts[a][1]+(pts[b][1]-pts[a][1])*v,9);}break;}
 case 'machine':{for(let j=0;j<3;j++){const a=280+j*230,b=cy+j%2*60,rr=105;circle(a,b,rr);circle(a,b,30);for(let k=0;k<12;k++){const q=k*TAU/12+clock*.5*(j%2?-1:1);line([[a+rr*Math.cos(q),b+rr*Math.sin(q)],[a+(rr+20)*Math.cos(q),b+(rr+20)*Math.sin(q)]]);}}break;}
 case 'map':{const pts=[[230,430],[600,390],[810,600],[620,810],[280,740],[230,430]];line(pts);pts.slice(0,5).forEach((p,j)=>{circle(...p,25);text(String(j+1),p[0]-9,p[1]+10,26);});line([[230,430],[620,810],[600,390],[280,740]]);break;}
 case 'ideas':{const branch=(a,b,len,angle,depth)=>{if(!depth)return;const d=a+len*Math.cos(angle),e=b+len*Math.sin(angle);line([[a,b],[d,e]]);circle(d,e,10);branch(d,e,len*.7,angle-.55,depth-1);branch(d,e,len*.7,angle+.55,depth-1);};branch(cx,850,170,-Math.PI/2,4);break;}
 case 'time':{line([[150,cy],[870,cy]]);for(let j=0;j<7;j++){const a=180+j*108;line([[a,cy-25],[a,cy+25]]);circle(a,cy+(j%2?110:-110),28);line([[a,cy],[a,cy+(j%2?82:-82)]]);}dot(180+648*u,cy,17);break;}
 case 'explain':{for(let j=0;j<3;j++){const a=300+j*210,b=cy-j*50;line([[a-65,b-65],[a+65,b-65],[a+65,b+65],[a-65,b+65]],true);if(j<2)arrow(a+75,b,a+130,b-35);}text('inside → action → purpose',200,820,35);break;}
 case 'glow':{for(let j=0;j<28;j++){const a=180+(hash(j)%1)*660,b=390+(hash(j+50)%1)*420,rr=8+13*(.5+.5*Math.sin(clock+j));circle(a,b,rr);dot(a,b,3);if(j%3===0)line([[a,b],[cx,cy]]);}break;}
 case 'ocean':{for(let k=0;k<4;k++)wave(430+k*110,22,2,k);for(let j=0;j<9;j++){const a=160+(j*100+clock*35)%700,b=490+j%3*105;x.beginPath();x.ellipse(a,b,30,12,0,0,TAU);x.stroke();line([[a-28,b],[a-50,b-17],[a-50,b+17],[a-28,b]]);}break;}
 case 'ribbon':{for(let j=0;j<5;j++)line(Array.from({length:140},(_,k)=>{const a=k/139*TAU;return[cx+250*Math.sin(a+clock*.25+j*.09),cy+190*Math.sin(a*2+clock*.4+j*.09)];}));break;}
 case 'geometry':{for(let j=0;j<7;j++){const rr=40+j*30,turn=clock*.1*(j%2?1:-1);line(Array.from({length:6},(_,k)=>[cx+rr*Math.cos(k*TAU/6+turn),cy+rr*Math.sin(k*TAU/6+turn)]),true);}break;}
 case 'celebration':{for(let j=0;j<24;j++){const a=j*TAU/24,rr=50+(clock*65+j*5)%240;line([[cx+rr*Math.cos(a),cy+rr*Math.sin(a)],[cx+(rr+22)*Math.cos(a),cy+(rr+22)*Math.sin(a)]]);}particles(15,1);break;}
 default:throw Error('Unknown theme '+c.mode);
 }
 // Whole-take continuity: a coherent four-beat story, repeated only on relevant surfaces.
 x.globalAlpha=fade*.95;x.fillStyle=white;
 if(['wall','fridge','table'].includes(surface)){
  const words=c.beats[phase].split(' ');let lines=[''];for(const w of words){let last=lines.length-1;if((lines[last]+' '+w).length>23)lines.push(w);else lines[last]+=(lines[last]?' ':'')+w;}
  lines.slice(0,3).forEach((s,j)=>text(s,115,155+j*68,55));
 }else if(surface==='shelf'){text(c.stages[Math.min(2,Math.floor(t/32))],130,230,62);}
 else if(surface==='floor'){text(c.stages[Math.min(2,Math.floor(t/32))],310,260,62);}
 x.restore();
}
export {modes};
