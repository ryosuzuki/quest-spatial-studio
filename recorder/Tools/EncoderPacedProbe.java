import org.openclaw.spatial.SpatialVideoEncoder;
/** Encoder-only paced load, no Unity/camera/pose/depth workload. */
public class EncoderPacedProbe {
 public static void main(String[] args)throws Exception {
  int frames=Integer.parseInt(args[1]),fps=Integer.parseInt(args[2]);
  boolean upright=args.length>3&&Boolean.parseBoolean(args[3]);
  byte[] rgba=new byte[1280*1280*4];
  for(int y=0;y<1280;y++)for(int x=0;x<1280;x++){
   int i=(y*1280+x)*4;rgba[i]=(byte)(x*255/1280);rgba[i+1]=(byte)(y*255/1280);rgba[i+2]=80;rgba[i+3]=(byte)255;
  }
  java.nio.ByteBuffer direct=java.nio.ByteBuffer.allocateDirect(rgba.length);direct.put(rgba).flip();
  SpatialVideoEncoder encoder=new SpatialVideoEncoder(args[0],1280,1280,upright);
  int accepted=0;long start=System.nanoTime();
  for(int f=0;f<frames;f++){
   if(encoder.enqueueDirect(direct,1000000L+f*1000000L/fps))accepted++;
   long wait=start+(f+1)*1000000000L/fps-System.nanoTime();
   if(wait>0)Thread.sleep(wait/1000000L,(int)(wait%1000000L));
  }
  String error=encoder.finish();
  System.out.println("attempted="+frames+" accepted="+accepted+" wallMs="+(System.nanoTime()-start)/1000000L+" error="+error);
  if(!error.isEmpty())throw new RuntimeException(error);
 }
}
