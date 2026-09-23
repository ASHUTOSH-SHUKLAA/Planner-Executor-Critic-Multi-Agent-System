"use client";

import React, { useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  MarkerType,
} from "@xyflow/react";
import { useTheme } from "@/lib/theme-context";
import { CustomStepNode } from "./CustomStepNode";
import { StepOutputData } from "@/lib/api";
import { Layers } from "lucide-react";

import type { NodeTypes } from "@xyflow/react";

const nodeTypes: NodeTypes = {
  customStep: CustomStepNode as any,
};

interface DAGCanvasProps {
  steps: StepOutputData[];
  selectedStepId: string | null;
  onSelectStep: (stepId: string) => void;
}

export function DAGCanvas({ steps, selectedStepId, onSelectStep }: DAGCanvasProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  // Compute topological layout for nodes and edges
  const { nodes, edges } = useMemo(() => {
    if (!steps || steps.length === 0) {
      return { nodes: [], edges: [] };
    }

    // Step 1: Build dependency map and calculate levels (longest path from roots)
    const stepMap = new Map<string, StepOutputData>();
    steps.forEach((s) => stepMap.set(s.step_id, s));

    const levelMap = new Map<string, number>();

    const getLevel = (id: string, visited = new Set<string>()): number => {
      if (levelMap.has(id)) return levelMap.get(id)!;
      if (visited.has(id)) return 0; // prevent cycle crash

      visited.add(id);
      const step = stepMap.get(id);
      if (!step || !step.depends_on || step.depends_on.length === 0) {
        levelMap.set(id, 0);
        return 0;
      }

      let maxParentLevel = 0;
      for (const dep of step.depends_on) {
        maxParentLevel = Math.max(maxParentLevel, getLevel(dep, new Set(visited)) + 1);
      }
      levelMap.set(id, maxParentLevel);
      return maxParentLevel;
    };

    steps.forEach((s) => getLevel(s.step_id));

    // Step 2: Group steps by level
    const levelBuckets = new Map<number, StepOutputData[]>();
    steps.forEach((s) => {
      const lvl = levelMap.get(s.step_id) || 0;
      if (!levelBuckets.has(lvl)) levelBuckets.set(lvl, []);
      levelBuckets.get(lvl)!.push(s);
    });

    // Step 3: Compute X and Y positions
    const computedNodes: Node[] = [];
    const X_GAP = 340;
    const Y_GAP = 160;

    levelBuckets.forEach((bucket, lvl) => {
      const totalInLevel = bucket.length;
      const startY = -((totalInLevel - 1) * Y_GAP) / 2 + 100;

      bucket.forEach((step, idx) => {
        computedNodes.push({
          id: step.step_id,
          type: "customStep",
          position: {
            x: 80 + lvl * X_GAP,
            y: startY + idx * Y_GAP,
          },
          data: {
            step,
            isSelected: selectedStepId === step.step_id,
            onSelect: onSelectStep,
          },
        });
      });
    });

    // Step 4: Create Edges
    const computedEdges: Edge[] = [];
    steps.forEach((step) => {
      if (step.depends_on && step.depends_on.length > 0) {
        step.depends_on.forEach((parent) => {
          const isParentPassed = stepMap.get(parent)?.status === "PASSED";
          const isTargetExecuting = step.status === "EXECUTING";
          const defaultStroke = isDark ? "#475569" : "#94a3b8";

          computedEdges.push({
            id: `e-${parent}-${step.step_id}`,
            source: parent,
            target: step.step_id,
            animated: isTargetExecuting,
            style: {
              stroke: isParentPassed ? "#10b981" : isTargetExecuting ? "#38bdf8" : defaultStroke,
              strokeWidth: 2,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 14,
              height: 14,
              color: isParentPassed ? "#10b981" : isTargetExecuting ? "#38bdf8" : defaultStroke,
            },
          });
        });
      }
    });

    return { nodes: computedNodes, edges: computedEdges };
  }, [steps, selectedStepId, onSelectStep, isDark]);

  if (steps.length === 0) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white/70 dark:bg-zinc-950/40 p-8 text-center transition-colors">
        <div className="h-16 w-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 shadow-xs">
          <Layers className="h-8 w-8" />
        </div>
        <h4 className="text-base font-bold text-zinc-900 dark:text-white">
          Dynamic Execution DAG Canvas
        </h4>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mt-1.5 leading-relaxed">
          Submit an objective above. The Planner Agent will break your goal down into an acyclic dependency graph
          rendered here in real time.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-950/60 overflow-hidden relative transition-colors">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.2}
        maxZoom={1.5}
        className={isDark ? "bg-[#09090b]" : "bg-[#f8fafc]"}
      >
        <Background color={isDark ? "#27272a" : "#cbd5e1"} gap={20} size={1} />
        <Controls
          className={`!rounded-xl !overflow-hidden shadow-md ${
            isDark
              ? "!bg-zinc-900 !border-zinc-800 !text-white fill-white"
              : "!bg-white !border-zinc-200 !text-zinc-800 fill-zinc-800"
          }`}
        />
        <MiniMap
          nodeColor={(n) => {
            const step = (n.data as any)?.step;
            if (step?.status === "PASSED") return "#10b981";
            if (step?.status === "EXECUTING") return "#38bdf8";
            if (step?.status === "CRITIC_REVIEW") return "#c084fc";
            return isDark ? "#52525b" : "#94a3b8";
          }}
          className={`!rounded-xl !overflow-hidden shadow-md ${
            isDark
              ? "!bg-zinc-950/90 !border-zinc-800"
              : "!bg-white/90 !border-zinc-200"
          }`}
          maskColor={isDark ? "rgba(0, 0, 0, 0.6)" : "rgba(240, 244, 248, 0.6)"}
        />
      </ReactFlow>
    </div>
  );
}
