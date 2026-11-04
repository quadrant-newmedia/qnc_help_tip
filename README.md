# qnc_help_tip
<!-- cspell: words qncht unitless -->

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

Note: plain-text popovers use `white-space: pre-wrap;`, which is how native `alert()` dialogs work.

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
  <div popover="auto">
      <div><!-- content; this inner div is the scroll container --></div>
  </div>
  ```

- It is a `popover="auto"` popover, so it closes on external click or pressing Escape. It is not modal and does not block scrolling.
- It is anchored with CSS anchor positioning: centered above the help tip, flipping below when there is not enough room, and staying attached while scrolling.

## Styling Tips

1. Keep a small amount of padding-right on the .qnc-help-tip-popover-scroller; otherwise italic text might get cut off slightly.
2. Put all of the padding on the .qnc-help-tip-popover-scroller if you want content to render tight-to-the-border when scrolling. Otherwise, put (most of) the padding on the .qnc-help-tip-popover (while still respecting the previous rule).

## Styling

### The target element

By "target element", we're referring to the actual `<qnc-help-tip>` element, which appears inline on your page.

We recommend adding this, to prevent your targets from splitting across multiple lines:
```css
qnc-help-tip {
    display: inline-block;
}
```

We'd like to apply this style automatically, but if we did so it would cause flash-of-unstyled-content. Since we inject styles at runtime, the only styles we inject are those which only impact the target/popover when the popover is open.

While open, this element has an `open` attribute, so you can highlight or underline it. We have a default style of:

```css
qnc-help-tip[open] {
    text-decoration: underline dotted;
}
```

Feel free to override. Note: the actual rule we apply uses `:where(qnc-help-tip[open])`, which has 0 specificity so that you can override it.


### The popover

The following custom properties can all be set on `<qnc-help-tip>`, but impact the popover:

| property | default | description | 
| - | - | - |
| --qncht-h-margin |  12px | any css length; minimum horizontal padding between popover and window | 
| --qncht-v-margin |  12px | any css length; minimum vertical padding between popover and window | 
| --qncht-padding |  5px 10px |  anything accepted by `padding`; the padding inside the popover  | 
| --qncht-min-width |  400px | any css length; see "Sizing" section | 
| --qncht-max-width |  400px | any css length; see "Sizing" section |
| --qncht-font | inherit | anything accepted by `font` |
| --qncht-color | black | anything accepted by `color` |
| --qncht-border |  1px solid black | anything accepted by `border`; we recommend a solid border, because it the connector triangle is generated via SVG and always uses a solid border (matching the color and width of the main border) | 
| --qncht-border-radius |  5px | anything accepted by `border-radius` | 
| --qncht-background |  white | anything accepted by `background`; we recommend a solid background, because it will be "copied" into the connector triangle | 
| --qncht-connector-width |  9 | unitless int or float; sets width of the triangle connector (in pixels) | 
| <span style="white-space: nowrap;">--qncht-connector-height</span> |  12 | unitless int or float; sets height of the triangle connector (in pixels) | 
| --qncht-filter |  drop-shadow(gray 0 0 3px) | anything accepted by `filter`; applies to the popover | 

## Popover sizing

The popover's size can be affected by:
- its content
- --qncht-min-width (defaults to 400px)
- --qncht-max-width  (defaults to 400px)
- the viewport width (and --qncht-h-margin)
- the viewport height (and the target height, --qncht-v-margin, and --qncht-connector-heigh)

Horizontally, it starts out at --qncht-min-width and grows as needed to fit its content up to a maximum of --qncht-max-width. Then, if it doesn't fit within the viewport (along with --qncht-h-margin on each side), it will be made narrower to fit. It's content will scroll horizontally if necessary.

The default values of --qncht-min-width and --qncht-max-width are the same. This means that whenever the viewport is big enough, all popovers have a fixed width. We believe this provides the best UX. Feel free to make the min width less than the max width, if you'd prefer the popovers to have a content-depended width.

Vertically, the popover takes up as much space as needed. We ensure it stays short enough that if the target is centered in the viewport, the popover (along with the triangle connector and --qncht-v-margin) can fit entirely above (or below) the target. This ensures the popover can "flip sides" seamlessly as the target is scrolled in the viewport, and the popover will never obscure the target.

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
