# Jules 3D website

Scroll-driven intro to Jules: one 3D model of the device stays on screen and re-forms at each stop.
Static files, no build step.

    python3 -m http.server 8765 --bind 127.0.0.1   # then open http://127.0.0.1:8765/

- `scene.js`: the device parts and the form for each stop
- `index.html`: the stops and their copy (taken from julesstories.com)
- `site.css`: Jules theme (colours, Macan)
- `engine.js`: rendering and scroll mapping

The inside view is an illustration, not an engineering drawing.
