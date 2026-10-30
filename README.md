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

## Styling (.qnc-help-tip-popover)

- --h-margin (12)
- --v-margin (12)
- --connector-width (9)
- --connector-height (12)
- --min-width (400px)
- --max-width (400px)

- background-


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

## Development

```sh
npm install
npm run build   # compile src/ to dist/ with tsc
npm start       # build, watch, and serve tests/index.html
```

[tests/index.html](tests/index.html) contains manual test cases, each with a description of the expected behavior.
