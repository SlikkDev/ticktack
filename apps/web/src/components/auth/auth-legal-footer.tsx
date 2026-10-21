export function AuthLegalFooter() {
  return (
    <footer className="flex flex-wrap justify-center gap-3 px-6 pb-8 text-muted-foreground text-xs">
      <a
        href="https://github.com/SlikkDev/ticktack"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-foreground"
      >
        TickTack · טיקטק
      </a>
      <span aria-hidden="true">·</span>
      <a
        href="https://github.com/usekaneo/kaneo"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-foreground"
      >
        Kaneo (MIT)
      </a>
    </footer>
  );
}
