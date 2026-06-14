# DaengDaBang Hero Flow Prompts

Use `public/images/hero/default.mp4` as the motion and character reference for every version.

Keep the same girl, same white dog, same leash, same walking cycle, same neighborhood composition, same watercolor pencil-book illustration style, same camera angle, same framing, and same loop timing. Only change the time of day, lighting, sky, and weather atmosphere. Do not add new people, new animals, cars, text, logos, signs, or watermarks.

Recommended output:
- 16:9 landscape
- 5-6 seconds
- seamless loop
- gentle walking motion
- no camera shake
- no crop changes
- export mp4

## 1. Night Moon Walk

Target file:
`public/images/hero/night-moon.mp4`

Prompt:
```
Using the reference video, keep the exact same child, white dog, red leash, walking motion, camera framing, and illustrated neighborhood background. Transform only the scene into a calm summer night. The sky is deep navy, the street and houses are softly dimmed, a small crescent moon sits behind the roofline, and subtle tiny stars appear in the upper sky. Add gentle moonlight on the child and dog without changing their shapes, clothes, pose, or timing. Keep the warm watercolor pencil-book illustration style. No new characters, no text, no watermark, no logo. Seamless loop, 16:9, 5 seconds.
```

Negative prompt:
```
Do not redesign the girl or dog. Do not change the leash, outfit, walking cycle, camera angle, or crop. Do not add a large sun-like moon. Do not add extra animals, cars, street signs, logos, or readable text.
```

## 2. Sunset Golden Walk

Target file:
`public/images/hero/sunset-golden.mp4`

Prompt:
```
Using the reference video, preserve the exact same child, white dog, leash, walking motion, framing, and neighborhood composition. Change only the lighting to a gentle golden sunset. The sky has soft peach, coral, and warm amber tones, with long mild shadows and a cozy evening glow across the houses and sidewalk. Keep the characters identical and natural, with the same hand-drawn watercolor pencil texture. No new people, no new animals, no text, no watermark. Seamless loop, 16:9, 5 seconds.
```

Negative prompt:
```
Do not crop the lower body or dog. Do not change the girl, dog, clothes, leash, pose, or motion. Avoid dramatic fantasy lighting, neon colors, logos, text, or extra objects.
```

## 3. Snowy Winter Walk

Target file:
`public/images/hero/snow-walk.mp4`

Prompt:
```
Using the reference video, keep the exact same child, white dog, red leash, walking cycle, camera angle, and composition. Turn the neighborhood into a soft snowy winter walk. Add light snow falling slowly, a thin blanket of snow on roofs, fences, and the sidewalk edges, and a cool pale sky. Keep the child and dog forms unchanged; only add subtle winter atmosphere and slightly cooler lighting. Maintain the watercolor pencil storybook style. No new characters, no text, no watermark. Seamless loop, 16:9, 5 seconds.
```

Negative prompt:
```
Do not replace the dog or child. Do not add heavy blizzard effects that hide the characters. Do not alter the camera crop, walking rhythm, clothing shape, or leash. No logos or text.
```

## 4. Rainy Walk

Target file:
`public/images/hero/rain-walk.mp4`

Prompt:
```
Using the reference video, preserve the exact child, dog, leash, walking motion, camera framing, and illustrated neighborhood. Change only the weather into a gentle rainy day. Add fine diagonal rain, soft wet reflections on the sidewalk, muted grey-blue sky, and a calm damp atmosphere. The girl and dog must stay clearly visible and identical to the reference. Keep the watercolor pencil-book illustration texture. No umbrellas unless already in the reference, no new characters, no text, no watermark. Seamless loop, 16:9, 5 seconds.
```

Negative prompt:
```
Do not obscure the dog or child with rain. Do not add new props, umbrellas, cars, people, signs, logos, or readable text. Do not change the character design, pose, leash, or crop.
```

## 5. Breezy Wind Walk

Target file:
`public/images/hero/windy-walk.mp4`

Prompt:
```
Using the reference video, keep the same girl, white dog, leash, walking cycle, camera angle, and background layout. Change only the atmosphere to a breezy clear day. Add subtle wind movement through nearby leaves, faint flowing line accents in the sky, and a slightly fresh cool light. The child's hair and clothes may move only very slightly, without changing shape or identity. The dog remains the same and clearly visible. Keep the watercolor pencil storybook style. No new characters, no text, no watermark. Seamless loop, 16:9, 5 seconds.
```

Negative prompt:
```
Do not make the wind stormy. Do not change the child, dog, leash, walking timing, framing, or crop. Do not add debris, new animals, vehicles, signs, logos, or readable text.
```

## Import Mapping After Export

After Flow export, place files here:

```
public/images/hero/night-moon.mp4
public/images/hero/sunset-golden.mp4
public/images/hero/snow-walk.mp4
public/images/hero/rain-walk.mp4
public/images/hero/windy-walk.mp4
```

Then update `lib/hero-assets.ts` so these variants replace the CSS-only weather overlays.
