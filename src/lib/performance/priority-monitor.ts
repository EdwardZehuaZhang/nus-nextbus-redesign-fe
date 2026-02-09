/**
 * Priority System Performance Monitoring
 * 
 * Tracks timing and performance of the priority initialization system
 * Useful for debugging and optimization
 */

export type PerformanceMetric = {
  phase: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'pending' | 'complete' | 'error';
};

class PriorityPerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private startTime: number = 0;

  constructor() {
    this.startTime = performance.now();
  }

  /**
   * Mark the start of a phase
   */
  startPhase(phase: string): void {
    this.metrics.set(phase, {
      phase,
      startTime: performance.now(),
      status: 'pending',
    });
    
    if (__DEV__) {
      console.log(`[PRIORITY] ⏱️ Starting phase: ${phase}`);
    }
  }

  /**
   * Mark the completion of a phase
   */
  completePhase(phase: string): void {
    const metric = this.metrics.get(phase);
    if (metric) {
      metric.endTime = performance.now();
      metric.duration = metric.endTime - metric.startTime;
      metric.status = 'complete';
      
      if (__DEV__) {
        console.log(
          `[PRIORITY] ✅ Completed phase: ${phase} (${metric.duration.toFixed(0)}ms)`
        );
      }
    }
  }

  /**
   * Mark a phase as errored
   */
  errorPhase(phase: string, error: Error): void {
    const metric = this.metrics.get(phase);
    if (metric) {
      metric.endTime = performance.now();
      metric.duration = metric.endTime - metric.startTime;
      metric.status = 'error';
      
      if (__DEV__) {
        console.error(
          `[PRIORITY] ❌ Error in phase: ${phase} - ${error.message}`
        );
      }
    }
  }

  /**
   * Get total time since initialization started
   */
  getTotalTime(): number {
    return performance.now() - this.startTime;
  }

  /**
   * Get timing breakdown
   */
  getTimingBreakdown(): Record<string, number> {
    const breakdown: Record<string, number> = {};
    this.metrics.forEach((metric, phase) => {
      if (metric.duration !== undefined) {
        breakdown[phase] = metric.duration;
      }
    });
    return breakdown;
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Map<string, PerformanceMetric> {
    return new Map(this.metrics);
  }

  /**
   * Log summary
   */
  logSummary(): void {
    if (!__DEV__) return;

    console.log('\n[PRIORITY] 📊 Performance Summary');
    console.log('='.repeat(50));

    this.metrics.forEach((metric) => {
      const status = metric.status === 'complete' ? '✅' : '❌';
      const duration = metric.duration ? `${metric.duration.toFixed(0)}ms` : '---';
      console.log(`${status} ${metric.phase.padEnd(20)} ${duration}`);
    });

    console.log('='.repeat(50));
    console.log(`⏱️  Total startup time: ${this.getTotalTime().toFixed(0)}ms\n`);
  }
}

// Global singleton instance
let monitor: PriorityPerformanceMonitor | null = null;

/**
 * Get or create the performance monitor
 */
export const getPriorityMonitor = (): PriorityPerformanceMonitor => {
  if (!monitor) {
    monitor = new PriorityPerformanceMonitor();
  }
  return monitor;
};

/**
 * Reset the monitor (useful for testing or multi-session tracking)
 */
export const resetPriorityMonitor = (): void => {
  monitor = null;
};

/**
 * Hook to integrate performance tracking into priority initialization
 */
export const usePriorityPerformanceTracking = (phase: string) => {
  React.useEffect(() => {
    const monitorInstance = getPriorityMonitor();
    monitorInstance.startPhase(phase);

    return () => {
      monitorInstance.completePhase(phase);
    };
  }, [phase]);
};

import React from 'react';
