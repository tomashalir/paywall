# Scanbass for iPhone, iPad and Mac

This folder holds the App Store version of Scanbass. It is a small native SwiftUI app with one
codebase and two targets:

| Target | Runs on | Store |
| --- | --- | --- |
| `Scanbass-iOS` | iPhone, iPad | App Store (iOS / iPadOS) |
| `Scanbass-macOS` | Mac (native AppKit app, Apple Silicon + Intel) | Mac App Store |

Both targets bundle the existing Vite + Three.js visualizer offline and display it in a `WKWebView`.
StoreKit 2 handles a single one-time purchase, **Scanbass Pro**. Both targets use the same bundle ID,
so with Universal Purchase, buying Pro once unlocks it on every device signed in to the same
Apple Account.

```text
apple/
  project.yml              XcodeGen spec (the .xcodeproj is generated, not committed)
  Scanbass.storekit        Local StoreKit config: test purchases without App Store Connect
  Shared/                  Code shared by iOS + macOS
    ScanbassApp.swift        App entry point
    VisualizerWebView.swift  WKWebView host, file picker (macOS), navigation policy
    BundleSchemeHandler.swift  Serves web/ at scanbass://app/ (offline, stable origin)
    NativeBridge.swift       JS <-> Swift messages (store.getState / purchase / restore, keep-awake)
    StoreManager.swift       StoreKit 2: product, purchase, restore, entitlement updates
    KeepAwake.swift          Stops the screen sleeping while music plays
    Assets.xcassets          App icon + launch color
    PrivacyInfo.xcprivacy    Privacy manifest (no tracking, no data collected)
  iOS/                     AppDelegate (audio session), Info.plist
  macOS/                   Info.plist, sandbox entitlements
  web/                     Output of `npm run build:apple` (git-ignored)
```

The web side of the integration lives in `src/native/`:

- `nativeBridge.js`: detects the native shell and sends bridge calls. Also provides a browser mock (`?native=mock`).
- `entitlements.js`: **sets what is free and what is Pro.** Edit `FREE_SCENE_INDEXES` / `PRO_FEATURES`.
- `paywall.js`: the paywall dialog (price from the App Store, Unlock, Restore Purchase, Not Now).
- `touchGestures.js`: in the app, tap the visual to hide the controls, swipe left/right to change scene, and swipe up/down to change preset.

The website build (`npm run build`, deployed at `/paywall`) has no bridge, so nothing is locked
there and it behaves as before.

## Current free / Pro split

| Free | Pro (one-time purchase) |
| --- | --- |
| Scene 1 (Sphere), all presets | Scenes 2 (Flow) and 3 (Lattice) |
| Open audio files, play/pause, drag & drop | Advanced Controls: overlay FX, scene settings, preset parameters, Save Preset |

## 1. One-time setup on your Mac

