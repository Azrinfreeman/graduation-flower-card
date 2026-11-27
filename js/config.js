/**
 * PERSONALIZE YOUR CARD HERE.
 * Keep user-provided text as plain text: the app inserts it with `textContent`, never `innerHTML`.
 */
export const cardConfig = {
  // Displayed on the congratulations page.
  graduateName: 'Alex',
  senderSignature: 'From someone cheering you on',

  // Your personal graduation wish. Use "\n\n" to start a new paragraph.
  // Long messages are automatically split across pages so nothing ever has to scroll.
  graduationMessage:
    "You really did it! Every late night, every tough deadline, and every small step along the way brought you to this moment.\n\n" +
    "Congratulations, Alex! \u{1F393}\n\n" +
    "May this next chapter bring you bold adventures, kind people, and plenty of reasons to smile. Take a breath and be proud of how far you've come.\n\n" +
    "Keep blooming — the best chapters are still ahead.",

  // Two quick fun questions before the surprise unlocks (not a security lock).
  // Add, edit, or replace these with your own inside jokes!
  questions: [
    {
      text: 'Ready to open your graduation surprise?',
      options: ['Obviously, yes', 'Nope, take me back'],
      correctAnswer: 'Obviously, yes',
    },
    {
      text: 'What deserves a celebration today?',
      options: ['Finally graduating!', 'Doing more homework'],
      correctAnswer: 'Finally graduating!',
    },
  ],

  // Playful quiz tease: wrong answers run away from the pointer/tap before they can be picked.
  runawayWrongAnswer: {
    enabled: true, // false = wrong answers behave like normal buttons
    giveUpAfter: 5, // dodges before the wrong answer gets "tired" and can be clicked
    hintAfter: 2, // dodges before the correct answer gets a red outline hint (0 = never)
    vibrate: true, // short buzz on Android phones when the button dodges a tap (iPhones ignore this)
    messages: [
      'Hmm, are you sure?',
      'Nope, not that one.',
      'Try the other one.',
      'Catch me if you can.',
      "Okay, okay, you're persistent.",
    ],
  },

  // Let visitors click Previous / Next on the last page to browse all bouquet varieties.
  // Set `enabled: false` (or leave only one entry in `bouquetGallery`) to lock to a single bouquet.
  bouquetPicker: {
    enabled: true,
  },

  // Ordered bouquet varieties shown on the last page. The first item blooms first.
  // Styles:
  //   '3d'    — rotating 3D text-character bouquet (presets: 'wildflower', 'roses', 'sunflowers', 'tulips', 'sakura', 'lilies')
  //   'ascii' — detailed 2D text-character bouquet (mix: 'lily', 'rose', 'daisy', 'tulip')
  //   'svg'   — minimal illustrated vector bouquet
  bouquetGallery: [
    {
      id: 'wildflower',
      name: 'Wildflower Meadow',
      style: '3d',
      preset: 'wildflower',
      seed: 7,
      mix: ['poppy', 'daisy', 'cornflower', 'lupine', 'lily', 'blush', 'gold'],
      colors: {}, // optional hex overrides, e.g. { lily: '#f8a8bf' }
      spinSpeed: .35, // radians per second (0 = manual rotation only)
    },
    {
      id: 'roses',
      name: 'Velvet Roses',
      style: '3d',
      preset: 'roses',
      seed: 11,
      colors: {},
      spinSpeed: .35,
    },
    {
      id: 'sunflowers',
      name: 'Sunflowers & Daisies',
      style: '3d',
      preset: 'sunflowers',
      seed: 19,
      colors: {},
      spinSpeed: .35,
    },
    {
      id: 'tulips',
      name: 'Spring Tulips',
      style: '3d',
      preset: 'tulips',
      seed: 23,
      colors: {},
      spinSpeed: .35,
    },
    {
      id: 'sakura',
      name: 'Sakura Branch',
      style: '3d',
      preset: 'sakura',
      seed: 31,
      colors: {},
      spinSpeed: .30,
    },
    {
      id: 'lilies',
      name: 'Lilies & Lavender',
      style: '3d',
      preset: 'lilies',
      seed: 37,
      colors: {},
      spinSpeed: .35,
    },
    {
      id: 'ascii-garden',
      name: 'Text-Art Garden',
      style: 'ascii',
      seed: 7,
      mix: ['lily', 'rose', 'daisy', 'tulip'],
      colors: ['#e0283c', '#d63fa6', '#f3e6d6', '#f2c230', '#f4a37a', '#9c1f38', '#b57edc'],
    },
    {
      id: 'minimal-svg',
      name: 'Minimal Vector',
      style: 'svg',
    },
  ],

  // Short sound effects. Paths are relative to index.html. Set enabled to false to disable them.
  sfx: {
    enabled: true,
    files: {
      open: 'assets/audio/sfx/open.mp3',
      tap: 'assets/audio/sfx/tap.mp3',
      correct: 'assets/audio/sfx/correct.mp3',
      wrong: 'assets/audio/sfx/wrong.mp3',
      page: 'assets/audio/sfx/page.mp3',
      bloom: 'assets/audio/sfx/bloom.mp3',
      dodge: 'assets/audio/sfx/dodge.mp3',
      switch: 'assets/audio/sfx/switch.mp3',
    },
  },

  // Optional background song. Off by default in this open-source template.
  // To add a song: put your MP3 in `assets/audio/your-song.mp3`, set `enabled: true`, and update `src` & `note`.
  music: {
    enabled: false,
    src: 'assets/audio/your-song.mp3',
    volume: 0.15, // Initial volume for the song and sound effects, from 0 to 1
    // Shown on the last page below the bouquet (leave empty '' to hide).
    note: 'A bouquet made in code. Use the arrows to try the other styles.',
  },

  // After deploying your card, run `python tools/generate_qr.py https://your-url/` if you want a printable QR code.
  qrReady: false,
};
