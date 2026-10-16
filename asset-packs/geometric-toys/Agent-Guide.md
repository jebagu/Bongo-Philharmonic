# Bongo Planet — AI composition guide

This is the current guide for agents writing music and visual settings for Bongo Planet. It is generated from the app's validators, instrument and look catalogs, topology, and Creation-Guide.md. Use this guide as the canonical file reference; Rules.md is the executable behavior contract.

## Your task

Compose the requested music as one complete, valid Bongo-Planet.json file. Include a compatible visual look. Use the current gated scene format (scene.version: 2), finite travel unless requested, and real adjacent vertices from the map below. Provide a downloadable file if you can; otherwise return the entire raw JSON in one block that the user can save. Never omit fields with ellipses. Briefly explain the rhythm, pitches, routing and look separately from the JSON. Do not claim you played or validated the result unless you actually did.

## File format

The outer object has format: "bongo-planet-composition" and version: 1. Its scene contains the music, settings, pieces and directed wiring; its appearance contains the entire look. The scene and appearance have their own versions. All fields in the current schema are required unless explicitly optional. The scene-level travel and quantization fields are saved metadata and do not change gated timing. Generator travel is a positive whole number of hops or "infinite"; period is beats and phase is a fraction of its period. Generator reach is retained metadata in gated scenes; wiring decides where sparks go. Do not add a generator path to a gated scene.

Appearance uses version: 1, style: "toys", surface: "seams", pulseEffects: "struts", eyes: true and bounce: true. Set planet and instrument colors as six-digit #RRGGBB values. backdrop chooses the sky; keep background equal to that sky's base color below. size controls friend size (0.65–1.6), lighting controls sunshine (0.5–2), sparkStyle controls the moving spark, and switches controls gate glyphs. switches.style accepts ink/toy/glow; switches.icon chooses the glyph; size, stroke, onColor, offColor, glow and animation customize it. note/beat colors and global glow are retained look fields; use the named instrument colors and sparkStyle for the current visible controls. Current camera projection is orthographic and is not serialized. Melodic sustain is in seconds and sampled notes end no later than their sample; percussion always plays its natural one-shot tail. Neither stretches the hop grid. Earlier appearance files may omit percussion colors and receive their defaults.

Planet palette: Ochre=#685222, Copper=#794629, Brick=#7a3637, Burgundy=#662b48, Plum=#543468, Deep violet=#443b79, Planet blue=#5262e9, Deep ocean=#23546a, Pine=#20534d, Forest=#365438, Charcoal=#3b404b, Ink=#344362. These dark colors keep bright instruments, gates and sparks visible.

Off-state gate outlines use Whisper half pixel: 0.5 CSS pixels at 25% opacity. switches.stroke multiplies that base width; switches.offColor retains the saved outline color. Width compensates for viewport size and orthographic zoom; the flat glyph naturally foreshortens toward the planet's edge. On-state glyphs retain their saved onColor at full opacity. This rendering treatment does not add a file field or change wiring.

Sky base colors: cream=#151e31, peach=#2b1d24, mint=#142c2b, lavender=#241c38, stars=#171c45. All backdrop choices are dark.

## FAQ

### Which instruments can I use?

Guitar (guitar), Glass (glass), Kalimba (kalimba), Piano (piano), Marimba (marimba), High bongo (bongo-high), Low bongo (bongo-low), Kick (kick), Snare (snare), Hi-hat (hi-hat). Save instruments as kind: "note" with an instrument ID. Percussion plays one whole recorded hit at its natural pitch; key, scale, degree, octave and duration metadata do not retune or shorten it. Keep those fields valid for the file schema. The hi-hat is closed. A Generator sends sparks; it is silent.

### How do sparks make music?

Each directed crossing takes 0.25 quarter-note beats (15 / BPM seconds). Every arrival at an instrument plays it. Empty junctions and revisits take the same time. Equal-hop branches make chords; add empty junctions for rests. Read the creation guide below for phase, tempo, sustain and Infinite behavior.

### How do I connect the pieces?

