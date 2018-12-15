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

(CSS transform only affects block elements; making inline ones position:relative and animating left/top ourselves (since those do not transition) is too much work (and potentially laggy). The potentially-script-affecting surface (element.style.transform) is minimal this way.)

(With a page's explicit cooperation, document.body animates appear.)
