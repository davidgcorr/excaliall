# Contributing to VeDav

Report bugs and propose features in [GitHub Issues](https://github.com/davidgcorr/vedav/issues). Include steps to reproduce and a small example drawing where possible.

See the [README](README.md#run-from-source) for local setup. Create a branch, make your change, and open a pull request against `master` in [davidgcorr/vedav](https://github.com/davidgcorr/vedav).

Before submitting, run the checks relevant to your change:

```sh
corepack yarn test:typecheck
corepack yarn test:app --run
corepack yarn desktop:test
```
