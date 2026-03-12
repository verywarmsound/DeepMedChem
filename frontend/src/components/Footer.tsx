export default function Footer() {
  return (
    <footer className="border-t border-primary/10 mt-12 py-10 bg-white dark:bg-background-dark">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="col-span-1 md:col-span-2">
          <div className="flex items-center gap-2 mb-4 text-primary">
            <span className="material-symbols-outlined">matter</span>
            <span className="font-bold text-xl text-slate-900 dark:text-slate-100">
              Deep MedChem
            </span>
          </div>
          <p className="text-slate-500 text-sm max-w-sm">
            Deep learning solutions for drug discovery and chemical property
            prediction. Open source and built for the scientific community.
          </p>
        </div>
        <div>
          <h4 className="font-bold mb-4 text-sm uppercase tracking-widest text-primary">
            Resources
          </h4>
          <ul className="space-y-2 text-sm text-slate-500">
            <li>
              <a
                className="hover:text-primary transition-colors"
                href="#"
              >
                Documentation
              </a>
            </li>
            <li>
              <a
                className="hover:text-primary transition-colors"
                href="#"
              >
                API Reference
              </a>
            </li>
            <li>
              <a
                className="hover:text-primary transition-colors"
                href="#"
              >
                Tutorials
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold mb-4 text-sm uppercase tracking-widest text-primary">
            Company
          </h4>
          <ul className="space-y-2 text-sm text-slate-500">
            <li>
              <a
                className="hover:text-primary transition-colors"
                href="#"
              >
                About
              </a>
            </li>
            <li>
              <a
                className="hover:text-primary transition-colors"
                href="#"
              >
                GitHub
              </a>
            </li>
            <li>
              <a
                className="hover:text-primary transition-colors"
                href="#"
              >
                Support
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 pt-10 mt-10 border-t border-primary/5 flex justify-between items-center text-xs text-slate-500">
        <p>&copy; {new Date().getFullYear()} Deep MedChem. All rights reserved.</p>
        <div className="flex gap-6">
          <a className="hover:text-primary transition-colors" href="#">
            Privacy Policy
          </a>
          <a className="hover:text-primary transition-colors" href="#">
            Terms of Service
          </a>
        </div>
      </div>
    </footer>
  );
}
