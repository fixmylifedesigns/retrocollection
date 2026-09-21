export default function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-1 px-5 py-8 text-center text-xs text-muted sm:flex-row sm:justify-between sm:px-8 sm:text-left">
        <span>© {new Date().getFullYear()} fixmylife</span>
        <span>Osaka, unofficially</span>
      </div>
    </footer>
  );
}
