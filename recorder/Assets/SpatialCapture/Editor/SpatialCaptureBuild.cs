using System;
using System.Linq;
using UnityEditor;
using UnityEditor.Build.Reporting;
public static class SpatialCaptureBuild
{
    public static void Android()
    {
        var devSettings=AssetDatabase.LoadAssetAtPath<UnityEngine.ScriptableObject>("Assets/Resources/DevAgentSettings.asset");
        if(devSettings!=null){
            var so=new SerializedObject(devSettings);
            var enabled=so.FindProperty("enabled");if(enabled!=null)enabled.boolValue=false;
            var token=so.FindProperty("accessToken");if(token!=null)token.stringValue="";
            var server=so.FindProperty("serverAddress");if(server!=null)server.stringValue="127.0.0.1";
            so.ApplyModifiedPropertiesWithoutUndo();AssetDatabase.SaveAssets();
        }
        PlayerSettings.productName = "Spatial Capture";
        PlayerSettings.SetApplicationIdentifier(UnityEditor.Build.NamedBuildTarget.Android, "org.openclaw.spatialcapture");
        PlayerSettings.Android.bundleVersionCode = 6;
        PlayerSettings.bundleVersion = "0.1.5";
        PlayerSettings.SetScriptingBackend(UnityEditor.Build.NamedBuildTarget.Android, ScriptingImplementation.IL2CPP);
        PlayerSettings.Android.targetArchitectures = AndroidArchitecture.ARM64;
        PlayerSettings.Android.useCustomKeystore = false;
        var scenes = EditorBuildSettings.scenes.Where(x=>x.enabled).Select(x=>x.path).ToArray();
        if(scenes.Length==0)throw new Exception("No enabled build scenes");
        var path = Environment.GetEnvironmentVariable("SPATIAL_APK") ?? "Builds/spatial-capture.apk";
        var report=BuildPipeline.BuildPlayer(scenes,path,BuildTarget.Android,BuildOptions.Development);
        if(report.summary.result!=BuildResult.Succeeded)throw new Exception("Build failed: "+report.summary.result);
    }
}
