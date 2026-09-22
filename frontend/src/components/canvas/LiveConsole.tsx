"use client";

import React, { useEffect, useRef, useState } from "react";
import { Terminal, ChevronDown, ChevronUp, Trash2 } from "lucide-react";

export interface LogEntry {
  timestamp: string;
  agent: string;
  message: string;
  level?: string;
}

interface LiveConsoleProps {
  logs: LogEntry[];
  onClear: () => void;
}

export function LiveConsole({ logs, onClear }: LiveConsoleProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isExpanded) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, isExpanded]);

  const getAgentColor = (agent: string) => {
    const ag = agent.toUpperCase();
    if (ag.includes("PLANNER")) return "text-indigo-400";
    if (ag.includes("EXECUTOR")) return "text-sky-400";
    if (ag.includes("CRITIC")) return "text-purple-400";
    if (ag.includes("REPLANNER")) return "text-amber-400";
    if (ag.includes("ERROR")) return "text-red-400 font-bold";
    return "text-emerald-400";
  };

  return (
    <div className="border-t border-zinc-800 bg-zinc-950 font-mono text-xs">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/60 border-b border-zinc-800/80">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-zinc-300 hover:text-white transition-colors"
        >
          <Terminal className="h-3.5 w-3.5 text-indigo-400" />
          <span className="font-semibold text-xs">Live Agent Telemetry Stream</span>
          <span className="rounded-full bg-zinc-800 px-2 py-0.2 text-[10px] text-zinc-400">
            {logs.length} events
          </span>
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
          ) : (
            <ChevronUp className="h-3.5 w-3.5 text-zinc-500" />
          )}
        </button>

        {isExpanded && (
          <button
            onClick={onClear}
            className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <Trash2 className="h-3 w-3" />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* Expandable Log Area */}
      {isExpanded && (
        <div className="h-48 overflow-y-auto p-3 space-y-1.5 bg-black/90">
          {logs.length === 0 ? (
            <p className="text-zinc-600 italic">No log events recorded yet.</p>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="flex items-start gap-2 leading-relaxed">
                <span className="text-zinc-600 text-[10px] flex-shrink-0">{log.timestamp}</span>
                <span className={`font-bold flex-shrink-0 ${getAgentColor(log.agent)}`}>
                  [{log.agent.toUpperCase()}]
                </span>
                <span className="text-zinc-300 whitespace-pre-wrap">{log.message}</span>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
