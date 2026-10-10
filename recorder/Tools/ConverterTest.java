import java.nio.ByteBuffer;
import java.util.Random;
import org.openclaw.spatial.RgbaYuvConverter;
public class ConverterTest {
 static int clamp(int x){return Math.max(0,Math.min(255,x));}
 static ByteBuffer view(byte[] a,int offset){ByteBuffer b=ByteBuffer.wrap(a);b.position(offset);return b.slice();}
 public static void main(String[] args){int cases=0;
  for(int w:new int[]{2,8,32})for(int h:new int[]{2,6,16})for(boolean flip:new boolean[]{false,true})for(boolean alias:new boolean[]{false,true}) {
   byte[] rgba=new byte[w*h*4];new Random(42).nextBytes(rgba);
   int ys=w+7,cs=w+9,step=alias?2:1;
   byte[] y=new byte[ys*h],uv=new byte[cs*h/2+2],vv=alias?uv:new byte[cs*h/2+2];
   ByteBuffer u=view(uv,0),v=view(vv,alias?1:0);
   new RgbaYuvConverter(w,h).convert(rgba,ByteBuffer.wrap(y),ys,1,u,cs,step,v,cs,step,flip);
   for(int row=0;row<h;row++)for(int col=0;col<w;col++){
    int src=flip?h-1-row:row,i=(src*w+col)*4,r=rgba[i]&255,g=rgba[i+1]&255,b=rgba[i+2]&255;
    if((y[row*ys+col]&255)!=clamp(((66*r+129*g+25*b+128)>>8)+16))throw new AssertionError("Y");
    if((row&1)==0&&(col&1)==0){
     if((u.get(row/2*cs+col/2*step)&255)!=clamp(((-38*r-74*g+112*b+128)>>8)+128))throw new AssertionError("U");
     if((v.get(row/2*cs+col/2*step)&255)!=clamp(((112*r-94*g-18*b+128)>>8)+128))throw new AssertionError("V");
    }
   }cases++;
  }System.out.println("PASS "+cases+" YUV layouts/orientations");
 }
}
