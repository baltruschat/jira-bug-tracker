import type { JiraProject } from '../../../src/models/types';

export class ProjectSelector {
  private container: HTMLElement;
  private onChange: (projectKey: string) => void;
  private onSearch?: (query: string) => void;
  private selectEl!: HTMLSelectElement;
  private searchInput?: HTMLInputElement;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    container: HTMLElement,
    callbacks: {
      onChange: (projectKey: string) => void;
      onSearch?: (query: string) => void;
    },
  ) {
    this.container = container;
    this.onChange = callbacks.onChange;
    this.onSearch = callbacks.onSearch;
  }

  render(projects: JiraProject[], selectedKey: string = ''): void {
    this.container.innerHTML = '<label>Project *</label>';

    // Add search input for large project lists
    if (this.onSearch) {
      this.searchInput = document.createElement('input');
      this.searchInput.type = 'text';
      this.searchInput.className = 'input';
      this.searchInput.placeholder = 'Search projects...';
      this.searchInput.style.marginBottom = '4px';

      this.searchInput.addEventListener('input', () => {
        if (this.searchTimer) clearTimeout(this.searchTimer);
        this.searchTimer = setTimeout(() => {
          this.onSearch?.(this.searchInput?.value ?? '');
        }, 300);
      });

      this.container.appendChild(this.searchInput);
    }

    this.selectEl = document.createElement('select');
    this.selectEl.className = 'select';
    this.selectEl.required = true;

    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = projects.length === 0 ? 'Select a site first...' : 'Select a project...';
    this.selectEl.appendChild(defaultOpt);

    for (const project of projects) {
      const opt = document.createElement('option');
      opt.value = project.key;
      opt.textContent = `${project.name} (${project.key})`;
      if (project.key === selectedKey) opt.selected = true;
      this.selectEl.appendChild(opt);
    }

    this.selectEl.addEventListener('change', () => {
      this.onChange(this.selectEl.value);
    });

    this.container.appendChild(this.selectEl);
  }

  getValue(): string {
    return this.selectEl?.value ?? '';
  }
}
