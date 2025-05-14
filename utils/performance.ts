export interface PerformanceMetrics {
  operation: string;
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  metadata?: any;
}

export interface SystemMetrics {
  timestamp: string;
  memory_usage: number;
  cpu_usage?: number;
  active_connections: number;
  requests_per_minute: number;
  error_rate: number;
  average_response_time: number;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics[] = [];
  private systemMetrics: SystemMetrics[] = [];
  private operationCounts: Map<string, number> = new Map();
  private errorCounts: Map<string, number> = new Map();
  private requestsInLastMinute: number[] = [];
  private activeConnections: number = 0;

  private constructor() {
    // Clean up old metrics every hour
    setInterval(() => this.cleanup(), 60 * 60 * 1000);
    // Collect system metrics every minute
    setInterval(() => this.collectSystemMetrics(), 60 * 1000);
  }

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  public startTimer(
    operation: string,
    metadata?: any
  ): (success?: boolean) => void {
    const startTime = performance.now();

    return (success: boolean = true) => {
      const endTime = performance.now();
      const duration = endTime - startTime;

      const metric: PerformanceMetrics = {
        operation,
        startTime,
        endTime,
        duration,
        success,
        metadata,
      };

      this.recordMetric(metric);
    };
  }

  public async measureAsync<T>(
    operation: string,
    asyncFunction: () => Promise<T>,
    metadata?: any
  ): Promise<T> {
    const stopTimer = this.startTimer(operation, metadata);

    try {
      const result = await asyncFunction();
      stopTimer(true);
      return result;
    } catch (error) {
      stopTimer(false);
      this.recordError(operation, error as Error);
      throw error;
    }
  }

  public measure<T>(
    operation: string,
    syncFunction: () => T,
    metadata?: any
  ): T {
    const stopTimer = this.startTimer(operation, metadata);

    try {
      const result = syncFunction();
      stopTimer(true);
      return result;
    } catch (error) {
      stopTimer(false);
      this.recordError(operation, error as Error);
      throw error;
    }
  }

  public recordRequest(): void {
    const now = Date.now();
    this.requestsInLastMinute.push(now);

    // Remove requests older than 1 minute
    const oneMinuteAgo = now - 60000;
    this.requestsInLastMinute = this.requestsInLastMinute.filter(
      (time) => time > oneMinuteAgo
    );
  }

  public incrementActiveConnections(): void {
    this.activeConnections++;
  }

  public decrementActiveConnections(): void {
    this.activeConnections = Math.max(0, this.activeConnections - 1);
  }

