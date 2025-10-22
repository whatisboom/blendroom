# Feedback

You will process this document as the authoritative source for bugs, UX issues, and feature ideas.
For each line item:
1. Follow the five phases — Diagnosis, Planning, Implementation, Testing, and Commit.
2. Update each item's progress tag: [NEW], [DIAG], [PLAN], [IMPL], [TEST], [DONE].
3. Work on one line item at a time.
4. Update the item's status tag after completing each phase.
5. Create one commit per item after the Commit phase.

**Status tags:** [NEW] → [DIAG] → [PLAN] → [IMPL] → [TEST] → [DONE]
**Additional tags:** [BLOCKED] for items waiting on dependencies or user input

Claude Code will edit this file directly to reflect progress after each phase.

## Bugs

- [NEW] now playing doesn't update at the start of a song. this should use websockets so that all clients are updated immediately.
- [NEW] when songs are dragged they seem to be removed from the queue, they never get played
- [NEW] Queue should maintain a minimum of 20 songs.
  *Note:* Current documentation and comments refer to 10.
- [NEW] when reordering the queue, if a song is dragged into the stable section (by the DJ), it is not labeled as stable and ones moved out of 'stable' are still labeled as stable

## UX

**Before working on UX items, read the screenshot:** `now-playing.png` shows the current layout.

- [NEW] playback controls and voting take up too much space
- [NEW] voting could be moved into now playing/track info

## Feature Ideas

These are not immediate tasks. For each feature idea:
1. Analyze feasibility and technical approach
2. Document implementation plan in "Planned Features" section below
3. Do not implement until user explicitly requests

- clicking on the device name should let you select a new device to move the playback to
- allow the user to configure queue length and stable section size
- expand the fetched artists for users to a larger number, possibly 50
- create an in-app page to display test coverage that reads from the JSON coverage output and matches our app's visual style/branding

## Planned Features

_(Claude will add detailed implementation plans here for feature ideas above)_