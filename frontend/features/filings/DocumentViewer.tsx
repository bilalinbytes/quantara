import { Card } from "../../components/ui";
import ReactMarkdown from 'react-markdown';

export function DocumentViewer({ parsedFiling }: any) {
  if (!parsedFiling) {
    return (
      <div className="w-full h-full flex items-center justify-center text-slate-500">
        Select a filing to view its contents.
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-[#0d1424]/50 rounded-xl border border-white/[0.05] overflow-hidden">
      {/* Sticky TOC */}
      <div className="w-full bg-[#1e293b]/80 backdrop-blur-md border-b border-white/[0.05] p-4 sticky top-0 z-10 flex gap-4 overflow-x-auto hide-scrollbar">
         {parsedFiling.sections.map((sec: any) => (
           <button key={sec.id} className="text-xs font-medium text-slate-400 hover:text-blue-400 whitespace-nowrap transition-colors">
             {sec.title}
           </button>
         ))}
      </div>
      
      {/* Document Content */}
      <div className="flex-1 overflow-y-auto p-8 hide-scrollbar scroll-smooth">
         <div className="max-w-3xl mx-auto space-y-12">
            <h1 className="text-3xl font-bold text-white mb-8 border-b border-white/[0.1] pb-4">{parsedFiling.type} - {parsedFiling.ticker}</h1>
            
            {parsedFiling.sections.map((sec: any) => (
              <section key={sec.id} id={sec.id} className="scroll-mt-24">
                <h2 className="text-xl font-semibold text-blue-400 mb-4">{sec.title}</h2>
                <div className="prose prose-invert max-w-none text-slate-300">
                  <ReactMarkdown>{sec.content}</ReactMarkdown>
                </div>
              </section>
            ))}
         </div>
      </div>
    </div>
  );
}
