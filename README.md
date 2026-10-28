# qnc_help_tip

`<qnc-help-tip>` is a dependency-free custom element for adding help popovers to inline text. It uses the native HTML Popover API and CSS anchor positioning.

## Usage

Import the module (it registers the element) and the default stylesheet:

```html
<script type="module" src="/dist/qnc_help_tip.js"></script>
<!-- We actually recommend you use something like esbuild and @import our stylesheet into your base stylesheet -->
<!-- Note: you _may_ omit this, as long as you review it and add equivalent/conforming styles to your stylesheet -->
<link rel="stylesheet" href="node_modules/@qnc/qnc_help_tip/qnc_help_tip.css">
```

Plain-text help:

```html
<qnc-help-tip data-popover-text="The special term means...">
    some special term
    <button data-help-tip-toggler type="button">?</button>
</qnc-help-tip>
```

HTML help:

```html
<qnc-help-tip data-popover-html="<strong>HTML</strong> with a <a href='#'>link</a>.">
    some special term
    <button data-help-tip-toggler type="button">?</button>
</qnc-help-tip>
```

## How it works

- The element is inline and applies no visible styles until opened.
- Only clicking an element with `data-help-tip-toggler` opens or closes the popover. Hovering does nothing. A help tip may have any number of togglers, anywhere inside it.
- The popover is created lazily, appended to `<body>`, and destroyed when closed. Its structure is:

  ```html
  <div class="qnc-help-tip-popover" popover="auto">
      <div><!-- content; this inner div is the scroll container --></div>
  </div>
  ```

- It is a `popover="auto"` popover, so it closes on external click or pressing Escape. It is not modal and does not block scrolling.
- It is anchored with CSS anchor positioning: centered above the help tip, flipping below when there is not enough room, and staying attached while scrolling.

## Styling

- Style popovers with the `.qnc-help-tip-popover` class. [src/qnc_help_tip.css](src/qnc_help_tip.css) is a working starting point, and describes the required styles.
- While open, the `<qnc-help-tip>` element has an `open` attribute, so you can highlight it:

  ```css
  qnc-help-tip[open] { background: #ffe9a8; }
  ```

## Programmatic control

- The `open` attribute and `open` property work like those of `<details>`. Setting the attribute in HTML opens the popover on load, which may cause a flash of unstyled content.
- A `toggle` event (bubbling, not cancelable) is dispatched after the open state changes. There is no `beforetoggle`.

## Browser support

Modern browsers with support for the Popover API and CSS anchor positioning.

## Known issue: width + scrollbars

Our default styles set width to (pseudo code) `min(400px, 100vw - 2*horizontal_margin)`. This works well on ALMOST any device. 

The only exception is when the user is using a browser with "always-visible" scrollbars (AFAIK, no modern browser is setup this way by default, but desktop browsers let you opt-in to this behaviour). In this setup, 100vw INCLUDES the space occupied by the vertical scroll bar, so the scrollbar might cover up part of the popover. This isn't likely to be a problem, however, since such browser windows are almost going to be wider than 400px.

I don't think there is any simple pure-css solution to this problem. We _could_ add code to check, after the popover is opened, if it is covered by scroll bar (and if so, reduce max-width accordingly).

## Known issue: height + scrollbars

Our default styles set max-height to `calc(100vh - 2 * var(--window-v-margin))`. This works well on ALMOST any device. 

The only exception is when the user is using a browser with "always-visible" scrollbars (AFAIK, no modern browser is setup this way by default, but desktop browsers let you opt-in to this behaviour). In this setup, 100vh INCLUDES the space occupied by the horizontal scroll bar, so the scrollbar might cover up part of the popover. 

So this is only a problem when:
- your site has a horizontal scroll bar
- the user is using a browser with "always visible scroll bars"
- the popover content is taller than available screen space

I don't think there is any simple pure-css solution to this problem. We _could_ add code to check, after the popover is opened, if it is covered by scroll bar (and if so, reduce max-height accordingly).

## Known issue: target-covering

The popover will ONLY scroll vertically if its content is taller than the available viewport space. It will cover up the `qnc-help-tip` element before this happens.

A better algorithm would be to let users define a `--min-height-before-target-gets-covered`. If there is this much space available, then the popover will scroll vertically before it's allowed to cover the target. If there is less than this much space, the popover can take up the entire viewport.

Note that you _could_ just set a more constrained max-height (eg. 50vh), which would sort of do the same thing. That approach, however, does not let the popover take up all of the available space when the target is near the top or bottom edge of the viewport.

## Development

```sh
npm install
npm run build   # compile src/ to dist/ with tsc
npm start       # build, watch, and serve tests/index.html
```

[tests/index.html](tests/index.html) contains manual test cases, each with a description of the expected behavior.
