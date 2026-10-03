// Audio input is opt-in. Speech recognition may use the browser vendor's service.
export function createSpatialAudio({onText,onImpulse,onStatus}){
 let stream,context,recognition,raf,active=false,last=-10,floor=.008;
 const detector={feed(samples,seconds){let energy=0,peak=0;for(const x of samples){energy+=x*x;peak=Math.max(peak,Math.abs(x));}const rms=Math.sqrt(energy/samples.length);const trigger=rms>Math.max(.065,floor*5)&&peak>.23&&seconds-last>.4;floor=.96*floor+.04*Math.min(rms,.035);if(trigger){last=seconds;onImpulse({seconds,strength:Math.min(1,rms*5),kind:'audio-transient'});}return trigger;}};
 async function stop(){active=false;cancelAnimationFrame(raf);recognition?.stop();stream?.getTracks().forEach(t=>t.stop());await context?.close();onStatus('Microphone off');}
 async function start(language='en-US'){
 try{stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:false,autoGainControl:false}});context=new AudioContext();await context.resume();const source=context.createMediaStreamSource(stream),analyser=context.createAnalyser();analyser.fftSize=1024;source.connect(analyser);const samples=new Float32Array(1024);active=true;
 const poll=()=>{if(!active)return;analyser.getFloatTimeDomainData(samples);detector.feed(samples,context.currentTime);raf=requestAnimationFrame(poll);};poll();
 const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(SR){recognition=new SR();recognition.lang=language;recognition.continuous=true;recognition.interimResults=true;recognition.onresult=e=>{let text='';for(let i=e.resultIndex;i<e.results.length;i++){text+=e.results[i][0].transcript+' ';}onText({text:text.trim(),final:e.results[e.results.length-1].isFinal,kind:'browser-speech'});};recognition.onerror=e=>onStatus('Audio active; speech: '+e.error);recognition.onend=()=>{if(active)try{recognition.start();}catch{}};recognition.start();onStatus('Listening: speech + sound transients');}else onStatus('Sound effects active; speech recognition unavailable');
 }catch(e){await stop();onStatus('Microphone: '+e.message);throw e;}}
 return{start,stop,detector};
}
