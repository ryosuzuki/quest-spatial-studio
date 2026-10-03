using System;
using System.IO;
using UnityEngine;
using Meta.XR.MRUtilityKit;
using RealityLog.Recording;

// Lives outside the upstream asmdefs so it can reference both recorder and Meta APIs.
public sealed class SpatialCaptureExtras : MonoBehaviour
{
    RecordingSessionController controller;
    StreamWriter hands;
    SpatialMicrophone audio;
    string take;
    double nextSample;
    bool loading;
    bool initialized;
    int roomAttempts;
    double nextRoomAttempt;
    string sceneJson;
    OVRCameraRig rig;

    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
    static void Install() => new GameObject("SpatialCaptureExtras").AddComponent<SpatialCaptureExtras>();

    async void Start()
    {
        controller = FindFirstObjectByType<RecordingSessionController>();
        rig = FindFirstObjectByType<OVRCameraRig>();
        #if UNITY_ANDROID && !UNITY_EDITOR
        if (!UnityEngine.Android.Permission.HasUserAuthorizedPermission(UnityEngine.Android.Permission.Microphone))
            UnityEngine.Android.Permission.RequestUserPermission(UnityEngine.Android.Permission.Microphone);
        var permission = OVRPermissionsRequester.ScenePermission;
        if (!UnityEngine.Android.Permission.HasUserAuthorizedPermission(permission)) {
            UnityEngine.Android.Permission.RequestUserPermission(permission);
            for (int i=0; i<120 && !UnityEngine.Android.Permission.HasUserAuthorizedPermission(permission); i++)
                await System.Threading.Tasks.Task.Delay(500);
        }
#endif
        // Export without starting camera recording. Never trigger a rescan automatically.
        await System.Threading.Tasks.Task.Delay(1500);
        OVRPlugin.SetHandSkeletonVersion(OVRHandSkeletonVersion.OpenXR);
        initialized = true;
        await ExportRoom();
    }

    async System.Threading.Tasks.Task ExportRoom()
    {
        if (loading) return;
        loading = true;
        roomAttempts++;
        nextRoomAttempt = Time.realtimeSinceStartupAsDouble + 10;
        var statusPath = Path.Combine(Application.persistentDataPath, "room-export-status.json");
        try
        {
            var mruk = MRUK.Instance;
            if (mruk == null)
            {
                var go = new GameObject("CaptureRoomLoader");
                go.SetActive(false);
                mruk = go.AddComponent<MRUK>();
                mruk.SceneSettings = new MRUK.MRUKSettings();
                mruk.SceneSettings.LoadSceneOnStartup = false;
                mruk.EnableWorldLock = false;
                go.SetActive(true);
            }
            var result = await mruk.LoadSceneFromDevice(false, true, MRUK.SceneModel.V2FallbackV1);
            if (mruk.Rooms.Count == 0) throw new Exception("No room returned: " + result);
            sceneJson = mruk.SaveSceneToJsonString(true);
            RoomGeometryExport.Save(mruk, Path.Combine(Application.persistentDataPath,"room-geometry-latest.json"));
            var dst = Path.Combine(Application.persistentDataPath, "room-scan-latest.json");
            File.WriteAllText(dst + ".tmp", sceneJson);
            File.Copy(dst + ".tmp", dst, true);
            File.Delete(dst + ".tmp");
            File.WriteAllText(statusPath, JsonUtility.ToJson(new RoomStatus {
                success = true, rooms = mruk.Rooms.Count, message = result.ToString(),
                unixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
            }, true));
            Debug.Log("[SpatialCapture] Room exported: " + mruk.Rooms.Count);
        }
        catch (Exception e)
        {
            File.WriteAllText(statusPath, JsonUtility.ToJson(new RoomStatus {
                success = false, message = e.Message, unixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
            }, true));
            Debug.LogWarning("[SpatialCapture] Room export: " + e.Message);
        }
        finally { loading = false; }
    }

    void LateUpdate()
    {
        // Retry while the wearer localizes; never open the system scan UI automatically.
        if (initialized && !loading && sceneJson == null && roomAttempts < 12
            && OVRManager.isHmdPresent && Time.realtimeSinceStartupAsDouble >= nextRoomAttempt)
            _ = ExportRoom();
        if (controller == null) return;
        if (!controller.IsRecording) { Close(); return; }
        var path = controller.ActivePaths?.RootDirectoryPath;
        if (string.IsNullOrEmpty(path)) return;
        if (path != take)
        {
            Close(); take = path;
            hands = new StreamWriter(Path.Combine(take, "hands.jsonl"), true);
            audio = new SpatialMicrophone(); audio.Start(take);
            // Serialize the loaded scene again at take start, not from a different app launch.
            var mruk = MRUK.Instance;
            if (mruk != null && mruk.Rooms.Count > 0) {
                File.WriteAllText(Path.Combine(take, "room-scan.json"), mruk.SaveSceneToJsonString(true));
                try { RoomGeometryExport.Save(mruk,Path.Combine(take,"room-geometry.json")); }
                catch(Exception e) { Debug.LogWarning("[SpatialCapture] "+e.Message); }
            }
            WriteSkeleton("left", OVRPlugin.HandSkeletonVersion == OVRHandSkeletonVersion.OpenXR ? OVRPlugin.SkeletonType.XRHandLeft : OVRPlugin.SkeletonType.HandLeft);
            WriteSkeleton("right", OVRPlugin.HandSkeletonVersion == OVRHandSkeletonVersion.OpenXR ? OVRPlugin.SkeletonType.XRHandRight : OVRPlugin.SkeletonType.HandRight);
            var schema = new CaptureSchema();
            File.WriteAllText(Path.Combine(take, "spatial-capture-schema.json"), JsonUtility.ToJson(schema, true));
            nextSample = 0;
        }
        audio?.Pump();
        double now = Time.realtimeSinceStartupAsDouble;
        if (now < nextSample) return;
        nextSample = now + 1.0 / 30;
        var tracking = rig != null ? rig.trackingSpace : null;
        var row = new HandSample {
            unixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
            realtimeSeconds = now, ovrSeconds = OVRPlugin.GetTimeInSeconds(),
            trackingPosition = tracking != null ? tracking.position : Vector3.zero,
            trackingRotation = tracking != null ? tracking.rotation : Quaternion.identity,
            left = ReadHand(OVRPlugin.Hand.HandLeft), right = ReadHand(OVRPlugin.Hand.HandRight)
        };
        hands.WriteLine(JsonUtility.ToJson(row));
    }

