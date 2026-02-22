type Labels = Record<string, string | number>;

type CounterMetric = {
  type: 'counter';
  name: string;
  help: string;
  values: Map<string, number>;
};

type HistogramMetric = {
  type: 'histogram';
  name: string;
  help: string;
  buckets: number[];
  bucketValues: Map<string, number[]>;
  sum: Map<string, number>;
  count: Map<string, number>;
};

class MetricsService {
  private counters = new Map<string, CounterMetric>();
  private histograms = new Map<string, HistogramMetric>();

  counter(name: string, help: string): void {
    if (!this.counters.has(name)) {
      this.counters.set(name, { type: 'counter', name, help, values: new Map() });
    }
  }

  histogram(name: string, help: string, buckets: number[]): void {
    if (!this.histograms.has(name)) {
      this.histograms.set(name, {
        type: 'histogram',
        name,
        help,
        buckets: [...buckets].sort((a, b) => a - b),
        bucketValues: new Map(),
        sum: new Map(),
        count: new Map(),
      });
    }
  }

  inc(name: string, labels: Labels = {}, value = 1): void {
    const metric = this.counters.get(name);
    if (!metric) return;
    const key = this.labelKey(labels);
    metric.values.set(key, (metric.values.get(key) || 0) + value);
  }

  observe(name: string, labels: Labels = {}, value: number): void {
    const metric = this.histograms.get(name);
    if (!metric) return;

    const key = this.labelKey(labels);
    const current = metric.bucketValues.get(key) || new Array(metric.buckets.length).fill(0);
    for (let i = 0; i < metric.buckets.length; i++) {
      if (value <= metric.buckets[i]) {
        current[i] += 1;
      }
    }
    metric.bucketValues.set(key, current);
    metric.sum.set(key, (metric.sum.get(key) || 0) + value);
    metric.count.set(key, (metric.count.get(key) || 0) + 1);
  }

  renderPrometheus(): string {
    const lines: string[] = [];

    for (const metric of this.counters.values()) {
      lines.push(`# HELP ${metric.name} ${metric.help}`);
      lines.push(`# TYPE ${metric.name} counter`);
      for (const [key, value] of metric.values.entries()) {
        lines.push(`${metric.name}${key} ${value}`);
      }
    }

    for (const metric of this.histograms.values()) {
      lines.push(`# HELP ${metric.name} ${metric.help}`);
      lines.push(`# TYPE ${metric.name} histogram`);

      for (const [key, buckets] of metric.bucketValues.entries()) {
        const labels = this.parseLabelKey(key);
        for (let i = 0; i < metric.buckets.length; i++) {
          lines.push(`${metric.name}_bucket${this.renderLabels({ ...labels, le: metric.buckets[i] })} ${buckets[i]}`);
        }
        lines.push(`${metric.name}_bucket${this.renderLabels({ ...labels, le: '+Inf' })} ${metric.count.get(key) || 0}`);
        lines.push(`${metric.name}_sum${this.renderLabels(labels)} ${metric.sum.get(key) || 0}`);
        lines.push(`${metric.name}_count${this.renderLabels(labels)} ${metric.count.get(key) || 0}`);
      }
    }

    return lines.join('\n') + '\n';
  }

  private labelKey(labels: Labels): string {
    const keys = Object.keys(labels).sort();
    if (keys.length === 0) return '';
    const rendered = keys.map((k) => `${k}="${String(labels[k]).replace(/"/g, '\\"')}"`).join(',');
    return `{${rendered}}`;
  }

  private parseLabelKey(key: string): Record<string, string> {
    if (!key) return {};
    const body = key.replace(/^{|}$/g, '');
    const out: Record<string, string> = {};
    if (!body) return out;
    body.split(',').forEach((kv) => {
      const [k, v] = kv.split('=');
      out[k] = v.replace(/^"|"$/g, '');
    });
    return out;
  }

  private renderLabels(labels: Record<string, string | number>): string {
    return this.labelKey(labels);
  }
}

export const metricsService = new MetricsService();

metricsService.counter('onedish_http_requests_total', 'HTTP request count');
metricsService.histogram('onedish_http_request_duration_ms', 'HTTP request duration in ms', [50, 100, 200, 500, 800, 1500, 3000, 6000, 10000]);
metricsService.counter('onedish_router_route_total', 'Router route selection count');
metricsService.counter('onedish_router_degrade_total', 'Router degrade count');
metricsService.counter('onedish_quota_user_used_total', 'User quota usage count');
metricsService.counter('onedish_quota_global_used_total', 'Global quota usage count');
metricsService.counter('onedish_quota_reject_total', 'Quota reject count');
metricsService.counter('onedish_cache_hit_total', 'Cache hit count');
metricsService.counter('onedish_cache_miss_total', 'Cache miss count');
metricsService.histogram('onedish_cache_latency_ms', 'Cache operation latency in ms', [1, 5, 10, 20, 50, 100, 200]);
metricsService.counter('onedish_upstream_requests_total', 'Upstream request count');
metricsService.histogram('onedish_upstream_latency_ms', 'Upstream latency in ms', [50, 100, 200, 500, 1000, 3000, 6000, 10000]);
metricsService.counter('onedish_redis_fallback_total', 'Redis fallback count');
