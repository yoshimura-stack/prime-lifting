# V0.5.30 — static costume leg geometry removal

Problem: Static costume thigh/shin boxes stayed in place while the underlying animated legs kicked, causing limbs to stick out.

Fix: Remove fixed-position costume leg and boot boxes in the four mirrored costume overlay files. The already-existing animated thigh, knee, calf and ankle meshes keep the costume materials and follow the original animation. Torso, cape, shoulders, helmet, and other static decorations remain.

No changes to renderer3d.js, physics, scoring, hitboxes, login, server, or rankings.

Local HTML test only. Verify knee/foot kicks in special outfits, especially 81k SAMURAI GOLD and 100k LEGEND. Confirm game play and scoring before considering deployment.
