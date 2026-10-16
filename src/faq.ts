import { AGENT_MUSIC_PROMPT, EXAMPLE_SONG, SONG_FORMAT } from './songGuide';

const guideImage = (name: string) => `${import.meta.env.BASE_URL}guide/${name}.png`;
const escapeHTML = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** The same Bongo-only screenshots can accompany both the local and public app. */
export const FAQ_GUIDE = `
  <div class="faq-content">
    <header class="guide-intro">
      <span class="guide-eyebrow">FAQ &amp; getting started</span>
      <h1 id="faq-title">Your band, from first note to showtime.</h1>
      <p>Place your band on the planet, write the music they play, then watch it come to life. Start small. You can change your band and your music as you go.</p>
      <ol class="guide-flow" aria-label="The music-making workflow">
        <li><a href="#guide-placement"><span>1</span> Place your band</a></li>
        <li aria-hidden="true">↔</li>
        <li><a href="#guide-composer"><span>2</span> Compose your music</a></li>
        <li aria-hidden="true">→</li>
        <li><a href="#guide-performance"><span>3</span> Put on a performance</a></li>
      </ol>
      <div class="guide-shortcuts"><a href="#guide-save">Save &amp; share</a><a href="#guide-agent">Write a song with your AI agent</a></div>
    </header>

    <dl class="guide-concepts" aria-label="Meet the concepts">
      <div><dt>The band</dt><dd>The characters you place are performers. Each plays an instrument and has its own notes.</dd></div>
      <div><dt>The planet</dt><dd>Your stage. A <strong>junction</strong> is a meeting point on its seams, with room for one performer.</dd></div>
      <div><dt>The score</dt><dd>Your musical timeline. Left to right is time; up and down is pitch. Pictures show who plays each note.</dd></div>
    </dl>

    <section id="guide-placement" class="guide-step" aria-labelledby="guide-placement-title">
      <div class="guide-step-copy">
        <span class="guide-eyebrow">Step 01 · Placement</span>
        <h2 id="guide-placement-title">First, get the band together.</h2>
        <p>Choose an instrument from the left, then click or tap an empty junction on the planet to place its performer. Repeat to build your band.</p>
        <p>Drag the background to turn the planet. Start with a melody instrument and a drum; you can have up to <strong>16 performers</strong>, including several of the same instrument.</p>
        <p class="guide-tip">Placing someone gives them a seat in the band. Their music comes next.</p>
        <button data-guide-view="placement">Open Placement →</button>
      </div>
      <figure>
        <a href="${guideImage('placement')}" target="_blank" rel="noopener" aria-label="Enlarge the Placement screenshot"><img src="${guideImage('placement')}" width="1280" height="850" alt="Placement: the instrument palette on the left and a band of five performers on the planet, with a selected performer's controls below the palette." decoding="async"></a>
        <figcaption>Choose an instrument, then give it a spot on the planet. Click any screenshot to enlarge it.</figcaption>
      </figure>
    </section>

    <section id="guide-composer" class="guide-step" aria-labelledby="guide-composer-title">
      <div class="guide-step-copy">
        <span class="guide-eyebrow">Step 02 · Composer</span>
        <h2 id="guide-composer-title">Give each bandmate a part.</h2>
        <p>Open <strong>Composer</strong> and choose a placed instrument from the pictures at the top. With <strong>Draw</strong> selected, click the score to add its notes.</p>
        <p>Notes farther right play later; higher notes sound higher. Stack notes at the same time to make a chord. Drums have a separate row at the bottom.</p>
        <p>Press <strong>Play</strong> to listen. Choose another instrument to add its part, change <strong>BPM</strong> to set the speed, and use <strong>Loop</strong> to repeat your idea.</p>
        <button data-guide-view="composer">Open Composer →</button>
      </div>
      <figure>
        <a href="${guideImage('composer')}" target="_blank" rel="noopener" aria-label="Enlarge the Composer screenshot"><img src="${guideImage('composer')}" width="1280" height="850" alt="Composer: instrument pictures above a score with a guitar melody, glass chords, marimba notes and a repeating drum rhythm. Play, Loop and BPM controls sit below." loading="lazy" decoding="async"></a>
        <figcaption>The pictures are notes: choose who plays, then decide when and how high.</figcaption>
      </figure>
    </section>

    <aside class="guide-back-and-forth" aria-labelledby="guide-revisit-title">
      <span class="guide-loop-icon" aria-hidden="true">↔</span>
      <div><h2 id="guide-revisit-title">Go back and forth as much as you like.</h2><p>Return to <strong>Placement</strong> to add or move bandmates, then come back to <strong>Composer</strong> to keep writing. Your notes stay with their performer when you move them. Choosing an unplaced instrument in Composer takes you to Placement; place it, then choose Composer to write its part.</p></div>
    </aside>

    <section id="guide-performance" class="guide-step" aria-labelledby="guide-performance-title">
      <div class="guide-step-copy">
        <span class="guide-eyebrow">Step 03 · Performance</span>
        <h2 id="guide-performance-title">Let the planet be your stage.</h2>
        <p>Open <strong>Performance</strong>, then press <strong>Play</strong> if the music is paused. Watch your band play while the score follows along below.</p>
        <p>The editing controls step aside for the show. Use <strong>Pause</strong>, <strong>Stop</strong> or <strong>Loop</strong> to control playback.</p>
        <p>Want to change something? Choose <strong>Placement</strong> or <strong>Composer</strong> in the same top menu. Drag the divider above the score to give the planet or the music more room.</p>
        <button data-guide-view="performance">Open Performance →</button>
      </div>
      <figure>
        <a href="${guideImage('performance')}" target="_blank" rel="noopener" aria-label="Enlarge the Performance screenshot"><img src="${guideImage('performance')}" width="1280" height="850" alt="Performance: the band fills the planet stage, the same workspace menu stays at the top, the following score sits below the planet, and playback controls remain at the bottom." loading="lazy" decoding="async"></a>
        <figcaption>Your same band and score, with space to enjoy the performance.</figcaption>
      </figure>
    </section>

    <section class="guide-questions" aria-labelledby="guide-questions-title">
      <span class="guide-eyebrow">A few useful answers</span>
      <h2 id="guide-questions-title">Frequently asked questions</h2>
      <details><summary>Can I try an existing song first?</summary><div><p>Yes. Open <strong>Library</strong> and choose a composition to load its band and score. Press Play to hear it, explore Placement, or change its notes in Composer. Export your current work first if you want a file to return to; loading a composition also keeps the previous draft in recovery.</p><button data-guide-view="library">Open Library →</button></div></details>
      <details><summary>How do I change or erase a note?</summary><div><p>In Composer, click a note to select it. Drag it to change its time or pitch, or use the fixed toolbar above the score to set its pitch and supported note length. Note controls become available when you select a note, without moving the score. Choose <strong>Erase</strong> and click notes to remove them, or select notes and press Delete. Scroll along the bottom to reach any part of the composition. The <strong>↶ Undo</strong> button restores an edit. Editing music pauses playback so you can listen again when ready.</p></div></details>
      <details><summary>What do Grid and the passage arrows do?</summary><div><p><strong>Grid</strong> sets the spacing of new notes in time: choose quarter notes for a simple start, or smaller divisions for faster rhythms. The <strong>− / +</strong> controls change the score zoom. The arrows beside <strong>Beats</strong> move to earlier or later passages. For a longer piece, open <strong>••• → Extend four bars</strong>.</p></div></details>
      <details><summary>Can several performers play at once?</summary><div><p>Yes. Notes at the same time play together, including chords from a single performer. You can place multiple copies of an instrument, up to 16 performers in total. If an instrument has several performers, choose its picture in Composer, then choose which performer gets the notes.</p></div></details>
      <details id="guide-save"><summary>How do I save, export or import a song?</summary><div>
        <p>Open <strong>Files</strong> in the top bar. Your draft also autosaves after edits in this browser.</p>
        <dl class="guide-file-actions">
          <div><dt>Save locally</dt><dd>Keep one checkpoint, separate from the working draft. Saving again replaces that checkpoint. Use <strong>Load local save</strong> to return to it.</dd></div>
          <div><dt>Export JSON</dt><dd>Download the complete band, notes, tempo, loop and visual style as a <strong>.json</strong> composition file. Keep separate files for different songs, or share one with a friend.</dd></div>
          <div><dt>Import JSON</dt><dd>Choose a composition file to open it here. A valid file replaces the current song, opens paused and keeps the previous draft in recovery. Press <strong>Play</strong> to hear it. An invalid file leaves your song unchanged.</dd></div>
          <div><dt>Recover previous draft</dt><dd>Bring back the most recent draft replaced by an import, load, Library selection or New. Undo also restores a replacement during the current session. Recovery is one copy, not an archive.</dd></div>
        </dl>
        <p>Browser saves stay on this site address, browser profile and device. They do not sync and may disappear if you clear browser data or use private browsing. <strong>Export files for a lasting backup.</strong> A JSON file is a musical score, not an audio recording or MIDI file.</p>
        <button data-guide-files>Open Files →</button>
      </div></details>
      <details><summary>Can my AI agent write music for this?</summary><div><p>Yes. <a href="#guide-agent">Copy the agent prompt below</a>, give it to your agent and replace <strong>MY SONG REQUEST</strong> with the music you want. It contains the complete file format, instrument IDs, timing rules and an importable example. Ask for a finished <strong>.json</strong> file, then use <strong>Files → Import JSON → Play</strong>.</p></div></details>
      <details><summary>What happens if I remove a bandmate?</summary><div><p>Moving a performer keeps their notes. If you remove one who has notes, the app asks whether to remove those notes or reassign them to another performer of the same instrument, when one is available. Use Undo if you change your mind.</p></div></details>
      <details><summary>Why can't I hear anything?</summary><div><p>Press <strong>Play</strong> to start the audio and check the app's <strong>Volume</strong> slider and your device volume. A newly placed band has no music until you add notes in Composer. For a quick sound check, open a Library composition and press Play.</p></div></details>
    </section>
    <section id="guide-agent" class="guide-agent" aria-labelledby="guide-agent-title">
      <span class="guide-eyebrow">Bring your own composer</span>
      <h2 id="guide-agent-title">Let your agent write the music.</h2>
      <p>Describe the song you want, and give your agent the prompt below. It has everything needed to write a compatible file, even if the agent has never seen this app.</p>
      <ol class="guide-agent-steps"><li>Copy or download the prompt.</li><li>Replace <strong>MY SONG REQUEST</strong> with your idea: style, mood, length, instruments and any melody or structure you want.</li><li>Ask your agent for the complete <strong>.json</strong> file. Import it using <strong>Files → Import JSON</strong>, then press <strong>Play</strong>. Open Performance to watch your band.</li></ol>
      <div class="guide-downloads"><button id="guide-prompt-copy" class="primary">Copy agent prompt</button><button id="guide-prompt-download">Download prompt</button><button id="guide-example-download">Download example song</button></div>
      <label class="guide-prompt-label" for="guide-agent-prompt">Complete prompt · select and copy, or use the buttons above</label>
      <textarea id="guide-agent-prompt" readonly spellcheck="false" rows="12">${escapeHTML(AGENT_MUSIC_PROMPT)}</textarea>
      <div class="guide-reference">
        <details><summary>Composition file format · JSON version 1</summary><div><p>The exact reference is included in the prompt. Exported songs use this same format; both sound sets are supported, one per song.</p><button id="guide-format-download">Download file format</button><pre tabindex="0" aria-label="Composition file format">${escapeHTML(SONG_FORMAT)}</pre></div></details>
        <details><summary>See a complete, playable example file</summary><div><p>“First Light” is a two-bar piano and kick sketch. Download it above, then import the file through Files. Export your current song first if you want to keep a portable copy.</p><pre tabindex="0" aria-label="Example composition JSON">${escapeHTML(JSON.stringify(EXAMPLE_SONG, null, 2))}</pre></div></details>
      </div>
    </section>
    <footer class="guide-outro"><p>A few bandmates and a few notes are all you need to begin.</p><button class="primary" data-guide-view="placement">Start with your band →</button></footer>
  </div>`;
