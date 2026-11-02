import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ShieldAlert } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About Us & Founder Story | Moremela Property Hub',
  description: 'The story and vision behind Moremela Property Hub.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      {/* Top Header Bar */}
      <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
          <Link href="/" className="flex items-center gap-2 sm:gap-3 group shrink min-w-0">
            <img
              src="/moremela-logo.svg"
              alt="Moremela Properties Emblem"
              className="w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-lg object-contain shrink-0 shadow-xs"
            />
            <span className="font-bold tracking-tight text-white text-xs sm:text-base group-hover:text-emerald-400 transition-colors truncate">
              Moremela Property Hub
            </span>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg hover:bg-slate-800 border border-slate-700 transition-colors shrink-0 whitespace-nowrap"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-emerald-400" strokeWidth={1.75} />
            <span>Back to Workspace</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
        {/* Subtle Stealth / No-Index Notice Pill */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3.5 py-1.5 rounded-md shadow-2xs">
            <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-amber-600" strokeWidth={1.75} />
            <span>
              Private GTM Draft — This page (/about) is currently hidden from public navigation and search engines.
            </span>
          </div>
        </div>

        {/* Reading Card */}
        <article className="bg-white border border-slate-200 rounded-xl p-8 sm:p-12 max-w-3xl mx-auto shadow-2xs space-y-8">
          {/* Emblem Header inside Card */}
          <div className="flex items-center gap-3.5 pb-6 border-b border-slate-100">
            <img
              src="/moremela-logo.svg"
              alt="Moremela Emblem (Kraal & Baobab)"
              className="w-12 h-12 rounded-lg object-contain shrink-0 shadow-xs"
            />
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-900 block">
                Moremela Properties (Pty) Ltd
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                Reg. No: 2026/838397/07 • Founder Story &amp; Vision
              </span>
            </div>
          </div>

          {/* Founder Story Container */}
          <div data-testid="about-founder-story" className="space-y-6 text-slate-700 leading-relaxed text-sm sm:text-base">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-snug">
              Build Your Family. Build South Africa. One Property at a Time.
            </h1>

            <p className="text-slate-800 font-medium">
              Nobody buys a property because they are in love with spreadsheets or tax brackets. You buy your first
              rental flat, build backyard units, or flip a run-down house in the suburbs because life is moving. Maybe
              your family is growing and you need extra income that doesn&apos;t depend on a boss. Maybe you want one rental
              property paying for each of your children’s university fees. Or maybe you want to make sure that when you
              retire, you leave your kids a tangible foundation—not debt.
            </p>

            <div className="space-y-2.5 pt-2">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">How This Started</h2>
              <p>
                I didn’t start building Moremela Properties as a tech company. I started building it for a friend who
                was trying to grow a property portfolio on his own. When we looked at the tools available in South
                Africa, we saw a massive gap. On one side were the banks and big corporate software platforms—built for
                institutional funds with teams of accountants, full of cold numbers that treat you like a credit score.
                On the other side were fragile Excel sheets and back-of-the-napkin calculations that leave solo
                investors blind to the real traps of our local market: Deeds Office delays, surprise municipal arrears,
                contractor draw leaks, and SARS tax rules.
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Why We Are Called &lsquo;Moremela&rsquo;
              </h2>
              <p>
                In Setswana, Sesotho, and Sepedi, <em>Moremela</em> (from <em>go remela</em>) means{' '}
                <strong>&lsquo;the one who clears the way&rsquo;</strong>—the person who goes ahead with an axe to clear
                the thorns and bush so the family can build the homestead (<em>lesaka</em> / <em>kraal</em>). That
                name—and our emblem of the Baobab tree rising out of a stepped Kraal—is personal to me. My grandmother,{' '}
                <strong>Sally Motlana</strong>, was awarded the National <strong>Order of the Baobab</strong> for
                spending her life fighting for the dignity and upliftment of our people. Her generation fought for our
                right to stand on this soil. Our generation’s job is to turn that soil into lasting family security and
                national wealth.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Our Vision</h2>
              <ul className="space-y-3 pl-1">
                <li className="flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-2 shrink-0" />
                  <div>
                    <strong className="text-slate-900">The Stepped Kraal at the base is protection:</strong>{' '}
                    <span>
                      It is the guardrail that protects your hard-earned cash from hidden municipal debt, bad deals, and
                      runaway renovation budgets.
                    </span>
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-2 shrink-0" />
                  <div>
                    <strong className="text-slate-900">
                      The Baobab rising from the center is why you do the work:
                    </strong>{' '}
                    <span>
                      Deep roots, shelter for your family, and wealth that outlives you. Whether you are adding a
                      cottage to your family home, building multi-lets brick by brick, sourcing deals for partners, or
                      flipping suburban houses—Moremela is here to clear the complicated math and admin out of your way,
                      so you can focus on what actually matters: building a legacy for your family, and rebuilding our
                      country from the ground up.
                    </span>
                  </div>
                </li>
              </ul>
            </div>

            <div className="pt-6 border-t border-slate-100 flex justify-start">
              <Link
                href="/"
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-xs transition-colors"
              >
                <span>Open Portfolio Workspace ➔</span>
              </Link>
            </div>
          </div>
        </article>
      </main>

      {/* Discreet Footer */}
      <footer className="py-6 text-center text-xs text-slate-400">
        <span>Moremela Properties (Pty) Ltd • Private GTM Draft</span>
      </footer>
    </div>
  );
}
