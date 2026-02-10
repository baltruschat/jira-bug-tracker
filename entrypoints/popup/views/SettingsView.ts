import type { ExtensionSettings, JiraConnection, JiraProject, JiraIssueType } from '../../../src/models/types';

export class SettingsView {
  private container: HTMLElement;
  private onSave: (settings: Partial<ExtensionSettings>) => void;
  private onBack: () => void;

  constructor(
    container: HTMLElement,
    callbacks: {
      onSave: (settings: Partial<ExtensionSettings>) => void;
      onBack: () => void;
    },
  ) {
    this.container = container;
    this.onSave = callbacks.onSave;
    this.onBack = callbacks.onBack;
  }

  render(
    settings: ExtensionSettings,
    connections: JiraConnection[],
    _projects: JiraProject[] = [],
    _issueTypes: JiraIssueType[] = [],
  ): void {
    this.container.innerHTML = '';

    const form = document.createElement('form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSave();
    });

    // Default site
    const siteGroup = document.createElement('div');
    siteGroup.className = 'form-group';
    siteGroup.innerHTML = `<label>Default Jira Site</label>`;
    const siteSelect = document.createElement('select');
    siteSelect.className = 'select';
    siteSelect.id = 'settings-site';
    siteSelect.innerHTML = `<option value="">None</option>` +
      connections.map((c) =>
        `<option value="${c.id}" ${c.id === settings.defaultSiteId ? 'selected' : ''}>${this.escapeHtml(c.siteName)}</option>`,
      ).join('');
    siteGroup.appendChild(siteSelect);
    form.appendChild(siteGroup);

    // Capture toggles
    form.appendChild(this.createToggle('settings-console', 'Capture Console Logs', settings.captureConsole));
    form.appendChild(this.createToggle('settings-network', 'Capture Network Requests', settings.captureNetwork));
    form.appendChild(this.createToggle('settings-env', 'Capture Environment Data', settings.captureEnvironment));

    // Network body max size
    const bodyGroup = document.createElement('div');
    bodyGroup.className = 'form-group';
    bodyGroup.innerHTML = `<label for="settings-bodymax">Network Body Truncation Limit (bytes)</label>`;
    const bodyInput = document.createElement('input');
    bodyInput.type = 'number';
    bodyInput.id = 'settings-bodymax';
    bodyInput.className = 'input';
    bodyInput.min = '1';
    bodyInput.value = String(settings.networkBodyMaxSize);
    bodyGroup.appendChild(bodyInput);
    form.appendChild(bodyGroup);

    // Console max entries
    const consoleGroup = document.createElement('div');
    consoleGroup.className = 'form-group';
    consoleGroup.innerHTML = `<label for="settings-consolemax">Max Console Entries</label>`;
    const consoleInput = document.createElement('input');
    consoleInput.type = 'number';
    consoleInput.id = 'settings-consolemax';
    consoleInput.className = 'input';
    consoleInput.min = '1';
    consoleInput.value = String(settings.consoleMaxEntries);
    consoleGroup.appendChild(consoleInput);
    form.appendChild(consoleGroup);

    // Actions
    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:8px;margin-top:12px;';

    const backBtn = document.createElement('button');
    backBtn.type = 'button';
    backBtn.className = 'btn btn-secondary';
    backBtn.textContent = 'Back';
    backBtn.addEventListener('click', this.onBack);
    actions.appendChild(backBtn);

    const saveBtn = document.createElement('button');
    saveBtn.type = 'submit';
    saveBtn.className = 'btn btn-primary';
    saveBtn.textContent = 'Save Settings';
    actions.appendChild(saveBtn);

    form.appendChild(actions);
    this.container.appendChild(form);
  }

  private createToggle(id: string, label: string, checked: boolean): HTMLElement {
    const group = document.createElement('div');
    group.className = 'form-group';
    group.style.cssText = 'display:flex;align-items:center;gap:8px;';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = id;
    checkbox.checked = checked;
    group.appendChild(checkbox);

    const labelEl = document.createElement('label');
    labelEl.htmlFor = id;
    labelEl.textContent = label;
    labelEl.style.cssText = 'margin:0;text-transform:none;font-weight:normal;';
    group.appendChild(labelEl);

    return group;
  }

  private handleSave(): void {
    const siteId = (document.getElementById('settings-site') as HTMLSelectElement)?.value || null;
    const captureConsole = (document.getElementById('settings-console') as HTMLInputElement)?.checked ?? true;
    const captureNetwork = (document.getElementById('settings-network') as HTMLInputElement)?.checked ?? true;
    const captureEnvironment = (document.getElementById('settings-env') as HTMLInputElement)?.checked ?? true;
    const networkBodyMaxSize = parseInt((document.getElementById('settings-bodymax') as HTMLInputElement)?.value, 10) || 10240;
    const consoleMaxEntries = parseInt((document.getElementById('settings-consolemax') as HTMLInputElement)?.value, 10) || 1000;

    this.onSave({
      defaultSiteId: siteId,
      captureConsole,
      captureNetwork,
      captureEnvironment,
      networkBodyMaxSize,
      consoleMaxEntries,
    });
  }

  private escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
