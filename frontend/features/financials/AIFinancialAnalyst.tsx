import { Card, CardHeader, CardTitle, CardContent, Badge } from "../../components/ui";
import { Sparkles, Activity, ShieldAlert, TrendingUp } from 'lucide-react';

export function AIFinancialAnalyst({ data }: { data: any }) {
  if (!data) return null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <Card className="relative overflow-hidden border-blue-500/20 bg-blue-500/5">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 blur-[100px] rounded-full pointer-events-none"></div>
        <CardHeader className="flex flex-row justify-between items-center border-b border-white/[0.05]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-400" />
            <CardTitle className="text-xl">Executive Summary</CardTitle>
          </div>
          <div className="flex gap-2">
            <Badge variant="brand" className="shadow-[0_0_15px_rgba(59,130,246,0.3)]">Confidence: {data.confidence}</Badge>
            <span className="text-xs text-slate-500 flex items-center">{data.generated_at}</span>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <p className="text-slate-300 leading-relaxed text-lg">{data.executive_summary}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
           <CardHeader>
             <CardTitle className="flex gap-2 items-center text-base"><Activity className="w-4 h-4 text-emerald-400"/> Revenue & Margins</CardTitle>
           </CardHeader>
           <CardContent className="space-y-4">
             <div>
               <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Revenue</h4>
               <p className="text-sm text-slate-300">{data.revenue_analysis}</p>
             </div>
             <div>
               <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Margins</h4>
               <p className="text-sm text-slate-300">{data.margin_analysis}</p>
             </div>
           </CardContent>
        </Card>

        <Card>
           <CardHeader>
             <CardTitle className="flex gap-2 items-center text-base"><TrendingUp className="w-4 h-4 text-purple-400"/> Cash Flow & Health</CardTitle>
           </CardHeader>
           <CardContent className="space-y-4">
             <div>
               <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Cash Generation</h4>
               <p className="text-sm text-slate-300">{data.cash_flow_analysis}</p>
             </div>
             <div>
               <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Overall Health</h4>
               <p className="text-sm text-slate-300">{data.overall_health}</p>
             </div>
           </CardContent>
        </Card>
        
        <Card className="md:col-span-2">
           <CardHeader>
             <CardTitle className="flex gap-2 items-center text-base"><ShieldAlert className="w-4 h-4 text-rose-400"/> Risks & Opportunities</CardTitle>
           </CardHeader>
           <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/10">
               <h4 className="text-sm font-semibold text-rose-400 mb-2">Key Risks</h4>
               <p className="text-sm text-slate-300">{data.financial_risks}</p>
             </div>
             <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
               <h4 className="text-sm font-semibold text-emerald-400 mb-2">Growth Drivers</h4>
               <p className="text-sm text-slate-300">{data.growth_opportunities}</p>
             </div>
           </CardContent>
        </Card>
      </div>
    </div>
  );
}
