import type { JiraIssueType } from '../../../src/models/types';

export class IssueTypeSelector {
  private container: HTMLElement;
  private selectEl!: HTMLSelectElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  render(issueTypes: JiraIssueType[], selectedId: string = '', projectSelected: boolean = false): void {
    this.container.innerHTML = '<label>Issue Type *</label>';

    this.selectEl = document.createElement('select');
    this.selectEl.className = 'select';
    this.selectEl.required = true;

    let placeholder: string;
    if (issueTypes.length > 0) {
      placeholder = 'Select issue type...';
    } else if (projectSelected) {
      placeholder = 'No issue types found';
    } else {
      placeholder = 'Select a project first...';
    }

    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = placeholder;
    this.selectEl.appendChild(defaultOpt);

    for (const issueType of issueTypes) {
      const opt = document.createElement('option');
      opt.value = issueType.id;
      opt.textContent = issueType.name;
      if (issueType.id === selectedId) opt.selected = true;
      this.selectEl.appendChild(opt);
    }

    if (selectedId) this.selectEl.value = selectedId;

    this.container.appendChild(this.selectEl);
  }

  getValue(): string {
    return this.selectEl?.value ?? '';
  }
}