Use scene.version: 2, settings.propagation: "gated", and wiring records with a vertex and exits. Each exit must be a neighbor from the map below. Gates are directed: a return needs its own exit. Missing or empty exits stop the spark. Explicit wiring is required in files; placing a Generator in the app opens its neighboring gates automatically.

### What pitches and settings are supported?

Key is a chromatic offset: 0=C, 1=C♯, through 11=B. Scale is major, minor or pentatonic; degree 0 is its root. Major/minor degrees 0–6 follow their seven-note scale; pentatonic uses [0,2,4,7,9] semitones and degrees 5–6 wrap into the next octave. Octaves are 2–6. Tempo is 40–180 BPM. The schema below lists every range and required field. UI controls expose Volume, Tempo, per-piece settings and looks; key and scale are set in the file.

### Which visual styles can I save?

The current planet style is Geometric Toys: style "toys", surface "seams", pulseEffects "struts", with eyes and bounce on. Spark styles: Ember (ember), White ball (white), Lightning (lightning). Gate icons: Arrow (arrow), Chevron (chevron), Triangle (triangle), Bolt (bolt), Comet (comet). Backgrounds: Midnight (cream), Ember dusk (peach), Deep forest (mint), Plum night (lavender), Star field (stars). The appearance object saves these choices, hex colors, size, lighting and switch styling. Looks do not change musical timing.

### How do I save and load the AI result?

Ask the agent for one complete .json file. Save the raw JSON as Bongo-Planet.json, without Markdown fences, comments or trailing commas. Choose Import below Tempo, select the file, then press Play. Import starts paused. Save/Load keep one music-and-look save in this browser; Export downloads both for sharing or backup. Look files in Edit look contain appearance only.

### Why might my composition be silent?

Press Play after Import. Enable the generator and give its vertex at least one outgoing gate. Connect adjacent exits all the way to an instrument; each missing exit stops that branch. Check generator travel reaches the note, instrument level and global volume are above zero, and the browser has enabled audio.

### What are the limits and safety rules?

Use at most 92 pieces, one per vertex, and 8 generators with unique IDs. Files must fit within 128 KiB. Prefer finite travel and restrained levels; repeated emissions into Infinite loops accumulate and can pause at capacity. Do not add camera, transport, output endpoints, credentials, samples or unknown fields. Ask the agent to describe the rhythm and verify routes before returning the file.

## Musical creation and behavior

# Bongo Planet — creation guide

For humans and agents composing **version-two gated scenes**, including Switch Chain, Switch Fork and Infinite Circuit. [Rules.md](Rules.md) is the executable contract.

## Compose with an AI agent

