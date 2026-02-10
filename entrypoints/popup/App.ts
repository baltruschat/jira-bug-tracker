import type {
  BugReport,
  JiraConnection,
  JiraProject,
  JiraIssueType,
  ExtensionSettings,
  Screenshot,
} from '../../src/models/types';
import { getConnections } from '../../src/models/connection';
import { getSettings, mergeSettings } from '../../src/models/settings';
import { loadPendingReport, clearPendingReport } from '../../src/models/bug-report';
import { ConnectView } from './views/ConnectView';
import { CaptureView } from './views/CaptureView';
import { ReportFormView } from './views/ReportFormView';
import { AnnotationView } from './views/AnnotationView';
import { SuccessView } from './views/SuccessView';
import { SettingsView } from './views/SettingsView';

type View = 'connect' | 'capture' | 'report' | 'annotation' | 'settings' | 'success';

export class App {
  private root: HTMLElement;
  private currentView: View = 'connect';
  private connections: JiraConnection[] = [];
  private settings!: ExtensionSettings;
  private currentReport: BugReport | null = null;
  private projects: JiraProject[] = [];
  private issueTypes: JiraIssueType[] = [];
  private submitting = false;
  private submitWarnings: string[] = [];

  constructor(root: HTMLElement) {
    this.root = root;
  }

  async init(): Promise<void> {
    this.settings = await getSettings();
    this.connections = await getConnections();

    // Check for pending report from previous session
    const pending = await loadPendingReport();
    if (pending && pending.status !== 'submitted') {
      this.currentReport = pending;
      this.currentView = pending.status === 'captured' ? 'report' : 'capture';
    } else if (this.connections.length > 0) {
      this.currentView = 'connect';
    }

    this.render();
  }

  navigateTo(view: View): void {
    this.currentView = view;
    this.render();
  }

  private render(): void {
    this.root.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'header';
    header.innerHTML = `
      <h1>Jira Bug Tracker</h1>
      <div class="header-actions">
        <button class="btn-icon" id="settings-btn" title="Settings">&#9881;</button>
      </div>
    `;
    this.root.appendChild(header);

    const content = document.createElement('div');
    content.className = 'content';
    this.root.appendChild(content);

    header.querySelector('#settings-btn')?.addEventListener('click', () =>
      this.navigateTo('settings'),
    );

    this.renderView(content);
  }

  private renderView(container: HTMLElement): void {
    switch (this.currentView) {
      case 'connect':
        this.renderConnectView(container);
        break;
      case 'capture':
        this.renderCaptureView(container);
        break;
      case 'report':
        this.renderReportView(container);
        break;
      case 'annotation':
        this.renderAnnotationView(container);
        break;
      case 'settings':
        this.renderSettingsView(container);
        break;
      case 'success':
        this.renderSuccessView(container);
        break;
    }
  }

  private renderConnectView(container: HTMLElement): void {
    const view = new ConnectView(container, {
      onAddSite: () => this.startOAuth(),
      onDisconnect: (id) => this.disconnectSite(id),
      onContinue: () => this.startCapture(),
    });
    view.render(this.connections);
  }

  private renderCaptureView(container: HTMLElement): void {
    const view = new CaptureView(container, {
      onContinue: () => this.navigateTo('report'),
      onAnnotate: () => this.navigateTo('annotation'),
      onReCapture: () => this.startCapture(),
    });

    if (this.currentReport) {
      view.render(this.currentReport);
    } else {
      view.renderLoading();
    }
  }

  private renderReportView(container: HTMLElement): void {
    if (!this.currentReport) {
      this.navigateTo('capture');
      return;
    }

    const view = new ReportFormView(container, {
      onSubmit: (data) => this.submitReport(data),
      onBack: () => this.navigateTo('capture'),
      onSiteChange: (siteId) => this.loadProjects(siteId),
      onProjectChange: (projectKey) => this.loadIssueTypes(projectKey),
      onProjectSearch: (siteId, query) => this.searchProjects(siteId, query),
    });

    view.render(this.currentReport, this.connections, this.projects, this.issueTypes, this.submitting);
  }

  private renderAnnotationView(container: HTMLElement): void {
    if (!this.currentReport?.screenshot) {
      this.navigateTo('capture');
      return;
    }

    const view = new AnnotationView(container, {
      onDone: (screenshot: Screenshot) => {
        if (this.currentReport) {
          this.currentReport = { ...this.currentReport, screenshot };
        }
        this.navigateTo('capture');
      },
      onCancel: () => this.navigateTo('capture'),
    });

    view.render(this.currentReport.screenshot);
  }

  private renderSettingsView(container: HTMLElement): void {
    const view = new SettingsView(container, {
      onSave: async (partial) => {
        this.settings = await mergeSettings(partial);
        this.navigateTo('connect');
      },
      onBack: () => this.navigateTo('connect'),
    });
    view.render(this.settings, this.connections);
  }

  private renderSuccessView(container: HTMLElement): void {
    const view = new SuccessView(container, {
      onNewReport: async () => {
        await clearPendingReport();
        this.currentReport = null;
        this.navigateTo('connect');
      },
    });

    view.render(
      this.currentReport?.submittedIssueKey ?? '',
      this.currentReport?.submittedIssueUrl ?? '',
      this.submitWarnings.length > 0 ? this.submitWarnings : undefined,
    );
  }

  private setReportError(message: string): void {
    if (this.currentReport) {
      this.currentReport = { ...this.currentReport, error: message };
    }
  }

