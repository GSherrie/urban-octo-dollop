import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "SherPay — Income, Expenses & Reports",
  description: "Track income and expenses, see your balance, and export simple reports. GHS first, with Cash, Bank and mobile money.",
};
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0B1220" },
    { media: "(prefers-color-scheme: light)", color: "#06244B" },
  ],
};

/* Paint the saved palette before the first frame so a dark-mode launch never
   flashes white. The preference is shared with the vanilla SherPay app: it is
   stored in db.settings.preferences.theme and mirrored to this key by
   UI.applyTheme() ("light" | "dark" | "system", default "system"). */
const THEME_BOOT = `(function(){try{var k='sherpay_theme',el=document.documentElement,m=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)');function paint(){var t=(function(){try{return localStorage.getItem(k)||'system'}catch(e){return 'system'}})();var d=t==='dark'||(t!=='light'&&!!(m&&m.matches));if(d)el.setAttribute('data-theme','dark');else el.removeAttribute('data-theme')}paint();if(m&&m.addEventListener)m.addEventListener('change',paint);}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}

