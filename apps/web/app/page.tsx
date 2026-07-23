import { config } from "@avd/shared/config";

export default function Home() {
  return (
    <main style={{ maxWidth: 880, margin: "0 auto", padding: "64px 24px" }}>
      <p className="mono muted" style={{ fontSize: 12 }}>harness · phase 1 — golden thread</p>
      <h1 className="disp" style={{ fontSize: 34, marginTop: 8 }}>
        AI Video Director
        <span
          aria-hidden
          style={{
            display: "inline-block",
            width: "0.4em",
            height: "0.4em",
            borderRadius: "50%",
            background: "var(--accent)",
            marginLeft: "0.3em",
          }}
        />
      </h1>
      <p className="muted" style={{ marginTop: 12, maxWidth: "56ch" }}>
        Shot-based AI video production. Projects land here next: create a project, direct a shot,
        generate its start frame and take, download the clip.
      </p>
      <p className="mono muted" style={{ marginTop: 24, fontSize: 12 }}>
        config check: shots {config.shot.minSeconds}–{config.shot.maxSeconds}s · default AR{" "}
        {config.project.defaultAspectRatio}
      </p>
    </main>
  );
}