Open **Write music with AI** in its own section below Settings to visit the dedicated introduction and AI guide at **/BongoPlanet/ai-music/**. It opens in a new tab so your current composition stays open. Describe the music and visual look, and copy the prompt into your agent. The prompt includes this guide, the exact JSON schema, a complete starter file, current instruments and visual options, and all valid neighboring vertex IDs. Save the agent's complete raw JSON as `Bongo-Planet.json`, choose **Import** below Tempo in the planet, then press **Play**. Imports start paused.

The canonical file reference and FAQ are [Agent-Guide.md](Agent-Guide.md), generated from the same sources as the app's AI guide page. Files use an outer `format: "bongo-planet-composition"`, `version: 1`, with a musical `scene` and a complete visual `appearance`. Use `scene.version: 2` and `appearance.version: 1`. **Save / Load** keep both in this browser; **Export / Import** transfer both in one JSON file. **Look files** in Edit look transfer appearance alone. Scene Undo/Redo restores music; appearance changes keep their separate automatic browser save.

## Choose a look with contrast

Off gates use **Whisper half pixel**: a faint 0.5-pixel outline at 25% opacity. The outline stays thin as you zoom or resize; the flat glyph naturally foreshortens toward the planet's edge. On gates keep their full-opacity orange fill. Saved outline and fill colors remain supported; `switches.stroke` multiplies the default half-pixel width.

Edit look offers a dark planet palette, retaining Planet blue and Ink alongside darker warm, purple, green and charcoal options. Instruments keep their bright palette so pieces, gates and sparks stand out. The backdrops are Midnight, Ember dusk, Deep forest, Plum night and Star field; all are dark. The default sky is Midnight. Existing backdrop IDs remain valid in saved files. Use the current planet palette and sky base colors in [Agent-Guide.md](Agent-Guide.md) when composing a look.

## View the globe

A floating red-and-white **North Pole** model with an **N** sign marks the globe's fixed north axis. It stays above the same pole as you orbit or tilt the view, so you can recognize which way is up. The starting view includes room for the marker.

The top-right **Reset view** button restores the starting orientation and zoom and stops slow rotation. **Slow rotate** toggles a gentle spin around the current view's vertical axis, preserving any tilt you chose by dragging. One full turn takes two minutes. Rotation pauses during camera, piece and gate gestures and resumes when you release. It works while music is paused. These view controls leave the music and saved look unchanged; camera state is not saved in composition files.

## The shared musical grid

**One strut crossing takes one sixteenth note, regardless of geometric length.** A beat means a quarter note: four hops make one beat; sixteen make a four-beat bar. Empty junctions and return trips consume steps too.

| Journey at 120 BPM | Arrival after emission |
| --- | --- |
| 1 hop | 125 ms |
| 2 hops | 250 ms |
| 3 hops | 375 ms |
| 4 hops | 500 ms / 1 beat |

At fixed tempo, hop duration is `15 / BPM` seconds. Sparks cross longer struts faster so visible arrival matches sound. Camera position and frame rate cannot alter timing.

**Spark interval** sets emission frequency in beats. **Spark travel** limits each branch's hops; it does not change hop duration. Infinite removes that limit. Switching off **Emit new sparks** leaves existing sparks traveling; Pause stops them. Repeated Infinite emissions can accumulate until a capacity limit pauses playback.

## Add percussion

The instrument picker includes **High bongo (`bongo-high`), Low bongo (`bongo-low`), Kick (`kick`), Snare (`snare`), and Hi-hat (`hi-hat`)** alongside the five melodic instruments. The hi-hat is closed. Every spark arrival plays one recorded hit at its natural pitch and lets its tail finish; repeated arrivals can overlap. Two takes alternate for each percussion sound. Level controls loudness. Key, scale, degree, octave and note length do not retune, stretch or shorten these one-shots. Saved percussion pieces still use `kind: "note"` and retain valid degree/octave/timbre/duration metadata for file compatibility.

All percussion heads face outward from the planet, with eyes on the outward face. The left-panel portraits retain their upright presentation; portable models use the planet orientation.

## Make a chord

Split a spark into branches and put different pitches the **same number of hops from the split**. They sound together despite different physical distances. In default C major, try C, E and G in one octave: the first, third and fifth scale degrees.

In **Switch Fork**, one instrument answers on step one; two answer together on step two. An extra empty junction delays a branch by one step. Enable return exits deliberately: revisits play again. Simultaneous sparks remain separate voices, so identical notes can get louder.

## Keep several generators aligned

Generators share transport beat zero and the same grid. Intervals of 1, 2 and 4 beats give regular layers. Intervals of 3 and 4 beats realign every 12 beats when start offsets match. Added or enabled generators join their next eligible future boundary.

Three-hop and four-hop **circuits** launched together return together every 12 steps, or 3 beats. Circuit length and generator interval are independent. Use empty junctions for spaces, revisits for repeated notes, and equal-hop branches for chords.

Tempo edits affect all active circuits and future emissions together at the next whole beat. Note length controls melodic sustain in seconds, independently of spacing; percussion uses its natural one-shot decay. Key, scale and chosen pitches determine melodic harmony; a common rhythm alone does not guarantee consonance.

## Contract for agents

- Use `version: 2`, `settings.propagation: "gated"`, adjacent vertex IDs and directed `wiring`. Gates belong to junctions independently of pieces.
- `HOP_BEATS = 0.25` in `src/core/gated.ts` is authoritative. `Engine` supplies anchored beat-to-time deadlines. Geometry, interval and travel budget must never determine gated delays; `GatedEdge.speed` is a display diagnostic.
- Generator `period` is in beats; saved `phase` is a fraction of that period. Its effective offset is `round(phase * period / 0.25) * 0.25`, wrapped modulo `period`; halfway values round upward. Preserve the saved metadata. Phase zero aligns downbeats; other offsets stay on the shared grid.
- Commit one edge ahead. Whole-beat tempo changes align with hop boundaries. Rendering consumes audio timestamps. Never separately snap sounds or deduplicate simultaneous arrivals.
- Keep this guide, [Rules.md](Rules.md), the [design brief](Game-Design-Brief.md) and [spark-gates plan](Spark-Gates-Work-Package.md) consistent. Regenerate [Agent-Guide.md](Agent-Guide.md) with `npm run docs:agents` whenever behavior, instruments, settings or looks change; its generator also supplies the app's prompt and FAQ. Run the musical-grid and spark-gates tests, including browser checks, after timing changes.

## Complete starter file

This is a valid three-note chain. Adapt it to the user's request; the sample alone is not the requested composition.

```json
{
  "format": "bongo-planet-composition",
  "version": 1,
  "scene": {
    "version": 2,
    "topology": "icosa-3v-v1",
    "settings": {
      "bpm": 120,
      "key": 0,
      "scale": "major",
      "travel": 0.75,
      "quantization": 0.25,
      "volume": 0.65,
      "propagation": "gated"
    },
    "pieces": [
      {
        "label": "Generator 1",
        "id": "gate-source",
        "vertex": 44,
        "kind": "generator",
        "period": 4,
        "phase": 0,
        "reach": 90,
        "enabled": true,
        "travel": 3
      },
      {
        "label": "Piano 1",
        "id": "gate-note-0",
        "vertex": 46,
        "kind": "note",
        "degree": 0,
        "octave": 4,
        "timbre": "sine",
        "instrument": "piano",
        "duration": 0.3,
        "level": 0.65
      },
      {
        "label": "Piano 2",
        "id": "gate-note-1",
        "vertex": 47,
        "kind": "note",
        "degree": 2,
        "octave": 4,
        "timbre": "sine",
        "instrument": "piano",
        "duration": 0.3,
        "level": 0.65
      },
      {
        "label": "Piano 3",
        "id": "gate-note-2",
        "vertex": 45,
        "kind": "note",
        "degree": 4,
        "octave": 4,
        "timbre": "sine",
        "instrument": "piano",
        "duration": 0.3,
        "level": 0.65
      }
    ],
    "wiring": [
      {
        "vertex": 44,
        "exits": [
          46
        ]
      },
      {
        "vertex": 46,
        "exits": [
          47
        ]
      },
      {
        "vertex": 47,
        "exits": [
          45
        ]
      },
      {
        "vertex": 45,
        "exits": []
      }
    ]
  },
  "appearance": {
    "version": 1,
    "style": "toys",
    "surface": "seams",
    "pulseEffects": "struts",
    "planet": "#5262e9",
    "generator": "#ffd35b",
    "note": "#70dec8",
    "beat": "#ff9685",
    "background": "#151e31",
    "guitar": "#ffb883",
    "glass": "#a1dff9",
    "kalimba": "#b5dfaa",
    "piano": "#c6b4f6",
    "marimba": "#f7aab9",
    "bongo-high": "#ffb883",
    "bongo-low": "#ff9685",
    "kick": "#ff9685",
    "snare": "#ff9685",
    "hi-hat": "#ffd35b",
    "backdrop": "cream",
    "eyes": true,
    "bounce": true,
    "glow": 1,
    "size": 1.25,
    "lighting": 1,
    "sparkStyle": "white",
    "switches": {
      "style": "ink",
      "icon": "arrow",
      "size": 1,
      "stroke": 1,
      "glow": 0,
      "onColor": "#ffd35b",
      "offColor": "#ffffff",
      "animation": true
    }
  }
}
```

## Exact JSON schema

Generated from the current gated-scene and appearance validators used by Import. The schema does not express graph adjacency, unique occupancy, unique IDs or the generator-count refinement: enforce those using the instructions and map here. With repository access, importCompositionFile in src/compositionFile.ts performs those checks. Validation does not prove that the music is pleasant or audible.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "format": {
      "type": "string",
      "const": "bongo-planet-composition"
    },
    "version": {
      "type": "number",
      "const": 1
    },
    "scene": {
      "type": "object",
      "properties": {
        "version": {
          "type": "number",
          "const": 2
        },
        "topology": {
          "type": "string",
          "const": "icosa-3v-v1"
        },
        "settings": {
          "type": "object",
          "properties": {
            "bpm": {
              "type": "number",
              "minimum": 40,
              "maximum": 180
            },
            "key": {
              "type": "integer",
              "minimum": 0,
              "maximum": 11
            },
            "scale": {
              "type": "string",
              "enum": [
                "major",
                "minor",
                "pentatonic"
              ]
            },
            "travel": {
              "type": "number",
              "minimum": 0.25,
              "maximum": 0.75
            },
            "quantization": {
              "anyOf": [
                {
                  "type": "number",
                  "const": 0
                },
                {
                  "type": "number",
                  "const": 0.125
                },
                {
                  "type": "number",
                  "const": 0.25
                }
              ]
            },
            "volume": {
              "type": "number",
              "minimum": 0,
              "maximum": 1
            },
            "propagation": {
              "type": "string",
              "const": "gated"
            }
          },
          "required": [
            "bpm",
            "key",
            "scale",
            "travel",
            "quantization",
            "volume",
            "propagation"
          ],
          "additionalProperties": false
        },
        "pieces": {
          "maxItems": 92,
          "type": "array",
          "items": {
            "oneOf": [
              {
                "type": "object",
                "properties": {
                  "label": {
                    "type": "string",
                    "pattern": "^(Generator|Guitar|Glass|Kalimba|Piano|Marimba|High bongo|Low bongo|Kick|Snare|Hi-hat) [1-9][0-9]{0,5}$"
                  },
                  "id": {
                    "type": "string",
                    "pattern": "^[a-zA-Z0-9_-]{1,64}$"
                  },
                  "vertex": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 91
                  },
                  "kind": {
                    "type": "string",
                    "const": "generator"
                  },
                  "period": {
                    "anyOf": [
                      {
                        "type": "number",
                        "const": 1
                      },
                      {
                        "type": "number",
                        "const": 2
                      },
                      {
                        "type": "number",
                        "const": 3
                      },
                      {
                        "type": "number",
                        "const": 4
                      },
                      {
                        "type": "number",
                        "const": 6
                      },
                      {
                        "type": "number",
                        "const": 8
                      }
                    ]
                  },
                  "phase": {
                    "type": "number",
                    "minimum": 0,
                    "maximum": 0.999999
                  },
                  "reach": {
                    "type": "number",
                    "minimum": 0,
                    "maximum": 180
                  },
                  "enabled": {
                    "type": "boolean"
                  },
                  "travel": {
                    "anyOf": [
                      {
                        "type": "integer",
                        "exclusiveMinimum": 0,
                        "maximum": 9007199254740991
                      },
                      {
                        "type": "string",
                        "const": "infinite"
                      }
                    ]
                  },
                  "path": {
                    "minItems": 2,
                    "maxItems": 182,
                    "type": "array",
                    "items": {
                      "type": "integer",
                      "minimum": 0,
                      "maximum": 91
                    }
                  }
                },
                "required": [
                  "id",
                  "vertex",
                  "kind",
                  "period",
                  "phase",
                  "reach",
                  "enabled",
                  "travel"
                ],
                "additionalProperties": false
              },
              {
                "type": "object",
                "properties": {
                  "label": {
                    "type": "string",
                    "pattern": "^(Generator|Guitar|Glass|Kalimba|Piano|Marimba|High bongo|Low bongo|Kick|Snare|Hi-hat) [1-9][0-9]{0,5}$"
                  },
                  "id": {
                    "type": "string",
                    "pattern": "^[a-zA-Z0-9_-]{1,64}$"
                  },
                  "vertex": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 91
                  },
                  "kind": {
                    "type": "string",
                    "const": "note"
                  },
                  "degree": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 6
                  },
                  "octave": {
                    "type": "integer",
                    "minimum": 2,
                    "maximum": 6
                  },
                  "timbre": {
                    "type": "string",
                    "enum": [
                      "sine",
                      "triangle"
                    ]
                  },
                  "instrument": {
                    "type": "string",
                    "enum": [
                      "guitar",
                      "glass",
                      "kalimba",
                      "piano",
                      "marimba",
                      "bongo-high",
                      "bongo-low",
                      "kick",
                      "snare",
                      "hi-hat"
                    ]
                  },
                  "duration": {
                    "type": "number",
                    "minimum": 0.05,
                    "maximum": 8
                  },
                  "level": {
                    "type": "number",
                    "minimum": 0,
                    "maximum": 1
                  }
                },
                "required": [
                  "id",
                  "vertex",
                  "kind",
                  "degree",
                  "octave",
                  "timbre",
                  "duration",
                  "level"
                ],
                "additionalProperties": false
              },
              {
                "type": "object",
                "properties": {
                  "label": {
                    "type": "string",
                    "pattern": "^(Generator|Guitar|Glass|Kalimba|Piano|Marimba|High bongo|Low bongo|Kick|Snare|Hi-hat) [1-9][0-9]{0,5}$"
                  },
                  "id": {
                    "type": "string",
                    "pattern": "^[a-zA-Z0-9_-]{1,64}$"
                  },
                  "vertex": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 91
                  },
                  "kind": {
                    "type": "string",
                    "const": "beat"
                  },
                  "sound": {
                    "type": "string",
                    "enum": [
                      "kick",
                      "hat",
                      "snare"
                    ]
                  },
                  "decay": {
                    "type": "number",
                    "minimum": 0.03,
                    "maximum": 4
                  },
                  "level": {
                    "type": "number",
                    "minimum": 0,
                    "maximum": 1
                  }
                },
                "required": [
                  "id",
                  "vertex",
                  "kind",
                  "sound",
                  "decay",
                  "level"
                ],
                "additionalProperties": false
              }
            ]
          }
        },
        "wiring": {
          "maxItems": 92,
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "vertex": {
                "type": "integer",
                "minimum": 0,
                "maximum": 91
              },
              "exits": {
                "maxItems": 6,
                "type": "array",
                "items": {
                  "type": "integer",
                  "minimum": 0,
                  "maximum": 91
                }
              }
            },
            "required": [
              "vertex",
              "exits"
            ],
            "additionalProperties": false
          }
        }
      },
      "required": [
        "version",
        "topology",
        "settings",
        "pieces",
        "wiring"
      ],
      "additionalProperties": false
    },
    "appearance": {
      "type": "object",
      "properties": {
        "version": {
          "type": "number",
          "const": 1
        },
        "style": {
          "type": "string",
          "const": "toys"
        },
        "surface": {
          "type": "string",
          "const": "seams"
        },
        "pulseEffects": {
          "type": "string",
          "const": "struts"
        },
        "planet": {
          "type": "string",
          "pattern": "^#[0-9a-f]{6}$"
        },
        "generator": {
          "type": "string",
          "pattern": "^#[0-9a-f]{6}$"
        },
        "note": {
          "type": "string",
          "pattern": "^#[0-9a-f]{6}$"
        },
        "beat": {
          "type": "string",
          "pattern": "^#[0-9a-f]{6}$"
        },
        "background": {
          "type": "string",
          "pattern": "^#[0-9a-f]{6}$"
        },
        "guitar": {
          "type": "string",
          "pattern": "^#[0-9a-f]{6}$"
        },
        "glass": {
          "type": "string",
          "pattern": "^#[0-9a-f]{6}$"
        },
        "kalimba": {
          "type": "string",
          "pattern": "^#[0-9a-f]{6}$"
        },
        "piano": {
          "type": "string",
          "pattern": "^#[0-9a-f]{6}$"
        },
        "marimba": {
          "type": "string",
          "pattern": "^#[0-9a-f]{6}$"
        },
        "bongo-high": {
          "default": "#ffb883",
          "type": "string",
          "pattern": "^#[0-9a-f]{6}$"
        },
        "bongo-low": {
          "default": "#ff9685",
          "type": "string",
          "pattern": "^#[0-9a-f]{6}$"
        },
        "kick": {
          "default": "#ff9685",
          "type": "string",
          "pattern": "^#[0-9a-f]{6}$"
        },
        "snare": {
          "default": "#ff9685",
          "type": "string",
          "pattern": "^#[0-9a-f]{6}$"
        },
        "hi-hat": {
          "default": "#ffd35b",
          "type": "string",
          "pattern": "^#[0-9a-f]{6}$"
        },
        "backdrop": {
          "type": "string",
          "enum": [
            "cream",
            "peach",
            "mint",
            "lavender",
            "stars"
          ]
        },
        "eyes": {
          "type": "boolean",
          "const": true
        },
        "bounce": {
          "type": "boolean",
          "const": true
        },
        "glow": {
          "type": "number",
          "minimum": 0,
          "maximum": 2
        },
        "size": {
          "type": "number",
          "minimum": 0.65,
          "maximum": 1.6
        },
        "lighting": {
          "type": "number",
          "minimum": 0.5,
          "maximum": 2
        },
        "sparkStyle": {
          "type": "string",
          "enum": [
            "ember",
            "white",
            "lightning"
          ]
        },
        "switches": {
          "type": "object",
          "properties": {
            "style": {
              "type": "string",
              "enum": [
                "ink",
                "toy",
                "glow"
              ]
            },
            "icon": {
              "type": "string",
              "enum": [
                "arrow",
                "chevron",
                "triangle",
                "bolt",
                "comet"
              ]
            },
            "size": {
              "type": "number",
              "minimum": 0.7,
              "maximum": 1.6
            },
            "stroke": {
              "type": "number",
              "minimum": 0.65,
              "maximum": 1.6
            },
            "glow": {
              "type": "number",
              "minimum": 0,
              "maximum": 1
            },
            "onColor": {
              "type": "string",
              "pattern": "^#[0-9a-f]{6}$"
            },
            "offColor": {
              "type": "string",
              "pattern": "^#[0-9a-f]{6}$"
            },
            "animation": {
              "type": "boolean"
            }
          },
          "required": [
            "style",
            "icon",
            "size",
            "stroke",
            "glow",
            "onColor",
            "offColor",
            "animation"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "version",
        "style",
        "surface",
        "pulseEffects",
        "planet",
        "generator",
        "note",
        "beat",
        "background",
        "guitar",
        "glass",
        "kalimba",
        "piano",
        "marimba",
        "bongo-high",
        "bongo-low",
        "kick",
        "snare",
        "hi-hat",
        "backdrop",
        "eyes",
        "bounce",
        "glow",
        "size",
        "lighting",
        "sparkStyle",
        "switches"
      ],
      "additionalProperties": false
    }
  },
  "required": [
    "format",
    "version",
    "scene",
    "appearance"
  ],
  "additionalProperties": false
}
```

## Planet neighbor map

Vertex: allowed adjacent exits. Only these directed pairs are valid; repeated vertices in a journey are allowed, but pieces and wiring records must be unique per vertex.

```text
0: 1, 4, 10, 16, 22
1: 0, 2, 4, 5, 10, 13
2: 1, 3, 5, 6, 13, 15
3: 2, 6, 15, 36, 37
4: 0, 1, 5, 7, 22, 28
5: 1, 2, 4, 6, 7, 8
6: 2, 3, 5, 8, 37, 40
7: 4, 5, 8, 9, 28, 29
8: 5, 6, 7, 9, 40, 42
9: 7, 8, 29, 42, 43
10: 0, 1, 11, 13, 16, 19
11: 10, 12, 13, 14, 19, 21
12: 11, 14, 21, 31, 60
13: 1, 2, 10, 11, 14, 15
14: 11, 12, 13, 15, 31, 34
15: 2, 3, 13, 14, 34, 36
16: 0, 10, 17, 19, 22, 25
17: 16, 18, 19, 20, 25, 27
18: 17, 20, 27, 54, 55
19: 10, 11, 16, 17, 20, 21
20: 17, 18, 19, 21, 55, 58
21: 11, 12, 19, 20, 58, 60
22: 0, 4, 16, 23, 25, 28
23: 22, 24, 25, 26, 28, 30
24: 23, 26, 30, 48, 49
25: 16, 17, 22, 23, 26, 27
26: 23, 24, 25, 27, 49, 52
27: 17, 18, 25, 26, 52, 54
28: 4, 7, 22, 23, 29, 30
29: 7, 9, 28, 30, 43, 46
30: 23, 24, 28, 29, 46, 48
31: 12, 14, 32, 34, 60, 91
32: 31, 33, 34, 35, 85, 91
33: 32, 35, 67, 68, 85
34: 14, 15, 31, 32, 35, 36
35: 32, 33, 34, 36, 68, 87
36: 3, 15, 34, 35, 37, 87
37: 3, 6, 36, 38, 40, 87
38: 37, 39, 40, 41, 66, 87
39: 38, 41, 63, 66, 73
40: 6, 8, 37, 38, 41, 42
41: 38, 39, 40, 42, 73, 88
42: 8, 9, 40, 41, 43, 88
43: 9, 29, 42, 44, 46, 88
44: 43, 45, 46, 47, 72, 88
45: 44, 47, 70, 72, 78
46: 29, 30, 43, 44, 47, 48
47: 44, 45, 46, 48, 78, 89
48: 24, 30, 46, 47, 49, 89
49: 24, 26, 48, 50, 52, 89
50: 49, 51, 52, 53, 77, 89
51: 50, 53, 75, 77, 83
52: 26, 27, 49, 50, 53, 54
53: 50, 51, 52, 54, 83, 90
54: 18, 27, 52, 53, 55, 90
55: 18, 20, 54, 56, 58, 90
56: 55, 57, 58, 59, 82, 90
57: 56, 59, 80, 82, 86
58: 20, 21, 55, 56, 59, 60
59: 56, 57, 58, 60, 86, 91
60: 12, 21, 31, 58, 59, 91
61: 62, 64, 69, 74, 79
62: 61, 63, 64, 65, 69, 71
63: 39, 62, 65, 66, 71, 73
64: 61, 62, 65, 67, 79, 84
65: 62, 63, 64, 66, 67, 68
66: 38, 39, 63, 65, 68, 87
67: 33, 64, 65, 68, 84, 85
68: 33, 35, 65, 66, 67, 87
69: 61, 62, 70, 71, 74, 76
70: 45, 69, 71, 72, 76, 78
71: 62, 63, 69, 70, 72, 73
72: 44, 45, 70, 71, 73, 88
73: 39, 41, 63, 71, 72, 88
74: 61, 69, 75, 76, 79, 81
75: 51, 74, 76, 77, 81, 83
76: 69, 70, 74, 75, 77, 78
77: 50, 51, 75, 76, 78, 89
78: 45, 47, 70, 76, 77, 89
79: 61, 64, 74, 80, 81, 84
80: 57, 79, 81, 82, 84, 86
81: 74, 75, 79, 80, 82, 83
82: 56, 57, 80, 81, 83, 90
83: 51, 53, 75, 81, 82, 90
84: 64, 67, 79, 80, 85, 86
85: 32, 33, 67, 84, 86, 91
86: 57, 59, 80, 84, 85, 91
87: 35, 36, 37, 38, 66, 68
88: 41, 42, 43, 44, 72, 73
89: 47, 48, 49, 50, 77, 78
90: 53, 54, 55, 56, 82, 83
91: 31, 32, 59, 60, 85, 86
```

## Keeping this reference current

For agents changing Bongo Planet: update Creation-Guide.md and Rules.md whenever musical behavior changes; update the instrument/look catalogs and validators whenever options change. Run npm run docs:agents to regenerate Agent-Guide.md. The app's FAQ and copied prompt use the same guide generator; npm run build regenerates the canonical document, and tests verify that the saved guide matches the current sources.
