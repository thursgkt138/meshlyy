# Meshlyy

Neighbourhood commerce landing page, built with Next.js, React and TypeScript.
Keep work on `feature/diagram-landing-v1`. Publication, pushes and merges require approval.

Run `npm run dev` for development. Run `npm run typecheck` and `npm run build`
before handing off changes. On PowerShell with script execution disabled, use `npm.cmd`.

The discovery map, search and basket share browser memory through `DemoProvider`.
Pickup and retailer demos use independent sample scenarios. Reloading resets all
previews. Shops, prices, routes, times and codes are illustrative; there is no
checkout, payment, location tracking or connection to live shop data.

Reusable components and original SVG illustrations are in `app/components`.
The existing logo is `public/mark.svg`; brand tokens and responsive layouts are
in `app/globals.css`. Motion is disabled by `prefers-reduced-motion`.

## Browser verification

Use Node 22+ (native WebSocket), an installed Chrome, and a dedicated headless
browser profile. No browser-test dependencies are required.

1. Build, then start with `npm run start -- --hostname 127.0.0.1 --port 3100`.
2. Launch Chrome with `--headless=new --remote-debugging-port=9223` and
   `--user-data-dir=<absolute-repository-path>/node_modules/.cache/meshlyy-browser`.
   On Windows, use `Start-Process -WindowStyle Hidden` with the installed Chrome path.
   Keep the profile outside `.next`, which builds replace.
3. Run `npm run test:preview`. Optional environment variables: `PREVIEW_URL`
   (default `http://127.0.0.1:3100`) and `CHROME_DEBUG_URL`
   (default `http://127.0.0.1:9223`). Use a local preview server only.
4. Stop the server and dedicated Chrome after verification.

The smoke check opens and closes its own browser tab. It checks native keyboard
activation, skip navigation, mobile menu focus, product search and empty states,
basket calculations and removal, pickup stages, retailer actions and resets,
accessibility-tree exposure, reduced motion, browser errors, and overflow at
320–1440px. Screenshots for visual inspection are saved under the ignored
`node_modules/.cache/meshlyy-review/` directory. This is a functional accessibility
check, not a replacement for a screen-reader audit.
