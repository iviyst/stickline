# Online Head to Head: Firebase setup

Online rooms use a Realtime Database (project `syncwave-83ac4`, everything under the `stickline/` node) with **Anonymous sign-in**.

1. Firebase console → Authentication → Sign-in method → turn **Anonymous** on (if it is not already).
2. Firebase console → Realtime Database → **Rules**.
3. The database is shared with another app, so **do not replace** the whole rules file. Inside the existing `"rules": { … }` object, add the `"stickline": { … }` block from `stickline-rules-paste.txt` (next to the other apps' blocks), then **Publish**.

`stickline-rules.json` holds the same block as JSON. Rooms are at `stickline/h4/<ROOM>` (`m` match, `slots/0..3`, `p/<id>` positions, `hits`, `win`), public listings at `stickline/h4pub/<ROOM>`. The older 2-player nodes (`rooms`, `lobby`) are kept so older copies of the game keep working.

Offline play, accounts and everything else work without any of this.

To check the rules: `npm i targaryen && npm test`.