  private recordMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric);

    // Update operation counts
    const currentCount = this.operationCounts.get(metric.operation) || 0;
    this.operationCounts.set(metric.operation, currentCount + 1);

    // Keep only last 10000 metrics
    if (this.metrics.length > 10000) {
      this.metrics = this.metrics.slice(-5000);
    }
  }

  private recordError(operation: string, error: Error): void {
    const currentErrorCount = this.errorCounts.get(operation) || 0;
    this.errorCounts.set(operation, currentErrorCount + 1);

    console.error(`[Performance] Error in ${operation}:`, error.message);
  }

  private collectSystemMetrics(): void {
    const now = new Date().toISOString();

    // Calculate metrics from recent data
    const recentMetrics = this.getRecentMetrics(5 * 60 * 1000); // Last 5 minutes
    const successfulMetrics = recentMetrics.filter((m) => m.success);
    const failedMetrics = recentMetrics.filter((m) => !m.success);

    const averageResponseTime =
      successfulMetrics.length > 0
        ? successfulMetrics.reduce((sum, m) => sum + m.duration, 0) /
          successfulMetrics.length
        : 0;

    const errorRate =
      recentMetrics.length > 0
        ? (failedMetrics.length / recentMetrics.length) * 100
        : 0;

    const systemMetric: SystemMetrics = {
      timestamp: now,
      memory_usage: this.getMemoryUsage(),
      active_connections: this.activeConnections,
      requests_per_minute: this.requestsInLastMinute.length,
      error_rate: errorRate,
      average_response_time: averageResponseTime,
    };

    this.systemMetrics.push(systemMetric);

    // Keep only last 24 hours of system metrics
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    this.systemMetrics = this.systemMetrics.filter(
      (m) => m.timestamp > oneDayAgo
    );
  }

  private getMemoryUsage(): number {
    try {
      // In Node.js environment, this would use process.memoryUsage()
      // For now, return a placeholder value
      return Math.random() * 100; // Mock memory usage percentage
    } catch {
      return 0;
    }
  }

  private getRecentMetrics(timeRangeMs: number): PerformanceMetrics[] {
    const cutoffTime = performance.now() - timeRangeMs;
    return this.metrics.filter((m) => m.startTime > cutoffTime);
  }

  public getOperationStats(operation?: string): {
    operation: string;
    count: number;
    averageTime: number;
    successRate: number;
    errors: number;
  }[] {
    const operations = operation
      ? [operation]
      : Array.from(this.operationCounts.keys());

    return operations.map((op) => {
      const operationMetrics = this.metrics.filter((m) => m.operation === op);
      const successfulOps = operationMetrics.filter((m) => m.success);
      const errors = this.errorCounts.get(op) || 0;

      return {
        operation: op,
        count: this.operationCounts.get(op) || 0,
        averageTime:
          successfulOps.length > 0
            ? successfulOps.reduce((sum, m) => sum + m.duration, 0) /
              successfulOps.length
            : 0,
        successRate:
          operationMetrics.length > 0
            ? (successfulOps.length / operationMetrics.length) * 100
            : 0,
        errors,
      };
    });
  }

  public getSystemHealth(): {
    status: "healthy" | "warning" | "critical";
    metrics: SystemMetrics;
    issues: string[];
  } {
    const latest = this.systemMetrics[this.systemMetrics.length - 1];
    if (!latest) {
      return {
        status: "warning",
        metrics: {
          timestamp: new Date().toISOString(),
          memory_usage: 0,
          active_connections: 0,
          requests_per_minute: 0,
          error_rate: 0,
          average_response_time: 0,
        },
        issues: ["No metrics available"],
      };
    }

    const issues: string[] = [];
    let status: "healthy" | "warning" | "critical" = "healthy";

    // Check various health indicators
    if (latest.memory_usage > 90) {
      issues.push("High memory usage");
      status = "critical";
    } else if (latest.memory_usage > 75) {
      issues.push("Elevated memory usage");
      status = status === "healthy" ? "warning" : status;
    }

    if (latest.error_rate > 10) {
      issues.push("High error rate");
      status = "critical";
    } else if (latest.error_rate > 5) {
      issues.push("Elevated error rate");
      status = status === "healthy" ? "warning" : status;
    }

    if (latest.average_response_time > 5000) {
      issues.push("Slow response times");
      status = status === "healthy" ? "warning" : status;
    }

    if (latest.active_connections > 100) {
      issues.push("High connection count");
      status = status === "healthy" ? "warning" : status;
    }

    return { status, metrics: latest, issues };
  }

  public getPerformanceReport(): {
    summary: {
      totalOperations: number;
      totalErrors: number;
      overallSuccessRate: number;
      averageResponseTime: number;
    };
    topOperations: ReturnType<typeof this.getOperationStats>;
    systemHealth: ReturnType<typeof this.getSystemHealth>;
    recentTrends: SystemMetrics[];
  } {
    const totalOperations = Array.from(this.operationCounts.values()).reduce(
      (sum, count) => sum + count,
      0
    );
    const totalErrors = Array.from(this.errorCounts.values()).reduce(
      (sum, count) => sum + count,
      0
    );
    const successfulOps = this.metrics.filter((m) => m.success);

    return {
      summary: {
        totalOperations,
        totalErrors,
        overallSuccessRate:
          totalOperations > 0
            ? ((totalOperations - totalErrors) / totalOperations) * 100
            : 0,
        averageResponseTime:
          successfulOps.length > 0
            ? successfulOps.reduce((sum, m) => sum + m.duration, 0) /
              successfulOps.length
            : 0,
      },
      topOperations: this.getOperationStats()
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      systemHealth: this.getSystemHealth(),
      recentTrends: this.systemMetrics.slice(-10),
    };
  }

  private cleanup(): void {
    // Remove metrics older than 1 hour
    const oneHourAgo = performance.now() - 60 * 60 * 1000;
    this.metrics = this.metrics.filter((m) => m.startTime > oneHourAgo);

    console.log(
      `[Performance] Cleaned up old metrics. Current count: ${this.metrics.length}`
    );
  }

  public export(): {
    metrics: PerformanceMetrics[];
    systemMetrics: SystemMetrics[];
    operationCounts: Record<string, number>;
    errorCounts: Record<string, number>;
  } {
    return {
      metrics: [...this.metrics],
      systemMetrics: [...this.systemMetrics],
      operationCounts: Object.fromEntries(this.operationCounts),
      errorCounts: Object.fromEntries(this.errorCounts),
    };
  }
}