1. Install **Xcode** (latest version, from the Mac App Store) and open it once to install components.
2. Join the **Apple Developer Program** (99 USD/year): <https://developer.apple.com/programs/>.
3. Install Homebrew (<https://brew.sh>), then run:

   ```bash
   brew install node xcodegen
   ```

4. Pick your identifiers. The defaults are below. Change them in **both** `apple/project.yml` and
   `apple/Scanbass.storekit` if you use different ones:
   - Bundle ID: `com.scanbass.visualizer`
   - Pro product ID: `com.scanbass.visualizer.pro`
5. In `apple/project.yml`, set `DEVELOPMENT_TEAM` to your Team ID (Xcode > Settings > Accounts),
   or select the team later in Xcode under *Signing & Capabilities* for each target.

## 2. Build and run

From the repo root:

```bash
npm install
npm run apple
```

This builds the web app into `apple/web/`, generates `apple/Scanbass.xcodeproj`, and opens it.
Then in Xcode:

- Choose the **Scanbass-iOS** scheme and an iPhone or iPad simulator (or a connected device), then press Run.
- Choose the **Scanbass-macOS** scheme and *My Mac*, then press Run.

Both schemes use `Scanbass.storekit`, so the paywall shows a price and purchases work in the
simulator and in debug runs without any App Store Connect setup. Go to *Debug > StoreKit > Manage
Transactions* to refund or delete a test purchase and see the app re-lock.

**After every change to the web code**, run `npm run build:apple` again before building in Xcode.
If you forget and `apple/web/` is empty, the build stops with an error that tells you to.
After changing `project.yml`, run `npm run apple:project`.

### Previewing the paywall in a browser

```bash
npm run dev
```

Open `http://localhost:5173/?native=mock`. This runs the app with an in-memory mock store, so you
can work on the paywall and locked-scene UI without Xcode. The mock purchase is saved in
localStorage. Run `localStorage.removeItem('scanbass.mock-pro-unlocked')` in the console to reset it.

## 3. App Store Connect

1. **Agreements, Tax, and Banking**: accept the *Paid Apps* agreement and add bank and tax info.
   In-app purchases never load, even in TestFlight, until this agreement is active.
2. **Certificates, IDs & Profiles**: register the App ID `com.scanbass.visualizer` with the
   *In-App Purchase* capability. Xcode automatic signing usually does this for you.
3. **Apps > + New App**: select **iOS** and **macOS** in the same record, with the bundle ID above.
   One record for both platforms is what enables Universal Purchase.
4. **Monetization > In-App Purchases > +**:
   - Type: **Non-Consumable**
   - Reference name: `Scanbass Pro`
   - Product ID: `com.scanbass.visualizer.pro`
   - Price: your choice (`Scanbass.storekit` uses 4.99 USD for local testing only)
   - Display name and description (for example: "Scanbass Pro" / "Unlock every scene and the advanced tuner.")
   - Review screenshot: a screenshot of the paywall dialog
   - Family Sharing: optional
5. **App Privacy**: answer *Data Not Collected*. The app has no analytics, accounts or network
   calls besides the App Store. Add a **Privacy Policy URL**. This is required, even for apps that
   collect no data.
6. **App Information**: set Category to *Music* (secondary: *Entertainment*) and complete the
   age rating questionnaire.
7. **Screenshots**: provide at least a 6.9" iPhone set, a 13" iPad set, and a Mac set
   (1280×800 or larger, 16:10). Tap the visual to hide the controls for clean shots.

## 4. Upload and submit

For each scheme (`Scanbass-iOS`, `Scanbass-macOS`):

1. Run `npm run build:apple`.
2. Increase `CURRENT_PROJECT_VERSION` in `project.yml` for every upload, and `MARKETING_VERSION`
   for every release. Then run `npm run apple:project`.
3. In Xcode, choose the destination *Any iOS Device* (or *Any Mac*), then *Product > Archive*.
4. In the Organizer, choose *Distribute App > App Store Connect > Upload*.
5. Test the build in **TestFlight**. Purchases there use the sandbox and cost nothing.
6. On the version page in App Store Connect, add the build and, **for the first submission, add the
   Scanbass Pro in-app purchase to the same submission**. Then submit for review.

Suggested *Notes for App Review*:

> Scanbass is an offline audio visualizer. Tap "Open Audio File" and pick any music file from Files
> (on Mac: the open panel or drag and drop). Scene 1 is free. Scenes 2–3 and "Show Advanced
> Controls" open the paywall for the one-time "Scanbass Pro" purchase. "Restore Purchase" is in
> the same dialog. Tap the visual to hide the controls. Swipe to change scenes and presets.

## 5. Things App Review checks for in this kind of app

- **Restore Purchase** must be reachable. It is in the paywall dialog.
- **Minimum functionality (guideline 4.2)**: apps that wrap web content are rejected when they
  only repackage a website. Scanbass runs fully offline, imports local files, uses native gestures,
  keeps the screen awake while playing, and ships a real Mac app. Mention this in the review notes
  if asked.
- **Silent switch**: the iOS app uses the `.playback` audio session, so music plays with the
  Ring/Silent switch on silent. This is the expected behavior for a music app.
- The website's developer export buttons (Copy … JSON) are hidden in the app.

## Not verified yet

This project was set up on Linux without Xcode, so **the Swift code and `project.yml` have not been
compiled yet**. The web integration was tested in a browser against a simulated bridge. The first
Xcode build may need small fixes. Check these first:

- Purchase, restore, and refund (via *Manage Transactions*) on both iOS and macOS.
- Opening large files (up to the 180 MB limit) on an older iPhone, for memory.
- Drag and drop onto the Mac window, and onto an iPad in Split View.

## Ideas for later

- `src/scenes/` holds 12 scenes, but only 3 are wired into `VisualizerApp`. Adding more scenes is
  the easiest way to make Pro more valuable.
- "Open in Scanbass" from the Files and Music share sheets (document types).
- Lock-screen and Control Center playback controls, and background audio.
