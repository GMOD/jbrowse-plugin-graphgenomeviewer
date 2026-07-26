// jbrowse-web puts the running session on the window (see
// products/jbrowse-web/src/components/JBrowse.tsx), which is how these e2e demos
// assert against what the *browser* built rather than what the source says it
// should have built.
//
// Deliberately loose: `views` is a heterogeneous MST array whose members come
// from whichever plugins loaded, so a precise type here would be fiction. Each
// call site narrows to the few members it reads.
interface JBrowseTestSession {
  views: any[]
}

declare global {
  interface Window {
    JBrowseSession: JBrowseTestSession
    JBrowseRootModel: unknown
  }
}

export {}
