import type { BugReport, JiraConnection, JiraProject, JiraIssueType } from '../../../src/models/types';
import { SiteSelector } from '../components/SiteSelector';
import { ProjectSelector } from '../components/ProjectSelector';
import { IssueTypeSelector } from '../components/IssueTypeSelector';

export class ReportFormView {
  private container: HTMLElement;
  private onSubmit: (data: {
    siteId: string;
    projectKey: string;
    issueTypeId: string;
    title: string;
    description: string;
  }) => void;
  private onBack: () => void;
  private onSiteChange: (siteId: string) => void;
  private onProjectChange: (projectKey: string) => void;
  private onProjectSearch?: (siteId: string, query: string) => void;

  private siteSelector!: SiteSelector;
  private projectSelector!: ProjectSelector;
  private issueTypeSelector!: IssueTypeSelector;

  constructor(
    container: HTMLElement,
    callbacks: {
      onSubmit: (data: {
        siteId: string;
        projectKey: string;
        issueTypeId: string;
        title: string;
        description: string;
      }) => void;
      onBack: () => void;
      onSiteChange: (siteId: string) => void;
      onProjectChange: (projectKey: string) => void;
      onProjectSearch?: (siteId: string, query: string) => void;
    },
  ) {
    this.container = container;
    this.onSubmit = callbacks.onSubmit;
    this.onBack = callbacks.onBack;
    this.onSiteChange = callbacks.onSiteChange;
    this.onProjectChange = callbacks.onProjectChange;
    this.onProjectSearch = callbacks.onProjectSearch;
  }

  render(
    report: BugReport,
    connections: JiraConnection[],
    projects: JiraProject[],
    issueTypes: JiraIssueType[],
    submitting: boolean = false,
  ): void {
    this.container.innerHTML = '';

    const form = document.createElement('form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit();
    });

    // Site selector
    const siteGroup = document.createElement('div');
    siteGroup.className = 'form-group';
    this.siteSelector = new SiteSelector(siteGroup, {
      onChange: this.onSiteChange,
    });
    this.siteSelector.render(connections, report.targetSiteId);
    form.appendChild(siteGroup);

    // Title
    const titleGroup = document.createElement('div');
    titleGroup.className = 'form-group';
    titleGroup.innerHTML = `<label for="report-title">Bug Title *</label>`;
    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.id = 'report-title';
    titleInput.className = 'input';
    titleInput.required = true;
    titleInput.placeholder = 'Brief description of the bug';
    titleInput.value = report.title;
    titleGroup.appendChild(titleInput);
    form.appendChild(titleGroup);

    // Description
    const descGroup = document.createElement('div');
    descGroup.className = 'form-group';
    descGroup.innerHTML = `<label for="report-desc">Description</label>`;
    const descInput = document.createElement('textarea');
    descInput.id = 'report-desc';
    descInput.className = 'textarea';
    descInput.placeholder = 'Steps to reproduce, expected vs actual behavior...';
    descInput.value = report.description;
    descGroup.appendChild(descInput);
    form.appendChild(descGroup);

    // Project selector with search support
    const projectGroup = document.createElement('div');
    projectGroup.className = 'form-group';
    this.projectSelector = new ProjectSelector(projectGroup, {
      onChange: this.onProjectChange,
      onSearch: this.onProjectSearch
        ? (query: string) => {
            const siteId = this.siteSelector.getValue();
            if (siteId) this.onProjectSearch!(siteId, query);
          }
        : undefined,
    });
    this.projectSelector.render(projects, report.projectKey, !!report.targetSiteId);
    form.appendChild(projectGroup);

    // Issue type selector
    const typeGroup = document.createElement('div');
    typeGroup.className = 'form-group';
    this.issueTypeSelector = new IssueTypeSelector(typeGroup);
    this.issueTypeSelector.render(issueTypes, report.issueTypeId, !!report.projectKey);
    form.appendChild(typeGroup);

    // Data summary
    const summary = document.createElement('div');
    summary.className = 'card';
    summary.innerHTML = `
      <div class="card-title" style="margin-bottom: 4px;">Attached Data</div>
      <div style="font-size: 12px; color: #5e6c84;">
        ${report.screenshot ? '&#10003; Screenshot' : '&#10007; No screenshot'} |
        ${report.consoleEntries.length} console entries |
        ${report.networkRequests.length} network requests
      </div>
    `;
    form.appendChild(summary);

    // Error display
    if (report.error) {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'error';
      errorDiv.textContent = report.error;
      form.appendChild(errorDiv);
    }

    // Actions
    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.gap = '8px';
    actions.style.marginTop = '12px';

    const backBtn = document.createElement('button');
    backBtn.type = 'button';
    backBtn.className = 'btn btn-secondary';
    backBtn.textContent = 'Back';
    backBtn.addEventListener('click', this.onBack);
    actions.appendChild(backBtn);

    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.className = 'btn btn-primary';
    submitBtn.textContent = submitting ? 'Submitting...' : 'Submit to Jira';
    submitBtn.disabled = submitting;
    actions.appendChild(submitBtn);

    form.appendChild(actions);
    this.container.appendChild(form);
  }

  private handleSubmit(): void {
    // Offline detection
    if (!navigator.onLine) {
      const errorDiv = this.container.querySelector('.error') ?? document.createElement('div');
      errorDiv.className = 'error';
      errorDiv.textContent = 'You are offline. Your report is saved and you can submit when back online.';
      if (!this.container.querySelector('.error')) {
        this.container.querySelector('form')?.appendChild(errorDiv);
      }
      return;
    }

    const title = (document.getElementById('report-title') as HTMLInputElement)?.value?.trim();
    const description = (document.getElementById('report-desc') as HTMLTextAreaElement)?.value?.trim() ?? '';
    const siteId = this.siteSelector.getValue();
    const projectKey = this.projectSelector.getValue();
    const issueTypeId = this.issueTypeSelector.getValue();

    if (!title) return;
    if (!siteId || !projectKey || !issueTypeId) return;

    this.onSubmit({ siteId, projectKey, issueTypeId, title, description });
  }
}
