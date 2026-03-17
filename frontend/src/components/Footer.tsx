export default function Footer() {
  return (
    <footer className="border-t border-primary/10 mt-12 py-8 bg-background-light dark:bg-background-dark">
      <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-center items-center gap-4 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-base">matter</span>
          <span className="font-bold text-slate-900 dark:text-slate-100">
            Deep MedChem
          </span>
        </div>
        <span className="hidden sm:inline text-slate-400">|</span>
        <p>
          Made by Olga Korpacheva
        </p>
      </div>
    </footer>
  );
}
