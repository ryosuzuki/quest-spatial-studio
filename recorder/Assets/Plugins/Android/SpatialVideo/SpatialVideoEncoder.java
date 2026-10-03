package org.openclaw.spatial;

import android.media.*;
import java.io.*;
import java.nio.ByteBuffer;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.TimeUnit;

/** Bounded encoder queue; timestamps are provided by the camera, never synthesized at 30 Hz. */
public final class SpatialVideoEncoder {
    private final ArrayBlockingQueue<Frame> queue = new ArrayBlockingQueue<>(3);
    private final int width, height;
    private final String path;
    private volatile boolean stopping;
    private volatile String error = "";
    private final Thread worker;
    private long origin = -1, last = -1;
    private int accepted, encoded, dropped;
    static final class Frame { final byte[] rgba; final long pts; Frame(byte[] b,long p){rgba=b;pts=p;} }
    public SpatialVideoEncoder(String p,int w,int h) {
        if (w<=0||h<=0||(w&1)!=0||(h&1)!=0) throw new IllegalArgumentException("Even dimensions required");
        path=p;width=w;height=h;
        worker=new Thread(this::run,"SpatialVideoEncoder"); worker.start();
    }
    public synchronized boolean enqueue(byte[] rgba,long cameraUs) {
        if (stopping||!error.isEmpty()||rgba.length!=width*height*4||cameraUs<=last) return false;
        long start=origin<0?cameraUs:origin;
        if (!queue.offer(new Frame(rgba,cameraUs-start))) { dropped++;return false; }
        if(origin<0) origin=cameraUs;
        last=cameraUs;accepted++;return true;
    }
    public synchronized boolean enqueueDirect(ByteBuffer source,long cameraUs) {
        if (stopping||!error.isEmpty()||source.remaining()!=width*height*4||cameraUs<=last) return false;
        if(queue.remainingCapacity()==0){dropped++;return false;}
        byte[] frame=new byte[width*height*4];source.duplicate().get(frame);
        return enqueue(frame,cameraUs);
    }
    public String finish() {
        stopping=true;
        try { worker.join(15000); } catch(InterruptedException e) { Thread.currentThread().interrupt(); }
        if(worker.isAlive()) return "Encoder finalization timed out; file is not ready";
        return error;
    }
    private void run() {
        MediaCodec codec=null;MediaMuxer muxer=null;PrintWriter packets=null;
        boolean muxStarted=false;int track=-1;
        try {
            MediaFormat f=MediaFormat.createVideoFormat("video/avc",width,height);
            f.setInteger(MediaFormat.KEY_COLOR_FORMAT,MediaCodecInfo.CodecCapabilities.COLOR_FormatYUV420Flexible);
            f.setInteger(MediaFormat.KEY_BIT_RATE,12000000);f.setInteger(MediaFormat.KEY_FRAME_RATE,30);
            f.setInteger(MediaFormat.KEY_I_FRAME_INTERVAL,1);
            codec=MediaCodec.createEncoderByType("video/avc");codec.configure(f,null,null,MediaCodec.CONFIGURE_FLAG_ENCODE);codec.start();
            muxer=new MediaMuxer(path,MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4);
            packets=new PrintWriter(new FileWriter(path+".packets.csv"));packets.println("pts_us,size,flags");
            boolean eosIn=false,eosOut=false;long lastPts=0;Frame pending=null;
            long finishDeadline=0;
            MediaCodec.BufferInfo info=new MediaCodec.BufferInfo();
            while(!eosOut) {
                if(stopping && finishDeadline==0) finishDeadline=System.nanoTime()+12000000000L;
                if(finishDeadline!=0 && System.nanoTime()>finishDeadline) throw new IOException("Encoder EOS timeout");
                if(!eosIn) {
                    if(pending==null) pending=queue.poll(2,TimeUnit.MILLISECONDS);
                    boolean sendEos=pending==null&&stopping&&queue.isEmpty();
                    if(pending!=null||sendEos) {
                        int idx=codec.dequeueInputBuffer(1000);
                        if(idx>=0) {
                            if(sendEos) {codec.queueInputBuffer(idx,0,0,lastPts+1,MediaCodec.BUFFER_FLAG_END_OF_STREAM);eosIn=true;}
                            else {
                                Image input=codec.getInputImage(idx);
                                if(input==null)throw new IOException("Encoder has no flexible-YUV input image");
                                fill(input,pending.rgba,width,height);
                                input.close();lastPts=pending.pts;
                                codec.queueInputBuffer(idx,0,width*height*3/2,lastPts,0);pending=null;
                            }
                        }
                    }
                }
                for(;;) {
                    int idx=codec.dequeueOutputBuffer(info,1000);
                    if(idx==MediaCodec.INFO_TRY_AGAIN_LATER)break;
                    if(idx==MediaCodec.INFO_OUTPUT_FORMAT_CHANGED) {
                        if(muxStarted)throw new IOException("Repeated codec format change");
                        track=muxer.addTrack(codec.getOutputFormat());muxer.start();muxStarted=true;continue;
                    }
                    if(idx<0)continue;
                    ByteBuffer b=codec.getOutputBuffer(idx);
                    if((info.flags&MediaCodec.BUFFER_FLAG_CODEC_CONFIG)!=0) info.size=0;
                    if(info.size>0) {
                        if(!muxStarted||b==null)throw new IOException("Packet before muxer ready");
                        b.position(info.offset);b.limit(info.offset+info.size);muxer.writeSampleData(track,b,info);
                        packets.println(info.presentationTimeUs+","+info.size+","+info.flags);encoded++;
                    }
                    eosOut=(info.flags&MediaCodec.BUFFER_FLAG_END_OF_STREAM)!=0;
                    codec.releaseOutputBuffer(idx,false);if(eosOut)break;
                }
            }
            if(encoded==0)throw new IOException("No video frames encoded");
        } catch(Throwable e) { error=e.toString(); }
        finally {
            if(packets!=null)packets.close();
            if(codec!=null){try{codec.stop();}catch(Exception ignored){}codec.release();}
            if(muxer!=null){try{if(muxStarted)muxer.stop();}catch(Exception e){error=e.toString();}muxer.release();}
            try(PrintWriter s=new PrintWriter(new FileWriter(path+".status.json"))) {
                s.print("{\"complete\":"+error.isEmpty()+",\"accepted\":"+accepted+",\"encoded\":"+encoded+",\"queueDropped\":"+dropped+",\"originCameraUs\":"+origin+",\"error\":"+org.json.JSONObject.quote(error)+"}");
            }catch(IOException ignored){}
        }
    }
    private static int clamp(int v){return Math.max(0,Math.min(255,v));}
    private static void fill(Image image,byte[] rgba,int w,int h) {
        Image.Plane[] p=image.getPlanes();
        ByteBuffer y=p[0].getBuffer(),u=p[1].getBuffer(),v=p[2].getBuffer();
        int ys=p[0].getRowStride(),yp=p[0].getPixelStride(),us=p[1].getRowStride(),up=p[1].getPixelStride(),vs=p[2].getRowStride(),vp=p[2].getPixelStride();
        // Keep exact GetColors row order. Replay uses the same image orientation as the raw recorder.
        for(int row=0;row<h;row++)for(int col=0;col<w;col++) {
            int i=(row*w+col)*4,r=rgba[i]&255,g=rgba[i+1]&255,b=rgba[i+2]&255;
            y.put(row*ys+col*yp,(byte)clamp(((66*r+129*g+25*b+128)>>8)+16));
            if((row&1)==0&&(col&1)==0){
                u.put(row/2*us+col/2*up,(byte)clamp(((-38*r-74*g+112*b+128)>>8)+128));
                v.put(row/2*vs+col/2*vp,(byte)clamp(((112*r-94*g-18*b+128)>>8)+128));
            }
        }
    }
}
