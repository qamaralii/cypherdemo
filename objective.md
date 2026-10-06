# Objective — Intugle: The Photo (Opening Experience)

## Goal and scope
Build a cinematic React webpage for Intugle’s Cypher 2026 booth using the supplied AI-generated videos. Introduce the product incident through a clear visual story, ending with an animated social-media post. This phase stops at the social post; do not build the agent race, investigation, decisions or outcomes yet. No typing or login.

## Experience flow
1. **Opening screen:** Intugle branding, “One photo. Two ways to find the answer.” and a prominent Start button.
2. **F1 — Factory:** Play the supplied manufacturing video. Packets continue moving while an amber warning activates. Preserve the footage; add configured temperature/incident captions as React overlays if supplied.
3. **F2 — Distribution:** Automatically play the supplied two-shot video: cartons loaded into a truck at the factory, then delivered to a grocery store. No intermediate depot scene.
4. **F3 — Discovery:** Automatically play the supplied video of a woman discovering mouldy chips and photographing them.
5. **Social-post animation:** Hold and dim F3’s final frame. Bring a social-post card into focus with a smooth fade, upward movement and subtle scale animation. Use the supplied chips-only photograph inside the card—not an image of the woman. Reveal the customer identity and caption, then animate views/shares upward and stagger a few brief comments into view. Example caption: “Just opened this packet. How is this okay?” Keep the image and text large enough to understand immediately.
6. **End state:** Settle on the completed post with counters capped at configured values. Offer Replay. Reserve an optional “Find the affected stores” callback for the next phase; hide the button until that callback is connected.

## Visual direction
Match the videos’ polished, stylised 3D aesthetic. Use navy, teal, cream and amber, with restrained coral for concern. Prioritize large typography, minimal copy, smooth transitions and one clear focal point. The post is a React interface, not another video. All names, captions, comments and counters must remain editable text. Use fictional social activity to illustrate the story.

## Implementation
- Use React + TypeScript + Vite, with GSAP for interface animation and counters.
- Build reusable OpeningScreen, VideoScene and SocialPost components, coordinated by one scene controller.
- Keep video files separate. Preload upcoming clips and retain the outgoing frame/poster until the next video is ready. No manual switching or black flashes.
- Store actual asset paths, overlays, cue times, post content and counter targets in one configuration file. Inspect supplied assets; show clear placeholders for missing media.
- Synchronize video overlays to playback time so pause and seek remain accurate.
- Support configurable loop sections where needed, especially F1. Preserve the supplied amber behaviour; do not reverse footage or assume its endpoints match. Keep overlay progression separate from background loops. F2 and F3 play once before advancing.
- Clean up timers, video listeners and GSAP timelines on scene exit/reset. Replay must start from a clean state.

## Controls and reliability
- Start and Replay support mouse, touch and keyboard.
- Space pauses/resumes video and interface timelines together; arrow keys navigate scenes; R resets; F toggles fullscreen. Provide small host-control help.
- Optimize for a 16:9 booth display and adapt to smaller screens without cropping essential content.
- Bundle media, fonts and dependencies locally; the built app must work from a local server without internet. Default to muted audio with an explicit sound toggle.
- Handle loading/playback failures gracefully and provide reduced-motion support.

## Deliverable
A working opening experience through the completed social post, plus a short README explaining startup, asset replacement, configuration and controls. Verify automatic transitions, readable overlays, pause/resume, scene navigation, replay and offline playback.
