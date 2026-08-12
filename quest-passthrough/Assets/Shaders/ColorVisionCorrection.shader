// Ported from colorvision.html's FRAG_SRC (GLSL/WebGL) to HLSL/Built-in RP.
// Staged for Phase 1 — not referenced by any scene yet. See ../../README.md.
//
// Deliberately dropped from the web version: the audio-reactive tint (tied
// to a live mic input the headset doesn't have) and the video-element
// UV-cover/rotate logic (a phone-camera/DOM-video concern; the passthrough
// texture Meta hands you is already correctly framed).
//
// Array uniforms (_SourceLab/_Correction/_Correction2) aren't exposed as
// Properties — ShaderLab doesn't support array properties in the Inspector.
// Set them from script instead, e.g.:
//   material.SetVectorArray("_SourceLab", labVec4Array);   // Vector4[], .xyz used
//   material.SetVectorArray("_Correction", corrVec4Array);
//   material.SetVectorArray("_Correction2", corr2Vec4Array); // .xy used
//   material.SetInt("_PointCount", count);
// SetVectorArray requires Vector4[] even though only xyz/xy is used here.

Shader "ColorVision/Correction"
{
    Properties
    {
        _MainTex ("Camera Texture", 2D) = "white" {}
        _Blend ("True <-> Corrected blend", Range(0,1)) = 1
        _CvdType ("CVD type (0 none,1 protan,2 deutan,3 tritan)", Int) = 0
        _CvdStrength ("CVD correction strength", Range(0,1)) = 1
        _Spread ("Correction spread", Float) = 4
        _OutlineEnabled ("Outline enabled", Float) = 0
        _OutlineThickness ("Outline thickness", Float) = 2
        _OutlineBlend ("Outline blend", Range(0,1)) = 1
        _OutlineOpacity ("Outline opacity", Range(0,1)) = 1
        _OutlineColor ("Outline colour", Color) = (1,1,1,1)
        _CartoonEnabled ("Cartoon enabled", Float) = 0
        _CartoonLevels ("Cartoon levels", Float) = 6
        _CartoonEdgeThickness ("Cartoon edge thickness", Float) = 2
        _CartoonEdgeStrength ("Cartoon edge strength", Range(0,1)) = 0.5
        _CartoonSaturation ("Cartoon saturation mult", Float) = 1.4
        _CartoonThemeEnabled ("Cartoon duotone enabled", Float) = 0
        _CartoonThemeLo ("Cartoon duotone shadow colour", Color) = (0,0,0,1)
        _CartoonThemeHi ("Cartoon duotone highlight colour", Color) = (1,1,1,1)
    }
    SubShader
    {
        Tags { "RenderType"="Opaque" }
        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "UnityCG.cginc"

            #define MAX_POINTS 32

            sampler2D _MainTex;
            float4 _MainTex_TexelSize; // .xy = 1/width, 1/height (Unity auto-provides this)
            float _Blend;
            int _CvdType;
            float _CvdStrength;
            float _Spread;
            int _PointCount;
            float4 _SourceLab[MAX_POINTS];   // .xyz used
            float4 _Correction[MAX_POINTS];  // .xyz = hueShift(deg), satAdjust, lightAdjust
            float4 _Correction2[MAX_POINTS]; // .xy = contrastAdjust, exposureAdjust

            float _OutlineEnabled;
            float _OutlineThickness;
            float _OutlineBlend;
            float _OutlineOpacity;
            float4 _OutlineColor;

            float _CartoonEnabled;
            float _CartoonLevels;
            float _CartoonEdgeThickness;
            float _CartoonEdgeStrength;
            float _CartoonSaturation;
            float _CartoonThemeEnabled;
            float4 _CartoonThemeLo;
            float4 _CartoonThemeHi;

            struct appdata { float4 vertex : POSITION; float2 uv : TEXCOORD0; };
            struct v2f { float2 uv : TEXCOORD0; float4 pos : SV_POSITION; };

            v2f vert(appdata v)
            {
                v2f o;
                o.pos = UnityObjectToClipPos(v.vertex);
                o.uv = v.uv;
                return o;
            }

            // GLSL's mod() is floor-based and differs from HLSL fmod() on
            // negative inputs — match the web version exactly.
            float glslMod(float x, float y) { return x - y * floor(x / y); }

            float srgbToLinear(float c) { return c <= 0.04045 ? c / 12.92 : pow((c + 0.055) / 1.055, 2.4); }
            float linearToSrgb(float c) { return c <= 0.0031308 ? c * 12.92 : 1.055 * pow(c, 1.0 / 2.4) - 0.055; }

            float3 mulCols(float3 col0, float3 col1, float3 col2, float3 v)
            {
                return col0 * v.x + col1 * v.y + col2 * v.z;
            }

            // Machado, Oliveira & Fonseca (2009) dichromacy simulation +
            // Fidaner/Lin/Ozguven error-redistribution Daltonize correction.
            // Same matrices as colorvision.html; see the comment there for
            // provenance. GLSL mat3(...) constructors are column-major, so
            // each block below lists matrix *columns*, not rows.
            float3 daltonize(float3 srgbColor, int type, float strength)
            {
                if (type == 0 || strength <= 0.0) return srgbColor;

                float3 lin = float3(srgbToLinear(srgbColor.r), srgbToLinear(srgbColor.g), srgbToLinear(srgbColor.b));
                float3 simCol0, simCol1, simCol2, errCol0, errCol1, errCol2;
                if (type == 1) {
                    simCol0 = float3(0.152286, 0.114503, -0.003882);
                    simCol1 = float3(1.052583, 0.786281, -0.048116);
                    simCol2 = float3(-0.204868, 0.099216, 1.051998);
                    errCol0 = float3(0.0, 0.7, 0.7);
                    errCol1 = float3(0.0, 1.0, 0.0);
                    errCol2 = float3(0.0, 0.0, 1.0);
                } else if (type == 2) {
                    simCol0 = float3(0.367322, 0.280085, -0.011820);
                    simCol1 = float3(0.860646, 0.672501, 0.042940);
                    simCol2 = float3(-0.227968, 0.047413, 0.968881);
                    errCol0 = float3(0.0, 0.7, 0.7);
                    errCol1 = float3(0.0, 1.0, 0.0);
                    errCol2 = float3(0.0, 0.0, 1.0);
                } else {
                    simCol0 = float3(1.255528, -0.078411, 0.004733);
                    simCol1 = float3(-0.076749, 0.930809, 0.691367);
                    simCol2 = float3(-0.178779, 0.147602, 0.303900);
                    errCol0 = float3(1.0, 0.0, 0.7);
                    errCol1 = float3(0.0, 1.0, 0.7);
                    errCol2 = float3(0.0, 0.0, 0.0);
                }

                float3 simulated = mulCols(simCol0, simCol1, simCol2, lin);
                float3 err = lin - simulated;
                float3 correctedLin = saturate(lin + mulCols(errCol0, errCol1, errCol2, err));
                float3 correctedSrgb = float3(linearToSrgb(correctedLin.r), linearToSrgb(correctedLin.g), linearToSrgb(correctedLin.b));
                return lerp(srgbColor, correctedSrgb, strength);
            }

            float3 rgb2lab(float3 c)
            {
                float r = srgbToLinear(c.r);
                float g = srgbToLinear(c.g);
                float b = srgbToLinear(c.b);
                float X = r * 0.4124564 + g * 0.3575761 + b * 0.1804375;
                float Y = r * 0.2126729 + g * 0.7151522 + b * 0.0721750;
                float Z = r * 0.0193339 + g * 0.1191920 + b * 0.9503041;
                float Xn = 0.95047; float Yn = 1.0; float Zn = 1.08883;
                float fx = X / Xn > 0.008856 ? pow(X / Xn, 1.0 / 3.0) : ((X / Xn) / (3.0 * 0.20705 * 0.20705) + 4.0 / 29.0);
                float fy = Y / Yn > 0.008856 ? pow(Y / Yn, 1.0 / 3.0) : ((Y / Yn) / (3.0 * 0.20705 * 0.20705) + 4.0 / 29.0);
                float fz = Z / Zn > 0.008856 ? pow(Z / Zn, 1.0 / 3.0) : ((Z / Zn) / (3.0 * 0.20705 * 0.20705) + 4.0 / 29.0);
                return float3(116.0 * fy - 16.0, 500.0 * (fx - fy), 200.0 * (fy - fz));
            }

            float3 rgb2hsl(float3 c)
            {
                float mx = max(max(c.r, c.g), c.b);
                float mn = min(min(c.r, c.g), c.b);
                float h = 0.0; float s = 0.0; float l = (mx + mn) * 0.5;
                float d = mx - mn;
                if (d > 0.0001) {
                    s = d / (1.0 - abs(2.0 * l - 1.0));
                    if (mx == c.r) { h = glslMod((c.g - c.b) / d, 6.0); }
                    else if (mx == c.g) { h = (c.b - c.r) / d + 2.0; }
                    else { h = (c.r - c.g) / d + 4.0; }
                    h *= 60.0;
                    if (h < 0.0) h += 360.0;
                }
                return float3(h, s, l);
            }

            float3 hsl2rgb(float3 hsl)
            {
                float h = hsl.x; float s = hsl.y; float l = hsl.z;
                float c = (1.0 - abs(2.0 * l - 1.0)) * s;
                float x = c * (1.0 - abs(glslMod(h / 60.0, 2.0) - 1.0));
                float m = l - c * 0.5;
                float3 rgb1;
                if (h < 60.0) { rgb1 = float3(c, x, 0.0); }
                else if (h < 120.0) { rgb1 = float3(x, c, 0.0); }
                else if (h < 180.0) { rgb1 = float3(0.0, c, x); }
                else if (h < 240.0) { rgb1 = float3(0.0, x, c); }
                else if (h < 300.0) { rgb1 = float3(x, 0.0, c); }
                else { rgb1 = float3(c, 0.0, x); }
                return rgb1 + m;
            }

            float cvLuminance(float3 c) { return dot(c, float3(0.299, 0.587, 0.114)); }

            // Sobel edge detection on luminance, sampled from the raw
            // passthrough texture (not the corrected result).
            float cvEdgeStrength(float2 uv, float thickness)
            {
                float2 t = _MainTex_TexelSize.xy * max(thickness, 0.0001);
                float tl = cvLuminance(tex2D(_MainTex, uv + float2(-t.x, -t.y)).rgb);
                float tc = cvLuminance(tex2D(_MainTex, uv + float2(0.0, -t.y)).rgb);
                float tr = cvLuminance(tex2D(_MainTex, uv + float2(t.x, -t.y)).rgb);
                float ml = cvLuminance(tex2D(_MainTex, uv + float2(-t.x, 0.0)).rgb);
                float mr = cvLuminance(tex2D(_MainTex, uv + float2(t.x, 0.0)).rgb);
                float bl = cvLuminance(tex2D(_MainTex, uv + float2(-t.x, t.y)).rgb);
                float bc = cvLuminance(tex2D(_MainTex, uv + float2(0.0, t.y)).rgb);
                float br = cvLuminance(tex2D(_MainTex, uv + float2(t.x, t.y)).rgb);
                float gx = -tl - 2.0 * ml - bl + tr + 2.0 * mr + br;
                float gy = -tl - 2.0 * tc - tr + bl + 2.0 * bc + br;
                return saturate(length(float2(gx, gy)));
            }

            float3 cvCartoonize(float3 c, float levels, float saturation)
            {
                float3 hsl = rgb2hsl(c);
                hsl.y = saturate(hsl.y * saturation + 0.05);
                float3 boosted = hsl2rgb(hsl);
                float lv = max(levels, 2.0);
                return saturate(floor(boosted * lv) / (lv - 1.0));
            }

            float cvCartoonLine(float2 uv, float thickness, float strength)
            {
                float edge = cvEdgeStrength(uv, thickness);
                float lo = lerp(0.30, 0.04, strength);
                float hi = lo + 0.18;
                float opacity = lerp(0.35, 1.0, strength);
                return smoothstep(lo, hi, edge) * opacity;
            }

            float3 cvCartoonTheme(float3 c, float3 lo, float3 hi)
            {
                float lum = cvLuminance(c);
                return lerp(lo, hi, lum);
            }

            fixed4 frag(v2f i) : SV_Target
            {
                float2 uv = i.uv;
                float3 original = tex2D(_MainTex, uv).rgb;
                float3 base = daltonize(original, _CvdType, _CvdStrength);
                float3 correction = float3(0, 0, 0);
                float2 correction2 = float2(0, 0);

                if (_PointCount > 0) {
                    float3 labP = rgb2lab(original);
                    float totalWeight = 0.0;
                    float3 weightedSum = float3(0, 0, 0);
                    float2 weightedSum2 = float2(0, 0);
                    for (int p = 0; p < MAX_POINTS; p++) {
                        if (p >= _PointCount) break;
                        float d = distance(labP, _SourceLab[p].xyz);
                        float w = 1.0 / (d * d + _Spread);
                        weightedSum += _Correction[p].xyz * w;
                        weightedSum2 += _Correction2[p].xy * w;
                        totalWeight += w;
                    }
                    // Null anchor so a single saved colour's correction fades
                    // out on unrelated colours instead of applying at full
                    // strength everywhere. Matches colorvision.html exactly.
                    totalWeight += 1.0 / (2500.0 + _Spread);
                    correction = weightedSum / totalWeight;
                    correction2 = weightedSum2 / totalWeight;
                }

                float3 hsl = rgb2hsl(base);
                hsl.x = glslMod(hsl.x + correction.x + 360.0, 360.0);
                hsl.y = saturate(hsl.y + correction.y);
                hsl.z = saturate(hsl.z + correction.z);
                float3 corrected = hsl2rgb(hsl);

                float contMul = 1.0 + correction2.x;
                float expMul = pow(2.0, correction2.y);
                corrected = saturate((corrected * expMul - 0.5) * contMul + 0.5);

                float3 filled = lerp(original, corrected, _Blend);
                float3 finalColor = filled;

                if (_CartoonEnabled > 0.5) {
                    float3 toon = cvCartoonize(filled, _CartoonLevels, _CartoonSaturation);
                    if (_CartoonThemeEnabled > 0.5) {
                        toon = cvCartoonTheme(toon, _CartoonThemeLo.rgb, _CartoonThemeHi.rgb);
                    }
                    float line = cvCartoonLine(uv, _CartoonEdgeThickness, _CartoonEdgeStrength);
                    finalColor = lerp(toon, float3(0.02, 0.02, 0.02), line);
                }
                if (_OutlineEnabled > 0.5) {
                    float edge = cvEdgeStrength(uv, _OutlineThickness) * _OutlineOpacity;
                    float3 outlineColor = _OutlineColor.rgb * edge;
                    finalColor = lerp(finalColor, outlineColor, _OutlineBlend);
                }

                return fixed4(finalColor, 1.0);
            }
            ENDCG
        }
    }
}
