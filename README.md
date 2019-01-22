# Smooth HTML

A Web Extension that smoothes element appear/disappear/move — a neat effect (when it works: for performance, moves may often be dropped).

A lot of things were not designed to not happen instantly, so may transition strangely.

# Installation

Temporary, alpha-version, ⴻ.

In Firefox, about:debugging, Load Temporary Add-on. Chrome has something like it too, and it might work. Others, unknown.

# Changes

## Initial (and 0.0.1)

- test.html is not part of functionality — it is a test page. Small, so no harm in including it.

- Block elements animate appear/move/disappear, by tracking their layout rects and applying `.style.transform` (translate/scale, with a transition) when layout changes (when a mutation observer notifies, or when layout-change spreads). If an element is transitioning this way, none of its parents or children, direct or indirect, may transition this way.

- Disappearing elements get cloned and those get absolutely-positioned in `<html>` to fade; if a clone's w/h are different, it is removed instead. Inline elements (like text nodes) only animate disappear.

- All transitions have a hardcoded duration of 200ms.

- Not-yet-loaded images will fade-in on load or after 1s, maybe — not tested properly.

- CSS reads/writes are batched to minimize reflows.

- To make updates not block UI, if a read for an element takes more than 10ms, its moved-check is not done. Onscreen elements are somewhat prioritized.

## 0.0.2

- Made some internal preparations for an options page. (Pre-insert/post-delete (ins/del) states can be specified in code, like `{opacity:0}`.)

- Trying enabling/testing anchors — elements whose center x/y should be kept unchanged after any layouts by scrolling the document. If it scrolls unexpectedly and arbitrarily, this was the wrong decision.

- Freed layout objects are now often cached, so memory/gc footprint may be reduced.

- Dynamically-applied-`display:none` elements should fade in and out now — untested.

- Removed the CSS file, JS now injects the CSS. (Media queries to `update` and `prefers-reduced-motion` are now also performed, just in case.)

- Added some primitive horizontal/vertical motion blur. Maybe. Doesn't seem to apply — have to look into why the dirtying does not loop on transitioning objects. (Maybe we need to not rely on the dirtying loop for motion blur, but start/stop on transitionstart/end instead?) (Also, even when it does get applied, it makes the element invisible for some reason; what did we do wrong? Maybe x/y/width/height have to be defined on the filter? Or is what we did illegal, with the ID?)

- Now re-starting interrupted transitions mid-way. Not yet tested; `ontransitioncancel` might fire too late to affect the next transition.

- When creating a fadeout-clone, the whole subtree is checked for changes (of x/y/w/h/color/alpha) (no-longer-applying parent-dependent CSS rules may cause this), not just the parent.

- From options, transition `props`/`ease`/`dur`/`delay` are picked on loading options; `ins`/`del` are picked when elements appear/disappear. (Picking from an array is done randomly, picking from a function is its result, and anything else is that — randomization/customization could be done like this.)

- Max duration of a read phase now adapts by ms since last dirty (1000+ -> 50, 100+ -> 20, 10+ -> 5), to ensure smoother experience (but much more moves should be dropped now). (…in fact, so many are dropped that it's rare for anything to happen at all. Maybe we need to be adaptive, limiting to 5ms if in a tight loop?)

- All layouts of unseen-by-the-moved-check elements will be noted near page load, not left unknown.

- Events do not wait for the next frame to finish processing and do so immediately.

- No longer cooperate with the page to fade-in `document.body`, because cannot predict what options decree.

# To do

- Do not rely on the dirtying cycle to tell when motion blur is applicable, since that will insert many neighboring checks and potentially even break motion blur by timeout; instead, have a totally different read loop, with start/stop on transitionstart or end/cancel.

- An options page; and tweaking of transition parameters: affected-property, duration, timing function, delay; and of ins/del.

- Add to the test page, to see behavior: dynamic `display:none`; a manipulated-by-JS slider; inline SVG in various contexts (preferably ones that break current code); enough content to scroll (and test anchors).

- Figure out what is going on with SVG (probably), why it sometimes disappears misplaced and differently-colored.

- Maybe, to make auto transition uniformly in browsers, set/remove its computed value inline on transition start/end? (`ontransitionstart`, snap and set inline style for `.propertyName` and remember this in a map; `ontransitionend`, remove mapped/remembered stuff by `.propertyName`.)

- Create machinery that can effectively replace an element with a tree fragment, and un-replace it, and keep track of it all — using shadow DOM, or outright HTML changes if not available. And add an option to disable it. (We will use it these ways: add-temp-children, add-temp-parent — maybe only support these cases?)

- Transition inline elements via temporary tree-replacings — encase each moved element in a parent-sized container, with a layout-shifting element before the element to transition its offset(s) in the parent. (How do inline elements interact with flex/grid, and how would we?)

- Add any-angle motion blur, by rotating-and-blurring an element and un-rotating its temporary container.

- Potentially, an option can be a function that returns a value. Requires unsafe-eval to use though.
