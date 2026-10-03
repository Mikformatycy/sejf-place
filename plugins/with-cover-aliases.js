/**
 * Config plugin: six launcher identities ("covers") for the same app.
 *
 * Android: MainActivity loses its LAUNCHER intent-filter; each cover becomes an
 * <activity-alias> with its own label and adaptive icon. Only "przepisy" is enabled
 * by default; modules/cover-switcher toggles them at runtime.
 *
 * iOS: registers CFBundleAlternateIcons (icon only; iOS cannot change the name).
 * NOTE: the iOS part is untested on a device (no Apple Developer account during the project).
 */
const fs = require('node:fs');
const path = require('node:path');
const {
  AndroidConfig,
  IOSConfig,
  withAndroidManifest,
  withDangerousMod,
  withInfoPlist,
  withXcodeProject,
} = require('expo/config-plugins');

const COVERS = [
  { id: 'przepisy', label: 'Przepisy' },
  { id: 'zadania', label: 'Zadania' },
  { id: 'woda', label: 'Pij wodę' },
  { id: 'urodziny', label: 'Urodziny' },
  { id: 'ksiazki', label: 'Czytelniczka' },
  { id: 'kwiatki', label: 'Moje kwiatki' },
];
const DEFAULT_COVER = 'przepisy';

const aliasName = (pkg, id) => `${pkg}.Cover${id[0].toUpperCase()}${id.slice(1)}`;

function isLauncherFilter(filter) {
  const actions = (filter.action ?? []).map((a) => a.$['android:name']);
  const categories = (filter.category ?? []).map((c) => c.$['android:name']);
  return actions.includes('android.intent.action.MAIN') && categories.includes('android.intent.category.LAUNCHER');
}

const withAndroidAliases = (config) =>
  withAndroidManifest(config, (cfg) => {
    const pkg = cfg.android?.package;
    if (!pkg) throw new Error('with-cover-aliases: android.package is required');
    const manifest = cfg.modResults;
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
    const main = AndroidConfig.Manifest.getMainActivityOrThrow(manifest);

    main['intent-filter'] = (main['intent-filter'] ?? []).filter((f) => !isLauncherFilter(f));

    app['activity-alias'] = (app['activity-alias'] ?? []).filter(
      (a) => !String(a.$['android:name']).includes('.Cover'),
    );
    for (const c of COVERS) {
      app['activity-alias'].push({
        $: {
          'android:name': aliasName(pkg, c.id),
          'android:targetActivity': '.MainActivity',
          'android:enabled': c.id === DEFAULT_COVER ? 'true' : 'false',
          'android:exported': 'true',
          'android:label': c.label,
          'android:icon': `@mipmap/ic_cover_${c.id}`,
          'android:roundIcon': `@mipmap/ic_cover_${c.id}`,
        },
        'intent-filter': [
          {
            action: [{ $: { 'android:name': 'android.intent.action.MAIN' } }],
            category: [{ $: { 'android:name': 'android.intent.category.LAUNCHER' } }],
          },
        ],
      });
    }
    return cfg;
  });

const withAndroidIconResources = (config) =>
  withDangerousMod(config, [
    'android',
    async (cfg) => {
      const src = path.join(cfg.modRequest.projectRoot, 'assets', 'covers', 'android');
      const res = path.join(cfg.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res');
      for (const density of fs.readdirSync(src)) {
        const dst = path.join(res, density);
        fs.mkdirSync(dst, { recursive: true });
        for (const file of fs.readdirSync(path.join(src, density))) {
          fs.copyFileSync(path.join(src, density, file), path.join(dst, file));
        }
      }
      // Adaptive icons: the gradient and the glyph are separate layers (scripts/generate-icons.mjs).
      const anydpi = path.join(res, 'mipmap-anydpi-v26');
      fs.mkdirSync(anydpi, { recursive: true });
      for (const c of COVERS) {
        fs.writeFileSync(
          path.join(anydpi, `ic_cover_${c.id}.xml`),
          `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
  <background android:drawable="@mipmap/ic_cover_${c.id}_bg"/>
  <foreground android:drawable="@mipmap/ic_cover_${c.id}_fg"/>
</adaptive-icon>
`,
        );
      }
      return cfg;
    },
  ]);

const withIosAlternateIcons = (config) => {
  config = withInfoPlist(config, (cfg) => {
    const icons = cfg.modResults.CFBundleIcons ?? {};
    icons.CFBundleAlternateIcons = Object.fromEntries(
      COVERS.filter((c) => c.id !== DEFAULT_COVER).map((c) => [
        `Cover-${c.id}`,
        { CFBundleIconFiles: [`Cover-${c.id}`], UIPrerenderedIcon: false },
      ]),
    );
    cfg.modResults.CFBundleIcons = icons;
    return cfg;
  });

  config = withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const src = path.join(cfg.modRequest.projectRoot, 'assets', 'covers', 'ios');
      const projectName = IOSConfig.XcodeUtils.getProjectName(cfg.modRequest.projectRoot);
      const dst = path.join(cfg.modRequest.platformProjectRoot, projectName);
      for (const file of fs.readdirSync(src)) fs.copyFileSync(path.join(src, file), path.join(dst, file));
      return cfg;
    },
  ]);

  return withXcodeProject(config, (cfg) => {
    const projectName = IOSConfig.XcodeUtils.getProjectName(cfg.modRequest.projectRoot);
    const src = path.join(cfg.modRequest.projectRoot, 'assets', 'covers', 'ios');
    for (const file of fs.readdirSync(src)) {
      if (file.includes(`Cover-${DEFAULT_COVER}`)) continue;
      IOSConfig.XcodeUtils.addResourceFileToGroup({
        filepath: path.join(projectName, file),
        groupName: projectName,
        isBuildFile: true,
        project: cfg.modResults,
      });
    }
    return cfg;
  });
};

module.exports = (config) => withIosAlternateIcons(withAndroidIconResources(withAndroidAliases(config)));
