/**
    cspell: words FOUC
    TODO.

    <qnc-help-tip> is for adding tooltips with help text.

    It is an INLINE element.

    Required markup:

    ```
    <qnc-help-tip data-help-text="The special term means...">
        some special term
        <button data-help-tip-toggler type="button">?</button>
    </help-tip>
    ```

    OR:

    ```
    <qnc-help-tip data-help-html="[some html content for the tooltip, ESCAPED since it's in an html attribute]">
        some special term
        <button data-help-tip-toggler type="button">?</button>
    </help-tip>
    ```

    The element with the `data-help-tip-toggler` button is called the "toggle button". You can actually have as many of these as you want, in any DOM position within the help-tip. They can be styled however you want.

    Note that we apply NO VISIBLE STYLES to the help-tip element until the user activates the tooltip.

    The tooltip can only be activated by clicking the toggle button. Hovering over the <qnc-help-tip> is NOT sufficient to open it. We MIGHT implement an option to allow open-on-hover, but it will be strictly opt-in.

    The tooltip uses a native html popover (with `popover=auto`). This means the tooltip can be "light dismissed" by clicking outside of it (including on the button which opened it) or pressing escape.

    While the tooltip is active, the element will have an "open" attribute set. You can use this in your stylesheet to identify the "bounds" of the help-tip, by applying background, underline, etc. You can also set the open attribute via html to have the help tip appear open, initially (will cause FOUC, though).

    The tooltip is NOT modal. You can still interact with other elements while the tooltip is active (including elements within the help-tip).

    The contents of the help-tip (apart from the `data-help-tip-toggler` button) MAY be interactive (and have their own hover/click/keydown listeners). The only element on which we listen for events is the toggle button.

    The tooltip will be displayed centered above the help-tip, when space permits. If there is insufficient space above, it will be displayed below.

    The tooltip does NOT prevent scrolling. It uses CSS anchor positioning, so the tooltip will stay next to its help-tip while scrolling.

    Browser requirements:
    - pretty much any modern browser, except for stripped-down mobile browsers
    - we COULD implement support for Opera Mobile, but it would require a fallback for css-anchor positioning (actually, I think popovers are viewport-centered by default, which might be a sufficient fallback for Opera Mobile)

    About implementing an "open-on-hover" option:
    - we'll have to implement close-on-mouseout logic
    - we'll have to ensure that neither opening nor closing can easily be triggered too easily
    - we'll have to document that when using this option, your content should not have any hover listeners/styles

    Later, we MIGHT implement support for a `--help-tip-alignment` custom css property, which lets you specify preferred sides for the popover.

    Implementation notes:
    - puts the tooltip/popover inside our own shadow dom, so as not to "mess with" any external elements
    - lazily attaches shadow dom when the toggle button is first clicked; it often won't be needed
    - checks current state in toggle button click; be sure to CLOSE the popover if currently open
    
    The styles below are applied by default inside the shadow dom (anchor names are tree-scoped, so they must live there). Override them from outside with `qnc-help-tip::part(popover) { ... }`.
    ```
        --margin: 5px;
        border: 1px solid black;
        background-color: white;
        padding: 0.5em 1em;
        text-align: left;
        max-width: 300px;

        // support scrolling if content requires it
        overflow: auto;
        box-sizing: border-box;
        max-height: calc(100vh - 2 * var(--margin));

        inset: auto; // necessary for position-try-fallbacks to work on a popover element
        position: fixed;
        position-anchor: --help-tip;
        position-area: top;
        position-try-fallbacks: flip-block;
        margin: var(--margin);
    ```
    And on the help-tip itself (via :host):
    ```
        anchor-name: --help-tip;
        anchor-scope: --help-tip;
    ```
 */
export class QncHelpTip extends HTMLElement {
    private _popover: HTMLElement | null = null;

    // This will be updated on toggle events AFTER a 0s timeout
    // It helps us handle multiple events within the same event loop properly (eg. browser light-dismisses popover AND we receive a click event)
    private _async_updated_is_open = false;

    constructor() {
        super();
        this.addEventListener("click", (event: MouseEvent) => {
            console.log("handling click");
            if (!this._get_toggle_button(event)) return;
            if (this._async_updated_is_open) {
                this._hide();
            } else {
                this._show();
            }
        });
    }

    // React to changes in "open" attribute
    static observedAttributes = ["open"];
    attributeChangedCallback(
        name: string,
        old_value: string | null,
        new_value: string | null,
    ) {
        const want_open = new_value !== null;

        if (want_open) {
            if (!this._popover_is_currently_open()) {
                this._show();
            }
        } else {
            if (this._popover_is_currently_open()) {
                this._hide();
            }
        }
    }

    // Provide typed "open" property, which mirrors the attribute
    get open() {
        return this.hasAttribute("open");
    }
    set open(value: boolean) {
        this.toggleAttribute("open", value);
    }

    connectedCallback() {
        if (this.hasAttribute("open")) this._show();
    }
    private _popover_is_currently_open() {
        return this._popover && this._popover.matches(":popover-open");
    }
    private _get_toggle_button(event: Event): Element | null {
        if (!(event.target instanceof Element)) return null;
        const toggle_button = event.target.closest("[data-help-tip-toggler]");
        if (!toggle_button) return null;
        if (toggle_button.closest("qnc-help-tip") != this) return null;
        return toggle_button;
    }
    private _show() {
        const popover_element = this._get_prepared_popover();
        const html = this.getAttribute("data-help-html");
        if (html !== null) {
            popover_element.innerHTML = html;
        } else {
            popover_element.textContent =
                this.getAttribute("data-help-text") ?? "";
        }
        popover_element.showPopover();
    }
    private _hide() {
        this._popover?.hidePopover();
    }
    private _get_prepared_popover(): HTMLElement {
        if (this._popover) return this._popover;
        const shadow = this.attachShadow({ mode: "closed" });
        const style = document.createElement("style");
        style.textContent = POPOVER_CSS;
        shadow.appendChild(style);
        const popover = document.createElement("undefined-custom-element"); // custom element with no styles or behaviour; used only so we have a transparent content model (meaning we can accept any content and can be used anywhere, so long as descendants don't violate content model of ancestors)")  ; cspell: words behaviour
        popover.setAttribute("popover", "auto");
        popover.setAttribute("part", "popover");
        popover.addEventListener("toggle", (event: ToggleEvent) => {
            const now_open = event.newState == "open";
            setTimeout(() => {
                this._async_updated_is_open = now_open;
            });
            this.toggleAttribute("open", now_open);
        });
        shadow.appendChild(popover);
        shadow.appendChild(document.createElement("slot"));

        this._popover = popover;
        return popover;
    }
}

// display is set only for :popover-open, otherwise it would override the UA rule that hides closed popovers
const POPOVER_CSS = `
:host {
    anchor-name: --help-tip;
    anchor-scope: --help-tip;
}
[popover]:popover-open {
    display: block;
    --margin: 5px;
    border: 1px solid black;
    background-color: white;
    padding: 0.5em 1em;
    text-align: left;
    max-width: 300px;
    overflow: auto;
    box-sizing: border-box;
    max-height: calc(100vh - 2 * var(--margin));
    inset: auto;
    position: fixed;
    position-anchor: --help-tip;
    position-area: top;
    position-try-fallbacks: flip-block;
    margin: var(--margin);
}
`;

customElements.define("qnc-help-tip", QncHelpTip);
