import { Card, CardHeader, CardTitle, CardContent, Badge } from "../../components/ui";
import { Building2, Globe, Users, MapPin } from "lucide-react";

export function HeroSection({ data }: { data: any }) {
  if (!data || !data.ticker) return null;

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 rounded-xl bg-white/[0.05] flex items-center justify-center border border-white/[0.1] text-xl font-bold text-white shadow-inner">
            {data.ticker.substring(0, 1)}
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">{data.name}</h1>
            <div className="flex items-center gap-2 text-sm text-slate-400 mt-1">
              <span>{data.exchange} : {data.ticker}</span>
              <span>•</span>
              <span>{data.sector}</span>
              <span>•</span>
              <span>{data.industry}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col items-end">
        <div className="flex items-end gap-3 mb-1">
          {data.isFallback && (
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 mr-2 self-center animate-pulse">
              FALLBACK MOCK DATA
            </span>
          )}
          <span className="text-4xl md:text-5xl font-bold text-white">${data.livePrice.toFixed(2)}</span>
          <span className={`text-xl font-medium mb-1 ${data.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {data.changePercent >= 0 ? '+' : ''}{data.changePercent}%
          </span>
        </div>
        <div className="text-sm text-slate-400">Market Cap: {data.marketCap} • Vol: {data.volume}</div>
      </div>
    </div>
  );
}

export function CompanyOverview({ data }: { data: any }) {
  if (!data) return null;

  return (
    <Card className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
       <CardHeader>
         <CardTitle className="flex items-center gap-2 text-base"><Building2 className="w-4 h-4 text-slate-400" /> Company Profile</CardTitle>
       </CardHeader>
       <CardContent className="space-y-6">
         <p className="text-slate-300 text-sm leading-relaxed">
           {data.description}
         </p>
         <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-4 border-t border-white/[0.05]">
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400"><Users size={18} /></div>
             <div>
               <div className="text-xs text-slate-500">CEO</div>
               <div className="text-sm font-medium text-slate-200">{data.ceo}</div>
             </div>
           </div>
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400"><Users size={18} /></div>
             <div>
               <div className="text-xs text-slate-500">Employees</div>
               <div className="text-sm font-medium text-slate-200">{data.employees}</div>
             </div>
           </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400"><MapPin size={18} /></div>
              <div>
                <div className="text-xs text-slate-500">Headquarters</div>
                <div className="text-sm font-medium text-slate-200">{data.country || 'USA'}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-400"><Globe size={18} /></div>
              <div>
                <div className="text-xs text-slate-500">Website</div>
                <div className="text-sm font-medium text-slate-200">{data.website || 'N/A'}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
  );
}

export function QuickFacts({ data }: { data: Record<string, string> }) {
  if (!data) return null;

  // Display-friendly label map
  const labelMap: Record<string, string> = {
    status:    'Market Status',
    exchange:  'Exchange',
    sector:    'Sector',
    industry:  'Industry',
    employees: 'Employees',
    ceo:       'CEO',
    country:   'Country',
    founded:   'Founded',
    currency:  'Currency',
    website:   'Website',
  };

  return (
    <Card className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
      <CardContent className="p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Quick Facts</h3>
        <div className="space-y-3">
          {Object.entries(data).map(([k, v]) => (
            <div key={k} className="flex justify-between items-center text-sm gap-2">
              <span className="text-slate-500 shrink-0">{labelMap[k] || k.replace(/([A-Z])/g, ' $1').trim()}</span>
              <span className="font-medium text-slate-200 text-right truncate max-w-[180px]" title={String(v)}>
                {k === 'website' && v && v !== 'N/A'
                  ? <a href={v.startsWith('http') ? v : `https://${v}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{v}</a>
                  : String(v) || 'N/A'
                }
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
