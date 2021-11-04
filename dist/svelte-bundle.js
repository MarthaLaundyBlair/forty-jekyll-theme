
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
(function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.43.1' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/Quadratic.svelte generated by Svelte v3.43.1 */

    const file = "src/Quadratic.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[35] = list[i];
    	child_ctx[37] = i;
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[38] = list[i];
    	child_ctx[37] = i;
    	return child_ctx;
    }

    // (515:8) {:else}
    function create_else_block(ctx) {
    	let p;
    	let br;
    	let t;

    	const block = {
    		c: function create() {
    			p = element("p");
    			br = element("br");
    			t = text("Currently this quadratic calc.ulator is only set to solve quadratics\n                with real solutions.");
    			add_location(br, file, 516, 16, 17172);
    			add_location(p, file, 515, 12, 17152);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, br);
    			append_dev(p, t);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(515:8) {:else}",
    		ctx
    	});

    	return block;
    }

    // (510:8) {#if compWithComplex}
    function create_if_block_6(ctx) {
    	let p;
    	let br;
    	let t;

    	const block = {
    		c: function create() {
    			p = element("p");
    			br = element("br");
    			t = text("Currently this quadratic calc.ulator is set to solve quadratics with\n                both real and complex solutions.");
    			add_location(br, file, 511, 16, 16985);
    			add_location(p, file, 510, 12, 16965);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, br);
    			append_dev(p, t);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6.name,
    		type: "if",
    		source: "(510:8) {#if compWithComplex}",
    		ctx
    	});

    	return block;
    }

    // (523:12) {#if count > 0}
    function create_if_block_5(ctx) {
    	let span0;
    	let t0_value = /*approx*/ ctx[11].Solution1 + "";
    	let t0;
    	let br0;
    	let t1;
    	let span1;
    	let t2_value = /*approx*/ ctx[11].Solution2 + "";
    	let t2;
    	let br1;

    	const block = {
    		c: function create() {
    			span0 = element("span");
    			t0 = text(t0_value);
    			br0 = element("br");
    			t1 = space();
    			span1 = element("span");
    			t2 = text(t2_value);
    			br1 = element("br");
    			attr_dev(span0, "class", "x1");
    			add_location(span0, file, 523, 14, 17378);
    			add_location(br0, file, 523, 56, 17420);
    			attr_dev(span1, "class", "x2");
    			add_location(span1, file, 524, 14, 17441);
    			add_location(br1, file, 524, 56, 17483);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span0, anchor);
    			append_dev(span0, t0);
    			insert_dev(target, br0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, span1, anchor);
    			append_dev(span1, t2);
    			insert_dev(target, br1, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*approx*/ 2048 && t0_value !== (t0_value = /*approx*/ ctx[11].Solution1 + "")) set_data_dev(t0, t0_value);
    			if (dirty[0] & /*approx*/ 2048 && t2_value !== (t2_value = /*approx*/ ctx[11].Solution2 + "")) set_data_dev(t2, t2_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span0);
    			if (detaching) detach_dev(br0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(span1);
    			if (detaching) detach_dev(br1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(523:12) {#if count > 0}",
    		ctx
    	});

    	return block;
    }

    // (543:5) {#if showStep1}
    function create_if_block_4(ctx) {
    	let h4;

    	const block = {
    		c: function create() {
    			h4 = element("h4");
    			h4.textContent = "Quadratic Formula Method-";
    			add_location(h4, file, 543, 6, 17758);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h4, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h4);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(543:5) {#if showStep1}",
    		ctx
    	});

    	return block;
    }

    // (551:32) {#if showStep1}
    function create_if_block_3(ctx) {
    	let h6;
    	let t0;
    	let t1_value = /*i*/ ctx[37] + 1 + "";
    	let t1;

    	const block = {
    		c: function create() {
    			h6 = element("h6");
    			t0 = text("Step ");
    			t1 = text(t1_value);
    			add_location(h6, file, 551, 28, 17978);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h6, anchor);
    			append_dev(h6, t0);
    			append_dev(h6, t1);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h6);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(551:32) {#if showStep1}",
    		ctx
    	});

    	return block;
    }

    // (549:12) {#each steps as step, i}
    function create_each_block_1(ctx) {
    	let div;
    	let t0;
    	let span0;
    	let t1_value = /*step*/ ctx[38].comment + "";
    	let t1;
    	let br0;
    	let t2;
    	let span1;
    	let t3_value = /*step*/ ctx[38].formula + "";
    	let t3;
    	let br1;
    	let if_block = /*showStep1*/ ctx[7] && create_if_block_3(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (if_block) if_block.c();
    			t0 = space();
    			span0 = element("span");
    			t1 = text(t1_value);
    			br0 = element("br");
    			t2 = space();
    			span1 = element("span");
    			t3 = text(t3_value);
    			br1 = element("br");
    			attr_dev(span0, "class", "comment");
    			add_location(span0, file, 553, 24, 18062);
    			add_location(br0, file, 553, 67, 18105);
    			attr_dev(span1, "class", "formula");
    			add_location(span1, file, 554, 24, 18136);
    			add_location(br1, file, 554, 67, 18179);
    			attr_dev(div, "class", "step");
    			add_location(div, file, 549, 24, 17883);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if (if_block) if_block.m(div, null);
    			append_dev(div, t0);
    			append_dev(div, span0);
    			append_dev(span0, t1);
    			append_dev(div, br0);
    			append_dev(div, t2);
    			append_dev(div, span1);
    			append_dev(span1, t3);
    			append_dev(div, br1);
    		},
    		p: function update(ctx, dirty) {
    			if (/*showStep1*/ ctx[7]) {
    				if (if_block) ; else {
    					if_block = create_if_block_3(ctx);
    					if_block.c();
    					if_block.m(div, t0);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty[0] & /*steps*/ 512 && t1_value !== (t1_value = /*step*/ ctx[38].comment + "")) set_data_dev(t1, t1_value);
    			if (dirty[0] & /*steps*/ 512 && t3_value !== (t3_value = /*step*/ ctx[38].formula + "")) set_data_dev(t3, t3_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(549:12) {#each steps as step, i}",
    		ctx
    	});

    	return block;
    }

    // (559:6) {#if isSquare}
    function create_if_block(ctx) {
    	let t;
    	let each_1_anchor;
    	let if_block = /*showPart1*/ ctx[8] && create_if_block_2(ctx);
    	let each_value = /*parts*/ ctx[10];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			t = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, t, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (/*showPart1*/ ctx[8]) {
    				if (if_block) ; else {
    					if_block = create_if_block_2(ctx);
    					if_block.c();
    					if_block.m(t.parentNode, t);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty[0] & /*parts, showPart1*/ 1280) {
    				each_value = /*parts*/ ctx[10];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(t);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(559:6) {#if isSquare}",
    		ctx
    	});

    	return block;
    }

    // (560:28) {#if showPart1}
    function create_if_block_2(ctx) {
    	let h4;

    	const block = {
    		c: function create() {
    			h4 = element("h4");
    			h4.textContent = "Factorisation Method-";
    			add_location(h4, file, 560, 8, 18318);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h4, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h4);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(560:28) {#if showPart1}",
    		ctx
    	});

    	return block;
    }

    // (567:9) {#if showPart1}
    function create_if_block_1(ctx) {
    	let h6;
    	let t0;
    	let t1_value = /*i*/ ctx[37] + 1 + "";
    	let t1;

    	const block = {
    		c: function create() {
    			h6 = element("h6");
    			t0 = text("Step ");
    			t1 = text(t1_value);
    			add_location(h6, file, 567, 8, 18499);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h6, anchor);
    			append_dev(h6, t0);
    			append_dev(h6, t1);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h6);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(567:9) {#if showPart1}",
    		ctx
    	});

    	return block;
    }

    // (565:7) {#each parts as part, i}
    function create_each_block(ctx) {
    	let div;
    	let t0;
    	let span0;
    	let t1_value = /*part*/ ctx[35].comment + "";
    	let t1;
    	let br0;
    	let t2;
    	let span1;
    	let t3_value = /*part*/ ctx[35].formula + "";
    	let t3;
    	let br1;
    	let t4;
    	let if_block = /*showPart1*/ ctx[8] && create_if_block_1(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (if_block) if_block.c();
    			t0 = space();
    			span0 = element("span");
    			t1 = text(t1_value);
    			br0 = element("br");
    			t2 = space();
    			span1 = element("span");
    			t3 = text(t3_value);
    			br1 = element("br");
    			t4 = space();
    			attr_dev(span0, "class", "comment");
    			add_location(span0, file, 569, 14, 18550);
    			add_location(br0, file, 569, 57, 18593);
    			attr_dev(span1, "class", "formula");
    			add_location(span1, file, 570, 14, 18614);
    			add_location(br1, file, 570, 57, 18657);
    			attr_dev(div, "class", "part");
    			add_location(div, file, 565, 13, 18447);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if (if_block) if_block.m(div, null);
    			append_dev(div, t0);
    			append_dev(div, span0);
    			append_dev(span0, t1);
    			append_dev(div, br0);
    			append_dev(div, t2);
    			append_dev(div, span1);
    			append_dev(span1, t3);
    			append_dev(div, br1);
    			append_dev(div, t4);
    		},
    		p: function update(ctx, dirty) {
    			if (/*showPart1*/ ctx[8]) {
    				if (if_block) ; else {
    					if_block = create_if_block_1(ctx);
    					if_block.c();
    					if_block.m(div, t0);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty[0] & /*parts*/ 1024 && t1_value !== (t1_value = /*part*/ ctx[35].comment + "")) set_data_dev(t1, t1_value);
    			if (dirty[0] & /*parts*/ 1024 && t3_value !== (t3_value = /*part*/ ctx[35].formula + "")) set_data_dev(t3, t3_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(565:7) {#each parts as part, i}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div4;
    	let section0;
    	let h1;
    	let span;
    	let t0_value = (/*A*/ ctx[1] || "a") + "";
    	let t0;
    	let t1;
    	let sup;
    	let t3;
    	let t4_value = (/*B*/ ctx[2] || "b") + "";
    	let t4;
    	let t5;
    	let t6_value = (/*C*/ ctx[3] || "c") + "";
    	let t6;
    	let t7;
    	let t8;
    	let t9;
    	let div0;
    	let label0;
    	let t11;
    	let input0;
    	let t12;
    	let div1;
    	let label1;
    	let t14;
    	let input1;
    	let t15;
    	let div2;
    	let label2;
    	let t17;
    	let input2;
    	let t18;
    	let div3;
    	let input3;
    	let t19;
    	let label3;
    	let t21;
    	let button;
    	let t23;
    	let t24;
    	let blockquote;
    	let t25;
    	let section1;
    	let h4;
    	let t26;
    	let t27;
    	let t28_value = (/*count*/ ctx[12] === 1 ? "quadratic" : "quadratics") + "";
    	let t28;
    	let t29;
    	let t30;
    	let t31;
    	let t32;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*compWithComplex*/ ctx[0]) return create_if_block_6;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block0 = current_block_type(ctx);
    	let if_block1 = /*count*/ ctx[12] > 0 && create_if_block_5(ctx);
    	let if_block2 = /*showStep1*/ ctx[7] && create_if_block_4(ctx);
    	let each_value_1 = /*steps*/ ctx[9];
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	let if_block3 = /*isSquare*/ ctx[13] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			section0 = element("section");
    			h1 = element("h1");
    			span = element("span");
    			t0 = text(t0_value);
    			t1 = text("x");
    			sup = element("sup");
    			sup.textContent = "2";
    			t3 = text("+");
    			t4 = text(t4_value);
    			t5 = text("x+");
    			t6 = text(t6_value);
    			t7 = space();
    			t8 = text("=0");
    			t9 = space();
    			div0 = element("div");
    			label0 = element("label");
    			label0.textContent = "Coefficient a";
    			t11 = space();
    			input0 = element("input");
    			t12 = space();
    			div1 = element("div");
    			label1 = element("label");
    			label1.textContent = "Coefficient b";
    			t14 = space();
    			input1 = element("input");
    			t15 = space();
    			div2 = element("div");
    			label2 = element("label");
    			label2.textContent = "Coefficient c";
    			t17 = space();
    			input2 = element("input");
    			t18 = space();
    			div3 = element("div");
    			input3 = element("input");
    			t19 = space();
    			label3 = element("label");
    			label3.textContent = "include complex solutions";
    			t21 = space();
    			button = element("button");
    			button.textContent = "Calc.ulate";
    			t23 = space();
    			if_block0.c();
    			t24 = space();
    			blockquote = element("blockquote");
    			if (if_block1) if_block1.c();
    			t25 = space();
    			section1 = element("section");
    			h4 = element("h4");
    			t26 = text(/*count*/ ctx[12]);
    			t27 = space();
    			t28 = text(t28_value);
    			t29 = text(" calc.ulated!");
    			t30 = space();
    			if (if_block2) if_block2.c();
    			t31 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t32 = space();
    			if (if_block3) if_block3.c();
    			add_location(sup, file, 461, 27, 15587);
    			attr_dev(span, "class", "formula");
    			add_location(span, file, 460, 12, 15537);
    			add_location(h1, file, 459, 8, 15520);
    			attr_dev(label0, "for", "coef-a");
    			add_location(label0, file, 466, 12, 15700);
    			attr_dev(input0, "name", "coef-a");
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "placeholder", "enter coefficient a");
    			add_location(input0, file, 467, 12, 15754);
    			attr_dev(div0, "class", "field");
    			add_location(div0, file, 465, 8, 15668);
    			attr_dev(label1, "for", "coef-b");
    			add_location(label1, file, 475, 12, 15970);
    			attr_dev(input1, "name", "coef-b");
    			attr_dev(input1, "type", "text");
    			attr_dev(input1, "placeholder", "enter coefficient b");
    			add_location(input1, file, 476, 12, 16024);
    			attr_dev(div1, "class", "field");
    			add_location(div1, file, 474, 8, 15938);
    			attr_dev(label2, "for", "coef-c");
    			add_location(label2, file, 485, 12, 16241);
    			attr_dev(input2, "name", "coef-c");
    			attr_dev(input2, "type", "text");
    			attr_dev(input2, "placeholder", "enter coefficient c");
    			add_location(input2, file, 486, 12, 16295);
    			attr_dev(div2, "class", "field");
    			add_location(div2, file, 484, 8, 16209);
    			attr_dev(input3, "type", "checkbox");
    			attr_dev(input3, "id", "comp-complex");
    			attr_dev(input3, "name", "comp-complex");
    			add_location(input3, file, 495, 3, 16513);
    			attr_dev(label3, "for", "comp-complex");
    			add_location(label3, file, 502, 3, 16755);
    			attr_dev(div3, "class", "6u$ 12u$(small)");
    			add_location(div3, file, 494, 8, 16480);
    			add_location(button, file, 505, 8, 16833);
    			add_location(blockquote, file, 521, 8, 17322);
    			add_location(section0, file, 458, 4, 15502);
    			add_location(h4, file, 536, 8, 17610);
    			attr_dev(section1, "class", "split");
    			add_location(section1, file, 534, 4, 17577);
    			attr_dev(div4, "class", "inner");
    			add_location(div4, file, 457, 0, 15478);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, section0);
    			append_dev(section0, h1);
    			append_dev(h1, span);
    			append_dev(span, t0);
    			append_dev(span, t1);
    			append_dev(span, sup);
    			append_dev(span, t3);
    			append_dev(span, t4);
    			append_dev(span, t5);
    			append_dev(span, t6);
    			append_dev(span, t7);
    			append_dev(h1, t8);
    			append_dev(section0, t9);
    			append_dev(section0, div0);
    			append_dev(div0, label0);
    			append_dev(div0, t11);
    			append_dev(div0, input0);
    			set_input_value(input0, /*a*/ ctx[4]);
    			append_dev(section0, t12);
    			append_dev(section0, div1);
    			append_dev(div1, label1);
    			append_dev(div1, t14);
    			append_dev(div1, input1);
    			set_input_value(input1, /*b*/ ctx[5]);
    			append_dev(section0, t15);
    			append_dev(section0, div2);
    			append_dev(div2, label2);
    			append_dev(div2, t17);
    			append_dev(div2, input2);
    			set_input_value(input2, /*c*/ ctx[6]);
    			append_dev(section0, t18);
    			append_dev(section0, div3);
    			append_dev(div3, input3);
    			input3.checked = /*compWithComplex*/ ctx[0];
    			append_dev(div3, t19);
    			append_dev(div3, label3);
    			append_dev(section0, t21);
    			append_dev(section0, button);
    			append_dev(section0, t23);
    			if_block0.m(section0, null);
    			append_dev(section0, t24);
    			append_dev(section0, blockquote);
    			if (if_block1) if_block1.m(blockquote, null);
    			append_dev(div4, t25);
    			append_dev(div4, section1);
    			append_dev(section1, h4);
    			append_dev(h4, t26);
    			append_dev(h4, t27);
    			append_dev(h4, t28);
    			append_dev(h4, t29);
    			append_dev(section1, t30);
    			if (if_block2) if_block2.m(section1, null);
    			append_dev(section1, t31);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(section1, null);
    			}

    			append_dev(section1, t32);
    			if (if_block3) if_block3.m(section1, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[15]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[16]),
    					listen_dev(input2, "input", /*input2_input_handler*/ ctx[17]),
    					listen_dev(input3, "change", /*input3_change_handler*/ ctx[18]),
    					listen_dev(input3, "click", /*click_handler*/ ctx[19], false, false, false),
    					listen_dev(button, "click", /*click_handler_1*/ ctx[20], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*A*/ 2 && t0_value !== (t0_value = (/*A*/ ctx[1] || "a") + "")) set_data_dev(t0, t0_value);
    			if (dirty[0] & /*B*/ 4 && t4_value !== (t4_value = (/*B*/ ctx[2] || "b") + "")) set_data_dev(t4, t4_value);
    			if (dirty[0] & /*C*/ 8 && t6_value !== (t6_value = (/*C*/ ctx[3] || "c") + "")) set_data_dev(t6, t6_value);

    			if (dirty[0] & /*a*/ 16 && input0.value !== /*a*/ ctx[4]) {
    				set_input_value(input0, /*a*/ ctx[4]);
    			}

    			if (dirty[0] & /*b*/ 32 && input1.value !== /*b*/ ctx[5]) {
    				set_input_value(input1, /*b*/ ctx[5]);
    			}

    			if (dirty[0] & /*c*/ 64 && input2.value !== /*c*/ ctx[6]) {
    				set_input_value(input2, /*c*/ ctx[6]);
    			}

    			if (dirty[0] & /*compWithComplex*/ 1) {
    				input3.checked = /*compWithComplex*/ ctx[0];
    			}

    			if (current_block_type !== (current_block_type = select_block_type(ctx))) {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);

    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(section0, t24);
    				}
    			}

    			if (/*count*/ ctx[12] > 0) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_5(ctx);
    					if_block1.c();
    					if_block1.m(blockquote, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (dirty[0] & /*count*/ 4096) set_data_dev(t26, /*count*/ ctx[12]);
    			if (dirty[0] & /*count*/ 4096 && t28_value !== (t28_value = (/*count*/ ctx[12] === 1 ? "quadratic" : "quadratics") + "")) set_data_dev(t28, t28_value);

    			if (/*showStep1*/ ctx[7]) {
    				if (if_block2) ; else {
    					if_block2 = create_if_block_4(ctx);
    					if_block2.c();
    					if_block2.m(section1, t31);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (dirty[0] & /*steps, showStep1*/ 640) {
    				each_value_1 = /*steps*/ ctx[9];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(section1, t32);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}

    			if (/*isSquare*/ ctx[13]) if_block3.p(ctx, dirty);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    			if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			destroy_each(each_blocks, detaching);
    			if (if_block3) if_block3.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Quadratic', slots, []);

    	var isSquare = function (n) {
    		return Math.sqrt(n) === Math.round(Math.sqrt(n));
    	};

    	var simpleFraction = function (numOne, numTwo) {
    		let sign = numOne < 0 && numTwo > 0 || numOne >= 0 && numTwo < 0
    		? "-"
    		: "";

    		var num1 = Math.abs(numOne), num2 = Math.abs(numTwo);

    		for (var i = Math.max(numOne, numTwo); i > 1; i--) {
    			if (num1 % i == 0 && num2 % i == 0) {
    				num1 = num1 / i;
    				num2 = num2 / i;

    				if (num2 == 1) {
    					return {
    						fraction: `${sign}${num1}`,
    						num1: `${num1}`,
    						num2: ``,
    						sign: `${sign}`,
    						num2Stripped: `${num2}`,
    						num1Sign: `${sign}${num1}`
    					};
    				} else {
    					return {
    						fraction: `${sign}${num1}/${num2}`,
    						num1: `${num1}`,
    						num2: `/${num2}`,
    						sign: `${sign}`,
    						num2Stripped: `${num2}`,
    						num1Sign: `${sign}${num1}`
    					};
    				}
    			}
    		}

    		if (num1 == Math.abs(numOne) && num2 == Math.abs(numTwo)) {
    			return {
    				fraction: `${sign}${num1}/${num2}`,
    				num1: `${num1}`,
    				num2: `/${num2}`,
    				sign: `${sign}`,
    				num2Stripped: `${num2}`,
    				num1Sign: `${sign}${num1}`
    			};
    		}
    	};

    	var simpleSurd = function (num) {
    		let complex = num < 0 ? "i" : "";
    		var surd = Math.abs(num), factor = 1;

    		for (var i = Math.floor(Math.sqrt(surd)); i > 1; i--) {
    			if (surd % (i * i) == 0) {
    				surd = surd / (i * i);
    				factor = factor * i;
    			}
    		}

    		if (factor == 1) {
    			return {
    				fullSurd: `${complex}√${surd}`,
    				factor: `${factor}`,
    				complex: `${complex}`,
    				surd: `√${surd}`
    			};
    		} else {
    			return {
    				fullSurd: `${factor}${complex}√${surd}`,
    				factor: `${factor}`,
    				complex: `${complex}`,
    				surd: `√${surd}`
    			};
    		}
    	};

    	var squareRoot = function (num) {
    		var ans = 0;
    		var modulus = Math.abs(num);

    		if (isSquare(modulus) && modulus === num) {
    			ans = Math.sqrt(num);
    			return ans;
    		} else if (isSquare(modulus) && modulus !== num) {
    			ans = Math.sqrt(Math.abs(num));
    			return `${ans}i`;
    		} else {
    			ans = simpleSurd(num).fullSurd;
    			return ans;
    		}
    	};

    	// Quadratic Calc functions
    	var calculationParts = function (a, b, c) {
    		let A = parseFloat(a);
    		let B = parseFloat(b);
    		let C = parseFloat(c);
    		let D = B * B - 4 * A * C;
    		let isComplex = D < 0;
    		let modD = Math.abs(D);
    		let minusB = -1 * B;
    		let twoA = 2 * A;
    		let sqrtD = squareRoot(D);
    		let sqrtModD = squareRoot(modD);
    		let SObject = simpleSurd(D);

    		return {
    			a,
    			b,
    			c,
    			A,
    			B,
    			C,
    			D,
    			isComplex,
    			modD,
    			minusB,
    			twoA,
    			sqrtD,
    			sqrtModD,
    			SObject,
    			isSqr() {
    				return isSquare(this.D);
    			},
    			isComplexSqr() {
    				return this.isComplex && isSquare(this.modD);
    			}
    		};
    	};

    	var initialSteps = function (calcParts) {
    		// extract the calculation parts we need
    		let { A, B, C, D, minusB, twoA } = calcParts;

    		return [
    			{
    				comment: `We start off by noting the quadratic formula`,
    				formula: `(-b\xB1√(b\u00B2-4ac))/2a`
    			},
    			{
    				comment: `In this case we note that a=${A}, b=${B} and c=${C} which we can simply substitute in giving`,
    				formula: `(${minusB}\xB1√(${B}\u00B2-4\u00D7${A}\u00D7${C}))/(2√${A})`
    			},
    			{
    				comment: `Simplifying the denominator and discriminant gives`,
    				formula: `(${minusB}\xB1√${D})/${twoA}`
    			}
    		];
    	};

    	var squareSteps = function (calcData) {
    		let { minusB, twoA, D, sqrtD } = calcData;
    		let numeratorA = minusB + sqrtD;
    		let numeratorB = minusB - sqrtD;

    		return [
    			{
    				comment: `${D} is a perfect square which we can square root to give ${calcData.sqrtD}`,
    				formula: `(${minusB}\xB1${sqrtD})/${twoA}`
    			},
    			{
    				comment: `This can be split to give the following two cases`,
    				formula: `${numeratorA}/${twoA} and ${numeratorB}/${twoA}`
    			},
    			{
    				comment: `This simplifies to give a final answer of`,
    				formula: `${simpleFraction(numeratorA, twoA).fraction} and ${simpleFraction(numeratorB, twoA).fraction}`
    			}
    		];
    	};

    	var complexSquareSteps = function (calcData) {
    		let { minusB, twoA, sqrtModD, D, sqrtD } = calcData;
    		let component1 = simpleFraction(minusB, twoA).fraction;
    		let component2 = simpleFraction(sqrtModD, twoA).fraction;

    		return [
    			{
    				comment: `because ${D} is negative, its square root must be imaginary and is therefore given by ${sqrtD}`,
    				formula: `(${minusB}\xB1${sqrtD})/${twoA}`
    			},
    			{
    				comment: `This can be split to give the following two cases`,
    				formula: `${minusB}/${twoA}+${sqrtD}/${twoA} and ${minusB}/${twoA}-${sqrtD}/${twoA}`
    			},
    			{
    				comment: `This simplifies to give a final answer of`,
    				formula: `${component1}+${component2}i and ${component1}-${component2}i`
    			}
    		];
    	};

    	var step4NonSquare = function (calcData) {
    		let { minusB, twoA, sqrtModD, modD, D, sqrtD, SObject } = calcData;
    		var comment;

    		if (calcData.isComplex && SObject.factor != "1") {
    			comment = `${D} is negative so its square root must be imaginary and is therefore it is given by ${sqrtD} (where √${modD}=${sqrtModD})`;
    		} else if (calcData.isComplex && SObject.factor == "1") {
    			comment = `${D} is negative so its square root must be imaginary and is therefore it is given by ${sqrtD}`;
    		} else if (SObject.factor == "1") {
    			comment = `The square root of ${D} can't be simplified any further`;
    		} else {
    			comment = `The square root of ${D} simplifies to give ${sqrtD}`;
    		}

    		let formula = `(${minusB}\xB1${sqrtD})/${twoA}`;
    		return { formula, comment };
    	};

    	var step5NonSquare = function (calcData) {
    		let { minusB, twoA, sqrtD } = calcData;

    		return {
    			comment: `This can be split to give the following two cases`,
    			formula: `${minusB}/${twoA}+${sqrtD}/${twoA} and ${minusB}/${twoA}-${sqrtD}/${twoA}`
    		};
    	};

    	var step6NonSquare = function (calcData) {
    		let { minusB, twoA, SObject } = calcData;
    		var component1 = simpleFraction(minusB, twoA).fraction;
    		let result = simpleFraction(SObject.factor, twoA);

    		if (result.num1 == 1 && result.num2 == 1) {
    			var component2 = `${SObject.complex}${SObject.surd}`;
    		} else if (result.num1 == 1 && result.num2 != 1) {
    			var component2 = `${SObject.complex}${SObject.surd}${result.num2}`;
    		} else if (result.num1 != 1 && result.num2 == 1) {
    			var component2 = `${result.num1}${SObject.complex}${SObject.surd}`;
    		} else if (result.num1 != 1 && result.num2 != 1) {
    			var component2 = `${result.num1}${SObject.complex}${SObject.surd}${result.num2}`;
    		}

    		return {
    			comment: `This simplifies to give a final answer of`,
    			formula: `${component1}+${component2} and ${component1}-${component2}`
    		};
    	};

    	function calculate(useComplexNumbers) {
    		var calcData = calculationParts(a, b, c);
    		$$invalidate(1, A = calcData.A);
    		$$invalidate(2, B = calcData.B);
    		$$invalidate(3, C = calcData.C);

    		if (isNaN(parseInt(a)) || isNaN(parseInt(b)) || isNaN(parseInt(c)) || Number.isInteger(A) == false || Number.isInteger(B) == false || Number.isInteger(C) == false) {
    			$$invalidate(7, showStep1 = false);

    			$$invalidate(9, steps = [
    				{
    					comment: "Oops something went wrong!",
    					formula: "Try inputting integer coefficients instead!"
    				}
    			]);

    			$$invalidate(8, showPart1 = false);
    			$$invalidate(10, parts = [{ comment: "", formula: "" }]);
    			return {};
    		}

    		$$invalidate(12, count += 1);

    		// Set the vars for displaying the formula
    		$$invalidate(1, A = calcData.A);

    		$$invalidate(2, B = calcData.B);
    		$$invalidate(3, C = calcData.C);
    		$$invalidate(7, showStep1 = true);
    		$$invalidate(8, showPart1 = true);

    		if (calcData.isComplex && !useComplexNumbers) {
    			$$invalidate(9, steps = [
    				{
    					comment: "There is no real answer!",
    					formula: "have your tried our complex numbers flavour?"
    				}
    			]);

    			$$invalidate(7, showStep1 = false);
    			$$invalidate(12, count -= 1);
    		} else if (calcData.isSqr()) {
    			$$invalidate(9, steps = [...initialSteps(calcData), ...squareSteps(calcData)]);
    		} else if (calcData.isComplexSqr()) {
    			$$invalidate(9, steps = [...initialSteps(calcData), ...complexSquareSteps(calcData)]);
    		} else {
    			$$invalidate(9, steps = [
    				...initialSteps(calcData),
    				step4NonSquare(calcData),
    				step5NonSquare(calcData),
    				step6NonSquare(calcData)
    			]);
    		}

    		if (calcData.isSqr() && calcData.A == 1) {
    			$$invalidate(10, parts = [...factoriseInitial(calcData), ...factoriseSimple(calcData)]);
    		} else if (calcData.isSqr() && calcData.A !== 1) {
    			$$invalidate(10, parts = [...factoriseInitial(calcData), ...factoriseHard(calcData)]);
    		} else {
    			$$invalidate(8, showPart1 = false);
    			$$invalidate(10, parts = [{ comment: "", formula: "" }]);
    		}

    		$$invalidate(11, approx = approxCalculate(calcData));
    	}

    	//Factorisation Functions
    	var approxCalculate = function (calcData) {
    		let { minusB, twoA, D, modD } = calcData;

    		if (D < 0) {
    			var x1 = `${minusB / twoA} + ${Math.sqrt(modD) / twoA}i`;
    			var x2 = `${minusB / twoA} - ${Math.sqrt(modD) / twoA}i`;
    		} else {
    			var x1 = `${(minusB + Math.sqrt(D)) / twoA}`;
    			var x2 = `${(minusB - Math.sqrt(D)) / twoA}`;
    		}

    		

    		return {
    			Solution1: `Solution 1 = ${x1}`,
    			Solution2: `Solution 2 = ${x2}`
    		};
    	};

    	var factoriseInitial = function (calcData, factoriseData) {
    		let { A, B, C } = calcData;

    		return [
    			{
    				comment: `This quadratic can be solved by factorisation!`,
    				formula: `ax\u00B2 + bx + c = (px + q)(rx + s) = 0`
    			},
    			{
    				comment: `Lets start by comparing the given form to the desired form...`,
    				formula: `${A}x\u00B2 + ${B}x + ${C} = (px + q)(rx + s) = prx\u00B2 + (ps + qr)x + qs = 0 `
    			}
    		];
    	};

    	var factoriseSimple = function (calcData) {
    		let { A, B, C, minusB, twoA, D, sqrtD } = calcData;
    		let x1 = (minusB + sqrtD) / twoA;
    		let x2 = (minusB - sqrtD) / twoA;

    		return [
    			{
    				comment: `However as the coefficent of x\u00B2 (a) = 1, this problem can easily be simplified to`,
    				formula: `x\u00B2 + bx + c = (x + q)(x + s) = x\u00B2 + (q + s)x + qs = 0`
    			},
    			{
    				comment: `Comparing the coefficients of the powers of x terms tells us`,
    				formula: `${B} = q + s and ${C} = qs`
    			},
    			{
    				comment: `More simply put we need to find two numbers which add to give ${B} and multiply to give ${C}. This may take a bit of trail and error but you should end up with...`,
    				formula: `q = ${-x1} and s = ${-x2} (${-x1}\u00D7${-x2}=${C} and ${-x1}+${-x2}=${B})`
    			},
    			{
    				comment: `From this we can easily obtain the desired factorised form which we can then solve`,
    				formula: `(x + ${-x1})(x + ${-x2}) = 0`
    			},
    			{
    				comment: `The only way this can equal zero is if one of the bracketed terms is equal to zero because anything multiplied by zero returns zero. This gives us two equations as follows `,
    				formula: `x + ${-x1} = 0 and x + ${-x2} = 0`
    			},
    			{
    				comment: `We can solve these two simple equations to give us our two final solutions of`,
    				formula: `${x1} and ${x2}`
    			}
    		];
    	};

    	var factoriseHard = function (calcData) {
    		let { A, B, C, minusB, sqrtD, twoA } = calcData;
    		let numeratorA = minusB + sqrtD;
    		let numeratorB = minusB - sqrtD;
    		let p = simpleFraction(numeratorA, twoA).num2Stripped;
    		let r = simpleFraction(numeratorB, twoA).num2Stripped;
    		let q = simpleFraction(numeratorA, twoA).num1Sign;
    		let s = simpleFraction(numeratorB, twoA).num1Sign;

    		return [
    			{
    				comment: `Comparing the coefficients of the powers of x terms tells us`,
    				formula: `${A} = pr, ${B} = ps + qr and ${C} = qs`
    			},
    			{
    				comment: `This may seem initially tricky to solve by trial and error, but it gets easier with more practice!`,
    				formula: `Writing a list of possibe numbers that multiply to give ${A} and ${C} will help. Try thinking about their relationship to ${B}.`
    			},
    			{
    				comment: `We can see that ${p} \u00D7 ${r} = ${A} (a) and therefore write`,
    				formula: `(${p}x + q)(${r}x + s) = 0 `
    			},
    			{
    				comment: `We also can see that  ${q} \u00D7 ${s} = ${C} (c) and because ${B} = (${p} \u00D7 ${s}) + (${q} \u00D7 ${r}) = ${B} this allows us to write`,
    				formula: `(${p}x + ${q})(${r}x + ${s}) = 0 `
    			},
    			{
    				comment: `The only way this can equal zero is if one of the bracketed terms is equal to zero because anything multiplied by zero returns zero. This gives us two equations as follows `,
    				formula: `${p}x + ${q} = 0 and ${r}x + ${s} = 0 `
    			},
    			{
    				comment: `We can solve these two simple equations to give us our two final solutions of`,
    				formula: `${simpleFraction(numeratorA, twoA).fraction} and ${simpleFraction(numeratorB, twoA).fraction}`
    			}
    		];
    	};

    	// Variables
    	let compWithComplex = false;

    	let A = "";
    	let B = "";
    	let C = "";
    	let a = "";
    	let b = "";
    	let c = "";
    	let showStep1 = "";
    	let showPart1 = "";
    	let steps = [];
    	let parts = [];
    	let approx = [];
    	let count = 0;
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Quadratic> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		a = this.value;
    		$$invalidate(4, a);
    	}

    	function input1_input_handler() {
    		b = this.value;
    		$$invalidate(5, b);
    	}

    	function input2_input_handler() {
    		c = this.value;
    		$$invalidate(6, c);
    	}

    	function input3_change_handler() {
    		compWithComplex = this.checked;
    		$$invalidate(0, compWithComplex);
    	}

    	const click_handler = () => calculate(!compWithComplex);
    	const click_handler_1 = () => calculate(compWithComplex);

    	$$self.$capture_state = () => ({
    		isSquare,
    		simpleFraction,
    		simpleSurd,
    		squareRoot,
    		calculationParts,
    		initialSteps,
    		squareSteps,
    		complexSquareSteps,
    		step4NonSquare,
    		step5NonSquare,
    		step6NonSquare,
    		calculate,
    		approxCalculate,
    		factoriseInitial,
    		factoriseSimple,
    		factoriseHard,
    		compWithComplex,
    		A,
    		B,
    		C,
    		a,
    		b,
    		c,
    		showStep1,
    		showPart1,
    		steps,
    		parts,
    		approx,
    		count
    	});

    	$$self.$inject_state = $$props => {
    		if ('isSquare' in $$props) $$invalidate(13, isSquare = $$props.isSquare);
    		if ('simpleFraction' in $$props) simpleFraction = $$props.simpleFraction;
    		if ('simpleSurd' in $$props) simpleSurd = $$props.simpleSurd;
    		if ('squareRoot' in $$props) squareRoot = $$props.squareRoot;
    		if ('calculationParts' in $$props) calculationParts = $$props.calculationParts;
    		if ('initialSteps' in $$props) initialSteps = $$props.initialSteps;
    		if ('squareSteps' in $$props) squareSteps = $$props.squareSteps;
    		if ('complexSquareSteps' in $$props) complexSquareSteps = $$props.complexSquareSteps;
    		if ('step4NonSquare' in $$props) step4NonSquare = $$props.step4NonSquare;
    		if ('step5NonSquare' in $$props) step5NonSquare = $$props.step5NonSquare;
    		if ('step6NonSquare' in $$props) step6NonSquare = $$props.step6NonSquare;
    		if ('approxCalculate' in $$props) approxCalculate = $$props.approxCalculate;
    		if ('factoriseInitial' in $$props) factoriseInitial = $$props.factoriseInitial;
    		if ('factoriseSimple' in $$props) factoriseSimple = $$props.factoriseSimple;
    		if ('factoriseHard' in $$props) factoriseHard = $$props.factoriseHard;
    		if ('compWithComplex' in $$props) $$invalidate(0, compWithComplex = $$props.compWithComplex);
    		if ('A' in $$props) $$invalidate(1, A = $$props.A);
    		if ('B' in $$props) $$invalidate(2, B = $$props.B);
    		if ('C' in $$props) $$invalidate(3, C = $$props.C);
    		if ('a' in $$props) $$invalidate(4, a = $$props.a);
    		if ('b' in $$props) $$invalidate(5, b = $$props.b);
    		if ('c' in $$props) $$invalidate(6, c = $$props.c);
    		if ('showStep1' in $$props) $$invalidate(7, showStep1 = $$props.showStep1);
    		if ('showPart1' in $$props) $$invalidate(8, showPart1 = $$props.showPart1);
    		if ('steps' in $$props) $$invalidate(9, steps = $$props.steps);
    		if ('parts' in $$props) $$invalidate(10, parts = $$props.parts);
    		if ('approx' in $$props) $$invalidate(11, approx = $$props.approx);
    		if ('count' in $$props) $$invalidate(12, count = $$props.count);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		compWithComplex,
    		A,
    		B,
    		C,
    		a,
    		b,
    		c,
    		showStep1,
    		showPart1,
    		steps,
    		parts,
    		approx,
    		count,
    		isSquare,
    		calculate,
    		input0_input_handler,
    		input1_input_handler,
    		input2_input_handler,
    		input3_change_handler,
    		click_handler,
    		click_handler_1
    	];
    }

    class Quadratic extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {}, null, [-1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Quadratic",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    new Quadratic({
      target: document.querySelector('#quadratic-container'),
    });

})();
//# sourceMappingURL=svelte-bundle.js.map
