# Paste this as your first message in Claude Code (started in C:\Users\Archlord\Desktop\CropGuard-AI)

Read docs/HANDOFF.md and docs/SATELLITE.md first. They hold the full context, the rules and the open work.
Then do open-work item 1:
1. Check that the phone is connected (adb devices) and that I'm not using it.
2. Install C:\Users\Archlord\Desktop\CropGuard-AI-v2.3.1.apk. If the signature clashes with the dev build, uninstall it first.
3. Open the Eldoret field's satellite page (cropguard-ai://satellite/86a0fc73-33a9-4499-8cd6-2188f4221d27) and wait for it to recompute with method v2.
4. Check the four layer chips (NDVI · 10 m, Crop-water NDWI · 20 m, Joint stress mask · 20 m, Open-water NDWI · 10 m), the captions, the scale bar, "On the map", the Technical panel and the CSV/GeoJSON share. Use scripts\tour.ps1 for screenshots.
5. Save one field check from "What did you find?".
Fix anything broken, keep `npx tsc --noEmit` clean, run node scripts/check_sw.js, commit and push.
