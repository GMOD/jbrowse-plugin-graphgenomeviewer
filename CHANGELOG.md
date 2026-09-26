## [3.0.5](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v3.0.4...v3.0.5) (2026-09-26)

### Other Changes

- Retire betabuild.sh; README names the unpkg url ([393d7bd](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/393d7bd0811095feebca6775a4f011f2a4ca41c3))
- README names the unpkg url; drop the betabuild script entry ([62ea47b](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/62ea47b7ced0b388556bb3d4b24aefdefb5fab6b))
- Delete the lane-pair route: the adapter answers no pair, and no aligner runs ([f4b0a97](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/f4b0a9715829448138032d48433b6e90b914dc5d))
- Remove unused test helpers ([b89cbd9](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/b89cbd946162616f4341bb551c163139e64bfe30))

## [3.0.4](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v3.0.3...v3.0.4) (2026-09-24)

### Other Changes

- GBZ lanes answer two lanes aligned to each other, read inside the anchor window ([1a840f0](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/1a840f0b9deba1432f3169c2b731b8f1a46613f7))
- GBZ handoff: a lane pair on the anchor window answers directly ([ae7d5eb](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/ae7d5ebacd1d6b66b7cb5b1ff669430a1fa3d0b2))
- A lane pair cuts each reference fragment its window overlaps ([63ffc99](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/63ffc99f57925004166195e38f36f8ac08a2d80b))

## [3.0.3](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v3.0.2...v3.0.3) (2026-09-24)

### Other Changes

- Name the repository in package.json, and fetch the e2e host by url ([e3b1934](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/e3b1934d6f366aa5562f45205aba10c4ba47b1ae))

## [3.0.2](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v3.0.1...v3.0.2) (2026-09-24)

### Other Changes

- Switch to published npm versions for jbrowse dependencies ([ad55d4a](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/ad55d4afc59a451f439c1f31b7a8565e269ab7b2))
- Fix lint errors after switching to published jbrowse packages ([d0190c1](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/d0190c136bb0dd32f05e560a1a0b29b2122d2a69))
- Depend on jbrowse 5.0.0-beta.9, the first release whose RPC cancellation is an AbortSignal ([d8b5a40](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/d8b5a4073127c19debc403a1e3e51c9a93c818c6))
- Repair the tests the package switch left behind, and read a channel-shaped lane color back ([1427c05](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/1427c059c0bc8715f9e5beb9dcc9de73d6f5af25))
- Fix what the review turned up in the drawing: tiles, label midpoints, chip keys, walk rows, spare rows, bubble routes, links indexes ([f874417](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/f8744172cbf3843c2bc0d7997d3960e3ed1142d1))
- Drop what nothing reads and fold the copies into one ([f1f68dd](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/f1f68dd9e90e2a44b38e4eb714e698b979404c06))
- Boot the built bundle on hosted releases before a tag, and check against the published packages ([7e23fdd](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/7e23fdd6e4bf35542335a298c9498ac3507fbe04))
- Say what is true now: published deps, a beta.9 floor, six layouts, no host fallback ([1791658](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/1791658d618b3cbca81fcb2adba1e37ac0e84988))

## [3.0.1](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v3.0.0...v3.0.1) (2026-09-22)

### Other Changes

- Configure typos-cli to ignore technical terms and intentional misspellings ([f113f81](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/f113f813561aa9e9d92fd22d0fd8510378ada449))
- Enable e2e tests with stable jbrowse release (v4.3.0) ([8496428](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/8496428b6737fea15904c6a083d015c52c7ec8c9))
- Update e2e tests to use jbrowse v5.0.0-beta.8 ([2603c2a](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/2603c2a672c93d7349d2792051af8168ef5bfb6a))

## [3.0.0](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v1.0.0...v3.0.0) (2026-09-22)

### Other Changes

- Npm publish workflow: OIDC trusted publishing and git-cliff changelog generation ([de56536](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/de56536144d2a2eec33f3c7c10c7acb36638b1c0))
- Bump ([25c296e](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/25c296e9c038314d135ec1efb132b930379d521f))

# Changelog

All notable changes to this project are documented in this file.
