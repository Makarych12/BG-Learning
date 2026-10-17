import { Component, type ReactNode } from 'react';

export function isModuleLoadError(error: Error) {
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS|Loading chunk .* failed/i.test(error.message);
}

/** Activate the current deployment before reloading an old PWA entry point. */
export async function reloadApplication() {
  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration) {
      await Promise.race([registration.update().catch(() => {}), new Promise(resolve => setTimeout(resolve, 3000))]);
      const worker = registration.installing;
      if (worker && worker.state !== 'installed' && worker.state !== 'redundant') {
        await new Promise<void>(resolve => {
          const done = () => { clearTimeout(timer); worker.removeEventListener('statechange', changed); resolve(); };
          const changed = () => { if (worker.state === 'installed' || worker.state === 'redundant') done(); };
          const timer = setTimeout(done, 3000);
          worker.addEventListener('statechange', changed);
        });
      }
      if (registration.waiting) {
        await new Promise<void>(resolve => {
          const done = () => { clearTimeout(timer); navigator.serviceWorker.removeEventListener('controllerchange', done); resolve(); };
          const timer = setTimeout(done, 2000);
          navigator.serviceWorker.addEventListener('controllerchange', done);
          registration.waiting!.postMessage({type: 'SKIP_WAITING'});
        });
      }
    }
  } catch { /* A failed update must still allow a fresh network navigation. */ }
  window.location.reload();
}

export async function recoverModuleVersion(error: Error) {
  if (!isModuleLoadError(error) || !navigator.onLine) return;
  // Keep a persistent failure from reloading indefinitely, including with an old SW.
  const version = document.querySelector<HTMLScriptElement>('script[type="module"][src]')?.src ?? window.location.href;
  try {
    if (sessionStorage.getItem('chameleon-module-recovery') === version) return;
    sessionStorage.setItem('chameleon-module-recovery', version);
  } catch { return; }
  await reloadApplication();
}

export class SectionBoundary extends Component<{children: ReactNode}, {error: Error | null}> {
  state: {error: Error | null} = {error: null};
  static getDerivedStateFromError(error: Error) { return {error}; }
  componentDidCatch(error: Error) { void recoverModuleVersion(error); }
  render() {
    if (!this.state.error) return this.props.children;
    return <section className="panel" role="alert">
      <h2>{isModuleLoadError(this.state.error) ? 'Не удалось загрузить раздел' : 'Не удалось открыть раздел'}</h2>
      <p>Меню доступно. Сохранённый прогресс остаётся на устройстве.</p>
      <button className="btn primary" onClick={() => void reloadApplication()}>Обновить приложение</button>
    </section>;
  }
}
