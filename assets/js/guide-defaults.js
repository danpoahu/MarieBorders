/* Marie Borders — guide defaults + shared renderer
 *
 * Single source of truth for the Buyer's and Seller's guide content.
 * Used by:
 *   - The public guide pages (assets/guides/marin-{buyers,sellers}-guide.html)
 *     which render from Firestore `guides/{buyer|seller}` if present, falling
 *     back to these defaults if not.
 *   - The CMS Guides editor (cms.html) which seeds the editor form from
 *     these defaults when no Firestore doc exists, and offers a "Reset to
 *     default" button that wipes the Firestore doc.
 *
 * Section model (each item in `sections` is one of):
 *   { type: 'h2',    text: string }          — major section heading
 *   { type: 'h3',    text: string }          — sub-section heading
 *   { type: 'p',     text: string }          — paragraph (supports **bold** / *italic*)
 *   { type: 'quote', text: string }          — pull quote (italic blockquote)
 *   { type: 'ol',    items: string[] }       — numbered list (items support **bold** / *italic*)
 *   { type: 'ul',    items: string[] }       — bulleted list
 *   { type: 'step',  title: string, body: string }  — numbered step card; numbers auto-assigned across siblings
 *
 * Inline formatting: text fields may use `**bold**` and `*italic*` markers.
 * The renderer escapes HTML first then converts the markers, so users
 * cannot inject HTML by writing tags directly.
 *
 * Exposed as window.MB.guideDefaults.{buyer, seller}.
 */

