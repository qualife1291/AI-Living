/** IntersectionObserver includes clipping by a scrolling dialog. This only
 * suspends presentation; simulation, polling and durable plans keep running. */
export function observeRenderVisibility(host: HTMLElement) {
  let intersecting = true, disposed = false;
  const observer = typeof IntersectionObserver === 'undefined' ? undefined : new IntersectionObserver(entries => {
    // Opening/scrolling a dialog can queue several transitions for one target.
    // The first record may be its old, hidden position; the last is current.
    const entry = entries.findLast(entry => entry.target === host);
    if (entry) intersecting = entry.isIntersecting && entry.intersectionRect.width > 0 && entry.intersectionRect.height > 0;
  }, {root:host.closest('dialog')});
  observer?.observe(host);
  return {
    visible: () => !disposed && !document.hidden && intersecting && host.clientWidth > 1 && host.clientHeight > 1,
    dispose() { if(disposed)return;disposed = true; observer?.disconnect(); },
  };
}
