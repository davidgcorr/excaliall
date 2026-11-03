# Feature milestones

Annotated tags identify the commit where each major feature was introduced. Later fixes and improvements are in subsequent commits.

| Tag | Commit | Feature |
| --- | --- | --- |
| `milestone-animations` | `1e56c78` | Animated connectors |
| `milestone-macos-desktop` | `9aa7cff` | macOS app and versioned releases |
| `milestone-gif-export` | `e213ed6` | Animated GIF export |
| `milestone-html-iframe-export` | `56efa1a` | Standalone animated HTML and iframe embedding |
| `milestone-roughviz-graphs` | `7c43c0d` | Data-driven roughViz graphs |
| `milestone-rough-tables` | `0de8fc7` | Editable rough tables |
| `milestone-graph-properties` | `a7c4172` | Graph side-panel properties and axis titles |
| `milestone-native-data-styling` | `d0432df` | Native data-element styling and on-table icons |
| `milestone-native-roughness` | `e752cea` | Standard roughness controls |

The tags are local until pushed. To publish the branch and these annotated milestone tags to your fork:

```sh
git push -u origin feature/animated-linear-elements
git push origin 'refs/tags/milestone-*:refs/tags/milestone-*'
```

Milestone tags do not trigger installer releases. To create a draft installer release, follow [the release guide](README.md) and use a `desktop-v<version>` tag matching `desktop/package.json`.

`origin` points to <https://github.com/davidgcorr/excalidraw>; `upstream` retains the original project for future merges. See published [tags](https://github.com/davidgcorr/excalidraw/tags) and [releases](https://github.com/davidgcorr/excalidraw/releases).
