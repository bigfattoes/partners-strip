# ActivateMe Fest partners strip

A white, auto-scrolling strip of partner, club and academy logos for
activatemefest.com, styled like the homepage stats strip. Static files only.
There's no build step and no framework.

| File | What it is |
|---|---|
| `partners.json` | **The list.** One line per logo. Edit this to add, remove or reorder partners. |
| `logos/` | Logo files (`<file>.webp`). To use a sharper original, drop it in with the same name. `.png` and `.svg` work too if you write the extension in `partners.json`, e.g. `"file": "mwan.svg"`. |
| `embed.js` | Draws the strip. Used by both embed options below. |
| `index.html` | The page the iframe loads. |
| `demo.html` | Test page showing the script embed under a stand-in stats strip. |
| `_headers` | Cloudflare Pages caching and CORS rules. |

## Editing partners

In `partners.json`, each logo is one line:

```json
{ "name": "Tesla", "file": "tesla" },
```

`name` is the alt text and the hover tooltip. You can add `"url": "https://…"` to make
a logo clickable. Each group has a `label` (the small grey caption) and a `row`
(1 = top row, 2 = bottom row in the two-row layout). `"layout": "b"` sets the
default layout (`"a"` = one row). Changes go live about 5 minutes after the
commit reaches `main`, because of caching.

## Hosting (Cloudflare Pages)

Workers & Pages → Create → Pages → Connect to Git → `bigfattoes/partners-strip`:

- Production branch: `main`
- Framework preset: None
- Build command: *(leave empty)*
- Build output directory: `/`
- Root directory: *(leave empty)*

Custom domain (optional): Pages project → Custom domains → add, e.g.
`partners.activatemefest.com`. Then use that domain in place of
`<project>.pages.dev` in the snippets below.

## For the website developers

Put **one** of these on the homepage, directly after the stats strip's closing
tag (the white band with "40+ Inspirational talks… 100+ Clubs & Academies").
Both are full width and white.

### Option 1: iframe (safest in any CMS)

```html
<iframe src="https://<project>.pages.dev/" title="ActivateMe Fest partners"
  loading="lazy" style="display:block;width:100%;height:180px;border:0"></iframe>
```

The strip fills whatever height you give the iframe (120–260px), on desktop and
mobile. Optional URL settings: `?layout=a` (one row) or `?layout=b` (two rows),
and `?h=140` to force a height.

### Option 2: script (no fixed height, can't be broken by site CSS)

```html
<script src="https://<project>.pages.dev/embed.js" async></script>
```

The strip appears exactly where the tag is placed. It runs inside a Shadow DOM,
so the site's CSS can't affect it, and it uses the site's font for the captions.
Optional attributes: `data-layout="a"` or `"b"`, and `data-h="160"` for the
height in px (default 180). The space is reserved right away, so nothing jumps
on the page. Logos only load when the strip is near the screen.

### Behaviour

- Scrolls slowly in an endless loop and pauses on hover or keyboard focus.
- Logos fade out at the left and right edges.
- If the visitor has "reduce motion" turned on, there's no auto-scroll and the
  logos can be swiped or scrolled sideways instead.
- If the list fails to load, the strip removes itself and leaves no empty box.
