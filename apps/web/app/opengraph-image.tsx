import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "#EDEFE9",
          padding: 80,
        }}
      >
        <div style={{ fontSize: 28, color: "#B23A2F", fontWeight: 700, letterSpacing: 2, display: "flex" }}>
          PHASE 1 · NAIROBI CITY
        </div>
        <div
          style={{
            fontSize: 84,
            color: "#14181F",
            fontWeight: 800,
            marginTop: 20,
            lineHeight: 1,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <span>Every stage, verified</span>
          <span>before you board.</span>
        </div>
        <div style={{ fontSize: 32, color: "#1B2A4A", marginTop: 30, display: "flex" }}>StageHome</div>
      </div>
    ),
    { ...size }
  );
}
