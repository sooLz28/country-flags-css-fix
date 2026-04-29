// Source: https://github.com/talkjs/country-flag-emoji-polyfill
const replacementFontName = "Twemoji Country Flags";

// The id the element containing all overwritten font families.
const extentionStyleTagId = "country-flag-fixer-ext";

// Icon font classes that must never be overridden with Twemoji.
// These are appended as :not() exclusions to broad universal selectors.
const iconFontNotSelectors = [
  ':not([class^="gdi_"])',
  ':not([class*=" gdi_"])',
  ':not([class^="ri-"])',
  ':not([class*=" ri-"])',
  ':not([class^="fa-"])',
  ':not([class*=" fa-"])',
  ':not([class^="mdi-"])',
  ':not([class*=" mdi-"])',
  ':not([class^="icon-"])',
  ':not([class*=" icon-"])',
  ':not([class*="-icon-"])',
  ':not(.fas)',
  ':not(.far)',
  ':not(.fab)',
  ':not(.fal)',
  ':not(.fad)',
].join('');

const extractFontFamilyRules = () =>
{
  const fontFamilyRules = [];

  for (const sheet of document.styleSheets) {

    // Ignore the styles set by this extention.
    if (sheet.ownerNode.id == extentionStyleTagId)
      continue;

    // Ignore any non-screen stylesheets.
    const sheetMediaBlacklist = ['print', 'speech', 'aural', 'braille', 'handheld', 'projection', 'tty'];
    if (sheetMediaBlacklist.includes(sheet.media.mediaText))
      continue;

    try {

      // Loop through every CSS selector in the stylesheet
      for (const rule of sheet.cssRules) {

        if (!rule.style || !rule.style?.fontFamily)
          continue;

        // Skip rules without a selectorText (e.g. @font-face, @keyframes, @media)
        if (!rule.selectorText)
          continue;

        const selectorText = rule.selectorText;
        const fontFamily = rule.style.fontFamily;

        // The 'inherit' value cannot be combined with other fonts; ignore it.
        if (fontFamily == 'inherit')
          continue;

        // Already modified CSS selectors may be ignored.
        if (fontFamily.toLowerCase().includes(replacementFontName.toLowerCase()))
          continue;

        fontFamilyRules.push({ selectorText, fontFamily });
      }
    }
    catch (e) {
      // Stylesheet may be inaccessible (cross-origin) or not loaded yet.
      // We retry on window load and document.fonts.ready, which gives slow stylesheets
      // a second chance to be processed.
    }
  }

  return fontFamilyRules;
};

const createNewStyleTag = (fontFamilyRules) =>
{
  const style = document.createElement("style");
  style.setAttribute("type", "text/css");
  style.setAttribute("id", extentionStyleTagId);

  fontFamilyRules.forEach((rule) => {
    let selector = rule.selectorText;

    // Append icon-font exclusions to EVERY selector so icon elements are never matched
    // by ANY Twemoji rule, regardless of specificity. This handles cases like
    // ':lang(en) .bold' (specificity 0,1,1) which beats '[class^="ri-"]' (0,1,0).
    // For compound selectors ('a, b') we must append to each comma-separated part.
    selector = selector
      .split(',')
      .map(part => part.trim() + iconFontNotSelectors)
      .join(', ');

    // Set the Country Flags font as main property; set the original font(s) as 'fallback'
    style.textContent += `${selector} { font-family: '${replacementFontName}', ${rule.fontFamily} !important; }\n`;
  });

  // Restore icon fonts that were overridden by other (lower-specificity) rules.
  style.textContent += `
    [class^="gdi_"], [class*=" gdi_"] {
      font-family: 'SmartPortalFont' !important;
      font-style: normal !important;
    }
    [class^="ri-"], [class*=" ri-"] {
      font-family: 'remixicon' !important;
      font-style: normal !important;
    }
    .fas, .far, .fal, .fab, .fad,
    [class^="fa-"], [class*=" fa-"] {
      font-family: 'Font Awesome 6 Free', 'Font Awesome 5 Free', 'Font Awesome 5 Brands', 'FontAwesome' !important;
      font-style: normal !important;
    }
    [class^="material-icons"], [class*=" material-icons"] {
      font-family: 'Material Icons' !important;
      font-style: normal !important;
    }
    [class^="material-symbols"], [class*=" material-symbols"] {
      font-family: 'Material Symbols Outlined' !important;
      font-style: normal !important;
    }
    [class^="mdi-"], [class*=" mdi-"] {
      font-family: 'Material Design Icons' !important;
      font-style: normal !important;
    }
    [class^="icon-"], [class*=" icon-"],
    [class*="-icon-"] {
      font-family: inherit !important;
      font-style: normal !important;
    }
  `;

  return style;
};

