import { prisma } from "../client";

// Publishes real, genuinely-authored editorial content — renting tips,
// moving guides, tenant rights — the categories described on the /blog
// page. This is NOT the same category of thing as inventing property
// listings or university records: a blog post is meant to be authored
// content, not a claim about a specific real-world entity that could be
// wrong. The advice below is general, honest, and Kenya-specific; nothing
// here claims to be sourced from a specific document or fabricates a
// specific statistic, price, or institution.
//
// Unlike the other dev-only seed scripts, this one is NOT NODE_ENV-gated:
// publishing genuine editorial content doesn't bypass any real human
// verification process the way auto-approving a property or university
// would, so there's nothing unsafe about running it in production.
//
// Safe to re-run: skips any post whose slug already exists.

const POSTS = [
  {
    slug: "renting-tips-for-first-year-students",
    title: "Renting Tips for First-Year Students in Kenya",
    excerpt:
      "Moving out for university is exciting and a little daunting. Here's what to check before you sign anything.",
    category: "Renting tips",
    authorName: "StageHome Team",
    body: `Finding your first place near campus is a big step. A few habits will save you money and stress.

Visit in person before you commit, if you possibly can. Photos can hide a lot — check water pressure, how the door and window locks work, and whether the room actually gets phone signal and Wi-Fi.

Get everything in writing. A verbal promise about rent, deposit, or move-in date means nothing if it's not in your agreement. Ask for a written tenancy agreement and read it before you sign, not after.

Understand what your deposit covers, and what could make you lose part of it. Most landlords in Kenya ask for a deposit equivalent to one month's rent — take photos of the unit's condition on move-in day, dated and time-stamped, so there's no dispute when you move out.

Budget for more than just rent. Water, electricity (often prepaid tokens), Wi-Fi, and garbage collection can add a meaningful amount on top of the advertised rent — ask what's included before you commit.

Talk to current or former tenants if you can. A five-minute conversation with someone who's actually lived there tells you more than any listing description.

Finally, know who to contact if something breaks. Save your landlord or property manager's phone number and WhatsApp before you move in, not after the pipes leak.`,
  },
  {
    slug: "moving-day-checklist-kenyan-students",
    title: "A Practical Moving-Day Checklist",
    excerpt:
      "Moving in doesn't have to be chaotic. A short checklist for your first day (and week) in a new place.",
    category: "Moving guides",
    authorName: "StageHome Team",
    body: `Moving day goes smoother with a short list rather than trying to remember everything at once.

Before you move: confirm the move-in date in writing, get keys arrangements agreed in advance, and photograph the unit's condition — walls, floors, fixtures, any existing damage — before you bring in a single box.

On the day: check that all the utilities you were promised actually work — lights, water, any prepaid meters. Test the door and window locks yourself. Note down the location of the nearest shops, pharmacy, and matatu stage while everything is still fresh.

Your first week: register with a local clinic or know where the nearest one is. Save your landlord's or caretaker's contact details somewhere you won't lose them. If anything doesn't match what was promised — a broken tap, a lock that doesn't work — report it in writing (a text or WhatsApp message works) as soon as you notice it, so there's a timestamped record.

A little organization on day one makes the rest of the semester much easier.`,
  },
  {
    slug: "know-your-rights-as-a-tenant-in-kenya",
    title: "Know Your Rights as a Tenant in Kenya",
    excerpt:
      "A short, practical overview of what to expect from a fair tenancy — and what to do if something feels wrong.",
    category: "Tenant rights",
    authorName: "StageHome Team",
    body: `Most tenancies in Kenya go smoothly, but it helps to know the basics of what a fair arrangement looks like.

A tenancy agreement should be clear about the rent amount, deposit amount, and what the deposit does and doesn't cover. If you're not given a written agreement, ask for one — a verbal-only arrangement is much harder to enforce if a disagreement comes up later.

Your landlord is generally expected to maintain the property in a habitable condition — working locks, no major structural issues, functioning utilities. If something significant breaks that isn't your fault, it's reasonable to expect it to be repaired within a fair timeframe once you've reported it.

Deposits should be refundable, minus any genuine damage beyond normal wear and tear. This is exactly why photographing the unit's condition on move-in day matters — it's your evidence if there's a dispute later about what counts as "damage."

Notice periods matter in both directions. Read your agreement's notice period requirement before you assume you can move out (or that your landlord can ask you to leave) on short notice.

If a serious dispute comes up that you can't resolve directly, Kenya's Business Premises Rent Tribunal and, for some cases, the small claims court are avenues worth knowing about — most disputes never need to go that far, but it's useful to know the options exist.

None of this replaces real legal advice for a specific situation — but knowing the basics helps you spot when something in an agreement looks unfair before you sign it.`,
  },
];

export async function main() {
  let published = 0;
  let skipped = 0;

  for (const post of POSTS) {
    const existing = await prisma.blogPost.findUnique({ where: { slug: post.slug } });
    if (existing) {
      skipped += 1;
      continue;
    }

    await prisma.blogPost.create({
      data: {
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        body: post.body,
        category: post.category,
        authorName: post.authorName,
        publicationStatus: "PUBLISHED",
        publishedAt: new Date(),
      },
    });
    published += 1;
  }

  console.log(`[blog] Done. ${published} post(s) published, ${skipped} already existed and were skipped.`);
}

if (require.main === module) {
  main()
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