  private clearReportError(): void {
    if (this.currentReport?.error) {
      this.currentReport = { ...this.currentReport, error: null };
    }
  }

  /**
   * Captures in-progress form values (title, description) from the DOM
   * so they survive a full re-render triggered by loadProjects/loadIssueTypes.
   */
  private captureFormState(): void {
    if (!this.currentReport) return;
    const titleEl = document.getElementById('report-title') as HTMLInputElement | null;
    const descEl = document.getElementById('report-desc') as HTMLTextAreaElement | null;
    if (titleEl !== null || descEl !== null) {
      this.currentReport = {
        ...this.currentReport,
        title: titleEl?.value ?? this.currentReport.title,
        description: descEl?.value ?? this.currentReport.description,
      };
    }
  }

  // Actions

  private async startOAuth(): Promise<void> {
    const view = new ConnectView(
      this.root.querySelector('.content')!,
      { onAddSite: () => {}, onDisconnect: () => {}, onContinue: () => {} },
    );
    view.render(this.connections, true);

    try {
      const result = await chrome.runtime.sendMessage({ type: 'START_OAUTH' });
      console.log('[Popup] OAuth result:', result);
      if (result?.error) throw new Error(result.error);
      this.connections = await getConnections();
      this.navigateTo('connect');
    } catch (err) {
      console.error('[Popup] OAuth error:', err);
      this.connections = await getConnections();
      this.navigateTo('connect');
    }
  }

  private async disconnectSite(connectionId: string): Promise<void> {
    await chrome.runtime.sendMessage({
      type: 'DISCONNECT_SITE',
      payload: { connectionId },
    });
    this.connections = await getConnections();
    this.navigateTo('connect');
  }

  private async startCapture(): Promise<void> {
    this.currentReport = null;
    this.navigateTo('capture');

    try {
      const result = await chrome.runtime.sendMessage({ type: 'START_CAPTURE' });
      if (result?.payload) {
        this.currentReport = result.payload;
        this.navigateTo('capture');
      }
    } catch {
      // Show error in capture view
    }
  }

  private async loadProjects(siteId: string, query: string = ''): Promise<void> {
    // Persist the selected site so it survives re-render
    if (this.currentReport) {
      this.currentReport = { ...this.currentReport, targetSiteId: siteId };
    }
    try {
      const result = await chrome.runtime.sendMessage({
        type: 'LIST_PROJECTS',
        payload: { siteId, query },
      });

      if (result?.error) {
        console.error('[Popup] Failed to load projects:', result.error);
        this.setReportError(`Failed to load projects: ${result.error}`);
        this.projects = [];
      } else {
        this.projects = result?.payload?.values ?? [];
        this.clearReportError();
      }
      this.issueTypes = [];
      this.captureFormState();
      this.render();
    } catch (err) {
      console.error('[Popup] Error loading projects:', err);
      this.projects = [];
      this.setReportError(
        `Failed to load projects: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
      this.captureFormState();
      this.render();
    }
  }

  private async searchProjects(siteId: string, query: string): Promise<void> {
    await this.loadProjects(siteId, query);
  }

  private async loadIssueTypes(projectKey: string): Promise<void> {
    // Persist the selected project so it survives re-render
    if (this.currentReport) {
      this.currentReport = { ...this.currentReport, projectKey };
    }
    const siteId = this.currentReport?.targetSiteId ?? this.settings.defaultSiteId ?? '';
    const project = this.projects.find((p) => p.key === projectKey);
    try {
      const result = await chrome.runtime.sendMessage({
        type: 'LIST_ISSUE_TYPES',
        payload: { siteId, projectKey, projectId: project?.id },
      });

      if (result?.error) {
        console.error('[Popup] Failed to load issue types:', result.error);
        this.setReportError(`Failed to load issue types: ${result.error}`);
        this.issueTypes = [];
      } else {
        this.issueTypes = result?.payload?.values ?? [];
        this.clearReportError();
      }
      this.captureFormState();
      this.render();
    } catch (err) {
      console.error('[Popup] Error loading issue types:', err);
      this.issueTypes = [];
      this.setReportError(
        `Failed to load issue types: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
      this.captureFormState();
      this.render();
    }
  }

  private async submitReport(data: {
    siteId: string;
    projectKey: string;
    issueTypeId: string;
    title: string;
    description: string;
  }): Promise<void> {
    if (!this.currentReport) return;

    this.submitting = true;
    this.currentReport = {
      ...this.currentReport,
      ...data,
      targetSiteId: data.siteId,
      status: 'submitting',
    };
    this.render();

    try {
      const result = await chrome.runtime.sendMessage({
        type: 'SUBMIT_REPORT',
        payload: {
          reportId: this.currentReport.id,
          siteId: data.siteId,
          projectKey: data.projectKey,
          issueTypeId: data.issueTypeId,
          title: data.title,
          description: data.description,
        },
      });

      if (result?.payload?.success) {
        this.currentReport = {
          ...this.currentReport,
          status: 'submitted',
          submittedIssueKey: result.payload.issueKey,
          submittedIssueUrl: result.payload.issueUrl,
        };
        this.submitWarnings = result.payload.warnings ?? [];
        await clearPendingReport();
        this.submitting = false;
        this.navigateTo('success');
      } else {
        this.currentReport = {
          ...this.currentReport,
          status: 'error',
          error: result?.payload?.error ?? 'Submission failed',
        };
        this.submitting = false;
        this.render();
      }
    } catch (err) {
      this.currentReport = {
        ...this.currentReport!,
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown error',
      };
      this.submitting = false;
      this.render();
    }
  }
}
