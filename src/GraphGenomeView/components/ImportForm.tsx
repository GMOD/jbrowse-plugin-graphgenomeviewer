import { useState } from 'react'

import { ErrorBanner, LoadingEllipses } from '@jbrowse/core/ui'
import { openLocation } from '@jbrowse/core/util/io'
import { Button, Paper, TextField, Typography } from '@mui/material'
import { observer } from 'mobx-react'
import { makeStyles } from 'tss-react/mui'

import type { GraphGenomeViewModel } from '../model'

const EXAMPLE_GFA = `H\tVN:Z:1.0
S\t1\tACGT
S\t2\tGGCC
S\t3\tTTAA
S\t4\tCCGG
L\t1\t+\t2\t+\t0M
L\t1\t+\t3\t+\t0M
L\t2\t+\t4\t+\t0M
L\t3\t+\t4\t+\t0M`

const useStyles = makeStyles()({
  column: { display: 'flex', flexDirection: 'column', gap: 8 },
  rowEnd: { display: 'flex', gap: 8, alignItems: 'flex-end' },
  rowCenter: { display: 'flex', gap: 8, alignItems: 'center' },
  flex1: { flex: 1 },
  paper: { padding: 16, margin: 8, maxWidth: 560, marginInline: 'auto' },
  header: { marginBottom: 12 },
  footer: { marginTop: 12, display: 'flex', justifyContent: 'flex-end' },
})

// File/URL load renders the whole GFA in the view — best for small/medium
// graphs. Locus-anchored subgraph extraction (a GfaTabix/GfaServer track + a
// region) is deferred until the reference-anchored index lands; the `TrackMode`
// form for it lives in git history.
const ImportForm = observer(function ImportForm({
  model,
}: {
  model: GraphGenomeViewModel
}) {
  const { classes } = useStyles()
  const [url, setUrl] = useState('')

  // Fetch failures go to the model's error slot rather than a second local one,
  // so the form has one error to show in one banner: two banners meant a failed
  // URL load could sit next to a stale error from a previous attempt.
  async function handleUrlLoad() {
    if (url.trim()) {
      model.setError(undefined)
      try {
        const text = await openLocation({
          uri: url,
          locationType: 'UriLocation',
        }).readFile('utf8')
        await model.loadGFA(text, url.split('/').pop() ?? 'GFA')
      } catch (e) {
        model.setError(e)
      }
    }
  }

  function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) {
      file
        .text()
        .then(text => model.loadGFA(text, file.name))
        .catch((err: unknown) => {
          model.setError(err)
        })
    }
  }

  return (
    <Paper className={classes.paper}>
      <div className={classes.header}>
        <Typography variant="h6">Load a GFA graph</Typography>
      </div>

      <div className={classes.column}>
        <div className={classes.rowCenter}>
          <Button variant="outlined" component="label" size="small">
            Choose file
            <input
              type="file"
              accept=".gfa,.gfa1,.gfa2"
              hidden
              onChange={event => {
                handleFileUpload(event)
              }}
            />
          </Button>
          <Typography variant="caption" color="text.secondary">
            Whole-file GFA; best for small/medium graphs.
          </Typography>
        </div>

        <div className={classes.rowEnd}>
          <TextField
            size="small"
            label="URL"
            placeholder="https://example.com/graph.gfa"
            value={url}
            onChange={e => {
              setUrl(e.target.value)
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                void handleUrlLoad()
              }
            }}
            className={classes.flex1}
          />
          <Button
            variant="contained"
            onClick={() => {
              void handleUrlLoad()
            }}
            disabled={!url.trim() || model.isLoading}
          >
            Open
          </Button>
        </div>
      </div>

      <div className={classes.footer}>
        <Button
          size="small"
          onClick={() => {
            void model.loadGFA(EXAMPLE_GFA, 'Example graph')
          }}
        >
          Load 4-node example
        </Button>
      </div>

      {model.isLoading ? (
        <LoadingEllipses
          variant="body2"
          message={model.statusMessage || 'Loading'}
        />
      ) : null}

      {model.error ? <ErrorBanner error={model.error} /> : null}
    </Paper>
  )
})

export default ImportForm
