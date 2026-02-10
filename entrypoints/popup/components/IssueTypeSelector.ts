import type { JiraIssueType } from '../../../src/models/types';

export class IssueTypeSelector {
  private container: HTMLElement;
  private selectEl!: HTMLSelectElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  render(issueTypes: JiraIssueType[], selectedId: string = ''): void {
    this.container.innerHTML = '<label>Issue Type *</label>';

    this.selectEl = document.createElement('select');
    this.selectEl.className = 'select';
    this.selectEl.required = true;

    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = issueTypes.length === 0 ? 'Select a project first...' : 'Select issue type...';
    this.selectEl.appendChild(defaultOpt);

    for (const issueType of issueTypes) {
      const opt = document.createElement('option');
      opt.value = issueType.id;
      opt.textContent = issueType.name;
      if (issueType.id === selectedId) opt.selected = true;
      this.selectEl.appendChild(opt);
    }

    this.container.appendChild(this.selectEl);
  }

  getValue(): string {
    return this.selectEl?.value ?? '';
  }
}
