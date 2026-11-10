# qnc_help_tip
<!-- cspell: words qncht unitless scroller beforetoggle -->

`<qnc-help-tip>` is a dependency-free custom element for adding help popovers to inline text. It uses the native HTML Popover API and CSS anchor positioning.

## Usage

Import the module (it registers the element):

```html
<script type="module" src="/dist/qnc_help_tip.js"></script>
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
  <div popover="auto" class="qnc-help-tip-popover">
    <div class="qnc-help-tip-bubble">
      <div class="qnc-help-tip-scroller"><!-- content--></div>
    </div>
  </div>
  ```

- It is a `popover="auto"` popover, so it closes on external click or pressing Escape. It is not modal and does not block scrolling.
- It is anchored with CSS anchor positioning: centered above the help tip, flipping below when there is not enough room, and staying attached while scrolling.

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

We inject the following styles* into your page. Feel free to override any of them.

```cs
qnc-help-tip {
    --qncht-h-margin: 12px;
    --qncht-v-margin: 12px;
    --qncht-connector-width: 9;
    --qncht-connector-height: 12;
    --qncht-min-width: 0px;
    --qncht-max-width: 400px;
}
.qnc-help-tip-popover {
    filter: drop-shadow(gray 0 0 3px);
}
.qnc-help-tip-bubble {
    padding: 5px 10px;
    border: 1px solid black;
    border-radius: 5px;
    background: white;
}
.qnc-help-tip-scroller {
} 
```

*Note: our styles actually use `:where(...)` selectors, so that they have 0 specificity. If you use the selectors we've suggested above, your styles will override ours.

Note that we set various *other* styles directly in the style attributes of these elements. The inline styles are *not* meant to be overridden.

The custom properties on `<qnc-help-tip>` actually impact the popover, as follows:

| property | default | description | 
| - | - | - |
| --qncht-h-margin |  12px | any css length; minimum horizontal padding between popover and window | 
| --qncht-v-margin |  12px | any css length; minimum vertical padding between popover and window | 
| --qncht-min-width |  0px | any css length; see "Sizing" section | 
| --qncht-max-width |  400px | any css length; see "Sizing" section |
| --qncht-connector-width |  9 | unitless int or float; sets width of the triangle connector (in pixels) | 
| <span style="white-space: nowrap;">--qncht-connector-height</span> |  12 | unitless int or float; sets height of the triangle connector (in pixels) | 

### Different Classes

If you want multiple classes of popovers with different styles (eg. one style for "short content" and another one for "long content"), you can add a `data-popover-class` to the `qnc-help-tip` element. This class will be added to the `qnc-help-tip-popover` element. Eg:

```html
<style>
    .big-popover {
        filter: drop-shadow(gray 0 0 30px);
    }
    .big-popover > .qnc-help-tip-bubble {
        padding: 30px;
        border: 6px solid black;
    }
</style>
<qnc-help-tip
    data-popover-class="big-popover"
    data-popover-html="...">...</qnc-help-tip>
```

## Styling Tips

1. Keep a small amount of `padding-right` on the .qnc-help-tip-scroller; otherwise italic text might get cut off slightly.
2. Put all of the padding on the .qnc-help-tip-scroller if you want content to render tight-to-the-border when scrolling. Otherwise, put (most of) the padding on the .qnc-help-tip-popover (while still respecting the previous rule).
3. Chrome's `alert` dialogs have all padding OUTSIDE the scroller, BUT they also have dynamically-toggled "overflow indicators", just like Alex has in some projects.


## Popover sizing

The popover's size can be affected by:
- its content
- --qncht-min-width
- --qncht-max-width 
- the viewport width (and --qncht-h-margin)
- the viewport height (and the target height, --qncht-v-margin, and --qncht-connector-heigh)

Horizontally, it starts out at --qncht-min-width and grows as needed to fit its content up to a maximum of --qncht-max-width. Then, if it doesn't fit within the viewport (along with --qncht-h-margin on each side), it will be made narrower to fit. It's content will scroll horizontally if necessary.

Vertically, the popover takes up as much space as needed. We ensure it stays short enough that if the target is centered in the viewport, the popover (along with the triangle connector and --qncht-v-margin) can fit entirely above (or below) the target. This ensures the popover can "flip sides" seamlessly as the target is scrolled in the viewport, and the popover will never obscure the target.

## Programmatic control

- The `open` attribute and `open` property work like those of `<details>`. Notice: setting the open attribute in HTML opens the popover on page load, which may cause a flash of unstyled content.
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
