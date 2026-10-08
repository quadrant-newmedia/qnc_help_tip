/**
    cspell: words FOUC

    <qnc-help-tip> is for adding popovers with help text.

    It is an INLINE element.

    Required markup:

    ```
    <qnc-help-tip data-popover="<div>The special term means...</div>">
        some special term
        <button data-help-tip-toggler type="button">?</button>
    </help-tip>
    ```

    Note that the data-popover attribute must specify the html of exactly one element. This will become the popover. We will set a few extra key attributes/styles on it.

    Other than positioning the popover, we apply no styles to it. We apply a 'qnc-help-tip-popover' class, and recommend you use that to style them all as you see fit. The popover will be created lazily, and appended to the body element. The popover will be destroyed as soon as it is closed.

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
export class QncHelpTip extends HTMLElement {
    static observedAttributes = ["open"];

    static #nextId = 0;

    #popover: HTMLElement | null = null;
    // This will be updated in a 0s timeout after toggle events
    // It helps us identify when multiple simultaneous things trigger the closing of the popover
    #asyncUpdatedIsOpen = false;

    constructor() {
        super();
        // Delegated, so toggle buttons can be anywhere within us, even if added later.
        this.addEventListener("click", (event) => {
            const target = event.target;
            if (!(target instanceof Element)) return;
            const toggler = target.closest("[data-help-tip-toggler]");
            if (!toggler || toggler.closest("qnc-help-tip") !== this) return;
            this.#onTogglerClick();
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

    #onTogglerClick() {
        this.toggleAttribute("open", !this.#asyncUpdatedIsOpen);
    }

    #open() {
        // Clean up any already-existing popover
        if (this.#popover) {
            this.#popover.hidePopover();
            this.#popover.remove();
        }

        const html = this.dataset["popover"] ?? "";
        const template = document.createElement("template");
        template.innerHTML = html;
        if (template.content.children.length !== 1) {
            console.error(
                "qnc-help-tip: data-popover must contain exactly one element",
                this,
            );
            this.removeAttribute("open");
            return;
        }
        const popover = template.content.firstElementChild;
        if (!(popover instanceof HTMLElement)) {
            console.error(
                "qnc-help-tip: data-popover must contain exactly one element",
                this,
            );
            this.removeAttribute("open");
            return;
        }

        const anchorName = `--qnc-help-tip-${QncHelpTip.#nextId++}`;
        this.style.setProperty("anchor-name", anchorName);

        popover.classList.add("qnc-help-tip-popover");
        popover.setAttribute("popover", "auto");
        popover.style.setProperty("position-anchor", anchorName);
        popover.style.setProperty("position-area", "top");
        popover.style.setProperty("justify-self", "anchor-center");
        popover.style.setProperty("position-try-fallbacks", "flip-block");
        popover.style.setProperty("inset", "auto");
        // Browsers set margin to auto by default to center the popover; clear that
        // Users are still free to override this
        popover.style.setProperty("margin", "0");

        popover.addEventListener("toggle", (event: ToggleEvent) => {
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
        popover.showPopover();
    }
}

customElements.define("qnc-help-tip", QncHelpTip);
