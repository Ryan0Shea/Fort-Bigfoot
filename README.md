# Fort McIntosh: Bigfoot Siege

A playable HTML5/Three.js first-person wave-survival prototype set at a stylized reconstruction of Fort McIntosh (Beaver, Pennsylvania), around 1780.

You defend the fort perimeter with a slow single-shot flintlock while waves of **wooden Bigfoot silhouette cutouts** attack and breach walls.

## Runtime Asset Set (Deployment)

The deployable build only keeps files required for gameplay runtime:

- `index.html`
- `style.css`
- `main.js`
- `bigfootData.js` (embedded fallback for silhouette loading reliability)
- `bigfoot-silhouette.png`
- `fort-mcintosh-demo2-low-vox.mp3`
- `README.md`

Large development-only references (wall/footprint source images, alternate audio, embedded fallback data file) were removed to reduce package size.

Priority order used in implementation:

1. Footprint shape/proportions
2. Wall construction and gun-loop style
3. Bigfoot silhouette profile
4. Historical setting constraints
5. Gameplay readability/performance

## Run

### Option A: Open directly

Open `index.html` in a modern desktop browser.

### Option B: Local server (recommended for consistent browser behavior)

From this folder:

```bash
python3 -m http.server 8000
```

Then open:

[http://localhost:8000](http://localhost:8000)

## Controls

- `W A S D`: Move
- `Mouse`: Look
- `Left Click`: Fire flintlock
- `R`: Reload
- `E`: Interact (ammo pickup / wall repair)
- `B`: Rebuild damaged fort sections (costs score)
- `Shift`: Sprint
- `Esc`: Release pointer lock
- `Enter`: Restart after game over

## Gameplay Loop

- Click start to enter pointer lock and begin defense.
- Survive escalating waves of wooden cutout attackers.
- Enemies attack designated fort wall segments and gate sections.
- Breached walls open pathing to the interior; enemies then rush the player.
- Lose when enemies reach you (or your health reaches zero).
- Re-arm at ammo crate(s) and repair damaged walls between/within waves.
- Spend score to trigger a full wall rebuild when breaches become critical.
- Defend from inside large eye-level gun loops built into solid timber wall courses.
- Current playtest layout keeps the interior mostly open (no interior buildings) for freer movement.

## Implemented Systems

- First-person pointer-lock camera and WASD movement
- Slow, single-shot flintlock with:
  - trigger delay
  - spread/inaccuracy
  - manual reload
  - limited reserve ammo
  - muzzle flash and smoke
- Wave manager with scaling enemy count/health/speed/damage
- Wooden Bigfoot cutout enemies with:
  - wall-target behavior before breach
  - chase-player behavior after breach
  - wood-splinter death effects
- Destructible wall and gate segments with breach transitions
- Optional full-fort rebuild action with cooldown and score cost
- Fort integrity tracking, score, kills, wave/enemy HUD
- Game over overlay with restart
- Web Audio API generated placeholder sound cues
- Background soundtrack playback tied to active gameplay state
- Footprint-driven fort perimeter and spawn logic
- Anti-stall wave safeguards for hidden/out-of-bounds stragglers

## Historical Reconstruction Notes

This prototype intentionally uses a **historically informed but approximate** reconstruction.

- There is no definitive surviving original plan of Fort McIntosh.
- The in-game wall line in this revision is based on the attached extracted footprint reference image and its scale legend, then compacted for browser playability.
- The map and structure arrangement in-game remain plausible synthesis choices for gameplay readability.
- Dimensions and interior placement are compressed and stylized for a compact survival arena.

## Historical Research Summary

The environment design was guided by recurring descriptions of Fort McIntosh as:

- A Continental Army fort built in 1778 near present-day Beaver, PA
- Positioned above the Ohio River near the Beaver River area/confluence context
- A log-built frontier fort with an irregular-square/trapezoidal character
- Horizontal timber wall courses with eye-level firing loopholes (stylized from period stockade descriptions)
- Four corner bastions connected by log palisade/stockade elements
- Ditch/earthwork defenses on three landward sides, with river-bluff protection on the other side
- Interior military/service buildings such as barracks, storage/magazine, officers’ spaces, and work areas
- Perimeter-side barracks placement influenced by marker descriptions that outer walls functioned with barracks fabric

## Reference Usage Notes

- **Footprint**: Converted into a playable polygon and used for perimeter walls, interior dirt boundary, and exterior spawn ring.
- **Wall reference**: Used to shift wall modeling to continuous stacked timbers with pronounced seams/chinking and large gun loops.
- **Bigfoot silhouette**: Applied as the runtime enemy cutout texture (`bigfoot-silhouette.png`).

## Sources Consulted

Primary or institutional sources used for baseline facts:

- National Park Service place page (Fort McIntosh):
  - [https://www.nps.gov/places/fort-mcintosh.htm](https://www.nps.gov/places/fort-mcintosh.htm)
- Beaver Area Heritage Foundation – Fort McIntosh Historic Site:
  - [https://beaverheritage.org/fort-mcintosh-historic-site/](https://beaverheritage.org/fort-mcintosh-historic-site/)
- Beaver County history collection page summarizing reconstruction context (no known original plan, irregular-square orientation and archaeological recovery context):
  - [https://www.bcpahistory.org/beavercounty/BeaverTown/Town.FortMcIntosh.html](https://www.bcpahistory.org/beavercounty/BeaverTown/Town.FortMcIntosh.html)
- Historical Marker Database entries for Fort McIntosh site/marker context:
  - [https://www.hmdb.org/m.asp?m=44750](https://www.hmdb.org/m.asp?m=44750)
  - [https://www.hmdb.org/m.asp?m=44734](https://www.hmdb.org/m.asp?m=44734)
  - [https://www.hmdb.org/m.asp?m=204299](https://www.hmdb.org/m.asp?m=204299)
- Beaver Area Heritage Foundation publication index for Fort McIntosh historical/restoration publication:
  - [https://www.bcpahistory.org/beavercounty/BAHF/FortMc.Carver/Carver.Main.pdf](https://www.bcpahistory.org/beavercounty/BAHF/FortMc.Carver/Carver.Main.pdf)
- Beaver County historical text excerpt collection (includes “timbers laid in courses like masonry” language in older descriptions):
  - [https://bcpahistory.org/beavercounty/BeaverCountyTopical/GeneralHistoriesofBC/BausmanMF89/BausemanMF89.html](https://bcpahistory.org/beavercounty/BeaverCountyTopical/GeneralHistoriesofBC/BausmanMF89/BausemanMF89.html)

Secondary synthesis reference used cautiously for dimension/layout phrases often attributed to period descriptions and nomination summaries:

- [https://en.wikipedia.org/wiki/Fort_McIntosh_(Pennsylvania)](https://en.wikipedia.org/wiki/Fort_McIntosh_(Pennsylvania))

## Known Technical Limitations

- Enemy navigation is lightweight and direct (no navmesh/pathfinding).
- Wall damage visuals are simplified (basic state change + debris effects).
- No save system.
- Audio is generated placeholder sound, not period-authentic recordings.
- Collision is simplified AABB/capsule-like handling tuned for prototype playability.
- Best experienced on desktop keyboard + mouse.

## Browser Compatibility

Designed for modern desktop versions of:

- Chrome
- Edge
- Firefox
- Safari

Pointer lock and WebGL must be enabled.
