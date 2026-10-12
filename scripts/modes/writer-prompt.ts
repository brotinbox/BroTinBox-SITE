import { BlogPlan } from './planner-prompt';
import { PlacePillar } from '../data/blog-pillars';

export function buildWriterPrompt(plan: BlogPlan, place: PlacePillar): string {
  const isRegional = place.type === 'regional';

  return `You are writing an authoritative, clinically grounded, and engaging 1,200 to 1,500 word article for the BroTin Box blog.

ARTICLE METADATA:
- Title: ${plan.title}
- Author: ${plan.author_name} (${plan.author_role})
- Category: ${plan.category_slug}
- Location Focus: ${place.name} (${isRegional ? 'Regional Outer District Target' : 'Local Coimbatore Neighborhood'})
- Macros Highlight: ${plan.macros_highlight}

DIRECT ANSWER SNIPPET (Include this at the very beginning in a blockquote):
"${plan.direct_answer_snippet}"

OUTLINE TO EXPAND:
${plan.outline.map((o, idx) => `${idx + 1}. ${o.h2}: ${o.keyPoints.join(', ')}`).join('\n')}

FREQUENTLY ASKED QUESTIONS TO INCLUDE AT THE END:
${plan.faq_list.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n')}

WRITING GUIDELINES & VOICE:
1. Tone: Clinical authority meets deep South Indian culinary passion. As a Pharm.D / clinical team based in Coimbatore, explain the physiology (cortisol cycles, insulin resistance, Muscle Protein Synthesis (MPS), raw vs cooked yields, peptide YY, visceral adiposity).
2. Clean Eating & "Free-From" SEO Dominance:
   - Systematically highlight our clean food standards: **100% Gluten-Free** (using native Tamil millets like thinai, varagu, kuthiraivali), **100% Palm-Oil-Free** (using single-origin cold-pressed oils), **Zero Refined Sugar**, **Zero Preservatives/Chemicals**, and **100% Maida-Free**.
   - Explain why these "free-from" parameters protect the gut microbiome and reverse liver fat accumulation.
3. Local Grounding: Seamlessly mention local landmarks and lifestyle in ${place.name} and Coimbatore (e.g., morning routines, tech corridors, Nehru stadium runners, Kongu ingredients like moringa, cold-pressed sesame oil, small shallots, cumin, black pepper).
4. The BroTin Box Difference:
   - Everything is weighed on calibrated digital scales in our Kuniyamuthur Central Kitchen before dispatch.
   - We strictly deliver twice daily: Morning breakfast (7:00 AM – 9:00 AM) and Dinner (7:00 PM – 9:00 PM). Emphasize that we purposefully do not serve afternoon lunches, as morning and night protein anchors drive metabolic stability and MPS without daytime bloat.
   - Zero boiled, tasteless Western food. Real, flavour-packed South Indian dishes with calculated macros.
${
  isRegional
    ? `5. Outer Regional District Context: Since ${place.name} is outside our immediate 30-minute hyper-local delivery radius, explain why active professionals in ${place.name} consult our team, follow our macro ratios, or submit an enquiry for bulk box schedules and customized diet guidance.`
    : `5. Local Coimbatore Delivery: Highlight doorstep delivery across ${place.name} during the 7–9 AM and 7–9 PM timeframes.`
}
6. Formatting & Markdown Syntax:
   - Use # for main section titles (this converts to h2).
   - Use ## for subsections (this converts to h3).
   - Use bullet points (- ) and numbered lists for readability.
   - Use **bold** for key concepts, numbers, and clean-eating guarantees.
   - Use > for the opening Direct Answer blockquote.
   - At the bottom, provide a "## Frequently Asked Questions" section containing the FAQs formatted with bold questions.
   - Conclude with a strong, organic Call to Action inviting readers to [Try Tomorrow’s Daily Trial Box](/tomorrow) or speak with our nutrition team.

OUTPUT RULES:
- Output ONLY pure markdown text.
- Do NOT output HTML tags.
- Do NOT wrap in triple backtick markdown code blocks.
- Do NOT include frontmatter or YAML. Start directly with the opening blockquote and title introduction.`;
}