    static Hand ReadHand(OVRPlugin.Hand side)
    {
        var state = new OVRPlugin.HandState();
        bool ok = OVRPlugin.GetHandState(OVRPlugin.Step.Render, side, ref state);
        var result = new Hand { valid = ok, status = (int)state.Status };
        if (!ok) return result; // Do not write stale or fabricated joints.
        result.tracked = (state.Status & OVRPlugin.HandStatus.HandTracked) != 0;
        result.rootPosition = V(state.RootPose.Position); result.rootRotation = Q(state.RootPose.Orientation);
        result.scale = state.HandScale; result.confidence = (int)state.HandConfidence;
        result.sampleTimestamp = state.SampleTimeStamp; result.requestedTimestamp = state.RequestedTimeStamp;
        result.pinches = (int)state.Pinches; result.pinchStrength = state.PinchStrength;
        if (state.BonePositions != null) {
            result.bonePositions = new Vector3[state.BonePositions.Length];
            for (int i=0;i<result.bonePositions.Length;i++) result.bonePositions[i]=V(state.BonePositions[i]);
        }
        if (state.BoneRotations != null) {
            result.boneRotations = new Quaternion[state.BoneRotations.Length];
            for (int i=0;i<result.boneRotations.Length;i++) result.boneRotations[i]=Q(state.BoneRotations[i]);
        }
        return result;
    }
    void WriteSkeleton(string side, OVRPlugin.SkeletonType kind)
    {
        var skeleton = new OVRPlugin.Skeleton2();
        if (!OVRPlugin.GetSkeleton2(kind, ref skeleton)) return;
        var doc = new SkeletonDoc { sdkHandSkeletonVersion = OVRPlugin.HandSkeletonVersion.ToString(), bones = new Bone[(int)skeleton.NumBones] };
        for(int i=0;i<doc.bones.Length;i++) {
            var b=skeleton.Bones[i];
            doc.bones[i]=new Bone { id=(int)b.Id, name=b.Id.ToString(), parent=b.ParentBoneIndex, position=V(b.Pose.Position), rotation=Q(b.Pose.Orientation) };
        }
        File.WriteAllText(Path.Combine(take, side+"-hand-skeleton.json"), JsonUtility.ToJson(doc,true));
    }
    [Serializable] class SkeletonDoc { public string sdkHandSkeletonVersion; public Bone[] bones; }
    [Serializable] class Bone { public int id,parent; public string name; public Vector3 position; public Quaternion rotation; }
    static Vector3 V(OVRPlugin.Vector3f v) => new Vector3(v.x,v.y,v.z);
    static Quaternion Q(OVRPlugin.Quatf q) => new Quaternion(q.x,q.y,q.z,q.w);
    void Close() { audio?.Dispose(); audio=null; hands?.Dispose(); hands=null; take=null; }
    void OnDisable() => Close();
    void OnApplicationPause(bool paused) { if (paused && controller != null && controller.IsRecording) controller.StopRecording(); if (paused) Close(); else { roomAttempts=0; nextRoomAttempt=Time.realtimeSinceStartupAsDouble+2; } }
    [Serializable] class RoomStatus { public bool success; public int rooms; public long unixMs; public string message; }
    [Serializable] class CaptureSchema {
        public int version = 1;
        public string sdkHandSkeletonVersion = OVRPlugin.HandSkeletonVersion.ToString();
        public string roomCoordinates = "MRUK 203 JSON: OpenXR, metres. Not Unity coordinates.";
        public string handCoordinates = "Raw OVRPlugin HandState. Root in tracking space; bone convention is SDK skeleton-dependent. No implicit world conversion.";
        public string worldTransform = "trackingPosition/trackingRotation: Unity tracking-space-to-world at each sample.";
        public string timing = "Video PTS = camera timestamp_us_realtime minus first accepted camera timestamp. Hand unixMs is host wall time; ovrSeconds and SDK sampleTimestamp preserved. Nearest/interpolated alignment requires measured timing validation.";
    }
    [Serializable] class HandSample { public long unixMs; public double realtimeSeconds,ovrSeconds; public Vector3 trackingPosition; public Quaternion trackingRotation; public Hand left,right; }
    [Serializable] class Hand { public bool valid,tracked; public int status,confidence,pinches; public float scale; public double sampleTimestamp,requestedTimestamp; public Vector3 rootPosition; public Quaternion rootRotation; public Vector3[] bonePositions; public Quaternion[] boneRotations; public float[] pinchStrength; }
}
