// The hosted JBrowse releases the plugin supports, oldest first. The build binds
// to the installed @jbrowse/core's names, so the first entry is the support
// floor only because `pnpm host-names` fails on an import it does not serve.
export const HOST_RELEASES = ['v5.0.0-beta.18', 'v5.0.0-beta.19']
export const SUPPORT_FLOOR = HOST_RELEASES[0]
