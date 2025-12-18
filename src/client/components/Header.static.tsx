export function Header() {
  return (
    <header className="bg-slate-800 border-b border-slate-700 px-4 py-3">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-r from-purple-500 to-blue-500 p-2 rounded-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">AsyncAPI Generator</h1>
            <p className="text-sm text-slate-400">Generate AsyncAPI definitions from JSON data</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400">
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            Client-Side Only
          </span>
        </div>
      </div>
    </header>
  );
}
