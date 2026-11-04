/**
    cspell: words FOUC qncht unitless

    <qnc-help-tip> is for adding popovers with help text.

    It is an INLINE element.

    Required markup:

    ```
    <qnc-help-tip data-popover-text="...">
        some special term
        <button data-help-tip-toggler type="button">?</button>
    </help-tip>
    ```

    OR

    ```
    <qnc-help-tip data-popover-html="...">
        some special term
        <button data-help-tip-toggler type="button">?</button>
    </help-tip>
    ```

    The popover content will be injected inside:

    <div class="qnc-help-tip-popover">
        <div>
            [CONTENT]
        </div>
    </div>

    The inner div is the "scroll container".

    The element with the `data-help-tip-toggler` button is called the "toggle button". You can actually have as many of these as you want, in any DOM position within the help-tip. They can be styled however you want.

    Note that we apply NO VISIBLE STYLES to the help-tip element until the user activates the popover.

    The popover can only be activated by clicking one of the toggle buttons. Hovering over the <qnc-help-tip> is NOT sufficient to open it. We MIGHT implement an option to allow open-on-hover, but it will be strictly opt-in. And if we do, we'll have to implement (intelligent) close-on-mouse-out (it's confusing to users if it opens on hover and can't be closed by moving mouse away).

    The popover uses a native html popover (with `popover=auto`). This means the popover can be "light dismissed" by clicking outside of it (including on the button which opened it) or pressing escape.

    While the popover is active, the element will have an "open" attribute set. You can use this in your stylesheet to visually identify the bounds of the help-tip, by applying background, underline, etc. You can also set the open attribute via html to have the help tip open immediately (will cause FOUC, though).

    The popover is NOT modal. You can still interact with other elements while the popover is active (including elements within the help-tip). External clicks will close the popover, but they will NOT be blocked.

    The contents of the qnc-help-tip (apart from the `data-help-tip-toggler` button) MAY be interactive (and have their own hover/click/keydown listeners). The only element on which we listen for events is the toggle button.

    The popover will be displayed centered above the help-tip, when space permits. If there is insufficient space above, it will be displayed below.

    The popover does NOT prevent scrolling. It uses CSS anchor positioning, so the popover will stay next to its help-tip while scrolling.


    Programmatic control/events:
    Similar to a native details element, we respond to an "open" attribute and property. We also dispatch toggle events AFTER our openness changes. We do not dispatch beforetoggle, however.

    Browser requirements:
    - pretty much any modern browser, except for stripped-down mobile browsers
    - we COULD implement support for Opera Mobile, but it would require a fallback for css-anchor positioning (actually, I think popovers are viewport-centered by default, which might be a sufficient fallback for Opera Mobile)

    About implementing an "open-on-hover" option:
    - we'll have to implement close-on-mouseout logic
    - we'll have to ensure that neither opening nor closing can easily be triggered too easily
    - we'll have to document that when using this option, your content should not have any hover listeners/styles

    Later, we MIGHT implement support for a `--help-tip-alignment` custom css property, which lets you specify preferred sides for the popover.

    


    Implementation notes:
    - lazily creates the popover, and destroys it as soon as it is closed
    - checks current state in toggle button click; if popover was "recently" open, be sure to close the popover; track "recently" open by toggling a boolean in a 0s timeout after the toggle event
    - dynamically generates a unique anchor name when the popover is opened
    - sets key positioning styles directly on the popover, but otherwise leaves it unstyled
 */

const style_sheet = new CSSStyleSheet();

// Note: 0-specificity selector lets users override this trivially in their stylesheet by defining them on qnc-help-tip
// This is approach is "non-dom-mutating", and has zero external stylesheet dependencies
// Only works because <qnc-help-tip> on its own has no visual effect (until opened)
// Ie, these styles will never cause FOUC
// TODO: document these in README, how the user is allowed to change
style_sheet.replaceSync(`
    :where(qnc-help-tip) {
        --qncht-h-margin: 12px;
        --qncht-v-margin: 12px;
        --qncht-connector-width: 9;
        --qncht-connector-height: 12;
        --qncht-min-width: 0px;
        --qncht-max-width: 400px;
    }
    :where(qnc-help-tip[open]) {
        text-decoration: underline dotted;
    }
    :where(.qnc-help-tip-popover) {
        filter: drop-shadow(gray 0 0 3px);
    }
    :where(.qnc-help-tip-bubble) {
        padding: 5px 10px;
        border: 1px solid black;
        border-radius: 5px;
        background: white;
    }
    :where(.qnc-help-tip-scroller) {
    } 
`);
document.adoptedStyleSheets.push(style_sheet);

