(function() {try{
	{"Allocates memory hideously: for-of, closures everywhere…"
		"And uses maps where properties would have sufficed, mainly for caches."}

	{"May break, in other pages:"
		"Inline filter and transition-* on element.style WILL get removed."
		"Those style props specified in the `ins` option WILL get removed too."
		"Code reading children of document.documentElement may break (that is where clones of removed nodes get put to die neatly)."
		"Code reading children of document.head may break (that is where CSS/SVG get put)."
		"Code reading element.className (and not .classList) might break."
		"Code reading/writing element.style.transform might rarely break."}

	if (typeof self === ''+void 0) return;
	const log = console.log;
	const prev = Symbol('prevLayout');
	finish.r = [], finish.w = [], finish.s = 0, finish.rects = new Map;
	alpha.a = new Map, layout.a = [];
	setInterval(() => layout.a.length = 0, 1000);

	(function need(...globals) {
		const bad = globals.filter(g => !self[g]);
		if (bad.length) throw 'Browser does not support '+bad+' — cannot be ⴻsmooth';
	})('document', 'MutationObserver', 'requestAnimationFrame', 'performance');

	const isFinite = Number.isFinite, parseFloat = Number.parseFloat;
	const once = { capture:true, once:true, passive:true }, many = { capture:true, passive:true };
	const nextFrame = requestAnimationFrame.bind(self);
	const now = performance.now.bind(performance);
	const locks = new Map;
	const dirty = new Map, shiny = new Set;
	const imageShowIds = new Map, imageInsUndos = new Map;
	let scheduled = false, start, cur, len;
	const options = {
		props:'all', ease:'ease-out', dur:2000, delay:0,
		ins:{opacity:0}, del:{opacity:0}
	};
	let props, ease, dur, delay; "Chosen at style-init time."



	if (document.body && document.readyState !== 'loading') init();
	else addEventListener('DOMContentLoaded', init, once);

	function init() {
		const o = new MutationObserver(on);
		o.observe(document.body, {
			attributes:true,
			characterData:true,
			childList:true,
			subtree:true,
		});
		seekImages(document.body);
		write(() => initStyle()), finish();

		addEventListener('resize', () => read(() => touch(document.body)), many);
		addEventListener('transitionstart', evt => {
			const e = evt.target;
			if (e) read(() => { !offscreen(e) && track(e), touch(e) }), finish();
		}, many);
		addEventListener('transitionend', evt => {
			const e = evt.target;
			if (e) read(() => look(e)), write(() => removeTrans(e)), finish();
		}, many);
		addEventListener('transitioncancel', evt => {
			"When transitions interrupt each other, the second one will now hopefully start midway."
			const e = evt.target, time = evt.elapsedTime, prop = evt.propertyName;
			if (e && !evt.pseudoElement)
				read(() => {
					if (!alpha(e)) return;
					addTrans(e, 'transition-property', prop);
					addTrans(e, 'transition-timing-function', ease);
					addTrans(e, 'transition-delay', delay/1000 - time + 's');
					addTrans(e, 'transition-duration', dur/1000 + time + 's');
				}), finish();
		}, many);

		addEventListener(self.PointerEvent ? 'pointerenter' : 'mouseenter', enter, many);
		let id = null;
		function enter(evt) { "Debounce point(evt.target)."
			clearTimeout(id), id = evt.target ? setTimeout(point, 300, evt.target) : null;
		}
		function point(e) { "Just in case it changed, update elem and all its parents."
			id = null, e.isConnected !== false && read(() => {
				anchor(e); "Position of e should be preserved through layout changes."
				while (e.firstChild) e = e.firstChild;
				for (p = e; p && p !== self && p !== document; p = p.parentNode) look(p);
			});
		}
	}
	function opt(o,e) {
		o = options[o]; "option getter, to optionally allow customizing some behavior."
		while (true)
			if (Array.isArray(o)) o = o[Math.floor(Math.random() * o.length)];
			else if (typeof o === 'function') o = o(e);
			else return o;
	}
	function initStyle() {
		write();
		let e = document.querySelector('#ⴻ');
		if (!e) e = document.head.appendChild(document.createElement('style')), e.id = 'ⴻ';
		if (self.matchMedia) {
			let s = 'screen'; "The media query language is extremely poor, and so is this code."
			if (matchMedia('(update:none),(update:slow),(update:fast)').matches)
				s += ' and (update:fast)';
			if (matchMedia('(prefers-reduced-motion:no-preference),(prefers-reduced-motion:reduce)').matches)
				s += ' and (prefers-reduced-motion:no-preference)';
			e.media = s;
		}
		if (!e.sheet) return;
		const s = e.sheet;
		for (var i = s.length; i-- > 0; ) s.deleteRule(i);
		props = opt('props'), ease = opt('ease'), dur = opt('dur'), delay = opt('delay');
		const tr = `${props} ${ease} ${dur}ms ${delay}ms`;
		s.insertRule(`:not(input):not(button) { transition:${tr} }`, 0);
		s.insertRule('.ⴻsnap { transition: none !important }', 1);
		s.insertRule('.ⴻvoid { display:block; position:absolute; margin:0; z-index:9999; overflow:hidden; pointer-events:none; user-select:none; -moz-user-select:none; -webkit-user-select:none }', 2);
	}
	function on(a) {
		read(() => {
			try {
				let i,n;
				for (i=0; i < a.length; ++i) {
					touch(a[i].target), neighbors(a[i]);
					if (a[i].type === 'childList') {
						const x = a[i].addedNodes, y = a[i].removedNodes;
						if (!x.length && y.length===1 && y[0].nodeType!==1) {
							const z = a[i+1] && a[i+1].type === 'childList' && a[i+1].addedNodes;
							if (z && a[i+1].target===a[i].target && z.length===1 && z[0].nodeType!==1) {
								~~"Likely setting .textContent (very common) — do not animate."
								z[0][prev] = y[0][prev];
								continue;
							}
						}
						if (!y.length && x.length===1 && x[0].nodeType!==1) {
							const z = a[i+1] && a[i+1].type === 'childList' && a[i+1].removedNodes;
							if (z && a[i+1].target===a[i].target && z.length===1 && z[0].nodeType!==1) {
								("Does not seem to trigger in Firefox, but is left just in case.")
								x[0][prev] = z[0][prev];
								continue;
							}
						}
						"Those above do not catch all .textContent sets, but most, so good enough."
						x.forEach(appeared);
						y.forEach(moved);
					}
				}
			}catch(err){log(err)}
		});
		finish();
	}
	function removeProperty(e, prop) {
		write();
		if (e.nodeType !== 1) return;
		if (prop) e.style.removeProperty(prop);
		if (!e.style.length) e.removeAttribute('style');
	}
	function unclass(e, ...k) {
		write();
		if (e.nodeType !== 1) return;
		e.classList.remove(...k);
		if (!e.classList.length) e.removeAttribute('class');
	}
	function addTrans(e,k,v) {
		read();
		if (e.nodeType !== 1) return;
		if (getComputedStyle(e)[k]) v += ',' + getComputedStyle(e)[k];
		write(() => e.style.setProperty(k,v));
	}
	function removeTrans(e) {
		write();
		if (e.nodeType !== 1) return;
		e.style.removeProperty('transition-property');
		e.style.removeProperty('transition-timing-function');
		e.style.removeProperty('transition-delay');
		e.style.removeProperty('transition-duration');
		removeProperty(e);
	}



	function fadeIn(e) {
		if (e.nodeType !== 1) return;
		write();
		const o = opt('ins', e);
		for (let k in o) e.style[k] = o[k];
		snap(e, true);
		return () => {
			snap(e, false);
			for (let k in o) e.style.removeProperty(k);
			removeProperty(e);
		};
	}
	function fadeOut(e) {
		if (e.nodeType !== 1) return;
		write();
		const o = opt('del', e);
		for (let k in o) e.style[k] = o[k];
	}
	function snap(e, to = true) {
		write();
		if (e === document.body) return;
		if (e.nodeType === 1) to ? e.classList.add('ⴻsnap') : unclass(e, 'ⴻsnap');
	}
	function clone(e) {
		dirty.delete(e);
		const to = e.cloneNode(false);
		let ch;
		for (ch = e.firstChild; ch; ch = ch.nextSibling)
			to.appendChild(clone(ch));
		return to;
	}
	function layoutChanged(e) {
		const from = e[prev], to = e[prev] = layout(e);
		log('layoutChanged');
		try {
			if (from === void 0) return false;
			if (!from !== !to) return true;
			if (!from && !to) return false;
			if (!intoSameSpace(from, to.p)) return false;
			if (Math.round(from.x - to.x) !== 0) return true;
			if (Math.round(from.y - to.y) !== 0) return true;
			if (Math.round(from.w - to.w) !== 0) return true;
			if (Math.round(from.h - to.h) !== 0) return true;
			if (from.c !== to.c) return true;
			if (from.a !== to.a) return true;
			let ch;
			for (ch = e.firstChild; ch; ch = ch.nextSibling)
				if (layoutChanged(ch)) return true;
			return false;
		} finally { layoutDiscard(from) }
	}
	function layoutDiscard(o) { o && layout.a.push(o) }
	function polluteGetters(o, stack) {
		"Used to debug use-after-free."; for (var k in o)
			Object.defineProperty(o, k, { get() { throw Error("ⴻuse after free at:\n"+stack) } });
	}
	function absoluteFadeout(e, from, into) {
		read();
		if (!e || !from || !from.p || !from.a) return;
		const oldPL = from.p[prev] || layout(from.p);
		const pw = oldPL ? oldPL.cw : 0, ph = oldPL ? oldPL.ch : 0;
		if (!intoSameSpace(from, into)) return;
		e = clone(e), e[prev] = from;
		write(() => {try{
			if (e.nodeType !== 1) {
				const p = document.createElement('span');
				p.style.display = 'inline';
				p.appendChild(e);
				e = p;
			}
			if (from.ix !== null && (pw || ph)) {
				const p = document.createElement('div');
				p.style.width = (pw || 0) + 'px';
				p.style.height = (ph || 0) + 'px';
				const sp = document.createElement('span');
				sp.style.display = 'inline-block';
				sp.style.width = (from.ix - from.x || 0) + 'px';
				sp.style.height = (from.iy - from.y || 0) + 'px';
				p.appendChild(sp);
				p.appendChild(e);
				e = p;
			}
			e.classList.add('ⴻvoid');
			const s = e.style;
			s.left = (from.x || 0) + 'px', s.top = (from.y || 0) + 'px';
			s.width = (from.w || 0) + 'px', s.height = (from.h || 0) + 'px';
			s.color = from.c;
			if (from.a !== 1) s.opacity = from.a;
			snap(e, true);
			into.append(e);
			read(() => {
				if (layoutChanged(e)) write(() => e.remove());
				else write(() => {
					snap(e, false), fadeOut(e);
					ontransitionendHasNotProvenSteadfast => 'easier to not trust';
					setTimeout(() => write(() => e.remove()), dur);
					("from should be discarded by the caller.")
				});
			});
		}catch(err){log('ⴻ',err);throw err}});
	}



	function svg(name) { return document.createElementNS('http://www.w3.org/2000/svg', name) }
	function defs() {
		write();
		let e = document.getElementById('ⴻdefs');
		if (!e) {
			e = document.head.appendChild(svg('svg'));
			e.style.display = 'none';
			e = e.appendChild(svg('defs'));
			e.id = 'ⴻdefs';
		}
		return e;
	}
	function blur(x,y,w,h) {
		if (!x && !y) return null;
		write();
		const id = `ⴻx${x}y${y}w${w}h${h}`;
		let e = document.getElementById(id);
		if (!e) {
			const b = svg('feGaussianBlur');
			b.setAttribute('in', 'SourceGraphic');
			b.setAttribute('edgeMode', 'none');
			b.setAttribute('primitiveUnits', 'objectBoundingBox');
			b.setStdDeviation(x,y);
			e = svg('filter');
			e.id = id;
			e.x.baseVal.newValueSpecifiedUnits(2, Math.floor(-(x/w)*100));
			e.y.baseVal.newValueSpecifiedUnits(2, Math.floor(-(y/h)*100));
			e.width.baseVal.newValueSpecifiedUnits(2, Math.ceil((1 + 2*x/w)*100));
			e.height.baseVal.newValueSpecifiedUnits(2, Math.ceil((1 + 2*y/h)*100));
			e.appendChild(b);
			defs().appendChild(e);
		}
		e.refs = (e.refs || 0) + 1;
		return id;
	}
	function blurDispose(id) {
		write(); "decrement ref-count, remove element if 0."
		const e = document.getElementById(id); "presumably, does not cause reflow."
		if (!e) return;
		e.refs = (e.refs || 1) - 1;
		if (!e.refs) e.remove();
	}
	function motion(e, from, to) {
		if (!from) return layoutDiscard(to), true;
		if (!to) return false;
		const x1 = from.ax - to.ax, x2 = x1 + from.w - to.w;
		const y1 = from.ay - to.ay, y2 = y1 + from.h - to.h;
		const x = (x1>0) === (x2>0) ? Math.min(Math.abs(x1), Math.abs(x2)) : 0;
		const y = (y1>0) === (y2>0) ? Math.min(Math.abs(y1), Math.abs(y2)) : 0;
		const w = to.w, h = to.h;
		layoutDiscard(to);
		read();
		log(x,y,w,h)
		if (!w || !h || !x && !y || x>5 && y>5) return false;
		let pre = getComputedStyle(e).filter;
		write(() => {
			const id = blur(Math.floor(x), Math.floor(y), w, h);
			track.m.set(e, id);
			if (!id) return;
			const add = `url(#${CSS.escape(id)})`;
			if (pre) pre = pre.replace(/(?: |)url\("#(?:ⴻ|%E2%B4%BB)[^]+/, '');
			"Why are filters not applied/found, making elems invisible?"
				"Seriously."
			if (!pre || pre === 'none') e.style.filter = add;
			else e.style.filter = pre+' '+add;
		});
		return true;
	}
	function track(e) {
		if (!track.m) track.m = new Map, track.start = 0;
		track.m.set(e, null);
		if (!scheduled) read(clean), scheduled = true;
	}
	function trackAll() {
		if (!track.m) track.m = new Map;
		read();
		track.start = now();
		try { track.m.forEach(trackOne) }
		catch (err) { if (err !== null) throw log('ⴻ', err), err }
	}
	function trackOne(id, e) {
		track.m.delete(e);
		if (now() - track.start > 10)
			throw e.style && e.style.filter && write(() => removeProperty(e, 'filter')), null;
		"Why do e[prev] and layout(e) return the same readings. Except when they don't (in which case, layout change is read, not visual change… except when it's visual…)."
			"Do we have to integrate with clean more closely, maybe call trackAll after cleaning, with all froms remembered?…"
		if (!motion(e, e[prev], layout(e)))
			e.style && e.style.filter && write(() => removeProperty(e, 'filter'));
		"Why is it still possible to not clear style but clear the filter element…"
		id && write(() => blurDispose(id));
	}



	function lock(e) {
		"Only parent or child, never both — wild.",
		`Fail if e or its parents or children were locked.
		"(In other words, if any ancestors were locked directly, or if e was locked in/directly.)"
			"(here, locks.get(e) is: >0 — indirect, <0 — direct, void — neither.)"`
		if (locks.has(e)) return false;
		let p;
		for (p = e.parentNode; p && p !== self && p !== document; p = p.parentNode)
			if (locks.get(p) < 0) return false;
		const a = [];
		for (p = e; p && p !== self && p !== document; p = p.parentNode)
			a.push(p);
		if (!a.length) return false;
		lockArr(e, a), setTimeout(unlockArr, dur, e, a);
		return true;
	}
	function lockArr(e,a) {
		let i;
		for (i = 0; i < a.length; ++i)
			if (!locks.has(a[i])) locks.set(a[i], 1);
			else if (locks.get(a[i]) > 0) locks.set(a[i], locks.get(a[i]) + 1);
			else if (locks.get(a[i]) < 0) locks.set(a[i], locks.get(a[i]) - 1);
			else throw "Zero-locks detected (should be not in the map at all)";
		if (!locks.has(e)) throw "array does not contain e";
		if (locks.get(e)<0) throw "Directly locked twice";
		locks.set(e, -locks.get(e));
	}
	function unlockArr(e,a) {
		let i;
		for (i = 0; i < a.length; ++i)
			if (locks.get(a[i]) > 1) locks.set(a[i], locks.get(a[i]) - 1);
			else if (locks.get(a[i]) < -1) locks.set(a[i], locks.get(a[i]) + 1);
			else locks.delete(a[i]);
		if (!locks.has(e)) throw "array does not contain e";
		if (locks.get(e)>0) throw "Directly unlocked what has not been directly locked";
		locks.set(e, -locks.get(e));
	}



	function box(e, color = 'royalblue') {
		const l = layout(e);
		showBox(l.p, l.x, l.y, l.w, l.h, color);
		layoutDiscard(l);
	}
	function showBox(p, x,y,w,h, color = 'royalblue') {
		"For debugging, to show the from/to boxes, to ensure that transforms move like foxes."
		const from = { p,x,y,w,h, ix:null }
		if (!intoSameSpace(from, document.documentElement)) return;
		write(() => {
			const e = document.createElement('div');
			const s = e.style;
			s.border = '3px solid ' + color;
			s.left = (from.x || 0) + 'px';
			s.top = (from.y || 0) + 'px';
			s.width = (from.w || 0) + 'px';
			s.height = (from.h || 0) + 'px';
			s.borderRadius = '3px';
			s.boxSizing = 'border-box';
			document.documentElement.append(e);
			read(() => {
				write(() => {
					fadeOut(e);
					e.classList.add('ⴻvoid');
					setTimeout(() => e.remove(), dur);
				});
			});
		});
	}



	function anchor(e = void 0) {
		("The last pointer-moved-over element (anchor) will try to stay in its viewport position through layout changes, by scrolling the document.")
		if (e) {
			const r = layout(e);
			if (!r) return anchor.e = void 0;
			anchor.e = e;
			anchor.x = r.ox + r.cw/2;
			anchor.y = r.oy + r.ch/2;
			layoutDiscard(r);
		} else if (anchor.e) {
			finish.s = 1;
			const r = layout(anchor.e);
			if (!r) return anchor.e = void 0;
			const sc = document.scrollingElement || document.documentElement;
			const dx = Math.round(anchor.x - (r.ox + r.cw/2));
			const dy = Math.round(anchor.y - (r.oy + r.ch/2));
			layoutDiscard(r);
			if (!dx || !dy) return;
			log('scroll:', dx, dy); //#
			finish.s = 2;
			sc.scrollLeft += dx; //#
			sc.scrollTop += dy; //#
			"Should we try to turn it on now? Well, we'll see how applicable it is now."
		}
	}



	function alpha(e) {
		if (alpha.a.has(e)) return alpha.a.get(e);
		if (e && e !== self && e !== document && e.nodeType === 1) {
			const s = getComputedStyle(e);
			let r;
			if (s.visibility === 'hidden' || s.display === 'none') r = 0;
			else r = alpha(e.parentNode) * (+s.opacity || 1);
			alpha.a.set(e, r);
			return r;
		} else return 1;
	}
	function layout(e) {
		read(); "Return an object describing e's layout, relative to parent where possible."
		"x/y/w/h/cx/cy/cw/ch/ix/iy/sx/sy/c/a could be mid-transition, but p/ox/oy are unaffected."
		const er = clientRect(e);
		if (!er || !e.nodeType) return null;
		const ax = er.x + scrollX, ay = er.y + scrollY; "absolute x/y"
		const s = getComputedStyle(e.nodeType === 1 ? e : document.documentElement);
		if (s.display === 'none' || s.position === 'sticky') return null;
		const p = getContainer(e,s);
		if (!p || !p.nodeType || p.nodeType !== 1) return null;
		const pr = clientRect(p), ps = getComputedStyle(p);
		if (!pr) return null;
		const px = pr.x - p.scrollLeft - parseFloat(ps.paddingLeft);
		const py = pr.y - p.scrollTop - parseFloat(ps.paddingTop);
		const x = er.x - px, y = er.y - py;
		let ox,oy; "offset x/y"
		if (e.nodeType !== 1)
			ox = Math.round(x), oy = Math.round(y);
		else if (e.offsetParent === p.offsetParent)
			ox = e.offsetLeft - p.offsetLeft, oy = e.offsetTop - p.offsetTop;
		else
			ox = e.offsetLeft, oy = e.offsetTop;
		const w = Math.ceil(er.width), h = Math.ceil(er.height);

		const padLeft = parseFloat(s.paddingLeft), padTop = parseFloat(s.paddingTop);
		const cx = er.x - p.scrollLeft - padLeft;
		const cy = er.y - p.scrollTop - padTop;
		let cw,ch; "content x/y/w/h"
		if (e.nodeType !== 1) {
			(".scrollWidth/Height round their values.")
			cw = e.scrollWidth - Math.floor(padLeft + parseFloat(s.paddingRight));
			ch = e.scrollHeight - Math.floor(padTop + parseFloat(s.paddingBottom));
		} else
			cw = Math.round(w), ch = Math.round(h);
		if (!isFinite(cw)) cw = Math.round(w), ch = Math.round(h);

		let ix = null, iy = null; "inline x/y"
		if (e.nodeType !== 1 || s.display.indexOf('block')<0) {
			const r = clientRects(e);
			if (r && r.length) ix = Math.round(r[0].x - px), iy = Math.round(r[0].y - py);
		}
		let sx = 0, sy = 0; "scale x/y (the transform origin to offset for scale to look ok)"
		if (s.transformOrigin) {
			const str = s.transformOrigin;
			sx = parseFloat(str), sy = parseFloat(str.slice(str.indexOf(' ') + 1));
		}
		`${"And a color, to better match the fading out looks in case the applied styles change."}
			And the alpha, to even better match the looks.`
		const c = s.color, a = alpha(e);
		
		if (layout.a.length) {
			const o = layout.a.pop();
			o.p=p, o.ax=ax, o.ay=ay, o.ox=ox,o.oy=oy, o.x=x, o.y=y, o.w=w, o.h=h;
			o.cx=cx, o.cy=cy, o.cw=cw, o.ch=ch, o.ix=ix, o.iy=iy, o.sx=sx, o.sy=sy, o.c=c, o.a=a;
			return o;
		} else return { p, ax,ay, ox,oy, x,y,w,h, cx,cy,cw,ch, ix,iy, sx,sy, c,a };
	}
	function getContainer(e,s) {
		let p;
		if (s.position === 'fixed')
			for (p = e.parentNode; p && p !== self && p !== document; p = p.parentNode) {
				("Returned style object is live, so it should be already cached.")
				s = getComputedStyle(p);
				if (s.transform !== 'none') break;
				if (s.perspective !== 'none') break;
				if (s.filter !== 'none') break;
			}
		else p = s.position === 'absolute' ? e.offsetParent || e.parentNode : e.parentNode;
		return !p || p === document ? document.documentElement : p;
	}
	function intoSameSpace(l, as) {
		read();
		if (!l.p || !as) return l;
		const lr = l.p[prev], asr = as[prev];
		if (!lr || !asr) return;
		const dx = lr.ax - asr.ax, dy = lr.ay - asr.ay;
		l.ox += Math.round(dx), l.oy += Math.round(dy);
		if (l.ix !== null) l.ix += dx, l.iy += dy;
		l.x += dx, l.cx += Math.round(dx);
		l.y += dy, l.cy += Math.round(dy);
		l.p = as;
		return l;
	}
	function seekImages(e) {
		if (e.nodeType===1 && e.tagName === 'IMG' && !e.complete) {
			write(() => imageInsUndos.set(e, fadeIn(e)));
			imageShowIds.set(e, setTimeout(showImage, 1000, e));
			e.addEventListener('load', showImage, once);
		}
		for (let ch = e.firstChild; ch; ch = ch.nextSibling) seekImages(ch);
	}
	function showImage(e) {
		if (e.target) e = e.target;
		if (!imageShowIds.has(e)) return;
		e.removeEventListener('load', showImage, once);
		clearTimeout(imageShowIds.get(e)), imageShowIds.delete(e);
		write(imageInsUndos.get(e)), imageInsUndos.delete(e);
	}
	function appeared(e) {
		if (!e[prev]) e[prev] = null;
		look(e), touch(e), spread(e), seekImages(e);
	}
	function moved(e) {
		read();
		if (e === document.body) layoutDiscard(e[prev]), e[prev] = void 0;
		if (e.classList && e.classList.contains('ⴻvoid')) return false;
		const from = e[prev], to = look(e, false) || from && void 0;
		if (from === void 0) return true;
		if (!from || !to) return false;

		let dx,dy, sx,sy, scaled;
		try {
			if (e.nodeType !== 1 || !e.nodeType) return false;
			const s = getComputedStyle(e);
			if (s.display.indexOf('block')<0) return false;
			if (!intoSameSpace(from, to.p)) return false;
			//const m = motion(e, from, to); "motion blur should be moved out of here, removing this"
			//if ((e.style.transform || 'none') !== 'none') return m; "and this"
			if ((s.transform || 'none') !== 'none') return false;
			sx = from.w / to.w, sy = from.h / to.h;
			dx = from.ox - to.ox, dy = from.oy - to.oy;
			scaled = isFinite(sx) && isFinite(sy) && (sx !== 1 || sy !== 1);
			if (!dx && !dy && !scaled) return false;
			if (Math.abs(from.w - to.w) > 1000 || Math.abs(from.h - to.h) > 1000)
				return "Doesn't look so good — do not take this route", false;
			if (!lock(e)) return false;
			box(e);
		} finally { layoutDiscard(from) }
		const tosx = to.sx, tosy = to.sy;

		write(() => {
			snap(e, true);
			if (scaled)
				e.style.transform = `translate(${dx + tosx * (sx-1)}px,${dy + tosy * (sy-1)}px) scale(${sx},${sy})`;
			else
				e.style.transform = `translate(${dx}px,${dy}px)`;
			read(() => write(() => {
				snap(e, false), removeProperty(e, 'transform');
				setTimeout(() => read(() => look(e)), dur);
			}));
		});
		return true;
	}



	"look updates layout info and applies animations",
	"touch marks as dirty; if a dirty one moved since last time, its dirtiness spreads to layout siblings/parent/children, but if it did not move, it becomes shiny to prevent back-flow."
	let lastDirty = 0, timeToMove, offscreenSkip; 'ms'
	"timeToMove is the max duration of a read phase — read+write should not exceed 1/60 seconds."
	{"Prioritize on-screen by skipping 40% off-screen before processing.",
		"Those that took too long to process, free (spread if unseen though)."}

	"…It literally takes 3-4 ms to set up, and only THEN it can actually do anything useful."
		"What. Why."
		"If that is so, maybe we should base timeToMove on how much time has passed or something?"
	function look(e, discard = true) {
		if (!e) return;
		const from = e[prev], to = e[prev] = layout(e);
		log('look');
		if (from === void 0) return void touch(e);
		if (!from)
			return void write(() => {
				const f = fadeIn(e);
				f && read(() => write(f));
			});
		if (!to) return void absoluteFadeout(e, from, document.documentElement);
		else if (discard) layoutDiscard(from);
		return to;
	}
	function touch(e, time = now()) {
		if (!e || dirty.has(e) || shiny.has(e)) return;
		if (e === document.documentElement) return;
		dirty.set(e, time);
		if (!scheduled) read(clean), scheduled = true;
	}
	function spread(e, time = now()) {
		neighbors(e, time);
		touch(e.parentNode, time);
		for (var n = e.firstChild; n; n = n.nextSibling) touch(n, time);
	}
	function alone(e) {
		if (e.nodeType !== 1 || !e.nodeType) return false;
		const s = getComputedStyle(e); 'Presumed already cached.'
		return s.position === 'absolute' || s.position === 'fixed';
	}
	function neighbors(e, time = now()) {
		if (alone(e)) return;
		let n;
		for (n = e.previousSibling; n && alone(n); n = n.previousSibling);
		touch(n, time);
		for (n = e.nextSibling; n && alone(n); n = n.nextSibling);
		touch(n, time);
	}
	function clean() {
		read();
		anchor.e && anchor(anchor.e);
		trackAll();
		start = now(), cur = 0, len = Math.min(dirty.size, 24);
		"We also limit the number of offscreen checks to len."
		if (start - lastDirty > 1000) timeToMove = 50, offscreenSkip = 20;
		else if (start - lastDirty > 100) timeToMove = 20, offscreenSkip = 8;
		else if (start - lastDirty > 10) timeToMove = 5, offscreenSkip = 2;
		else timeToMove = 1, offscreenSkip = 0;
		try { dirty.forEach(cleanOne) }
		catch (err) { if (err !== null) throw log('ⴻ', err), err }
		shiny.clear();
		if (dirty.size || track.m.size) nextFrame(() => read(clean)), scheduled = true;
		else scheduled = false;
		lastDirty = now();
	}
	function offscreen(e) {
		const r = clientRect(e);
		if (!r) return false;
		if (r.right <= 0 || r.bottom <= 0) return true;
		if (r.left >= innerWidth || r.top >= innerHeight) return true;
		return false;
	}
	function cleanOne(time, e) { "(keys/values are swapped for map's forEach for some reason.)"
		dirty.delete(e);
		if (e.parentNode && e.parentNode[prev] === void 0) touch(e.parentNode, time);
		const at = now();
		if (at - time > timeToMove)
			e[prev] === void 0 && spread(e, time), look(e), shiny.add(e);
		else if (cur++ < len && now() - start < offscreenSkip && offscreen(e))
			dirty.set(e, time);
		else
			moved(e) ? (dirty.set(e, time), spread(e, time)) : shiny.add(e);
		if (at - start > timeToMove) throw null;
	}



	{"Browsers batch layout/style updates, and when needed, open all gates."
		"This means that interleaving style reads and writes freely is very bad for performance."
		"Instead, batch functions to be done on read/write and then finish them."}
	function read(f = void 0) {
		if (f) finish.r.push(f), finishLater();
		else if (finish.s !== 1) throw console.error('not in read'), new Error("not in read");
	}
	function write(f = void 0) {
		if (f) finish.w.push(f), finishLater();
		else if (finish.s !== 2) throw console.error('not in write'), new Error("not in write");
	}
	function clientRect(e) {
		if (!e || !e.parentNode) return null;
		const r = clientRectGetterFor(e);
		if (!finish.rects.has(e)) read(), finish.rects.set(e, r.getBoundingClientRect());
		return finish.rects.get(e);
	}
	function clientRects(e) {
		if (!e || !e.parentNode) return null;
		read();
		return clientRectGetterFor(e).getClientRects();
	}
	function clientRectGetterFor(e) {
		if (e.getClientRects) return e;
		const r = document.createRange();
		r.selectNode(e);
		return r;
	}
	function finishLater() { if (!finish.b) nextFrame(finish), finish.b = true }
	function finish() {
		if (finish.now) return;
		finish.now = true;
		try {
			finish.rects.clear(), alpha.a.clear();
			let i;
			while (finish.r.length || finish.w.length) {
				finish.s = 1;
				log('r')
				for (i=0; i < finish.r.length; ++i) finish.r[i]();
				finish.r.length = 0;
				finish.s = 2;
				log('w')
				for (i=0; i < finish.w.length; ++i) finish.w[i]();
				finish.w.length = 0;
				finish.rects.clear(), alpha.a.clear();
				if (finish.r.length) document.body.offsetLeft, log('anew');
				else anchor.e && anchor();
			}
		} catch (err) { log('ⴻ', err); throw err }
		finally {
			finish.s = finish.w.length = finish.r.length = 0;
			finish.now = finish.b = false;
		}
	}
}catch(err){console.log('ⴻ', err)}})()
