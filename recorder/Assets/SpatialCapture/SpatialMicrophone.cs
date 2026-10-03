using System;
using System.IO;
using UnityEngine;

// Mono PCM WAV sidecar. Timing uncertainty is explicit; not advertised as sample-exact A/V sync.
public sealed class SpatialMicrophone : IDisposable
{
    AudioClip clip;
    BinaryWriter writer;
    string folder;
    int readPosition, samplesWritten;
    readonly int rate=48000;
    Timing timing=new Timing();
    public bool Start(string directory)
    {
        folder=directory;
        #if UNITY_ANDROID && !UNITY_EDITOR
        if(!UnityEngine.Android.Permission.HasUserAuthorizedPermission(UnityEngine.Android.Permission.Microphone)) {
            timing.error="microphone_permission_not_granted"; SaveTiming(); return false;
        }
        #endif
        timing.startRequestUnixMs=DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        timing.startRequestRealtime=Time.realtimeSinceStartupAsDouble;
        clip=Microphone.Start(null,true,20,rate);
        if(clip==null){timing.error="microphone_start_failed";SaveTiming();return false;}
        writer=new BinaryWriter(File.Open(Path.Combine(folder,"audio.wav"),FileMode.Create));
        writer.Write(new byte[44]);return true;
    }
    public void Pump()
    {
        if(clip==null||writer==null)return;
        int pos=Microphone.GetPosition(null);
        if(pos<0)return;
        if(timing.firstObservedSampleUnixMs==0&&pos>0){
            timing.firstObservedSampleUnixMs=DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            timing.firstObservedPosition=pos;
            timing.estimatedFirstSampleUnixMs=timing.firstObservedSampleUnixMs-pos*1000.0/rate;
        }
        int available=(pos-readPosition+clip.samples)%clip.samples;
        while(available>0){
            int count=Math.Min(available,Math.Min(4096,clip.samples-readPosition));
            var pcm=new float[count*clip.channels];
            if(!clip.GetData(pcm,readPosition)){timing.error="microphone_read_failed";break;}
            // Always mono; average channels if a device supplies more than one.
            for(int i=0;i<count;i++){
                float value=0;for(int c=0;c<clip.channels;c++)value+=pcm[i*clip.channels+c];
                writer.Write((short)Mathf.RoundToInt(Mathf.Clamp(value/clip.channels,-1,1)*32767));
            }
            readPosition=(readPosition+count)%clip.samples;available-=count;samplesWritten+=count;
        }
    }
    public void Dispose()
    {
        Pump();if(clip!=null){Microphone.End(null);UnityEngine.Object.Destroy(clip);clip=null;}
        if(writer!=null){
            int bytes=samplesWritten*2;writer.Seek(0,SeekOrigin.Begin);
            writer.Write(System.Text.Encoding.ASCII.GetBytes("RIFF"));writer.Write(36+bytes);
            writer.Write(System.Text.Encoding.ASCII.GetBytes("WAVEfmt "));writer.Write(16);
            writer.Write((short)1);writer.Write((short)1);writer.Write(rate);writer.Write(rate*2);
            writer.Write((short)2);writer.Write((short)16);writer.Write(System.Text.Encoding.ASCII.GetBytes("data"));writer.Write(bytes);
            writer.Dispose();writer=null;
        }
        timing.sampleCount=samplesWritten;timing.sampleRate=rate;
        timing.complete=samplesWritten>0&&string.IsNullOrEmpty(timing.error);SaveTiming();
    }
    void SaveTiming(){if(folder!=null)File.WriteAllText(Path.Combine(folder,"audio-timing.json"),JsonUtility.ToJson(timing,true));}
    [Serializable] class Timing {
        public string timingQuality="estimated-unity-microphone; validate A/V offset with a visible clap";
        public string error="";public bool complete;public int sampleCount,sampleRate,firstObservedPosition;
        public long startRequestUnixMs,firstObservedSampleUnixMs;
        public double startRequestRealtime,estimatedFirstSampleUnixMs;
    }
}
