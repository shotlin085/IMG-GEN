# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: studio.spec.ts >> customer studio >> information architecture, live catalogue data and no page errors
- Location: e2e\studio.spec.ts:7:7

# Error details

```
Error: uncaught page errors: Minified React error #418; visit https://react.dev/errors/418?args[]=HTML&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.

expect(received).toHaveLength(expected)

Expected length: 0
Received length: 1
Received array:  ["Minified React error #418; visit https://react.dev/errors/418?args[]=HTML&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings."]
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e2]:
    - complementary [ref=e3]:
      - link "shotlin." [ref=e4] [cursor=pointer]:
        - /url: /
      - paragraph [ref=e7]: Workspace
      - navigation "Primary navigation" [ref=e8]:
        - link "Studio" [ref=e9] [cursor=pointer]:
          - /url: /
        - link "Projects" [ref=e14] [cursor=pointer]:
          - /url: /projects
        - link "Garments" [ref=e18] [cursor=pointer]:
          - /url: /garments
        - link "Batch" [ref=e22] [cursor=pointer]:
          - /url: /batch
        - link "Models" [ref=e29] [cursor=pointer]:
          - /url: /models
        - link "Presets" [ref=e34] [cursor=pointer]:
          - /url: /presets
        - link "Account" [ref=e39] [cursor=pointer]:
          - /url: /account
      - generic [ref=e45]:
        - generic [ref=e46]:
          - generic [ref=e47]: ES
          - generic [ref=e48]:
            - generic [ref=e49]: E2E Studio
            - generic [ref=e50]: Customer workspace
        - button "Sign out" [ref=e51] [cursor=pointer]
    - main [ref=e52]:
      - generic [ref=e53]:
        - generic [ref=e54]:
          - generic [ref=e55]: Shotlin
          - generic [ref=e56]: /
          - strong [ref=e57]: Generate
          - generic [ref=e58]: stack online
        - generic [ref=e60]: E2E Studio
      - generic [ref=e62]:
        - generic [ref=e63]:
          - generic [ref=e64]:
            - paragraph [ref=e65]: Zero-prompt image studio
            - heading [level=1] [ref=e66]:
              - text: Make the garment
              - emphasis [ref=e67]: the main character.
            - paragraph [ref=e68]: Bring a reference. Shotlin handles the visual language, fidelity checks, and repair loop for you.
          - generic [ref=e69]: Draft saved · 08:31 AM
        - generic [ref=e71]:
          - generic [ref=e72]:
            - generic [ref=e73]:
              - generic [ref=e74]:
                - paragraph [ref=e75]: New generation
                - heading "Build a look" [level=2] [ref=e76]
              - group "Studio mode" [ref=e77]:
                - button "Auto" [ref=e78] [cursor=pointer]
                - button "Pro" [active] [pressed] [ref=e79] [cursor=pointer]
            - generic [ref=e80]:
              - generic [ref=e81]: Preset
              - combobox "Saved preset" [ref=e82]:
                - option "None selected" [selected]
              - button "Apply" [disabled] [ref=e83] [cursor=pointer]
              - button "Save current" [ref=e84] [cursor=pointer]
              - generic [ref=e85]: No presets yet — set up a look you like and save it.
            - tablist "Studio steps" [ref=e86]:
              - tab "01 Garment" [selected] [ref=e87] [cursor=pointer]
              - tab "02 Character" [ref=e88] [cursor=pointer]
              - tab "03 Scene" [ref=e89] [cursor=pointer]
              - tab "04 Output" [ref=e90] [cursor=pointer]
              - tab "05 Review" [ref=e91] [cursor=pointer]
            - generic [ref=e92]:
              - generic [ref=e93]:
                - generic [ref=e94]:
                  - heading "Start with a reference" [level=3] [ref=e95]
                  - generic [ref=e96]: Required · 1 main image
                - generic [ref=e98]:
                  - paragraph [ref=e102]: Drop your garment reference here
                  - paragraph [ref=e103]: JPG, PNG or WEBP · up to 25 MB
                - button "Capture with camera" [ref=e104] [cursor=pointer]
                - generic [ref=e109]:
                  - generic [ref=e110]: Detail references optional — close-ups of a border, embroidery, or anything easy to miss
                  - button "Add" [ref=e113] [cursor=pointer]
              - generic [ref=e117]:
                - generic [ref=e118]:
                  - heading "Choose a character" [level=3] [ref=e119]
                  - generic [ref=e120]: Identity stays consistent
                - generic [ref=e121]:
                  - button "Priya Indian woman in her mid-twenties, medium height, graceful posture." [ref=e122] [cursor=pointer]:
                    - generic [ref=e123]: Priya
                    - generic [ref=e124]: Indian woman in her mid-twenties, medium height, graceful posture.
                  - button "Aarav Indian man in his late twenties, tall, athletic frame." [ref=e128] [cursor=pointer]:
                    - generic [ref=e129]: Aarav
                    - generic [ref=e130]: Indian man in his late twenties, tall, athletic frame.
                  - button "Upload character Use your own reference" [ref=e131] [cursor=pointer]:
                    - generic [ref=e132]: Upload character
                    - generic [ref=e133]: Use your own reference
                - generic [ref=e134]:
                  - generic [ref=e135]:
                    - generic [ref=e136]: Age appearance
                    - combobox [ref=e137]:
                      - option "mid-20s" [selected]
                      - option "Toddler · 2–4 years"
                      - option "Child · 5–9 years"
                      - option "Preteen · 10–12 years"
                      - option "Teen · 13–17 years"
                      - option "Young adult · 18–25 years"
                      - option "Adult · 26–39 years"
                      - option "Middle-aged · 40–59 years"
                      - option "Senior · 60–74 years"
                      - option "Elder · 75+ years"
                  - generic [ref=e138]:
                    - generic [ref=e139]: Height
                    - combobox [ref=e140]:
                      - option "Petite"
                      - option "Average" [selected]
                      - option "Tall"
                - generic [ref=e141]:
                  - generic [ref=e142]:
                    - text: Pose
                    - generic [ref=e143]: Pick one, or leave it to the pipeline
                  - generic [ref=e144]:
                    - button "Let Shotlin decide" [pressed] [ref=e145] [cursor=pointer]
                    - button "Standing, relaxed" [ref=e146] [cursor=pointer]
                    - button "Walking" [ref=e147] [cursor=pointer]
                    - button "Slow turn" [ref=e148] [cursor=pointer]
                    - button "Hip pop" [ref=e149] [cursor=pointer]
                    - button "Hand on hip" [ref=e150] [cursor=pointer]
                    - button "Seated" [ref=e151] [cursor=pointer]
                    - button "Leaning" [ref=e152] [cursor=pointer]
                    - button "Adjusting the garment" [ref=e153] [cursor=pointer]
                    - button "Holding the pallu" [ref=e154] [cursor=pointer]
                    - button "Looking back" [ref=e155] [cursor=pointer]
                    - button "Arms crossed" [ref=e156] [cursor=pointer]
                    - button "Detail focus" [ref=e157] [cursor=pointer]
              - generic [ref=e158]:
                - generic [ref=e159]:
                  - heading "Set the scene" [level=3] [ref=e160]
                  - generic [ref=e161]: Indoor / outdoor is an actual environment preset
                - generic [ref=e162]:
                  - button "Outdoor Natural outdoor" [ref=e163] [cursor=pointer]:
                    - generic [ref=e164]: Outdoor Natural
                    - generic [ref=e165]: outdoor
                  - button "Outdoor Premium outdoor" [ref=e166] [cursor=pointer]:
                    - generic [ref=e167]: Outdoor Premium
                    - generic [ref=e168]: outdoor
                  - button "Indoor Premium indoor" [ref=e169] [cursor=pointer]:
                    - generic [ref=e170]: Indoor Premium
                    - generic [ref=e171]: indoor
                  - button "Studio Commercial studio" [ref=e172] [cursor=pointer]:
                    - generic [ref=e173]: Studio Commercial
                    - generic [ref=e174]: studio
                  - button "Festive festive" [ref=e175] [cursor=pointer]:
                    - generic [ref=e176]: Festive
                    - generic [ref=e177]: festive
                  - button "Cinematic Fashion cinematic" [ref=e178] [cursor=pointer]:
                    - generic [ref=e179]: Cinematic Fashion
                    - generic [ref=e180]: cinematic
                  - button "Clean / Minimal minimal" [ref=e181] [cursor=pointer]:
                    - generic [ref=e182]: Clean / Minimal
                    - generic [ref=e183]: minimal
                  - button "Rooftop · Golden Hour outdoor" [ref=e184] [cursor=pointer]:
                    - generic [ref=e185]: Rooftop · Golden Hour
                    - generic [ref=e186]: outdoor
                  - button "Heritage Haveli indoor" [ref=e187] [cursor=pointer]:
                    - generic [ref=e188]: Heritage Haveli
                    - generic [ref=e189]: indoor
                  - button "Temple Courtyard festive" [ref=e190] [cursor=pointer]:
                    - generic [ref=e191]: Temple Courtyard
                    - generic [ref=e192]: festive
                  - button "Handloom Atelier indoor" [ref=e193] [cursor=pointer]:
                    - generic [ref=e194]: Handloom Atelier
                    - generic [ref=e195]: indoor
                  - button "Marigold Courtyard festive" [ref=e196] [cursor=pointer]:
                    - generic [ref=e197]: Marigold Courtyard
                    - generic [ref=e198]: festive
                  - button "Garden Lawn outdoor" [ref=e199] [cursor=pointer]:
                    - generic [ref=e200]: Garden Lawn
                    - generic [ref=e201]: outdoor
                  - button "Monsoon Verandah outdoor" [ref=e202] [cursor=pointer]:
                    - generic [ref=e203]: Monsoon Verandah
                    - generic [ref=e204]: outdoor
                  - button "Art Deco Interior indoor" [ref=e205] [cursor=pointer]:
                    - generic [ref=e206]: Art Deco Interior
                    - generic [ref=e207]: indoor
                  - button "Desert Fort cinematic" [ref=e208] [cursor=pointer]:
                    - generic [ref=e209]: Desert Fort
                    - generic [ref=e210]: cinematic
                  - button "Boutique Rail indoor" [ref=e211] [cursor=pointer]:
                    - generic [ref=e212]: Boutique Rail
                    - generic [ref=e213]: indoor
                - generic [ref=e214]:
                  - generic [ref=e215]: How it is worn general placements — recognise a garment to get regional drapes
                  - generic [ref=e217]:
                    - button "Nivi drape · Andhra Pradesh / Telangana" [ref=e218] [cursor=pointer]
                    - button "Bengali drape (Atpoure) · West Bengal" [ref=e219] [cursor=pointer]
                    - button "Gujarati drape (Shaicha) · Gujarat" [ref=e220] [cursor=pointer]
                    - button "Nauvari drape · Maharashtra" [ref=e221] [cursor=pointer]
                    - button "Madisar drape · Tamil Nadu" [ref=e222] [cursor=pointer]
                    - button "Kerala drape (Munduputtavum) · Kerala" [ref=e223] [cursor=pointer]
                    - button "Odia drape (Sambalpuri) · Odisha" [ref=e224] [cursor=pointer]
                    - button "Parsi drape (Gara) · Mumbai / Udvada" [ref=e225] [cursor=pointer]
                    - button "Goan Kunbi drape · Goa" [ref=e226] [cursor=pointer]
                    - button "Lehenga-style saree · Contemporary, pan-Indian" [ref=e227] [cursor=pointer]
                    - button "Dhoti-pant saree · Contemporary, pan-Indian" [ref=e228] [cursor=pointer]
                    - button "Seedha pallu drape · North India" [ref=e229] [cursor=pointer]
                    - button "Retro falling drape · 1960s–80s Hindi cinema" [ref=e230] [cursor=pointer]
                    - button "Tribal drape · Central / North-East India" [ref=e231] [cursor=pointer]
                    - button "Both shoulders, even" [ref=e232] [cursor=pointer]
                    - button "One shoulder" [ref=e233] [cursor=pointer]
                    - button "Diagonal across the torso" [ref=e234] [cursor=pointer]
                    - button "Pallu style with pleats" [ref=e235] [cursor=pointer]
                    - button "Over the head" [ref=e236] [cursor=pointer]
                    - button "Behind, open" [ref=e237] [cursor=pointer]
                    - button "Tucked at the waist" [ref=e238] [cursor=pointer]
                    - button "Crossed in front" [ref=e239] [cursor=pointer]
                    - button "Framing the neckline" [ref=e240] [cursor=pointer]
                    - button "Held at the wrist" [ref=e241] [cursor=pointer]
                    - button "Belted at the waist" [ref=e242] [cursor=pointer]
                    - button "Rolled shoulder" [ref=e243] [cursor=pointer]
                    - button "Punjabi lambi dupatta with salwar · Punjab" [ref=e244] [cursor=pointer]
                    - button "Kanjeevaram with temple borders · Tamil Nadu" [ref=e245] [cursor=pointer]
                    - button "Angrakha over a straight kurta" [ref=e246] [cursor=pointer]
                    - button "Stole over a sherwani" [ref=e247] [cursor=pointer]
              - generic [ref=e248]:
                - generic [ref=e249]:
                  - heading "Output" [level=3] [ref=e250]
                  - generic [ref=e251]: The pipeline will pick the right model
                - generic [ref=e252]:
                  - generic [ref=e253]:
                    - generic [ref=e254]: Resolution
                    - combobox [ref=e255]:
                      - option "1K"
                      - option "2K" [selected]
                      - option "4K"
                  - generic [ref=e256]:
                    - generic [ref=e257]: Frame
                    - combobox [ref=e258]:
                      - option "Portrait 3:4 · Classic catalogue crop" [selected]
                      - option "Tall portrait 2:3 · Editorial, full length"
                      - option "Square 1:1 · Marketplace grids"
                      - option "Story 9:16 · Reels and shorts"
                      - option "Landscape 4:3 · Lookbook spread"
                      - option "Wide 16:9 · Campaign banner"
                  - generic [ref=e259]:
                    - generic [ref=e260]: Set size
                    - combobox [ref=e261]:
                      - option "1 image" [selected]
                      - option "2 images"
                      - option "3 images"
                      - option "4 images"
                      - option "5 images"
                  - generic [ref=e262]:
                    - generic [ref=e263]: Image model
                    - combobox [ref=e264]:
                      - option "OpenRouter · Nano Banana 2 (Gemini 3.1 Flash Image)" [selected]
                - generic [ref=e265]:
                  - generic [ref=e266]:
                    - text: Crop
                    - generic [ref=e267]: How much of the look is in frame
                  - generic [ref=e268]:
                    - button "Match the angle" [pressed] [ref=e269] [cursor=pointer]
                    - button "Full body" [ref=e270] [cursor=pointer]
                    - button "Three-quarter" [ref=e271] [cursor=pointer]
                    - button "Knee line" [ref=e272] [cursor=pointer]
                    - button "Waist up" [ref=e273] [cursor=pointer]
                    - button "Bust and face" [ref=e274] [cursor=pointer]
                    - button "Macro detail" [ref=e275] [cursor=pointer]
              - generic [ref=e276]:
                - paragraph [ref=e278]:
                  - strong [ref=e279]: 2K · Portrait 3:4 (3:4)
                  - text: · 1 image · Outdoor Natural
                - button [ref=e280] [cursor=pointer]
          - complementary [ref=e284]:
            - generic [ref=e285]:
              - generic [ref=e286]:
                - paragraph [ref=e287]: Reference rail
                - heading "What Shotlin is holding" [level=2] [ref=e288]
              - generic [ref=e289]: protected
            - generic [ref=e290]:
              - generic [ref=e291]: "01"
              - generic [ref=e292]:
                - generic [ref=e293]: Garment structure
                - generic [ref=e294]: Waiting for image
            - generic [ref=e295]:
              - generic [ref=e296]: "02"
              - generic [ref=e297]:
                - generic [ref=e298]: Character identity
                - generic [ref=e299]: Priya · locked
            - generic [ref=e300]:
              - generic [ref=e301]: "03"
              - generic [ref=e302]:
                - generic [ref=e303]: Environment language
                - generic [ref=e304]: Outdoor Natural
            - generic [ref=e305]:
              - generic [ref=e306]: "04"
              - generic [ref=e307]:
                - generic [ref=e308]: Quality bar
                - generic [ref=e309]: Fidelity-first review
            - generic [ref=e310]:
              - generic [ref=e311]: "05"
              - generic [ref=e312]:
                - generic [ref=e313]: Camera angles
                - generic [ref=e314]: Single frame
            - paragraph [ref=e315]: The prompt stays behind the scenes. Your choices are the brief.
        - generic [ref=e316]:
          - generic [ref=e317]:
            - generic [ref=e318]:
              - paragraph [ref=e319]: Your studio
              - heading "Recent projects" [level=2] [ref=e320]
            - link "View archive" [ref=e321] [cursor=pointer]:
              - /url: /projects
          - generic [ref=e324]:
            - strong [ref=e325]: No connected jobs yet
            - generic [ref=e326]: Sign in and submit a generation to populate this archive.
  - alert [ref=e327]
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | import { selectByLabel } from "./fixtures";
  3  | 
  4  | const NAV = ["Studio", "Projects", "Garments", "Batch", "Models", "Presets", "Account"];
  5  | 
  6  | test.describe("customer studio", () => {
  7  |   test("information architecture, live catalogue data and no page errors", async ({ page }) => {
  8  |     const errors: string[] = [];
  9  |     page.on("pageerror", (error) => errors.push(error.message));
  10 | 
  11 |     await page.goto("/");
  12 |     for (const label of NAV) await expect(page.locator(".nav-list").getByRole("link", { name: label })).toBeVisible();
  13 |     await expect(page.locator(".nav-list").getByRole("link", { name: "Control room" })).toHaveCount(0);
  14 |     await expect(page.locator(".crumb-status")).toContainText("stack online", { timeout: 15_000 });
  15 | 
  16 |     await expect(page.getByRole("tab", { name: "Garment" })).toBeVisible();
  17 |     await expect(page.getByRole("button", { name: "Pro" })).toHaveAttribute("aria-pressed", "false");
  18 | 
  19 |     // Vocabulary is served by the API rather than hard-coded in the studio (P9/P13).
  20 |     const age = selectByLabel(page, "Age appearance");
  21 |     await expect(async () => {
  22 |       expect(await age.locator("option").count()).toBeGreaterThanOrEqual(9);
  23 |     }).toPass({ intervals: [500], timeout: 15_000 });
  24 |     const frame = selectByLabel(page, "Frame");
  25 |     await expect(frame.locator("option")).toHaveCount(6, { timeout: 15_000 });
  26 |     // The option labels carry the real ratios and their use case.
  27 |     await expect(frame).toContainText(/3:4/, { timeout: 15_000 });
  28 |     expect(await frame.innerText()).toMatch(/1:1|9:16|16:9/);
  29 | 
  30 |     // Pro controls expose the pose and crop libraries.
  31 |     await page.getByRole("button", { name: "Pro" }).click();
  32 |     await expect(page.getByRole("button", { name: /Holding the pallu/ })).toBeVisible({ timeout: 15_000 });
  33 |     await expect(page.getByRole("button", { name: /Macro detail/ })).toBeVisible();
  34 | 
  35 |     expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false);
> 36 |     expect(errors, `uncaught page errors: ${errors.join(" | ")}`).toHaveLength(0);
     |                                                                   ^ Error: uncaught page errors: Minified React error #418; visit https://react.dev/errors/418?args[]=HTML&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
  37 |   });
  38 | 
  39 |   test("garment intake and library render", async ({ page }) => {
  40 |     await page.goto("/");
  41 |     await expect(page.getByText(/Drop your garment reference/i)).toBeVisible();
  42 |     await expect(selectByLabel(page, "Age appearance")).toBeEnabled();
  43 | 
  44 |     await page.goto("/garments");
  45 |     await expect(page.getByRole("heading", { level: 1 })).toContainText(/garment/i);
  46 |     await expect(page.locator(".garment-grid, .empty-state").first()).toBeVisible({ timeout: 15_000 });
  47 |   });
  48 | 
  49 |   test("model library, presets, batch and account render with data", async ({ page }) => {
  50 |     await page.goto("/models");
  51 |     await expect(page.getByRole("heading", { level: 1 })).toContainText(/wears/i);
  52 |     await expect(page.locator(".model-card").first()).toBeVisible({ timeout: 15_000 });
  53 | 
  54 |     await page.goto("/presets");
  55 |     await expect(page.getByRole("heading", { level: 1 })).toContainText(/once/i);
  56 |     await expect(page.locator(".account-check").first()).toBeVisible({ timeout: 15_000 });
  57 | 
  58 |     await page.goto("/batch");
  59 |     await expect(page.getByRole("heading", { level: 1 })).toContainText(/whole set/i);
  60 | 
  61 |     await page.goto("/account");
  62 |     await expect(page.getByRole("heading", { level: 1 })).toContainText(/account/i);
  63 |     await expect(page.getByRole("button", { name: "Sign out of this device" })).toBeVisible();
  64 |   });
  65 | 
  66 |   test("the catalogue offers garments only — no footwear anywhere", async ({ page }) => {
  67 |     await page.goto("/models");
  68 |     const models = (await page.locator(".model-card").allInnerTexts()).join(" ");
  69 |     await page.goto("/presets");
  70 |     const presets = await page.locator("body").innerText();
  71 |     expect(`${models} ${presets}`.toLowerCase()).not.toMatch(/footwear|sneaker|sandals|\bheels\b|\bflats\b|loafers|slippers/);
  72 |   });
  73 | });
  74 | 
```