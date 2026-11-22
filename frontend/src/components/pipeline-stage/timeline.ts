/**
 * Timeline Controller
 * Provides deterministic clock, scrubbing, speed control, and event stepping for the pipeline simulation.
 */

import type { PipelineEvent } from "./events";
import { INITIAL_PIPELINE_STATE, type PipelineState, pipelineReducer } from "./reducer";

export type PlaybackSpeed = 0.5 | 1 | 2;

export interface TimelineState {
  currentIndex: number;
  totalEvents: number;
  isPlaying: boolean;
  speed: PlaybackSpeed;
  loop: boolean;
  currentState: PipelineState;
  currentEvent: PipelineEvent | null;
  historyStates: PipelineState[];
}

export class TimelineController {
  private events: PipelineEvent[] = [];
  private historyStates: PipelineState[] = [];
  private currentIndex: number = 0;
  private isPlaying: boolean = false;
  private speed: PlaybackSpeed = 1;
  private loop: boolean = true;
  private timer: NodeJS.Timeout | null = null;
  private listeners: Set<(state: TimelineState) => void> = new Set();
  private baseStepMs: number = 1100; // Pacing beat >= 600ms

  constructor(events: PipelineEvent[] = [], autoPlay: boolean = false, speed: PlaybackSpeed = 1) {
    this.speed = speed;
    this.loadEvents(events);
    if (autoPlay) {
      this.play();
    }
  }

  public loadEvents(events: PipelineEvent[]): void {
    this.pause();
    this.events = events;
    this.currentIndex = 0;

    // Pre-compute pure state at each event step so scrub/seek is O(1) instant
    let cur = INITIAL_PIPELINE_STATE;
    const states: PipelineState[] = [cur];

    for (const ev of events) {
      cur = pipelineReducer(cur, ev);
      states.push(cur);
    }

    this.historyStates = states;
    this.notify();
  }

  public subscribe(listener: (state: TimelineState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  public getState(): TimelineState {
    const safeIdx = Math.min(this.currentIndex, this.events.length);
    return {
      currentIndex: safeIdx,
      totalEvents: this.events.length,
      isPlaying: this.isPlaying,
      speed: this.speed,
      loop: this.loop,
      currentState: this.historyStates[safeIdx] || INITIAL_PIPELINE_STATE,
      currentEvent: safeIdx > 0 ? this.events[safeIdx - 1] : null,
      historyStates: this.historyStates,
    };
  }

  public play(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.scheduleNextBeat();
    this.notify();
  }

  public pause(): void {
    if (!this.isPlaying && !this.timer) return;
    this.isPlaying = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.notify();
  }

  public togglePlayPause(): void {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  public stepForward(): void {
    this.pause();
    if (this.currentIndex < this.events.length) {
      this.currentIndex += 1;
      this.notify();
    } else if (this.loop) {
      this.currentIndex = 0;
      this.notify();
    }
  }

  public stepBackward(): void {
    this.pause();
    if (this.currentIndex > 0) {
      this.currentIndex -= 1;
      this.notify();
    }
  }

  public seek(index: number): void {
    const target = Math.max(0, Math.min(index, this.events.length));
    this.currentIndex = target;
    this.notify();
  }

  public setSpeed(speed: PlaybackSpeed): void {
    this.speed = speed;
    if (this.isPlaying) {
      if (this.timer) clearTimeout(this.timer);
      this.scheduleNextBeat();
    }
    this.notify();
  }

  public setLoop(loop: boolean): void {
    this.loop = loop;
    this.notify();
  }

  public destroy(): void {
    this.pause();
    this.listeners.clear();
  }

  private scheduleNextBeat(): void {
    if (!this.isPlaying) return;

    if (this.currentIndex >= this.events.length) {
      if (this.loop) {
        // 2s calm pause at the end of scenario
        this.timer = setTimeout(() => {
          if (!this.isPlaying) return;
          this.currentIndex = 0;
          this.notify();
          this.scheduleNextBeat();
        }, 2000);
      } else {
        this.pause();
      }
      return;
    }

    const interval = Math.max(500, Math.round(this.baseStepMs / this.speed));
    this.timer = setTimeout(() => {
      if (!this.isPlaying) return;
      this.currentIndex += 1;
      this.notify();
      this.scheduleNextBeat();
    }, interval);
  }

  private notify(): void {
    const st = this.getState();
    this.listeners.forEach((l) => l(st));
  }
}
