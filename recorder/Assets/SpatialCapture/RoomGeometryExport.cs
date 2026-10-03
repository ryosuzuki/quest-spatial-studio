using System;
using System.IO;
using System.Collections.Generic;
using UnityEngine;
using Meta.XR.MRUtilityKit;
public static class RoomGeometryExport
{
    [Serializable] class Document { public int version=1;public string coordinateSystem="three-rh-y-up-meters";public long unixMs;public Part[] parts; }
    [Serializable] class Part {public string label,source;public float[] vertices;public int[] triangles;}
    public static void Save(MRUK mruk,string path)
    {
        var parts=new List<Part>();
        foreach(var room in mruk.Rooms) {
            var global=room.GlobalMeshAnchor;
            if(global!=null) {
                var mesh=global.GlobalMesh;
                if(mesh==null)mesh=global.LoadGlobalMeshTriangles();
                if(mesh!=null&&mesh.vertexCount>0)parts.Add(PartFrom(global,mesh.vertices,mesh.triangles,"global-mesh"));
            }
            foreach(var anchor in room.Anchors) {
                if(anchor==global)continue;
                if(anchor.VolumeBounds.HasValue) {
                    var b=anchor.VolumeBounds.Value;var v=new Vector3[8];
                    for(int i=0;i<8;i++)v[i]=new Vector3((i&1)==0?b.min.x:b.max.x,(i&2)==0?b.min.y:b.max.y,(i&4)==0?b.min.z:b.max.z);
                    parts.Add(PartFrom(anchor,v,new[]{0,2,1,1,2,3,4,5,6,5,7,6,0,1,4,1,5,4,2,6,3,3,6,7,0,4,2,2,4,6,1,3,5,3,7,5},"semantic-volume-bounds"));
                } else if(anchor.PlaneRect.HasValue) {
                    var r=anchor.PlaneRect.Value;
                    parts.Add(PartFrom(anchor,new[]{new Vector3(r.xMin,r.yMin,0),new Vector3(r.xMax,r.yMin,0),new Vector3(r.xMax,r.yMax,0),new Vector3(r.xMin,r.yMax,0)},new[]{0,1,2,0,2,3},"semantic-plane-bounds"));
                }
            }
        }
        if(parts.Count==0)throw new Exception("Room has no exportable geometry");
        File.WriteAllText(path,JsonUtility.ToJson(new Document{unixMs=DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),parts=parts.ToArray()}));
    }
    static Part PartFrom(MRUKAnchor a,Vector3[] vertices,int[] triangles,string source) {
        var v=new float[vertices.Length*3];
        for(int i=0;i<vertices.Length;i++){var p=a.transform.TransformPoint(vertices[i]);v[3*i]=p.x;v[3*i+1]=p.y;v[3*i+2]=-p.z;}
        var t=(int[])triangles.Clone();for(int i=0;i+2<t.Length;i+=3){int tmp=t[i+1];t[i+1]=t[i+2];t[i+2]=tmp;}
        return new Part{label=a.Label.ToString(),source=source,vertices=v,triangles=t};
    }
}
