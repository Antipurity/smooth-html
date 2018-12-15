(function() {try{
	"Allocates memory hideously.";
	"Fade-out clones elements, so matching CSS rules may change (if they depended on their still-alive parents), and removed elements may look different before they disappear.";

	"Page code using element.className (and not .classList), or reading all classes, may break.",
	"Page code reading children of document.documentElement may break (that is where clones of removed nodes get put to die neatly)."
	"Page code manipulating element.style.transform might break (it is used for position transitions).";

	if (typeof self === ''+void 0) return;
	const log = console.log;
	const prev = Symbol('prevLayout');
	finish.r = [], finish.w = [], finish.s = 0, finish.rects = new Map;

	const isFinite = Number.isFinite, parseFloat = Number.parseFloat;
	if (!self.MutationObserver)
		return console.info('Browser does not support MutationObserver — cannot smooth');
	const once = { capture:true, once:true, passive:true }, many = { capture:true, passive:true };
	if (!self.requestAnimationFrame)
		return console.info('Browser does not support requestAnimationFrame — cannot smooth');
	if (!self.performance)
		return console.info('Browser does not support performance — cannot smooth');
	const nextFrame = self.requestAnimationFrame.bind(self);
	const now = self.performance.now.bind(self.performance);
	const dirty = new Set, shiny = new Set;
	let scheduled = false, start, cur, len;



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
		for (let e of document.getElementsByTagName('IMG'))
			write(() => { hide(e), show(e, false) });

		read(() => {
			{"Including this script and transition.css in a page directly, and having <body class=ⴻvoid>, will make it fade in."}
				("Though it's enough to just have (in addition to the class):",
					"css, .ⴻvoid  {  opacity: 0;  filter: blur(2px);  visibility: hidden  }",
					"js, `setTimeout(()=>document.body.classList.remove('ⴻvoid'), 100)` or the like.")
			if (document.body.classList.contains('ⴻvoid'))
				write(() => show(document.body, false));
			else if ("scripts didn't inject so late")
				"document.body would have faded in great";
		});

		addEventListener('resize', () => read(() => touch(document.body)), many);
		addEventListener('transitionstart', evt => evt.target && read(() => touch(evt.target)), many);
		addEventListener('transitionend', evt => evt.target && read(() => look(evt.target)), many);
		if (!self.PointerEvent)
			addEventListener('mousemove', point, many);
		else
			addEventListener('pointermove', point, many);
		let lastPoint = now();
		function point(evt) {
			if (now() - lastPoint < 300) return;
			lastPoint = now();
			evt.target && read(() => {
				touch(evt.target);
				anchor(evt.target);
			});
		}
	}
	function on(a) {
		read(() => {
			try {
				let i,n;
				for (i=0; i < a.length; ++i) {
					touch(a[i].target), neighbors(a[i]);
					if (a[i].type === 'childList') {
						a[i].addedNodes.forEach(appeared);
						a[i].removedNodes.forEach(moved);
					}
				}
			}catch(err){log(err)}
		});
	}
	function removeProperty(e, prop) {
		write();
		e.style.removeProperty(prop);
		if (!e.style.length) e.removeAttribute('style');
	}
	function unclass(e, ...k) {
		write();
		e.classList.remove(...k);
		if (!e.classList.length) e.removeAttribute('class');
	}



	function hide(e, imm = true) {
		write();
		if (e.nodeType !== 1) return;
		snap(e, imm);
		e.classList.add('ⴻvoid');
	}
	function show(e, imm = true) {
		write();
		if (e.nodeType !== 1) return;
		snap(e, false);
		if (!imm && e.tagName === 'IMG' && e.complete && e.naturalWidth === 0) {
			const id = setTimeout(e => write(() => show(e)), 1000, e);
			e.addEventListener('load', () => { clearTimeout(id), write(() => show(e)) }, once);
		} else unclass(e, 'ⴻvoid');
	}
	function snap(e, to = true) {
		write();
		if (e === document.body) return;
		if (e.nodeType === 1) to ? e.classList.add('ⴻsnap') : unclass(e, 'ⴻsnap');
	}
	function absoluteRemove(e, from, into) {
		read();
		if (e.parentNode) return;
		if (!e || !from || !from.p) return;
		const oldPL = from.p[prev] || layout(from.p);
		intoSameSpace(from, into);
		e = e.cloneNode(true);
		write(() => {try{
			if (e.nodeType !== 1) {
				const p = document.createElement('span');
				p.style.display = 'inline';
				p.appendChild(e);
				e = p;
			}
			if (from.ix !== null) {
				const p = document.createElement('div');
				p.style.width = oldPL.cw + 'px';
				p.style.height = oldPL.ch + 'px';
				const sp = document.createElement('span');
				sp.style.display = 'inline-block';
				sp.style.width = (from.ix - from.x) + 'px';
				sp.style.height = (from.iy - from.y) + 'px';
				p.appendChild(sp);
				p.appendChild(e);
				e = p;
			}
			e.style.display = 'block';
			e.style.position = 'absolute';
			e.style.margin = 0;
			e.style.left = from.x + 'px';
			e.style.top = from.y + 'px';
			e.style.width = from.w + 'px';
			e.style.height = from.h + 'px';
			e.style.zIndex = 9999;
				"doesn't seem to work reliably"
			e.style.pointerEvents = 'none';
			e.style.userSelect = e.style.MozUserSelect = 'none';
			snap(e);
			into.append(e);
			read(() => {
				const to = layout(e);
				if (Math.round(from.w)!==Math.round(to.w) || Math.round(from.h)!==Math.round(to.h))
					write(() => e.remove());
				else
					write(() => {
						hide(e, false);
						setTimeout(() => e.remove(), 200);
						{"200ms is hardcoded", "since laziness can be afforded."}
					})
			});
		}catch(err){log(err)}});
	}



	function layout(e) {
		read();
		const er = clientRect(e);
		if (!er || !e.nodeType) return;
		const s = getComputedStyle(e.nodeType === 1 ? e : document.documentElement);
		if (s.display === 'none' || s.position === 'sticky') return;
		const p = getContainer(e,s);
		const pr = clientRect(p), ps = getComputedStyle(p);
		if (!pr) return;
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
		return { p, ox,oy, x,y,w,h, cx,cy,cw,ch, ix,iy, sx,sy };
	}
	function getContainer(e,s) {
		let p;
		if (s.position === 'fixed')
			for (p = e.parentNode; p && p !== self && p !== document; p = p.parentNode) {
				("Returned object is live, so it should be already cached.")
				s = getComputedStyle(p);
				if (p.transform !== 'none') break;
				if (p.perspective !== 'none') break;
				if (p.filter !== 'none') break;
			}
		else
			p = s.position === 'absolute' ? e.offsetParent || e.parentNode : e.parentNode;
		return !p || p === document ? document.documentElement : p;
	}
	function intoSameSpace(l, as) {
		read();
		if (!l.p || !as) return l;
		const lr = clientRect(l.p), asr = clientRect(as);
		const dx = lr.x - asr.x, dy = lr.y - asr.y;
		l.ox += Math.round(dx), l.oy += Math.round(dy);
		if (l.ix !== null) l.ix += dx, l.iy += dy;
		l.x += dx, l.cx += Math.round(dx);
		l.y += dy, l.cy += Math.round(dy);
		l.p = as;
		return l;
	}
	function appeared(e) { if (!e[prev]) e[prev] = null;  touch(e), spread(e) }
	function ancestorsTransforming(e) {
		let p,s;
		for (p = e.parentNode; p && p !== self && p !== document; p = p.parentNode) {
			s = getComputedStyle(p); "Presumably, already cached."
			if (s.transform !== 'none') return true;
		}
	}
	function moved(e) {
		read();
		const from = e[prev], to = e[prev] = layout(e);
		if (e === document.body) return spread(e), false;
		if (from === void 0) return false;
		if (!from)
			return void write(() => {
				hide(e), read(() => write(() => show(e, false)));
			}) || false;
		if (!to) return void absoluteRemove(e, from, document.documentElement) || false;
		if (e.nodeType !== 1 || !e.nodeType) return false;
		const s = getComputedStyle(e);
		if (s.display.indexOf('block')<0) return false;
		if (s.transform !== 'none') return false;
		if (ancestorsTransforming(e)) return false;
		intoSameSpace(from, to.p);
		const tx = Math.round(from.ox + from.sx - (to.ox + to.sx));
		const ty = Math.round(from.oy + from.sy - (to.oy + to.sy));
		"sometimes, seems to be off (on the scale of about 8px — varies) — why?"
			"calculations seem to be not entirely correct…"
		if (!tx && !ty) return false;
		if (from.w > 500 || from.h > 500)
			return "Doesn't look so good — do not take this route", false;
		"does it silently take time to update practically-invisible movements? how would we know?"
		write(() => {
			const sx = from.w / to.w, sy = from.h / to.h;
			const t = `translate(${tx}px,${ty}px)`;
			snap(e, true);
			if (isFinite(sx) && isFinite(sy) && (sx !== 1 || sy !== 1))
				e.style.transform = `${t} scale(${sx},${sy})`;
			else
				e.style.transform = t;
			read(() => write(() => {
				snap(e, false), removeProperty(e, 'transform');
			}));
		});
		return true;
	}



	function anchor(e = void 0) {
		if (e) {
			const r = layout(e);
			if (!r) return anchor.e = void 0;
			anchor.e = e;
			anchor.x = r.ox + r.cw/2;
			anchor.y = r.oy + r.ch/2;
		} else if (anchor.e) {
			finish.s = 1;
			const r = layout(anchor.e);
			if (!r) return anchor.e = void 0;
			const sc = document.scrollingElement || document.documentElement;
			const dx = Math.round(anchor.x - (r.ox + r.cw/2));
			const dy = Math.round(anchor.y - (r.oy + r.ch/2));
			if (!dx || !dy) return;
			//log('scroll:', dx, dy);
			finish.s = 2;
			//sc.scrollLeft += dx;
			//sc.scrollTop += dy;
			"While a great idea, doesn't seem to work."
		}
		("The last pointer-moved-over element (anchor) will try to stay in its viewport position through layout changes, by scrolling the document.")
	}



	function look(e) { if (e) e[prev] = layout(e) }
	function touch(e) {
		if (!e || dirty.has(e) || shiny.has(e)) return;
		if (e === document.documentElement) return;
		dirty.add(e);
		if (!scheduled) read(clean), scheduled = true;
	}
	function spread(e) {
		neighbors(e);
		touch(e.parentNode);
		for (var n = e.firstChild; n; n = n.nextSibling) touch(n);
	}
	function alone(e) {
		if (e.nodeType !== 1 || !e.nodeType) return false;
		const s = getComputedStyle(e);
		return s.position === 'absolute' || s.position === 'fixed';
	}
	function neighbors(e) {
		if (alone(e)) return;
		let n;
		for (n = e.previousSibling; n && alone(n); n = n.previousSibling);
		touch(n);
		for (n = e.nextSibling; n && alone(n); n = n.nextSibling);
		touch(n);
	}
	function clean() {
		read();
		anchor.e && anchor(anchor.e);
		start = now(), cur = 0, len = Math.min(dirty.size, 24);
		try { dirty.forEach(cleanOne) }
		catch (err) { if (err !== null) throw log(err), err }
		shiny.clear();
		if (dirty.size) nextFrame(() => read(clean)), scheduled = true;
		else scheduled = false;
	}
	function offscreen(n) {
		const r = clientRect(n);
		if (!r) return false;
		if (r.right <= 0 || r.bottom <= 0) return true;
		if (r.left >= innerWidth || r.top >= innerHeight) return true;
		return false;
	}
	function cleanOne(n) {
		dirty.delete(n);
		{"Prioritize on-screen by skipping 30% off-screen."}
		if (cur++ < len && now() - start < 3 && offscreen(n))
			dirty.add(n);
		else
			moved(n) ? (dirty.add(n), spread(n)) : shiny.add(n);
		if (now() - start > (10^'ms')) throw null;
	}



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
		try {
			finish.rects.clear();
			let i;
			while (finish.r.length || finish.w.length) {
				finish.s = 1;
				for (i=0; i < finish.r.length; ++i) finish.r[i]();
				finish.r.length = 0;
				finish.s = 2;
				for (i=0; i < finish.w.length; ++i) finish.w[i]();
				finish.w.length = 0;
				finish.rects.clear();
				if (finish.r.length) document.body.offsetLeft;
				else anchor.e && anchor();
			}
		} catch (err) { log(err); throw err }
		finally { finish.s = finish.w.length = finish.r.length = 0, finish.b = false }
	}
}catch(err){console.log(err)}})()
