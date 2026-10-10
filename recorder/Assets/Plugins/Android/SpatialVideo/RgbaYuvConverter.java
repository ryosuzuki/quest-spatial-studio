package org.openclaw.spatial;
import java.nio.ByteBuffer;

/** Reusable row buffers avoid millions of checked ByteBuffer writes per frame. */
public final class RgbaYuvConverter {
    private final int width,height;
    private final byte[] yRow,uRow,vRow;
    private byte[] scratch=new byte[0];
    public RgbaYuvConverter(int w,int h) {
        if(w<=0||h<=0||(w&1)!=0||(h&1)!=0)throw new IllegalArgumentException("Even dimensions required");
        width=w;height=h;yRow=new byte[w];uRow=new byte[w/2];vRow=new byte[w/2];
    }
    private static int clamp(int value){return Math.max(0,Math.min(255,value));}
    private void putRow(ByteBuffer plane,int offset,int pixelStride,byte[] values) {
        ByteBuffer row=plane.duplicate();row.position(offset);
        if(pixelStride==1){row.put(values);return;}
        int length=(values.length-1)*pixelStride+1;
        if(scratch.length<length)scratch=new byte[length];
        // Preserve gaps: U and V often alias the same interleaved allocation.
        row.get(scratch,0,length);row.position(offset);
        for(int x=0;x<values.length;x++)scratch[x*pixelStride]=values[x];
        row.put(scratch,0,length);
    }
    public void convert(byte[] rgba,ByteBuffer y,int ys,int yp,ByteBuffer u,int us,int up,ByteBuffer v,int vs,int vp,boolean flipY) {
        if(rgba.length!=width*height*4)throw new IllegalArgumentException("RGBA size mismatch");
        for(int row=0;row<height;row++) {
            int sourceRow=flipY?height-1-row:row;
            for(int col=0;col<width;col++) {
                int i=(sourceRow*width+col)*4,r=rgba[i]&255,g=rgba[i+1]&255,b=rgba[i+2]&255;
                yRow[col]=(byte)clamp(((66*r+129*g+25*b+128)>>8)+16);
                if((row&1)==0&&(col&1)==0) {
                    uRow[col/2]=(byte)clamp(((-38*r-74*g+112*b+128)>>8)+128);
                    vRow[col/2]=(byte)clamp(((112*r-94*g-18*b+128)>>8)+128);
                }
            }
            putRow(y,row*ys,yp,yRow);
            if((row&1)==0){putRow(u,row/2*us,up,uRow);putRow(v,row/2*vs,vp,vRow);}
        }
    }
}
