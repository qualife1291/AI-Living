/** IntersectionObserver includes clipping by a scrolling dialog. This only
 * suspends presentation; simulation, polling and durable plans keep running. */
export function observeRenderVisibility(host: HTMLElement) {
  let intersecting = true, disposed = false;
  const observer = typeof IntersectionObserver === 'undefined' ? undefined : new IntersectionObserver(entries => {
    const entry = entries.find(entry => entry.target === host);
    if (entry) intersecting = entry.isIntersecting && entry.intersectionRect.width > 0 && entry.intersectionRect.height > 0;
  });
  observer?.observe(host);
  return {
    visible: () => !disposed && !document.hidden && intersecting && host.clientWidth > 1 && host.clientHeight > 1,
    dispose() { disposed = true; observer?.disconnect(); },
  };
}
