import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const slides = [
  [24, '09 · CREATIVE DEVELOPMENT', 'Craft · Creative Development', '09-creative-development.jpg'],
  [25, '10 · CG INTEGRATION', 'Craft · CG Integration', '10-cg-integration.jpg'],
  [26, '11 · CG ENVIRONMENTS', 'Craft · CG Environments', '11-cg-environments.jpg'],
  [27, '12 · COMPOSITING', 'Craft · Compositing', '12-compositing.jpg'],
  [28, '13 · SIMULATION AND FX', 'Craft · Simulation and FX', '13-simulation-and-fx.jpg'],
  [29, '14 · POLISH', 'Craft · Polish', '14-polish.jpg'],
  [30, '15 · SOUND', 'Craft · Sound', '15-sound.jpg'],
  [31, '16 · AI-ASSISTED WORKFLOW', 'Craft · AI-Assisted Workflow', '16-ai-assisted-workflow.jpg'],
];

const out = slides
  .map(
    ([idx, comment, tag, img]) => `  <!-- ═══════════════════════════════
       ${comment}
  ═══════════════════════════════ -->
  <div class="slide slide-craft-full" data-index="${idx}" data-deck-chrome="compact">
    <div class="xyz-logo">XYZSTUDIOS</div>
    <div class="slide-tag">${tag}</div>
    <div class="slide-inner">
      <img class="deck-full-img" src="/capabilities/assets/deck-stills/${img}" alt="" decoding="async">
    </div>
    <div class="slide-footer-line"></div>
    <div class="slide-year">2026</div>
    <div class="slide-logo-mark"><img src="/capabilities/assets/xyz-logo.png" alt="XYZ Studios"></div>
  </div>`
  )
  .join('\n\n');

fs.writeFileSync(path.join(__dirname, '..', 'Capabilities', '_craft-slides-fragment.html'), out);
console.log('ok', out.length);
