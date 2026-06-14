import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#0a0a0a",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
        }}
      >
        <p style={{ color: "#a78bfa", fontSize: 80, fontWeight: 700, margin: 0, letterSpacing: "-2px" }}>
          Busted Board
        </p>
        <p style={{ color: "#a1a1aa", fontSize: 34, margin: 0 }}>
          Find something great to watch.
        </p>
      </div>
    ),
    { ...size }
  );
}
