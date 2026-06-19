import React, { useState } from "react";

const API_URL = "http://127.0.0.1:8000/generate-bug-report";

const EMPTY_REPORT = {
  component: "",
  issue: "",
  severity: "",
  priority: "",
  bug_type: "",
  short_summary: "",
  root_cause: "",
  test_cases: [],
};

/* ---------- tiny inline icons (no extra dependencies) ---------- */

const IconCopy = (p) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const IconCheck = (p) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconAlert = (p) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12" y2="17" />
  </svg>
);

const IconSpark = (p) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M12 2 9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5Z" />
  </svg>
);

/* ---------- helpers ---------- */

function getSeverityStyle(severity) {
  const s = (severity || "").toLowerCase();
  if (s.includes("critical")) return { bg: "rgba(239,68,68,0.12)", border: "#7f1d1d", text: "#fca5a5", dot: "#ef4444" };
  if (s.includes("high")) return { bg: "rgba(249,115,22,0.12)", border: "#7c2d12", text: "#fdba74", dot: "#f97316" };
  if (s.includes("medium")) return { bg: "rgba(234,179,8,0.12)", border: "#713f12", text: "#fde047", dot: "#eab308" };
  if (s.includes("low")) return { bg: "rgba(34,197,94,0.12)", border: "#14532d", text: "#86efac", dot: "#22c55e" };
  return { bg: "rgba(148,163,184,0.12)", border: "#334155", text: "#cbd5e1", dot: "#64748b" };
}

function buildReportText(r) {
  const lines = [
    `Component: ${r.component || "N/A"}`,
    `Issue: ${r.issue || "N/A"}`,
    `Severity: ${r.severity || "N/A"}`,
    `Priority: ${r.priority || "N/A"}`,
    `Bug Type: ${r.bug_type || "N/A"}`,
    `Short Summary: ${r.short_summary || "N/A"}`,
    `Root Cause: ${r.root_cause || "N/A"}`,
    "",
    "Test Cases:",
  ];
  if (Array.isArray(r.test_cases) && r.test_cases.length > 0) {
    r.test_cases.forEach((tc, i) => {
      lines.push(`  ${i + 1}. ${typeof tc === "string" ? tc : JSON.stringify(tc)}`);
    });
  } else {
    lines.push("  None generated.");
  }
  return lines.join("\n");
}

/* ---------- design tokens ---------- */

const COLORS = {
  bg: "#0a0b0f",
  surface: "#131620",
  surface2: "#1a1d29",
  border: "#262a37",
  borderSoft: "#1f222e",
  text: "#e7e9ee",
  textDim: "#8b91a3",
  textFaint: "#5b6175",
  accent: "#7c5cfc",
  accent2: "#36c5f0",
};

const mono = "'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace";
const sans = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif";

/* ---------- component ---------- */

