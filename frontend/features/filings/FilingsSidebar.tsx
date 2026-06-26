import { Card, CardContent } from "../../components/ui";
import { FileText, Download, ExternalLink } from 'lucide-react';

export function FilingsSidebar({ filings, onSelectFiling, selectedFilingId }: any) {
  return (
    <div className="w-full h-full flex flex-col gap-4 border-r border-white/[0.05] pr-6">
      <h3 className="text-lg font-bold text-white mb-2">Latest Filings</h3>
      <div className="flex flex-col gap-3 overflow-y-auto hide-scrollbar">
        {filings?.map((filing: any) => (
          <Card 
            key={filing.id} 
            className={`cursor-pointer transition-all ${selectedFilingId === filing.id ? 'bg-blue-500/10 border-blue-500/30' : 'hover:bg-white/[0.05] border-white/[0.05]'}`}
            onClick={() => onSelectFiling(filing.id)}
          >
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-400" />
                  <span className="font-bold text-slate-200">{filing.type}</span>
                </div>
                <span className="text-xs text-slate-500">{filing.date}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-400 mt-4">
                <span>{filing.size}</span>
                <div className="flex gap-2">
                  <button className="hover:text-blue-400"><Download size={14}/></button>
                  <button className="hover:text-blue-400"><ExternalLink size={14}/></button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
