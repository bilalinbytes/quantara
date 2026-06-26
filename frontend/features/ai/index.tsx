import { Card, CardHeader, CardTitle, CardContent, Badge } from "../../components/ui";
import { Sparkles, CheckCircle2, AlertTriangle, TrendingUp } from "lucide-react";

interface AISummary {
  overview: string;
  strengths: string[];
  risks: string[];
  drivers: string[];
}

export function AISnapshotCard({ data }: { data: AISummary | undefined }) {
  if (!data) return null;
  return (
    <Card className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[80px] rounded-full pointer-events-none"></div>
      
      <CardHeader className="flex flex-row justify-between items-center pb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-400" />
          <CardTitle>AI Analysis Snapshot</CardTitle>
        </div>
        <Badge variant="brand" className="animate-pulse shadow-[0_0_15px_rgba(59,130,246,0.3)]">AI Generated</Badge>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div>
          <p className="text-slate-300 text-sm leading-relaxed">{data.overview}</p>
        </div>
        
        <div className="grid grid-cols-1 gap-4">
          <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/10">
             <h4 className="flex items-center gap-2 text-sm font-semibold text-green-400 mb-2">
               <CheckCircle2 size={16} /> Business Strengths
             </h4>
             <ul className="space-y-1">
               {data.strengths.map((s, i) => <li key={i} className="text-xs text-slate-300">• {s}</li>)}
             </ul>
          </div>

          <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
             <h4 className="flex items-center gap-2 text-sm font-semibold text-blue-400 mb-2">
               <TrendingUp size={16} /> Growth Drivers
             </h4>
             <ul className="space-y-1">
               {data.drivers.map((s, i) => <li key={i} className="text-xs text-slate-300">• {s}</li>)}
             </ul>
          </div>
          
          <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10">
             <h4 className="flex items-center gap-2 text-sm font-semibold text-red-400 mb-2">
               <AlertTriangle size={16} /> Key Risks
             </h4>
             <ul className="space-y-1">
               {data.risks.map((s, i) => <li key={i} className="text-xs text-slate-300">• {s}</li>)}
             </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