function parse_styles(qnc_help_tip: HTMLElement) {
    const style = getComputedStyle(qnc_help_tip);

    function require_number(name: string): number {
        const val = Number(style.getPropertyValue(name));
        if (isNaN(val)) throw new Error(`${name} must be a unitless number`);
        return val;
    }

    function normalize_length(name: string): string {
        const val = style.getPropertyValue(name);
        /**
            0 is a valid CSS length IN MOST CONTEXTS, so we support it.
            Unfortunately, it doesn't work when used inside calc(), which we do with some of our properties. For those, we make sure to normalize 0 -> 0px
        */
        if (val.trim() == "0") return "0px";
        /*
            If the user provides a unitless length and we don't do this, things break in hard-to-debug ways
        */
        if (!isNaN(Number(val)))
            throw new Error(
                `${name} must be a valid css length; it cannot be a unitless number`,
            );
        return val;
    }

    return {
        h_margin: normalize_length("--qncht-h-margin"),
        v_margin: normalize_length("--qncht-v-margin"),
        min_width: normalize_length("--qncht-min-width"),
        max_width: normalize_length("--qncht-max-width"),
        connector_width: require_number("--qncht-connector-width"),
        connector_height: require_number("--qncht-connector-height"),
    };
}
type Styles = ReturnType<typeof parse_styles>;

export class QncHelpTip extends HTMLElement {
    static observedAttributes = ["open"];

    static #nextId = 0;

    #popover: HTMLElement | null = null;
    // This will be updated in a 0s timeout after toggle events
    // It helps us identify when multiple simultaneous things trigger the closing of the popover
    #asyncUpdatedIsOpen = false;

    // Set during click events, cleared in toggle events.
    #clickedToggler: HTMLElement | null = null;

    constructor() {
        super();
        // Delegated, so toggle buttons can be anywhere within us, even if added later.
        this.addEventListener("click", (event) => {
            const target = event.target;
            if (!(target instanceof Element)) return;
            const toggler = target.closest("[data-help-tip-toggler]");
            if (!toggler || toggler.closest("qnc-help-tip") !== this) return;
            this.#onTogglerClick(toggler);
        });
    }

    connectedCallback() {
        if (this.hasAttribute("open")) this.#open();
    }

    disconnectedCallback() {
        this.#popover?.hidePopover();
        this.#popover?.remove();
        this.#popover = null;
        this.style.removeProperty("anchor-name");
    }

    attributeChangedCallback(name: string) {
        if (name !== "open" || !this.isConnected) return;
        if (this.hasAttribute("open")) {
            this.#open();
        } else {
            this.#popover?.hidePopover();
            this.#popover?.remove();
            this.#popover = null;
            this.style.removeProperty("anchor-name");
        }
    }

    // sync open attribute with a property
    get open() {
        return Boolean(this.#popover?.matches(":popover-open"));
    }
    set open(value: boolean) {
        this.toggleAttribute("open", value);
    }

    #onTogglerClick(toggler: Element) {
        const shouldOpen = !this.#asyncUpdatedIsOpen;
        if (shouldOpen && toggler instanceof HTMLElement) {
            this.#clickedToggler = toggler;
        }
        this.toggleAttribute("open", !this.#asyncUpdatedIsOpen);
    }

    #open() {
        // Clean up any already-existing popover
        if (this.#popover) {
            this.#popover.hidePopover();
            this.#popover.remove();
        }

        const anchorName = `--qnc-help-tip-${QncHelpTip.#nextId++}`;
        this.style.setProperty("anchor-name", anchorName);
        const styles = parse_styles(this);

        /*
            Layout:
            popover
                scroller
                connector
        */

        const target_rect = this.getBoundingClientRect();
        const popover = document.createElement("div");
        const bubble = document.createElement("div");
        const scroller = document.createElement("div");
        popover.setAttribute("popover", "auto");

        /* 
            We want the popover to be short enough so that if the target is centered on screen, the popover can fit either above or below it
            This ensures that "anchor positioning" flips seamlessly when the page is scrolled
        */
        const max_available_height = `calc(${document.documentElement.clientHeight / 2}px - ${styles.v_margin} - ${target_rect.height}px - 2px)`;

        const max_available_width = `calc( ${document.documentElement.clientWidth}px - 2 * ${styles.h_margin})`;

        popover.classList.add("qnc-help-tip-popover");
        const extra_class = this.getAttribute("data-popover-class");
        if (extra_class) popover.classList.add(extra_class);
        popover.setAttribute(
            "style",
            `
                position-anchor: ${anchorName};
                position-area: top;
                justify-self: anchor-center;
                position-try-fallbacks: flip-block;
                inset: auto;
                box-sizing: border-box;
                overflow: visible;
                display: flex;
                flex-direction: column;
                min-width: min(${styles.min_width}, ${max_available_width});
                max-width: min(${styles.max_width}, ${max_available_width});
                max-height: ${max_available_height};
                margin: ${styles.v_margin} ${styles.h_margin};
                margin-bottom: ${styles.connector_height}px;

                padding: 0;
                border: none;
                border-radius: 0;
                background: transparent;
            `,
        );

        bubble.classList.add("qnc-help-tip-bubble");
        bubble.setAttribute(
            "style",
            `
            overflow: hidden;
            min-width: 0; 
            min-height: 0;
            flex-grow: 1;
            display: flex;
            flex-direction: column;
            white-space: pre-wrap;
        `,
        );
        popover.appendChild(bubble);

        scroller.classList.add("qnc-help-tip-scroller");
        scroller.setAttribute(
            "style",
            `
                overflow: auto; min-width: 0; min-height: 0;
                flex-grow: 1;
            `,
        );
        bubble.appendChild(scroller);
        const html = this.getAttribute("data-popover-html");
        if (html !== null) {
            scroller.innerHTML = html;
        } else {
            scroller.textContent = this.getAttribute("data-popover-text") ?? "";
        }

        popover.addEventListener("toggle", (event: ToggleEvent) => {
            this.#clickedToggler = null;
            const isOpen = event.newState == "open";
            if (!isOpen) {
                // this might have been triggered by light-dismissal, might have been triggered by one of our own .hidePopover() calls
                this.#popover?.hidePopover();
                this.#popover?.remove();
                this.#popover = null;
                this.style.removeProperty("anchor-name");
                this.removeAttribute("open");
            }
            setTimeout(() => {
                this.#asyncUpdatedIsOpen = isOpen;
            });
            this.dispatchEvent(
                new Event("toggle", { bubbles: true, cancelable: false }),
            );
        });

        document.body.append(popover);
        this.#popover = popover;
        const options: ShowPopoverOptions = {};
        const source =
            this.#clickedToggler ||
            this.querySelector("[data-help-tip-toggler]");
        if (source instanceof HTMLElement) {
            options.source = source;
        }
        popover.showPopover(options);

        append_connector(this, popover, bubble, styles);
    }
}

