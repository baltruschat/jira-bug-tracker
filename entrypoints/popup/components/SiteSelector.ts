import type { JiraConnection } from '../../../src/models/types';

export class SiteSelector {
  private container: HTMLElement;
  private onChange: (siteId: string) => void;
  private selectEl!: HTMLSelectElement;

  constructor(container: HTMLElement, callbacks: { onChange: (siteId: string) => void }) {
    this.container = container;
    this.onChange = callbacks.onChange;
  }

  render(connections: JiraConnection[], selectedId: string = ''): void {
    this.container.innerHTML = '<label>Jira Site *</label>';

    this.selectEl = document.createElement('select');
    this.selectEl.className = 'select';
    this.selectEl.required = true;

    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = 'Select a Jira site...';
    this.selectEl.appendChild(defaultOpt);

    for (const conn of connections) {
      const opt = document.createElement('option');
      opt.value = conn.id;
      opt.textContent = `${conn.siteName} (${conn.displayName})`;
      if (conn.id === selectedId) opt.selected = true;
      this.selectEl.appendChild(opt);
    }

    if (selectedId) this.selectEl.value = selectedId;

    this.selectEl.addEventListener('change', () => {
      this.onChange(this.selectEl.value);
    });

    this.container.appendChild(this.selectEl);
  }

  getValue(): string {
    return this.selectEl?.value ?? '';
  }
}
