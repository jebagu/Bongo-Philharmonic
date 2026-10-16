import { getInstruments } from './catalog';
import { JUNCTION_COUNT, MAX_EVENTS, MAX_LENGTH_BEATS, MAX_PERFORMERS, validateComposition, type Composition } from './model';

export const MAX_SONG_FILE_BYTES = 12 * 1024 * 1024;

/** Files, examples and agent instructions use the existing version-one save format. */
export async function readSongFile(file: Pick<File, 'size' | 'text'>): Promise<Composition> {
  if (file.size > MAX_SONG_FILE_BYTES) throw Error('This file is too large. Use a JSON file of at most 12 MiB with at most 32,768 events.');
  return validateComposition(JSON.parse(await file.text()));
}

export const EXAMPLE_SONG = validateComposition({
  schemaVersion: 1, id: 'example-first-song', title: 'First Light', assetSetId: 'bongo', appearance: 'original',
  performers: [
    { id: 'keys', instrumentTypeId: 'piano', junctionId: 0, familyNumber: 1 },
    { id: 'drum', instrumentTypeId: 'kick', junctionId: 12, familyNumber: 1 },
  ],
  locationNames: {}, tempo: 112, meter: [4, 4], editSubdivision: 4,
  lengthBeats: 8, loopRange: [0, 8], loopEnabled: true, masterVolume: 0.7,
  events: [
    ...[60, 64, 67, 64, 62, 65, 69, 67].map((pitch, i) => ({
      id: `melody-${i + 1}`, performerId: 'keys', pitch, startBeat: i, durationBeats: 0.8, velocity: 0.75,
    })),
    ...[0, 2, 4, 6].map((startBeat, i) => ({
      id: `kick-${i + 1}`, performerId: 'drum', pitch: 60, startBeat, durationBeats: 0.25, velocity: 0.6,
    })),
  ],
});

