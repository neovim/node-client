# Changes

## [5.1.0](https://github.com/neovim/node-client/compare/v4.11.0...v5.1.0) (prerelease)

- fix: console.log() writes to RPC channel #202 #329
- feat: eliminate `which` dependency
- feat: improve logs + error messages
- fix: always use custom logger if one is given #336
- feat(logger): timestamp, pretty-print objects #337

## [5.0.1](https://github.com/neovim/node-client/compare/v4.11.0...v5.0.1) (2024-03-01)

- Renamed `getNvimFromEnv` to `findNvim`
- fix: `findNvim()` fails if path has spaces. #319

## [4.11.0](https://github.com/neovim/node-client/compare/v4.10.0...v4.11.0) (2024-02-07)

- `getNvimFromEnv` provides a way to easily find `nvim` on the user's system. (Currently depends on `$PATH` #267)
- Use `$NVIM` instead of deprecated `$NVIM_LISTEN_ADDRESS` #195
- Update dependencies
- Minimum node.js version: 14.x

## [4.8.0](https://github.com/neovim/node-client/compare/v4.7.0...v4.8.0) (2020-01-12)

- **attach:** allow custom logger for attach neovim proc ([#138](https://github.com/neovim/node-client/issues/138)) ([d9bc2ef](https://github.com/neovim/node-client/commit/d9bc2efe30cd4c0de3691e953cace04d02e7855f))

## [4.7.0](https://github.com/neovim/node-client/compare/v4.6.0...v4.7.0) (2019-12-30)

- **transport:** bump up msgpack to latest official ([#136](https://github.com/neovim/node-client/issues/136)) ([669e1d9](https://github.com/neovim/node-client/commit/669e1d9591138dc315092c52b819f118ece66749))
