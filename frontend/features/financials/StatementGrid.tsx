import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface RowData {
  label: string;
  values: string[];
  isHeader?: boolean;
  indent?: boolean;
  expandable?: boolean;
  expanded?: boolean;
  children?: RowData[];
}

export function StatementGrid({ headers, rows }: { headers: string[], rows: RowData[] }) {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const toggleRow = (label: string) => {
    setExpandedRows(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const renderRow = (row: RowData) => {
    const isExpanded = expandedRows[row.label];
    
    return (
      <div key={row.label} className="w-full">
        <div 
          className={`grid grid-cols-6 gap-4 py-3 px-4 border-b border-white/[0.05] transition-colors ${row.expandable ? 'cursor-pointer hover:bg-white/[0.02]' : ''} ${row.isHeader ? 'font-semibold text-slate-200' : 'text-slate-400'}`}
          onClick={() => row.expandable && toggleRow(row.label)}
        >
          <div className="col-span-1 flex items-center gap-2">
            {row.indent && <div className="w-4"></div>}
            {row.expandable && (
               <span className="text-slate-500">
                 {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
               </span>
            )}
            <span className="text-sm">{row.label}</span>
          </div>
          {row.values.map((val, i) => (
             <div key={i} className="col-span-1 text-right text-sm">
               {val}
             </div>
          ))}
        </div>
        
        {row.expandable && isExpanded && row.children && (
          <div className="bg-white/[0.01]">
            {row.children.map(renderRow)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-white/[0.05] bg-[#0d1424]/50">
      <div className="min-w-[800px]">
        {/* Header */}
        <div className="grid grid-cols-6 gap-4 py-3 px-4 border-b border-white/[0.1] bg-[#1e293b]/50 sticky top-0 z-10">
           <div className="col-span-1 text-xs font-semibold text-slate-500 uppercase tracking-wider">Metric</div>
           {headers.map((h, i) => (
              <div key={i} className="col-span-1 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</div>
           ))}
        </div>
        
        {/* Body */}
        <div className="flex flex-col">
          {rows.map(renderRow)}
        </div>
      </div>
    </div>
  );
}
