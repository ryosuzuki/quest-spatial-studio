import org.openclaw.spatial.SpatialVideoEncoder;
public class EncoderProbe {
 public static void main(String[] a)throws Exception {
  SpatialVideoEncoder e=new SpatialVideoEncoder(a[0],1280,1280);int accepted=0;
  for(int f=0;f<30;f++){
   byte[] b=new byte[1280*1280*4];
   for(int y=0;y<1280;y++)for(int x=0;x<1280;x++){int i=(y*1280+x)*4;b[i]=(byte)(x*255/1280);b[i+1]=(byte)(y*255/1280);b[i+2]=(byte)(f*8);b[i+3]=(byte)255;}
   java.nio.ByteBuffer direct=java.nio.ByteBuffer.allocateDirect(b.length);direct.put(b).flip();
   if(e.enqueueDirect(direct,1000000L+f*33333L))accepted++;
   Thread.sleep(34);
  }
  String error=e.finish();System.out.println("accepted="+accepted+" error="+error);if(!error.isEmpty())throw new RuntimeException(error);
 }
}