(function () {
  'use strict';
  window.MB = window.MB || {};

  var buyer = {
    title: "The Marin Buyer's Guide",
    eyebrow: "Marie Borders · Marin Real Estate",
    coverLede: "A clear-eyed walkthrough of buying a home in Marin County — from first call to final closing, with a few honest words on what makes this market its own.",
    sections: [
      { type: 'h2', text: 'Before you start looking' },
      { type: 'p',  text: "The most common mistake first-time Marin buyers make is starting the property hunt before they've done the inside work. Three things to settle first:" },
      { type: 'ol', items: [
          "**Your real budget.** Pre-approval from a lender, with paperwork in hand. Online estimators are a starting point, not a number an offer can hang on.",
          "**Your non-negotiables.** Bedrooms, school zone, commute, accessibility — the three or four things that, if missing, mean the home is wrong. Everything else is a nice-to-have.",
          "**Your timeline.** Marin moves at its own pace. Some buyers are ready in 90 days; others spend a year. Both are fine. What matters is being honest about which one you are."
        ] },
      { type: 'quote', text: "\"I'd rather work with a buyer for nine months and find them the right home than rush them into the wrong one in six weeks.\"" },

      { type: 'h2', text: 'Understanding the Marin micro-markets' },
      { type: 'p',  text: "Marin isn't one market. It's a constellation of neighborhoods, each with its own rhythm. A few quick generalizations to start a conversation — never to end one:" },

      { type: 'h3', text: 'Southern Marin (Mill Valley, Tiburon, Sausalito, Belvedere)' },
      { type: 'p',  text: "Closest to the city, oldest housing stock, steepest prices. Inventory turns slowly and homes often go off-market through networks before they ever hit the MLS. Working with a local agent matters most here." },

      { type: 'h3', text: 'Central Marin (Larkspur, Corte Madera, San Anselmo, Ross, Kentfield)' },
      { type: 'p',  text: "Family-favorite school districts, mix of cottages and substantial homes. More inventory than the south, still tight. Walking-town life in San Anselmo and Larkspur is part of the appeal." },

      { type: 'h3', text: 'Northern Marin (San Rafael, Novato)' },
      { type: 'p',  text: "Most varied price range and largest inventory. Genuine starter-home opportunities still exist, especially in Terra Linda and parts of Novato. Newer construction is more common here." },

      { type: 'h3', text: 'West Marin (Pt Reyes, Bolinas, Inverness, Stinson Beach)' },
      { type: 'p',  text: "A separate world. Limited inventory, second-home and weekend-property territory, weather-dependent commute. Worth the conversation only if you know why you want to be there." },

      { type: 'h2', text: 'The buying process, step by step' },
      { type: 'step', title: 'Get pre-approved',                   body: "Not pre-qualified — pre-approved, with real documents. Marin sellers and listing agents take pre-approval seriously, and the strongest offers are the ones that look bulletproof on financing." },
      { type: 'step', title: 'Define your search',                 body: "We'll talk through neighborhoods, must-haves, and budget. I'll set up custom searches that surface new listings the moment they hit the MLS — and quietly flag pre-market opportunities through agent channels." },
      { type: 'step', title: 'Tour homes — thoughtfully',          body: "Open houses are useful but they're crowded. Private showings let us slow down, look in cabinets, sit in rooms, take time. I prefer to limit each session to three or four homes — more than that and they all blur together." },
      { type: 'step', title: 'Run the disclosures before you fall in love', body: "Most Marin listings provide a disclosure packet up front: inspections, pest reports, geological surveys, permit history. Read these *before* writing an offer. A short call with the inspector who wrote a report often answers more than a re-read of the document." },
      { type: 'step', title: 'Write a strong offer',               body: "Multi-offer situations are common. A strong offer isn't always the highest one — it's the cleanest one. Few contingencies, large earnest money, demonstrated financing, and a thoughtful personal letter (where appropriate) often beat raw dollars." },
      { type: 'step', title: 'Inspect, negotiate, close',          body: "Inspection contingencies are valuable for major surprises — foundation, roof, structural — not for nitpicking. Plan to handle the small stuff yourself. Typical Marin escrow runs 21 to 30 days." },

      { type: 'h2', text: 'A few honest truths' },
      { type: 'ul', items: [
          "**The \"perfect\" home doesn't exist.** The right home solves your most important problems and lets you live with the rest.",
          "**Disclosure packages are not casual reading.** They tell you more about the home than any open house ever will.",
          "**Patience and discipline win in a hot market** — not aggression. Buyers who chase end up overpaying for the wrong house.",
          "**Your agent works for you.** A good buyer's agent will tell you when not to write an offer just as readily as they'll tell you when to write one."
        ] },

      { type: 'h2', text: 'What to ask your agent before signing on' },
      { type: 'ol', items: [
          "How many transactions did you close in Marin in the last 12 months?",
          "What neighborhoods do you know best, and where are you less strong?",
          "Who is on your team? Who actually shows up to inspections?",
          "How do you handle multi-offer situations on my behalf?",
          "What's your communication style — text, email, weekly check-ins?"
        ] }
    ],
    closingTitle: "Let's talk.",
    closingBody: "I'd love to hear what you're looking for. Whether you're nine months out or moving next quarter, there's value in starting the conversation early."
  };

  var seller = {
    title: "The Marin Seller's Guide",
    eyebrow: "Marie Borders · Marin Real Estate",
    coverLede: "An honest walk through what it really takes to sell a Marin home well — from the first decision to the final walkthrough, with notes on the choices that move the needle and the ones that don't.",
    sections: [
      { type: 'h2', text: 'Before you list' },
      { type: 'p',  text: "The decision to sell is rarely just about timing the market. The questions to answer first:" },
      { type: 'ol', items: [
          "**Why sell now?** Job change, downsize, growing family, estate, financial — the answer shapes everything else, including how flexible we can be on timing and price.",
          "**Where are you going next?** Are you buying contemporaneously? Renting first? Moving out of state? Sequencing affects what kind of offer terms work for you.",
          "**What's the realistic number?** A rigorous comparative market analysis (CMA) — not a Zestimate. We look at recent solds, current actives, and pending sales within your specific micro-market."
        ] },
      { type: 'quote', text: "\"Setting list price is a strategy choice, not a price prediction. The right number depends on how aggressive a market you want to create.\"" },

      { type: 'h2', text: 'What actually moves the needle' },
      { type: 'p',  text: "Marin sellers are inundated with advice. The handful of things that genuinely matter:" },

      { type: 'h3', text: 'Photography' },
      { type: 'p',  text: "The first impression on Zillow, MLS, and email blasts is your only impression for 80% of buyers. Professional photography — wide-angle lens, twilight shots where the light warrants, drone where the lot warrants — pays for itself many times over." },

      { type: 'h3', text: 'Strategic light staging' },
      { type: 'p',  text: "A full stage isn't always necessary, especially in occupied homes with good furniture. A targeted stage — rugs, art, the right throw pillows — can dramatically warm a space without major investment." },

      { type: 'h3', text: 'Pre-list inspections' },
      { type: 'p',  text: "Marin buyers expect a full disclosure package up front: home inspection, pest, roof, sewer lateral if applicable, geo if warranted. Investing $1,000–$2,500 in pre-list inspections gives buyers confidence and removes contingencies. It almost always pays back many times over." },

      { type: 'h3', text: 'The right list price' },
      { type: 'p',  text: "Underpricing creates competition and often *raises* final sales price; overpricing kills momentum and forces price drops that telegraph weakness. There's a precise sweet spot for every property, and it's earned through analysis, not guesswork." },

      { type: 'h2', text: "What doesn't move the needle (much)" },
      { type: 'ul', items: [
          "**Major renovations the week before listing.** You rarely recover the cost in the sale price.",
          "**Open house grand-spectacle expense.** Strong photos and good signage matter more than catering.",
          "**Holding out for a fictional buyer.** The best offer often comes in the first three weeks. After that, the property goes \"stale\" in agent eyes."
        ] },

      { type: 'h2', text: 'The selling process, step by step' },
      { type: 'step', title: 'Initial walk-through & strategy session', body: "I come look at the home in person. We talk about goals, timeline, and the price story we want to tell. I leave with notes; you leave with a clear plan." },
      { type: 'step', title: 'Prep work',                  body: "Pre-list inspections scheduled. Light staging coordinated. Photographer booked for the morning when the light hits the rooms right. Repairs only for the things that genuinely hurt a buyer's perception — not a long deferred-maintenance list." },
      { type: 'step', title: 'Pricing & positioning',      body: "Final CMA. We discuss list price strategy — aggressive to create a bidding war, or priced to value to capture qualified-buyer attention. The MLS write-up, marketing copy, and broker tour pitch all align around the strategy." },
      { type: 'step', title: 'Go live',                    body: "Listing hits MLS Thursday or Friday for ideal weekend exposure. Twilight email blast to my buyer database. Broker tour Tuesday. First open house the following weekend." },
      { type: 'step', title: 'Showings & offers',          body: "The first 10 days are decisive. We watch agent feedback closely. If we set offer-review dates, they're typically 10–14 days after listing. I screen every offer with you and explain the trade-offs — price, terms, contingencies, financing strength." },
      { type: 'step', title: 'Escrow to close',            body: "Once accepted, we manage timelines, contingency releases, repair requests if any, and disclosure follow-ups. Typical Marin escrow: 21 to 30 days. I handle the day-to-day; you sign when there's something to sign." },

      { type: 'h2', text: "What you'll net" },
      { type: 'p',  text: "The sale price is not what you walk away with. Standard seller costs in Marin:" },
      { type: 'ul', items: [
          "**Commissions:** typically 5–6% split between listing and buyer's agents",
          "**Transfer taxes:** county and city — ranges roughly $1.10–$15.00 per $1,000 of sale price depending on locale",
          "**Title and escrow fees:** ~$2,500–$5,000 depending on price",
          "**Property tax proration, any HOA dues, NHD reports, etc.**",
          "**Capital gains tax** if you exceed the $250K/$500K primary-residence exclusion (consult your CPA — this is a place where good advice pays for itself many times over)"
        ] },
      { type: 'p',  text: "I'll prepare a detailed net-sheet projection before we go live so there are no surprises at closing." },

      { type: 'h2', text: 'Questions worth asking your listing agent' },
      { type: 'ol', items: [
          "What was your average list-to-sale ratio in the last 12 months?",
          "How long, on average, do your listings spend on market?",
          "What's your marketing budget, and what does it cover?",
          "How do you handle pre-emptive offers? Do you encourage or discourage them?",
          "Who shows the home when you can't?"
        ] }
    ],
    closingTitle: "Let's talk strategy.",
    closingBody: "I offer a no-obligation walk-through and CMA for any Marin homeowner thinking about selling — this year or next."
  };

  MB.guideDefaults = { buyer: buyer, seller: seller };
})();
