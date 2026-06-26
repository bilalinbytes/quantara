import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useCompanyHistory } from "../../hooks/useCompanyData";

export function InteractivePriceChart({ ticker }: { ticker: string }) {
  const [timeframe, setTimeframe] = useState('1Y');
  const timeframes = ['1D', '1W', '1M', '3M', '6M', '1Y', '5Y'];
  
  const { data: historyData, isLoading } = useCompanyHistory(ticker, timeframe);

  return (
    <Card className="animate-in fade-in slide-in-from-bottom-8 duration-700">
      <CardHeader className="flex flex-row justify-between items-center pb-2 border-b-0">
        <CardTitle>Interactive Chart</CardTitle>
        <div className="flex gap-1 bg-white/[0.02] p-1 rounded-lg border border-white/[0.05]">
          {timeframes.map(tf => (
            <button 
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${timeframe === tf ? 'bg-blue-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
            >
              {tf}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[350px] w-full">
          {isLoading ? (
             <div className="w-full h-full flex items-center justify-center text-slate-500">Loading chart data...</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height="80%">
                <LineChart data={historyData?.data || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} minTickGap={30} />
                  <YAxis domain={['auto', 'auto']} stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} width={50} orientation="right" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0d1424', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Line type="monotone" dataKey="price" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
              <ResponsiveContainer width="100%" height="20%">
                 <BarChart data={historyData?.data || []}>
                    <Bar dataKey="volume" fill="#3b82f6" opacity={0.2} />
                 </BarChart>
              </ResponsiveContainer>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
