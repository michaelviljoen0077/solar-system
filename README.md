# Milky Way

An interactive 3D model of our galaxy, built with React and Three.js.

- **Live model** — ~80k stars on a flat rotation curve, so the arms wind up as you speed up time
- **Guided tour** — Sagittarius A*, the bar, the major arms, the Sun, the globular halo and the Magellanic Clouds
- **Night sky mode** — stand at the Sun and look around from inside the disc: the milky band, the bright core, the Great Rift and the Magellanic Clouds
- **Supernovae** — stars detonate in the arms at a rate tied to the time dial
- **Sound** — optional deep-space drone, with a chime for each supernova

## Running it

Requires Node.js 20.19+.

```sh
npm install
npm run dev      # start the dev server
npm run build    # production build into dist/
npm run preview  # serve the production build
```

## Controls

| Action | Space view | Night sky |
| --- | --- | --- |
| Drag | Orbit the camera | Look around |
| Scroll / pinch | Zoom | Change field of view |
| Time slider | Speed up / pause the galaxy's rotation | Watch the sky wheel |

Motion (auto-rotate, twinkle, time) is paused when the OS "reduce motion" setting is on.

## Project layout

```
index.html          page shell
src/main.jsx        React entry point
src/MilkyWay.jsx    the whole scene: star generation, shaders, camera rig, UI
```