/**
    Must be called after the help_tip is already connected to the DOM (since we use getComputedStyle) AND the popover is rendered (since we use getBoundingClientRect)
 */
function append_connector(
    help_tip: HTMLElement,
    popover: HTMLElement,
    bubble: HTMLElement,
    styles: Styles,
) {
    const connector = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "svg",
    );

    const bubble_style = getComputedStyle(bubble);
    const { connector_width, connector_height } = styles;
    const border_width = parseFloat(bubble_style.borderBottomWidth);
    const border_radius = parseInt(bubble_style.borderRadius);
    const border_color = bubble_style.borderBottomColor;
    const background_color = bubble_style.backgroundColor;

    // Some basic geometry gives...
    const Y = connector_width / 2;
    const H = connector_height;
    const inner_connector_lift =
        (border_width * (Y * Y + H * H) ** 0.5) / Y / H;

    connector.setAttribute("viewBox", `0 0 2 1`);
    connector.setAttribute("preserveAspectRatio", "none");
    connector.setAttribute(
        "style",
        `
            width: ${connector_width}px;    
            height: ${connector_height}px;    
            position: absolute;
            overflow: hidden;
        `,
    );
    connector.innerHTML = `
        <path d="M 0,0 L 1,1 L 2,0 Z" fill="${border_color}" />
        <path d="M 0,0 L 1,1 L 2,0 Z" fill="${background_color}" style="transform: translateY(-${inner_connector_lift}px);"/>
    `;

    popover.appendChild(connector);

    const position_connector = () => {
        const target_rect = help_tip.getBoundingClientRect();
        const popover_rect = popover.getBoundingClientRect();

        const min_horizontal_inset =
            connector_width / 2 + border_width + border_radius;

        // relative to viewport
        const x_overlap_min = Math.max(target_rect.x, popover_rect.x);
        const x_overlap_max = Math.min(
            target_rect.x + target_rect.width,
            popover_rect.x + popover_rect.width,
        );
        const x_overlap_center = (x_overlap_min + x_overlap_max) / 2;

        // relative to popover_rect's left edge
        const overlap_center_left_coordinate =
            x_overlap_center - popover_rect.x;
        const left_clamped = Math.max(
            overlap_center_left_coordinate,
            min_horizontal_inset,
        );
        const fully_clamped = Math.min(
            left_clamped,
            popover_rect.width - min_horizontal_inset,
        );

        connector.style.left = fully_clamped + "px";

        if (popover_rect.top < target_rect.top) {
            // popover is above target
            connector.style.top = `calc( 100% - ${border_width}px )`;
            connector.style.bottom = "";
            connector.style.transform = "translateX(-50%)";
        } else {
            // popover is below target
            connector.style.top = "";
            connector.style.bottom = `calc( 100% - ${border_width}px )`;
            connector.style.transform = "rotateZ(180deg) translateX(-50%)";
        }
    };
    const onscroll = () => {
        if (!popover.isConnected) {
            window.removeEventListener("scroll", onscroll);
            connector.remove();
        } else position_connector();
    };
    window.addEventListener("scroll", onscroll, true);

    position_connector();
}

customElements.define("qnc-help-tip", QncHelpTip);
