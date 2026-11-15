# Troubleshooting

| Symptom | What to check |
| --- | --- |
| Update Now is missing | Commit the workflow to the default branch and enable Actions for the public repository. |
| Reusable workflow cannot be found | Use the public upstream path and branch from the example. For a fork, update both the caller’s workflow reference and the engine checkout reference. |
| Git Push fails | Check branch protections and repository Actions policies. Rerun if the branch advanced while the job ran. A non-fast-forward update will never overwrite remote commits. |
| GraphQL access fails | Check the public repository and its token. If GraphQL denies the built-in Actions token, configure a dedicated token with public access only and explicitly map it as the reusable workflow’s optional `calendar-token` secret. For local execution, set `GITHUB_TOKEN`. Stats, Constellation, and Languages can run without GraphQL. |
| GitHub reports restricted contributions | Disable private contribution display if you want a public-only calendar while that information is present, or select a view that does not require the calendar. |
| Loading a snapshot fails | Run Update Now in your public username/username repository and select the default branch. The snapshot’s login must match the profile repository owner. |
| The studio uses the sample for one view | The published snapshot includes only the expensive data required by the last selected view. Generate a snapshot with the view you want to preview. |
| The SVG is unchanged | Check the run summary and latest commit. If GitHub still displays an older image after a push, allow time for its cache to refresh. |
| 3D canvas is unavailable | Switch to SVG mode. The README card renders independently of WebGL. |
| API rate limits or repository cap | Follow the retry time in the error message. Language aggregation supports up to 250 owned public non-fork repositories. Try a different view for larger profiles. |