const applyCustomFontStyles = () =>
{
  var existingSheet = document.getElementById(extentionStyleTagId);

  const fontFamilyRules = extractFontFamilyRules();
  const newStyleTag = createNewStyleTag(fontFamilyRules);

  // Completely rewrite the overriden styles, if applicable.
  if (existingSheet) {
    existingSheet.parentNode.removeChild(existingSheet);
  }

  if (document.head == null)
    return;

  document.head.appendChild(newStyleTag);
};

// Inject Twemoji into an element's inline style="font-family: ..." declaration.
// CSS rules with !important can't beat inline styles, so we have to rewrite the
// inline value directly to add Twemoji as the primary family.
const injectFlagFontInline = (element) =>
{
  if (!element || typeof element.getAttribute !== 'function')
    return;

  // Ignore elements without style attribute or any font-family property.
  const inlineStyle = element.getAttribute('style');
  if (!inlineStyle || !inlineStyle.includes('font-family'))
    return;

  // Font family regex matching the font (group 1) and the !important modifier (group 2).
  const fontFamilyRegex = /font-family\s*:\s*([^;]+?)(\s*!important)?\s*(;|$)/;
  const match = fontFamilyRegex.exec(inlineStyle);

  // Cancel if there is no match for any reason.
  if (!match)
    return;

  const currentFontFamily = match[1].trim();

  // 'inherit' cannot be combined with other fonts; let inheritance work normally.
  if (currentFontFamily === 'inherit')
    return;

  // Already injected; nothing to do (also breaks the loop when our own write triggers
  // the MutationObserver again).
  if (currentFontFamily.toLowerCase().includes(replacementFontName.toLowerCase()))
    return;

  element.style.setProperty(
    'font-family',
    `'${replacementFontName}', ${currentFontFamily}`,
    'important'
  );
};

// Inject Twemoji into an SVG element's font-family="..." presentation attribute.
// SVG charts (D3, Recharts, ApexCharts) usually set fonts as XML attributes,
// which beat inheritance and aren't reached by the CSS-rule overrides.
const injectFlagFontSvg = (element) =>
{
  if (!element || typeof element.getAttribute !== 'function')
    return;

  const ff = element.getAttribute('font-family');
  if (!ff)
    return;

  if (ff === 'inherit')
    return;

  if (ff.toLowerCase().includes(replacementFontName.toLowerCase()))
    return;

  element.setAttribute('font-family', `'${replacementFontName}', ${ff}`);
};

// Walk an element and its descendants, applying both injectors.
const processNodeSubtree = (root) =>
{
  if (!root || root.nodeType !== Node.ELEMENT_NODE)
    return;

  injectFlagFontInline(root);
  injectFlagFontSvg(root);

  if (typeof root.querySelectorAll !== 'function')
    return;

  root.querySelectorAll('[style*="font-family"]').forEach(injectFlagFontInline);
  root.querySelectorAll('[font-family]').forEach(injectFlagFontSvg);
};

// Re-runs CSS-rule extraction and inline/attribute injection across the whole
// document. Cheap to call repeatedly because both injectors short-circuit on
// already-processed elements.
const initialApply = () =>
{
  applyCustomFontStyles();
  if (document.body)
    processNodeSubtree(document.body);
  else if (document.documentElement)
    processNodeSubtree(document.documentElement);
};

initialApply();

// Late stylesheets / late-loading fonts: re-apply once everything is settled.
window.addEventListener('load', initialApply);
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(initialApply);
}

// Track stylesheet nodes by reference (more robust than dedup by textContent,
// which collides on empty <style> tags filled in later via JS).
const seenStyleNodes = new WeakSet();
for (const sheet of document.styleSheets) {
  if (sheet.ownerNode) seenStyleNodes.add(sheet.ownerNode);
}

const observer = new MutationObserver((mutations) =>
{
  let stylesheetChanged = false;

  for (const mutation of mutations) {
    if (mutation.type === 'childList') {
      for (const node of mutation.addedNodes) {
        if (node.id === extentionStyleTagId)
          continue;

        const isStylesheet = node.nodeName === 'LINK' && node.rel === 'stylesheet';
        const isStyleNode = node.nodeName === 'STYLE';

        if ((isStylesheet || isStyleNode) && !seenStyleNodes.has(node)) {
          seenStyleNodes.add(node);
          stylesheetChanged = true;

          // Cross-origin <link>s have empty cssRules until they finish loading;
          // re-apply when the load event fires so we pick up their rules.
          if (isStylesheet && typeof node.addEventListener === 'function') {
            node.addEventListener('load', applyCustomFontStyles, { once: true });
          }
        }

        // Inject into the new subtree's inline styles and SVG attributes.
        processNodeSubtree(node);
      }
    } else if (mutation.type === 'attributes') {
      if (mutation.attributeName === 'style') {
        injectFlagFontInline(mutation.target);
      } else if (mutation.attributeName === 'font-family') {
        injectFlagFontSvg(mutation.target);
      }
    }
  }

  if (stylesheetChanged) {
    applyCustomFontStyles();
  }
});

observer.observe(document, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['style', 'font-family']
});
