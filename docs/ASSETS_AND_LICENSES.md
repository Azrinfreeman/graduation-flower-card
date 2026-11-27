# Assets and Licenses

## Original code & artwork (MIT License)
- **3D procedural text-art bouquets** (`js/bouquet3dScene.js`, `js/bouquet3dRenderer.js`, `js/bouquet3dMotion.js`): Wildflower Meadow, Velvet Roses, Sunflowers & Daisies, Spring Tulips, Sakura Branch, and Lilies & Lavender — all generated mathematically in original JavaScript with no images or external libraries.
- **2D ASCII text-art bouquet** (`js/flowerShapes.js`, `js/asciiBouquet.js`): original canvas vector painters converted to text characters.
- **Minimal vector SVG bouquet** (`index.html`, `css/animations.css`) and `assets/icons/favicon.svg`: original inline SVG.

## Sound effects (CC0 1.0)

The clips in `assets/audio/sfx/` are mono MP3s with trimmed starts and adjusted levels. All eight are available under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).

| Local MP3 | Pack | Source file |
|---|---|---|
| `open.mp3` | UI SFX Dreamy | [`open.mp3`](https://github.com/romainsimon/uisfx/blob/9950fe66f993a6660dab9c2651dcbcd899ffd83b/packages/uisfx/sounds/dreamy/open.mp3) |
| `tap.mp3` | UI SFX Soft | [`press.mp3`](https://github.com/romainsimon/uisfx/blob/9950fe66f993a6660dab9c2651dcbcd899ffd83b/packages/uisfx/sounds/soft/press.mp3) |
| `correct.mp3` | UI SFX Dreamy | [`success.mp3`](https://github.com/romainsimon/uisfx/blob/9950fe66f993a6660dab9c2651dcbcd899ffd83b/packages/uisfx/sounds/dreamy/success.mp3) |
| `wrong.mp3` | Kenney Interface Sounds | [`bong_001.wav`](https://github.com/Calinou/kenney-interface-sounds/blob/4596a49eaf5a533948d49a47467f606bcdea70ff/addons/kenney_interface_sounds/bong_001.wav) |
| `page.mp3` | Kenney RPG Audio | [`book_flip_1.ogg`](https://github.com/Boyquotes/kenney-rpg-audio-for-godot/blob/22eb79bb843bbcadcaa6ed119353a33265ffad11/addons/kenney%20rpg%20audio/book_flip_1.ogg) |
| `bloom.mp3` | UI SFX Dreamy | [`achievement.mp3`](https://github.com/romainsimon/uisfx/blob/9950fe66f993a6660dab9c2651dcbcd899ffd83b/packages/uisfx/sounds/dreamy/achievement.mp3) |
| `dodge.mp3` | UI SFX Organic | [`drop.mp3`](https://github.com/romainsimon/uisfx/blob/9950fe66f993a6660dab9c2651dcbcd899ffd83b/packages/uisfx/sounds/organic/drop.mp3) |
| `switch.mp3` | UI SFX Soft | [`release.mp3`](https://github.com/romainsimon/uisfx/blob/9950fe66f993a6660dab9c2651dcbcd899ffd83b/packages/uisfx/sounds/soft/release.mp3) |

Pack licenses are listed at [Kenney Interface Sounds](https://kenney.nl/assets/interface-sounds), [Kenney RPG Audio](https://kenney.nl/assets/rpg-audio), and [UI SFX audio license](https://github.com/romainsimon/uisfx/blob/9950fe66f993a6660dab9c2651dcbcd899ffd83b/LICENSE-AUDIO).

## Fonts (self-hosted)
- **JetBrains Mono** (`assets/fonts/jetbrains-mono-latin.woff2`) is licensed under the **SIL Open Font License 1.1** (`assets/fonts/OFL-JetBrains-Mono.txt`), permitting free personal and commercial web use. Body copy uses the visitor's system sans-serif font.

## Background audio
- No commercial MP3 is bundled with this repository. To add a song, supply an audio file you have rights to use in `assets/audio/` and enable `music` in `js/config.js`.