function App() {
  const [description, setDescription] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);

  const analyzeBug = async () => {
    const trimmed = description.trim();
    if (!trimmed) {
      setErrorMsg("Please enter a bug description before generating a report.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setResult(null);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: trimmed }),
      });

      if (!response.ok) {
        let detail = `Request failed with status ${response.status}`;
        try {
          const errorBody = await response.json();
          if (errorBody && (errorBody.detail || errorBody.message)) {
            detail = errorBody.detail || errorBody.message;
          }
        } catch {
          // response wasn't JSON - keep the generic status message
        }
        throw new Error(detail);
      }

      const data = await response.json();
      setResult({ ...EMPTY_REPORT, ...data });
    } catch (error) {
      console.error(error);
      setErrorMsg(
        error.message === "Failed to fetch"
          ? "Couldn't reach the backend. Is the server running on http://127.0.0.1:8000?"
          : error.message
      );
    } finally {
      setLoading(false);
    }
  };

  const copyReport = async () => {
    if (!result) return;
    const text = buildReportText(result);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setErrorMsg("Couldn't copy to clipboard. Your browser may be blocking it.");
    }
  };

  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") analyzeBug();
  };

  const sev = result ? getSeverityStyle(result.severity) : null;

  return (
    <div
      className="qa-root"
      style={{
        minHeight: "100vh",
        background: COLORS.bg,
        color: COLORS.text,
        fontFamily: sans,
        position: "relative",
        overflowX: "hidden",
      }}
    >
      <style>{`
        @keyframes qa-spin { to { transform: rotate(360deg); } }
        @keyframes qa-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .35; } }
        @keyframes qa-fade-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .qa-textarea::placeholder { color: ${COLORS.textFaint}; }
        .qa-textarea:focus { outline: none; border-color: ${COLORS.accent}; box-shadow: 0 0 0 3px rgba(124,92,252,0.16); }
        .qa-btn-primary:hover:not(:disabled) { filter: brightness(1.08); }
        .qa-btn-primary:active:not(:disabled) { transform: translateY(1px); }
        .qa-btn-ghost:hover { background: ${COLORS.surface2}; border-color: #363b48; }
        .qa-card-in { animation: qa-fade-in .4s ease both; }
        .qa-dot { animation: qa-pulse 2s ease-in-out infinite; }
        .qa-spin { animation: qa-spin .8s linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .qa-dot, .qa-spin, .qa-card-in { animation: none; }
        }
        .qa-scroll::-webkit-scrollbar { height: 8px; }
        .qa-scroll::-webkit-scrollbar-thumb { background: ${COLORS.border}; border-radius: 4px; }
      `}</style>

      {/* ambient glow, decorative only */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "-180px",
          left: "50%",
          width: "900px",
          height: "500px",
          transform: "translateX(-50%)",
          background: `radial-gradient(closest-side, rgba(124,92,252,0.16), transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", maxWidth: "760px", margin: "0 auto", padding: "clamp(28px,6vw,64px) 20px 80px" }}>
        {/* header */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              fontFamily: mono,
              fontSize: "11px",
              letterSpacing: "0.12em",
              color: COLORS.textDim,
              textTransform: "uppercase",
              marginBottom: "18px",
            }}
          >
            <span className="qa-dot" style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
            Agent ready
          </div>

          <h1 style={{ fontSize: "40px", fontWeight: 700, letterSpacing: "-0.02em", margin: 0, lineHeight: 1.1 }}>
            QA Copilot
          </h1>
          <p
            style={{
              fontFamily: mono,
              fontSize: "13px",
              letterSpacing: "0.06em",
              color: COLORS.accent2,
              textTransform: "uppercase",
              margin: "10px 0 0",
            }}
          >
            AI-Powered Bug Triage Agent
          </p>
        </div>

        {/* input card */}
        <div
          style={{
            background: COLORS.surface,
            border: `1px solid ${COLORS.border}`,
            borderRadius: "14px",
            padding: "18px",
          }}
        >
          <div
            style={{
              fontFamily: mono,
              fontSize: "11px",
              letterSpacing: "0.1em",
              color: COLORS.textFaint,
              textTransform: "uppercase",
              marginBottom: "10px",
            }}
          >
            Describe the bug
          </div>

          <label htmlFor="bug-description" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
            Bug description
          </label>
          <textarea
            id="bug-description"
            className="qa-textarea"
            rows="7"
            style={{
              width: "100%",
              resize: "vertical",
              background: "transparent",
              color: COLORS.text,
              border: `1px solid ${COLORS.border}`,
              borderRadius: "10px",
              padding: "12px 14px",
              fontFamily: sans,
              fontSize: "14.5px",
              lineHeight: 1.55,
              boxSizing: "border-box",
              transition: "border-color .15s, box-shadow .15s",
            }}
            placeholder="e.g. Workflow approval notifications are not being sent to the assigned approver after initiation..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={handleKeyDown}
          />

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "14px",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <span style={{ fontFamily: mono, fontSize: "11.5px", color: COLORS.textFaint }}>
              ⌘ / Ctrl + Enter to submit
            </span>

            <button
              onClick={analyzeBug}
              disabled={loading || !description.trim()}
              className="qa-btn-primary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 20px",
                borderRadius: "9px",
                border: "none",
                fontSize: "14px",
                fontWeight: 600,
                color: "#0a0b0f",
                background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accent2})`,
                cursor: loading || !description.trim() ? "not-allowed" : "pointer",
                opacity: loading || !description.trim() ? 0.5 : 1,
                transition: "filter .15s, transform .1s",
              }}
            >
              {loading ? (
                <>
                  <svg className="qa-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M21 12a9 9 0 1 1-9-9" />
                  </svg>
                  Analyzing…
                </>
              ) : (
                <>
                  <IconSpark />
                  Generate Bug Report
                </>
              )}
            </button>
          </div>
        </div>

        {/* error */}
        {errorMsg && (
          <div
            className="qa-card-in"
            style={{
              display: "flex",
              gap: "10px",
              alignItems: "flex-start",
              marginTop: "16px",
              padding: "13px 14px",
              borderRadius: "10px",
              background: "rgba(239,68,68,0.08)",
              border: "1px solid #5c1f1f",
              color: "#fca5a5",
              fontSize: "13.5px",
            }}
          >
            <IconAlert style={{ marginTop: "1px", flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* report */}
        {result && (
          <div
            className="qa-card-in"
            style={{
              marginTop: "24px",
              background: COLORS.surface,
              border: `1px solid ${COLORS.border}`,
              borderRadius: "14px",
              padding: "22px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "18px" }}>
              <div>
                <div style={{ fontFamily: mono, fontSize: "11px", letterSpacing: "0.1em", color: COLORS.textFaint, textTransform: "uppercase", marginBottom: "6px" }}>
                  Bug analysis report
                </div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "4px 11px",
                    borderRadius: "999px",
                    background: sev.bg,
                    border: `1px solid ${sev.border}`,
                    color: sev.text,
                    fontSize: "12.5px",
                    fontWeight: 600,
                  }}
                >
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: sev.dot, display: "inline-block" }} />
                  {result.severity || "Severity: N/A"}
                </div>
              </div>

              <button
                onClick={copyReport}
                className="qa-btn-ghost"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "7px",
                  padding: "8px 14px",
                  borderRadius: "8px",
                  border: `1px solid ${COLORS.border}`,
                  background: "transparent",
                  color: copied ? "#86efac" : COLORS.textDim,
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "background .15s, border-color .15s",
                }}
              >
                {copied ? <IconCheck /> : <IconCopy />}
                {copied ? "Copied!" : "Copy Report"}
              </button>
            </div>

            {/* stat chips */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "10px", marginBottom: "22px" }}>
              {[
                ["Component", result.component],
                ["Priority", result.priority],
                ["Bug Type", result.bug_type],
              ].map(([label, value]) => (
                <div key={label} style={{ background: COLORS.surface2, border: `1px solid ${COLORS.borderSoft}`, borderRadius: "10px", padding: "10px 12px" }}>
                  <div style={{ fontFamily: mono, fontSize: "10.5px", letterSpacing: "0.08em", color: COLORS.textFaint, textTransform: "uppercase", marginBottom: "4px" }}>
                    {label}
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: 600 }}>{value || "N/A"}</div>
                </div>
              ))}
            </div>

            {/* text sections */}
            {[
              ["Issue", result.issue],
              ["Short Summary", result.short_summary],
              ["Root Cause", result.root_cause],
            ].map(([label, value]) => (
              <div key={label} style={{ marginBottom: "18px" }}>
                <div style={{ fontFamily: mono, fontSize: "11px", letterSpacing: "0.08em", color: COLORS.textFaint, textTransform: "uppercase", marginBottom: "6px" }}>
                  {label}
                </div>
                <p style={{ margin: 0, fontSize: "14.5px", lineHeight: 1.6, color: COLORS.text }}>{value || "N/A"}</p>
              </div>
            ))}

            {/* test cases */}
            <div style={{ fontFamily: mono, fontSize: "11px", letterSpacing: "0.08em", color: COLORS.textFaint, textTransform: "uppercase", marginBottom: "10px" }}>
              Test Cases
            </div>

            {Array.isArray(result.test_cases) && result.test_cases.length > 0 ? (
              result.test_cases.map((tc, index) => (
                <div
                  key={index}
                  style={{
                    background: COLORS.surface2,
                    border: `1px solid ${COLORS.borderSoft}`,
                    borderRadius: "10px",
                    padding: "12px 14px",
                    marginBottom: "10px",
                  }}
                >
                  <div style={{ fontFamily: mono, fontSize: "10.5px", color: COLORS.accent2, marginBottom: "6px" }}>
                    TEST CASE {String(index + 1).padStart(2, "0")}
                  </div>
                  <pre
                    className="qa-scroll"
                    style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", overflowX: "auto", fontFamily: mono, fontSize: "13px", color: COLORS.text, lineHeight: 1.5 }}
                  >
                    {typeof tc === "string" ? tc : JSON.stringify(tc, null, 2)}
                  </pre>
                </div>
              ))
            ) : (
              <p style={{ margin: 0, fontSize: "14px", color: COLORS.textDim }}>No test cases generated.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;