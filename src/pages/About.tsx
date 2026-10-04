import { Link } from 'react-router-dom';
import { AS_OF, asOfLong, manifest, provenance } from '@/lib/data';

const REPO = `https://github.com/${manifest.github_account}/${manifest.slug}`;

/** `/about` — the disclaimer in full, what the app is and is not, who built it, the as-of date, the repo. */
export default function About() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 bx-prose text-ink dark:text-night-ink">
      <h1 className="text-3xl sm:text-4xl text-ink dark:text-night-ink">About FAR Out</h1>
      <p className="mt-2 flex flex-wrap items-center gap-2"><span className="bx-asof" data-testid="about-asof">Current as of {AS_OF}</span></p>

      <section className="bx-card p-4 mt-4 border-l-4 border-l-amber-500" aria-labelledby="disc-h" data-testid="disclaimer-full">
        <h2 id="disc-h" className="text-xl text-ink dark:text-night-ink">Disclaimer</h2>
        <p className="mt-1 font-semibold">{manifest.disclaimer}</p>
        <p className="mt-2">{manifest.venue}</p>
      </section>

      <h2 className="text-2xl mt-8 text-ink dark:text-night-ink">What it is</h2>
      <p className="mt-2">{manifest.plain_abstract}</p>
      <p className="mt-2">It is written for {manifest.audience}. The question behind it: {manifest.question}</p>

      <h2 className="text-2xl mt-8 text-ink dark:text-night-ink">What it is not</h2>
      <ul className="list-disc pl-5 mt-2 grid gap-1">
        <li>Not peer reviewed, not official, and not legal, financial or compliance advice. No agency or firm has reviewed or endorsed it.</li>
        <li>Not tailored to any firm. The pathfinder counts matches between the answers given and the tags on each route; it does not recommend.</li>
        <li>Not current beyond its date. The sweep closed on {asOfLong()}; every record shows its own as-of date and links to its governing text.</li>
        <li>Not a copy of anyone's figures: all {provenance.figures.total} figures are the builder's own — {provenance.figures.by_synthesis.data ?? 0} synthesised from data across cited sources and {provenance.figures.by_synthesis.conceptual ?? 0} conceptual diagrams. No published figure image is reproduced.</li>
      </ul>

      <h2 className="text-2xl mt-8 text-ink dark:text-night-ink">Who built it</h2>
      <p className="mt-2">
        The guide and its records were written by an AI research builder, the {manifest.builder.name} (version {manifest.builder.version}, {manifest.builder.date}), from {provenance.references.total.toLocaleString()} public
        sources; {provenance.references.rechecked.toLocaleString()} of the cited sources were read again against the live page before publication. The app was built from that content by Claude Code.
        Listed author: {manifest.authors.join(', ')}.
      </p>
      <p className="mt-2"><span className="font-semibold">Text and figures: </span>{manifest.permissions.text}. {manifest.permissions.figures}.</p>

      <h2 className="text-2xl mt-8 text-ink dark:text-night-ink">What leaves the browser</h2>
      <p className="mt-2">Two things, stated where they happen: <Link className="underline" to="/find">/find</Link> loads this site's own daily copy of the public SAM.gov and Grants.gov feeds, and <Link className="underline" to="/partners">/partners</Link> sends a NAICS code and the chosen filters to the USAspending API. Nothing else is sent anywhere — no analytics, no accounts. Pathfinder answers, notes and saved searches stay in this browser.</p>

      <h2 className="text-2xl mt-8 text-ink dark:text-night-ink">Reporting an error</h2>
      <p className="mt-2">Every record links to its governing text and its sources; where a record and its source disagree, the source governs. Errors can be reported as an issue on the repository: <a className="underline" href={`${REPO}/issues`} target="_blank" rel="noreferrer">{REPO}/issues</a>. The source and the content pack are at <a className="underline" href={REPO} target="_blank" rel="noreferrer">{REPO}</a>. How it was built and what it does not cover is on <Link className="underline" to="/methods">Methods</Link>.</p>
    </div>
  );
}
