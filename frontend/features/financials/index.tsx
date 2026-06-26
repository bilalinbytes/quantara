import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui";

interface MetricItem { label: string; value: string; status: string; }

export function MetricsGrid({ metrics }: { metrics: MetricItem[] }) {
  return (
    <Card className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
      <CardHeader>
        <h3 className="text-lg font-semibold text-white">Key Metrics</h3>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {metrics.map((m, i) => (
            <div key={i} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-colors">
              <div className="text-xs text-slate-500 mb-1">{m.label}</div>
              <div className={`text-lg font-semibold ${m.status === 'favorable' ? 'text-green-400' : m.status === 'unfavorable' ? 'text-red-400' : 'text-slate-200'}`}>
                {m.value}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function FinancialSnapshot({ snapshot }: { snapshot: MetricItem[] }) {
  return (
    <Card className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
      <CardHeader>
        <h3 className="text-lg font-semibold text-white">Financial Snapshot (TTM)</h3>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {snapshot.map((s, i) => (
            <div key={i} className="flex justify-between items-center py-2 border-b border-white/[0.05] last:border-0">
              <span className="text-sm text-slate-400">{s.label}</span>
              <span className="text-sm font-medium text-slate-200">{s.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