export const SONG_FORMAT = `BONGO PHILHARMONIC COMPOSITION FILE — schemaVersion 1

Save plain UTF-8 JSON with a .json extension. The root is one composition object, not an array or wrapper. This is the same format the app exports. Maximum file size: 12 MiB (${MAX_SONG_FILE_BYTES} bytes). No comments, trailing commas, Markdown fences, extra properties, audio, models or external asset URLs inside the JSON.

ROOT FIELDS (all required except familyCounters and loopEnabled)
- schemaVersion: the number 1.
- id: a unique composition ID. All composition, performer and event IDs must match [A-Za-z0-9_-]{1,100}. IDs are plain strings; a UUID is not required.
- title: 1–180 characters after trimming.
- assetSetId: "bongo" or "mario". Choose ONE sound set for the entire composition; never mix their instrument IDs.
- appearance: use "original" (Blue Marble), "nebula-space" or "firefly-garden".
- performers: array of 0–${MAX_PERFORMERS} performer objects (see below).
- locationNames: object mapping zero-based junction IDs as decimal strings to names, or {}. Keys are "0"–"${JUNCTION_COUNT - 1}" without leading zeros; names are at most 40 grapheme characters after trimming.
- familyCounters: optional object mapping instrumentTypeId to the highest familyNumber used, including removed performers. Values are integers 0–1000000, at least the highest current familyNumber for that type. Omit it for a newly generated song; the app derives it.
- tempo: finite number, 20–400 quarter-note beats per minute.
- meter: [numerator, denominator]; numerator is an integer 1–16; denominator is 1, 2, 4, 8 or 16.
- editSubdivision: integer 1–16; 1 = quarter notes, 2 = eighths, 4 = sixteenths, 3 = eighth-note triplets. This sets the editor grid; importing never rounds or snaps note times.
- lengthBeats: finite number > 0 and <= ${MAX_LENGTH_BEATS}; the score ending in quarter-note beats.
- loopRange: [start, end], with 0 <= start < end <= lengthBeats. Use [0, lengthBeats] for the whole song.
- loopEnabled: optional boolean, defaults to true for older files. Set false for a song that should end.
- masterVolume: finite number 0–1; 0.7 is a useful starting level.
- events: array of 0–${MAX_EVENTS} note objects (see below).

EACH PERFORMER (exactly these fields)
- id: unique among performers.
- instrumentTypeId: one exact ID from the chosen sound set below.
- junctionId: integer 0–${JUNCTION_COUNT - 1}; unique among performers. The UI labels these Junction 1–${JUNCTION_COUNT}; file junction 0 is UI Junction 1.
- familyNumber: integer 1–1000000; unique within each instrumentTypeId. Start each instrument at 1; duplicate instruments use 2, 3, etc. One performer can play chords.

AVAILABLE INSTRUMENT IDS
bongo: ${getInstruments('bongo').map(i => i.id).join(', ')}.
mario: ${getInstruments('mario').map(i => i.id).join(', ')}.

EACH NOTE / EVENT (exactly these fields)
- id: unique among events.
- performerId: the exact id of an existing performer in this file.
- pitch: integer MIDI note 0–127; C4 = 60, D4 = 62, E4 = 64, F4 = 65, G4 = 67, A4 = 69, B4 = 71, C5 = 72. Use numbers, not note-name strings. For useful on-screen melodies, favor B3–G5 (59–79).
- startBeat: finite number >= 0 and < lengthBeats, measured from beat 0.
- durationBeats: finite number > 0 and <= ${MAX_LENGTH_BEATS}. Prefer startBeat + durationBeats <= lengthBeats for a clean ending.
- velocity: finite number 0–1. Use nonzero values for audible notes.

MUSICAL TIMING AND SOUND
All timing uses quarter-note beats regardless of meter: a quarter = 1, eighth = 0.5, sixteenth = 0.25, eighth-note triplet = 1/3. Bar length = numerator * 4 / denominator: 4/4 = 4 beats; 6/8 = 3 beats. Seconds = beats * 60 / tempo. Chords are separate events with the same startBeat and performerId and different pitch values. Rests are gaps; do not create rest objects. Polyrhythms and fractional times are allowed. Sort events by startBeat for readability.
Bongo melodic samples play with the written pitch and duration, within their natural sample length; they are not sustained synthesizers. Bongo percussion (bongo-high, bongo-low, kick, snare, hi-hat) uses its natural one-shot sound; pitch and duration do not alter it, but are required (use pitch 60, durationBeats 0.25).
All Mario instruments, including boat, are pitched one-shots; durationBeats does not stretch or sustain them. Their native MIDI pitches are 59, 60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79; other pitches transpose the nearest sample.
Playback allows at most 64 simultaneous sample voices and 256 attacks in one audio quantum (128 samples). Natural sample tails count, including across loops. Keep arrangements comfortably below those limits; a valid file can still exceed the playback budget. Prefer a few parts with room to breathe.

OPEN AND PLAY
Open https://bongo-philharmonic.jebagu.chatgpt.site, choose Files → Import JSON, then select the .json file. Import validates the whole file before replacing the score, keeps the previous draft in recovery and opens the imported band paused. Press Play; choose Performance to watch it. Never start playback automatically. Files → Save locally makes one browser-local checkpoint; Files → Export JSON downloads a portable copy. Browser saves do not sync between devices, browser profiles or site addresses. This is a composition file, not an audio recording or MIDI file.`;

export const AGENT_MUSIC_PROMPT = `Create a complete, playable song for Bongo Philharmonic from my request below.

MY SONG REQUEST: [Describe the song, mood, style, melody, instruments, tempo, approximate duration, sections and whether it should loop. Replace this bracketed text with your request.]

Interpret my musical request into an intentional arrangement: a memorable melody, supporting harmony/bass where appropriate, rhythm, variation between sections and a deliberate ending or seamless loop. Match the requested duration using tempo and quarter-note beats. If I leave details open, make reasonable musical choices. Use only this app's available instruments and sounds; do not promise vocals, audio uploads or custom samples.

DELIVERABLE: Provide a downloadable UTF-8 file named song-title-Philharmonic.json containing the entire song as literal JSON. If you cannot attach a file, return the full JSON in one code block and tell me to save only its contents as that filename. Do not return code that generates the song, pseudocode, ellipses, abbreviated arrays or a prose-only description. Include every note. Follow the exact format and constraints below. Do not change schemaVersion or invent fields for sections, lyrics, tracks, effects or metadata.

${SONG_FORMAT}

COMPLETE, IMPORTABLE EXAMPLE (a short two-bar sketch; replace its title, IDs, band, length and ALL events with the requested full song):
${JSON.stringify(EXAMPLE_SONG, null, 2)}

BEFORE DELIVERING: Parse your JSON, check all required fields and allowed instrument IDs, unique IDs and junctions, performer references, family numbers, finite numeric ranges, score ending, loop boundaries, file size and playback budget. Include audible notes, nonzero volume and velocity. Check the musical timing, section lengths and approximate duration. Outside the file, briefly describe your arrangement and say: Files → Import JSON → select this file → Play. If browser control is available and I ask you to load it, use the visible Import JSON file picker and verify the imported title and notes; play only when asked. Never write directly to browser storage.`;
