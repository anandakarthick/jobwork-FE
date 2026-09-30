import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { pollIngestJobs, selectHasProcessing } from '../store/ingestJobsSlice';

/**
 * App-level watcher for background price-list ingests. Mounted once in Layout so
 * it keeps running across every in-app navigation, and re-mounts (resuming from
 * the DB-backed status) on a hard refresh. Polls fast while any ingest is
 * PROCESSING and slowly otherwise (to pick up jobs started in another tab). The
 * slice fires a toast when a watched job completes or fails.
 */
export default function IngestWatcher() {
  const dispatch = useAppDispatch();
  const hasProcessing = useAppSelector((s) => selectHasProcessing(s.ingestJobs.byId));

  useEffect(() => {
    // Immediate poll on mount = resume tracking after a refresh/navigation.
    void dispatch(pollIngestJobs());
    const interval = hasProcessing ? 3500 : 20000;
    const timer = window.setInterval(() => {
      void dispatch(pollIngestJobs());
    }, interval);
    return () => window.clearInterval(timer);
  }, [dispatch, hasProcessing]);

  return null;
}
