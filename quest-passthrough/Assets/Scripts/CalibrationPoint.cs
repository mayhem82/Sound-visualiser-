using System;

namespace ColorVision.Quest
{
    // Matches the exact JSON shape colorvision.html/colorassist.html save to
    // localStorage under the key "cvCalibrationPoints_v1" (see savePoint() in
    // colorvision.js). Field names are kept identical on purpose so a raw
    // export from the web app deserializes here with no conversion step.
    [Serializable]
    public class CalibrationPoint
    {
        public string id;
        public string label;
        public float[] sourceColor;   // [r, g, b], each 0..1
        public float hueShift;        // degrees
        public float satAdjust;       // -1..1
        public float lightAdjust;     // -1..1
        public float contrastAdjust;  // -1..1
        public float exposureAdjust;  // -1..1
    }

    // localStorage stores a bare JSON array; JsonUtility needs a wrapper
    // object to parse a top-level array.
    [Serializable]
    public class CalibrationPointList
    {
        public CalibrationPoint[] points;

        // Wraps a bare "[...]" array string (as exported from the web app)
        // in a {"points": ...} envelope so JsonUtility.FromJson can read it.
        public static CalibrationPointList FromRawArrayJson(string rawArrayJson)
        {
            string wrapped = "{\"points\":" + rawArrayJson + "}";
            return UnityEngine.JsonUtility.FromJson<CalibrationPointList>(wrapped);
        }
    }
}
