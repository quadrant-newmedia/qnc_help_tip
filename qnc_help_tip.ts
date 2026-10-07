/**
    TODO.

    <help-tip> is for adding tooltips with help text.

    It is an INLINE element.

    Required markup:

    ```
    <help-tip data-help-text="The special term means...">
        some special term
        <button data-help-tip-toggler type="button">?</button>
    </help-tip>
    ```

    OR:

    ```
    <help-tip data-help-html="[some html content for the tooltip, ESCAPED since it's in an html attribute]">
        some special term
        <button data-help-tip-toggler type="button">?</button>
    </help-tip>
    ```

    The element with the `data-help-tip-toggler` button is called the "toggle button". You can actually have as many of these as you want, in any DOM position within the help-tip. They can be styled however you want.

    Note that we apply NO VISIBLE STYLES to the help-tip element until the user activates the tooltip.

    The tooltip can only be activated by clicking the toggle button. Hovering over the <help-tip> is NOT sufficient to open it. We MIGHT implement an option to allow open-on-hover, but it will be strictly opt-in.

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
    
    Suggested styles for the popover:
    ```
        // fee free to change
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
    And on the help-tip itself:
    ```
        anchor-name: --help-tip;
        anchor-scope: --help-tip;
    ```
 */
export class QncHelpTip extends HTMLElement {
    private _is_open: boolean;
    private _shadow: HelpTipShadow | null = null;

    constructor() {
        super();
        this._is_open = false;
        this.addEventListener("click", (event: MouseEvent) => {
            if (!event.target) return;
            if (!(event.target instanceof HTMLElement)) return;
            const toggle_button = event.target.closest(
                "[data-help-tip-toggler]",
            );
            if (!toggle_button) return;
            if (toggle_button.closest("qnc-help-tip") != this) return;
        });
    }
    toggle() {}
    private _get_prepared_shadow(): HelpTipShadow {
        if (this._shadow) return this._shadow;
        const shadow = this.attachShadow({ mode: "closed" });
        const popover = document.createElement("undefined-custom-element"); // custom element with no styles or behaviour; used only so we have a transparent content model (meaning we can accept any content and can be used anywhere, so long as descendants don't violate content model of ancestors)")
        shadow.appendChild(popover);
        shadow.appendChild(document.createElement("slot"));
        const help_tip_shadow = {
            shadow: shadow,
            popover_element: popover,
        };

        this._shadow = help_tip_shadow;
        return help_tip_shadow;
    }
}

type HelpTipShadow = {
    readonly shadow: ShadowRoot;
    readonly popover_element: HTMLElement;
};

customElements.define("qnc-help-tip", QncHelpTip);
