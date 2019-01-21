# Smooth HTML

A Web Extension that smoothes element appear/disappear/move — a neat effect (when it works).

A lot of things were not designed to not happen immediately, so may transition strangely.

# Installation

Temporary, alpha-version, ⴻ.

Uhh, in Firefox, about:debugging, Load Temporary Add-on. Others, unknown.

# Other

test.html is not part of the extension — it is a test page that allows seeing the effects of this extension.

Block elements animate appear/move/disappear.

Inline elements (like text nodes) only animate disappear.

(CSS transform only affects block elements; making inline ones position:relative and animating left/top ourselves (since those do not transition here) is too much work (and potentially laggy). The potentially-script-affecting surface (element.style.transform) is minimal this way.)

(With a page's explicit cooperation, document.body animates appear — for any internal usage.)

# To do

- Add enter/leave for CSS read/write, where leave flushes the rw queue if it's top-level, so that events can immediately clean it up too.

- An options page, and global enable/disable, and tweaking of transition parameters: duration, timing function, delay. And enable/disable of non-layout-change transitions.

- Add to the test page, to see behavior: dynamic `display:none`, a manipulated-by-JS slider, and inline SVG in various contexts (preferably ones that break current code).

- Make `display:none` into `{ position:absolute; …; visibility:hidden; opacity:0 }` transitions (a type of removal/appearance when an element is still attached).

- Since default CSS transitions start from 0 when interrupting self, rapid re-transitions like sliders look lagged. Should try, `ontransitioncancel` unless `evt.pseudoElement`, to set `.style.transitionDelay` to `-evt.elapsedTime + 's'`, and `.transitionProperty` to `evt.propertyName`, and `.transitionDuration` to `parseFloat(computed.transitionDuration) + evt.elapsedTime + 's'`, and `.transitionTimingFunction` to whatever it should be (well, add those with a comma at the start or alter in-string value if already present) (and remove them `ontransitionend`).

- Figure out what is going on with SVG (probably), why it sometimes disappears misplaced and differently-colored.

- Create machinery that can effectively replace an element with a tree fragment, and un-replace it, and keep track of it all — using shadow DOM, or outright HTML changes if not available. And add an option to disable it. (We will use it these ways: add-temp-children, add-temp-parent — maybe only support these cases?)

- Maybe put removed element clones into their parents and not `<html>`, so that context-sensitive CSS rules may still apply? Maybe optionally, or maybe use that shadow machinery.

- Transition inline elements via temporary tree-replacings — encase each moved element in a parent-sized container, with a layout-shifting element before the element to transition its offset(s) in the parent. (How do inline elements interact with flex/grid, and how would we?)

- Add optional horizontal/vertical motion blur, via CSS `filter:url(#id)` (adding to the end) and SVG `<feGaussianBlur edgeMode=none stdDeviation='x y'>` — with the same x/y pointing to the same filter element.

- Add any-angle motion blur, by rotating-and-blurring an element and un-rotating its temporary container.

- Potentially, additional fade-in/out effects, like slide-from-offscreen or grow/shrink or mask-of-turbulence? Maybe even allow interaction with the page? (Can an extension even see page's element properties — if so, how?)
