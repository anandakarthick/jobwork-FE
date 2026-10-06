import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';
import { SparklesIcon } from '../components/icons';

/**
 * In-app user manual: one section per menu plus the Get Quote chat walkthrough.
 * Plain content, a sticky table of contents, and anchors so a section can be
 * linked directly (e.g. /guide#get-quote).
 */

type Section = { id: string; title: string; body: React.ReactNode };

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-600 text-xs font-semibold text-white">
        {n}
      </span>
      <span className="text-sm leading-relaxed text-slate-700">{children}</span>
    </li>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">{children}</div>
  );
}

function Example({ children }: { children: React.ReactNode }) {
  return <code className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[12.5px] text-slate-800">{children}</code>;
}

export default function UserGuide() {
  const appName = useAppSelector((s) => s.appSettings.appName) || 'Jobwork';
  const [active, setActive] = useState('overview');

  useEffect(() => {
    if (window.location.hash) {
      const id = window.location.hash.slice(1);
      document.getElementById(id)?.scrollIntoView();
      setActive(id);
    }
  }, []);

  const sections: Section[] = [
    {
      id: 'overview',
      title: 'What the application does',
      body: (
        <>
          <p>
            {appName} turns a customer&apos;s <strong>BOQ</strong> (bill of quantities / specification) into a priced
            <strong> bill of materials</strong> in the Switchgear Report-Board Excel format. You pick the customer, the
            brand(s) and the brand rules; the AI reads the brand&apos;s price lists, applies the rules and selects every
            product with its catalogue number and list price. You then continue in a chat to ask questions or change the
            quote, and download the Excel at any time.
          </p>
          <p className="mt-3">The three things the engine works from — nothing else is fixed in the software:</p>
          <ul className="mt-2 list-disc space-y-1 pl-6 text-sm text-slate-700">
            <li><strong>BOQ</strong> — what the customer needs (ratings, poles, kA, release, LSI/LSIG, single-/double-break, incoming/outgoing, quantities, panels).</li>
            <li><strong>Brand rules</strong> — how to choose (series by construction, release model by protection, mandatory accessories, wording). Kept on each brand.</li>
            <li><strong>Price lists</strong> — the only source of catalogue numbers, descriptions and prices. Trained once per brand.</li>
          </ul>
        </>
      ),
    },
    {
      id: 'dashboard',
      title: 'Dashboard',
      body: (
        <>
          <p>The landing page: counts of customers, brands and quotes, your role, and the most recent quotes with their status. <strong>New quote</strong> jumps straight to Get Quote. Click a recent quote to open its chat.</p>
        </>
      ),
    },
    {
      id: 'customers',
      title: 'Customers',
      body: (
        <>
          <p>Who the quote is for. Each customer has a name, status (Active / Inactive), contact details and address.</p>
          <ol className="mt-3 space-y-2">
            <Step n={1}>Customers → <strong>Add customer</strong>, fill the name (required) and details, Save.</Step>
            <Step n={2}>Only <strong>Active</strong> customers are offered on Get Quote; set Inactive to hide one without deleting it.</Step>
            <Step n={3}>Open a customer to see their quotes; Edit to change details; Delete removes the customer and their quotes (asks for confirmation).</Step>
          </ol>
        </>
      ),
    },
    {
      id: 'brands',
      title: 'Brands — rules and reference files',
      body: (
        <>
          <p>A brand (e.g. LK) holds everything the AI knows about that manufacturer: its <strong>Rules</strong> and its <strong>Reference files</strong> (price lists). Only Active brands can be quoted.</p>
          <h4 className="mt-4 text-sm font-semibold text-slate-900">Rules</h4>
          <ol className="mt-2 space-y-2">
            <Step n={1}>Brands → open the brand → Edit → <strong>Add rule</strong>. Give it a name (e.g. &quot;Mandatory accessories&quot;) and write the rule in plain language. Unlimited length; one topic per rule keeps them easy to tick on and off.</Step>
            <Step n={2}>Tick <strong>Common</strong> for rules that should be pre-selected on every quote for this brand. Un-ticked rules stay available but start unselected.</Step>
            <Step n={3}>Save. With the Claude engine each saved rule shows <em>not trained</em> until you click <strong>Train</strong> (↻) — a confirm appears, then the rule is stored in Claude and shows <strong>trained</strong> (green) with its id on hover. <strong>Train all</strong> does every rule.</Step>
            <Step n={4}>Edit a rule → it shows <em>edited — save, then Train again</em>. Until you train it again, the quote still receives the saved text, so nothing is lost. Removing a rule removes its copy from Claude.</Step>
          </ol>
          <Tip>Write rules as the engineer would brief a colleague: what to identify in the BOQ, which series/release to pick for which case, what to do when the BOQ is silent, which accessories are mandatory, and the exact status wording for items not found.</Tip>
          <h4 className="mt-4 text-sm font-semibold text-slate-900">Reference files (price lists)</h4>
          <ol className="mt-2 space-y-2">
            <Step n={1}>Edit → <strong>Add file</strong> → choose the PDF (any size; Word, Excel, images also accepted). Give each file a name, keep <strong>Train</strong> ticked, Save.</Step>
            <Step n={2}>Click <strong>Train</strong> (↻) on the file. The text of every page is extracted; picture-only pages and images are read by local OCR (no cost); the complete text is stored in Claude and a <strong>catalogue index</strong> is built (one line per product, grouped by the price list&apos;s sections). The row shows <em>training…</em> then <strong>trained · N chars · N pages · N sections</strong>.</Step>
            <Step n={3}>A big catalogue (150+ pages) takes 20–40 minutes the first time (OCR); re-training the same file later takes seconds. Replace a price list with a new revision → Train again.</Step>
            <Step n={4}>Removing a file (or un-ticking Train) removes it from Claude.</Step>
          </ol>
        </>
      ),
    },
    {
      id: 'get-quote',
      title: 'Get Quote — creating a quote',
      body: (
        <>
          <p>Get Quote looks like a chat. The left side lists your previous chats (search, rename, delete); the right side is the conversation. A new quote starts from the composer at the bottom.</p>
          <ol className="mt-3 space-y-2">
            <Step n={1}><strong>Customer</strong> — pick the customer the quote is for.</Step>
            <Step n={2}><strong>Brand</strong> — pick one or more brands. Their price lists and rules become available.</Step>
            <Step n={3}><strong>Rules</strong> — the brand&apos;s rules appear with the <em>Common</em> ones already ticked. Tick or untick any rule for this quote; each rule shows its brand name when several brands are selected.</Step>
            <Step n={4}><strong>Attach the BOQ</strong> (📎) — Excel, PDF, Word, image or text; several files are fine.</Step>
            <Step n={5}><strong>Optional message</strong> — anything extra the engineer wants applied, e.g. <Example>Quote only the MCCB feeders, skip the busbar.</Example> or <Example>Customer prefers 36kA where the BOQ says 25kA.</Example></Step>
            <Step n={6}>Press <strong>Send</strong>. The progress card shows the real stage (choosing catalogue sections → Claude reading → verifying codes and prices → saving). A typical quote takes 3–6 minutes.</Step>
            <Step n={7}>The reply summarises how many lines were priced and what needs review, and the <strong>file card</strong> appears: click <strong>Download</strong> for the Excel (one file per chat, named <Example>Customer-BOQ-date-Qnn.xlsx</Example>), or <strong>Email</strong> to send it.</Step>
          </ol>
          <Tip>Every catalogue number and price in the file is checked against the brand&apos;s price list. Anything the AI could not confirm is left blank and marked <em>manual verification required</em> — it is never guessed.</Tip>
        </>
      ),
    },
    {
      id: 'chat',
      title: 'Get Quote — continuing the chat',
      body: (
        <>
          <p>After the first output, keep typing in the same chat. The customer, brand and rules stay selected (you can change them above the composer; changes apply from the next message). Two kinds of message:</p>
          <h4 className="mt-4 text-sm font-semibold text-slate-900">Questions (answered, quote unchanged)</h4>
          <ul className="mt-2 list-disc space-y-1 pl-6 text-sm text-slate-700">
            <li><Example>Why did you choose iTRP3 for the 630A incomer?</Example></li>
            <li><Example>Which rule decided the spreader link?</Example></li>
            <li><Example>What is the price difference between DN2 and DZ4 at 250A?</Example></li>
          </ul>
          <h4 className="mt-4 text-sm font-semibold text-slate-900">Changes (the quote and the Excel are updated)</h4>
          <ul className="mt-2 list-disc space-y-1 pl-6 text-sm text-slate-700">
            <li><Example>Change all outgoing MCCBs to the DN series.</Example></li>
            <li><Example>Make the 250A outgoing quantity 3.</Example></li>
            <li><Example>Give 10% discount on all MCCBs.</Example></li>
            <li><Example>Add an auxiliary contact to every MCCB.</Example></li>
            <li><Example>Remove the UN-CO modules.</Example></li>
            <li><Example>Rename the file to Ptta-rev2.</Example></li>
          </ul>
          <h4 className="mt-4 text-sm font-semibold text-slate-900">Starting over</h4>
          <ul className="mt-2 list-disc space-y-1 pl-6 text-sm text-slate-700">
            <li>Type <Example>regenerate</Example> to rebuild the whole quote from the same BOQ with the rules/brand selected now (e.g. after editing a rule).</li>
            <li>Attach a new or corrected BOQ in the chat to rebuild from that file.</li>
            <li><strong>New chat</strong> (left panel) starts a fresh quote with nothing pre-selected.</li>
          </ul>
          <Tip>Each chat keeps its own quote and its own Excel. Rename a chat by clicking its title; delete it from the list (asks for confirmation).</Tip>
        </>
      ),
    },
    {
      id: 'reading-output',
      title: 'Reading the output file',
      body: (
        <>
          <ul className="list-disc space-y-1 pl-6 text-sm text-slate-700">
            <li><strong>Board Name</strong> rows = the panels of the BOQ (with the panel quantity).</li>
            <li><strong>Feeder Name</strong> rows = each breaker of the BOQ, labelled <em>Incoming</em> / <em>Outgoing</em> as the BOQ labels it, with the feeder quantity.</li>
            <li>Under a feeder: the breaker first, then its accessories; panel-level items (meters, CTs, lamps, busbar) sit under the incoming feeder.</li>
            <li>Qty is per feeder; <strong>Total Qty</strong> = Qty × Feeder Qty; <strong>Unit Rate</strong> = Catalog price × (1 − Discount%); <strong>Price</strong> = Unit Rate × Total Qty; the board row totals its items.</li>
            <li>A line with an empty Model No was not found or not confirmed in the price list — check it manually; its note says why.</li>
          </ul>
        </>
      ),
    },
    {
      id: 'roles-users',
      title: 'Roles and Users',
      body: (
        <>
          <p><strong>Roles</strong> define what a user may do: view/create/edit for customers, brands, quotes, users, roles, settings and API keys. <strong>Users</strong> get a role; a new user can be emailed their login (needs SMTP). Deactivate a user to block sign-in without deleting.</p>
        </>
      ),
    },
    {
      id: 'settings',
      title: 'Settings',
      body: (
        <>
          <ul className="list-disc space-y-2 pl-6 text-sm text-slate-700">
            <li><strong>Profile</strong> — your name and phone; <strong>Change password</strong> is under your avatar (top right).</li>
            <li><strong>General</strong> — application name, logo, accent colour, date format.</li>
            <li><strong>Email (SMTP)</strong> — outgoing mail server for sending quotes and user credentials; send a test mail to check.</li>
            <li><strong>Email Template</strong> — the letterhead used around emailed quotes.</li>
            <li>
              <strong>API Keys</strong> — the AI provider and how quotes are produced:
              <ul className="mt-1 list-[circle] space-y-1 pl-5">
                <li><em>Provider</em> Claude (recommended) or OpenAI, with the model (dropdown) and API key.</li>
                <li><em>Quote engine</em>: <strong>Claude knowledge</strong> = brand files and rules live in Claude by id (recommended); <strong>Parsed price list</strong> = the older database method.</li>
                <li><em>Fast model</em> — the cheap model used for small jobs (choosing catalogue sections, simple chat questions).</li>
                <li><em>Workspace ID</em> — needed to train files when the Anthropic key is an organisation-wide key (console.anthropic.com → Settings → Workspaces, starts with <Example>wrkspc_</Example>).</li>
                <li><em>Credit balance</em> — entered by you; the header shows balance − estimated spend.</li>
              </ul>
            </li>
          </ul>
        </>
      ),
    },
    {
      id: 'cost',
      title: 'What a quote costs and how to keep it low',
      body: (
        <>
          <ul className="list-disc space-y-1 pl-6 text-sm text-slate-700">
            <li>Training (OCR, index) is a one-time cost per price list; quotes only pay for the catalogue sections they attach and the answer written.</li>
            <li>Quotes made within an hour of each other re-use the cached price-list reading at a fraction of the price.</li>
            <li>Keep rules short and numbered; ask for short notes per line — the answer length is the main remaining cost.</li>
            <li>The header chip shows estimated spend since the balance was last set.</li>
          </ul>
        </>
      ),
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting',
      body: (
        <>
          <ul className="list-disc space-y-2 pl-6 text-sm text-slate-700">
            <li><strong>&quot;The AI account has run out of credit&quot;</strong> — add credit at console.anthropic.com → Plans &amp; Billing, then try again (training and quotes both need it).</li>
            <li><strong>&quot;Anthropic needs the Workspace ID&quot;</strong> — Settings → API Keys → Claude → Workspace ID.</li>
            <li><strong>&quot;No files are trained into Claude for &lt;brand&gt;&quot;</strong> — open the brand, tick Train on its price lists, Save, click Train ↻.</li>
            <li><strong>training failed</strong> on a file or rule — hover the badge for the reason, fix it, click Train again.</li>
            <li><strong>A product shows blank Model No</strong> — it was not found or not confirmed in the price list: check the note, the rule covering it, and whether the price list contains it; then <Example>regenerate</Example>.</li>
            <li><strong>Wrong series or release chosen</strong> — almost always a rule gap or ambiguity (e.g. what to do when the BOQ does not state the construction). Tighten the rule, Save, Train again, <Example>regenerate</Example>.</li>
            <li><strong>Quote taking long</strong> — the progress card shows the live stage; a first quote reads the price lists in full (3–6 min).</li>
          </ul>
        </>
      ),
    },
  ];

  return (
    <div>
      <section className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-600 to-violet-600 px-6 py-7 text-white shadow-pop sm:px-8">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-white/70">User guide</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-white">How to use {appName}</h1>
            <p className="mt-1 text-sm text-white/80">Every menu, and how to get a correct quote out of the chat.</p>
          </div>
          <Link to="/jobwork" className="btn inline-flex bg-white text-brand-700 shadow-pop hover:bg-brand-50 focus-visible:ring-white/50">
            <SparklesIcon className="h-4 w-4" />
            Open Get Quote
          </Link>
        </div>
      </section>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <aside className="card w-full shrink-0 p-2 lg:sticky lg:top-20 lg:w-64">
          <p className="hidden px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 lg:block">Contents</p>
          <nav className="flex gap-1 overflow-x-auto lg:flex-col" aria-label="Guide sections">
            {sections.map((s, i) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                onClick={() => setActive(s.id)}
                className={`whitespace-nowrap rounded-xl px-3 py-2 text-sm transition-colors lg:whitespace-normal ${
                  active === s.id ? 'bg-brand-50 font-medium text-brand-700' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="mr-2 text-xs text-slate-400">{i + 1}.</span>
                {s.title}
              </a>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 flex-1 space-y-5">
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} className="card scroll-mt-24 p-6">
              <h2 className="mb-3 flex items-center gap-3 text-lg font-semibold text-slate-900">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 text-sm font-semibold text-white shadow-glow">
                  {i + 1}
                </span>
                {s.title}
              </h2>
              <div className="text-sm leading-relaxed text-slate-700">{s.body}</div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
