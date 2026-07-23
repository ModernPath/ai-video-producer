// USER BUG 2026-07-23: model output rendered as raw markdown text — render it properly.
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function Markdown({ children }: { children: string }) {
  return (
    <div className="md" style={{ fontSize: 13, lineHeight: 1.65, maxWidth: "70ch" }}>
      <style>{`
        .md h1,.md h2,.md h3{font-family:var(--disp);letter-spacing:.08em;text-transform:uppercase;font-size:13px;margin:14px 0 6px;color:var(--ink)}
        .md p{margin:6px 0}
        .md strong{color:var(--ink)}
        .md hr{border:none;border-top:1px solid var(--line);margin:10px 0}
        .md table{border-collapse:collapse;margin:10px 0;font-size:12px;display:block;overflow-x:auto}
        .md th,.md td{border:1px solid var(--line);padding:5px 8px;text-align:left;vertical-align:top}
        .md th{color:var(--ink-2);font-family:var(--mono);font-size:10px;text-transform:uppercase}
        .md ul,.md ol{padding-left:20px;margin:6px 0}
        .md code{font-family:var(--mono);font-size:11.5px;background:var(--stage);border:1px solid var(--line);border-radius:4px;padding:0 4px}
      `}</style>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
