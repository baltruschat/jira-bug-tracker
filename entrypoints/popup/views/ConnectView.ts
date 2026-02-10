import type { JiraConnection } from '../../../src/models/types';

export class ConnectView {
  private container: HTMLElement;
  private onAddSite: () => void;
  private onDisconnect: (id: string) => void;
  private onContinue: () => void;

  constructor(
    container: HTMLElement,
    callbacks: {
      onAddSite: () => void;
      onDisconnect: (id: string) => void;
      onContinue: () => void;
    },
  ) {
    this.container = container;
    this.onAddSite = callbacks.onAddSite;
    this.onDisconnect = callbacks.onDisconnect;
    this.onContinue = callbacks.onContinue;
  }

  render(connections: JiraConnection[], loading: boolean = false): void {
    this.container.innerHTML = '';

    if (loading) {
      this.container.innerHTML = `
        <div class="loading">
          <div class="spinner"></div>
          <span class="loading-text">Connecting to Jira...</span>
        </div>`;
      return;
    }

    if (connections.length === 0) {
      this.renderEmptyState();
    } else {
      this.renderConnectedSites(connections);
    }
  }

  private renderEmptyState(): void {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = `
      <div class="empty-icon">&#128279;</div>
      <div class="empty-title">No Jira Sites Connected</div>
      <div class="empty-description">
        Connect to your Jira Cloud instance to start capturing and submitting bug reports.
      </div>
    `;

    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-primary';
    addBtn.textContent = 'Add Jira Site';
    addBtn.addEventListener('click', this.onAddSite);
    empty.appendChild(addBtn);

    this.container.appendChild(empty);
  }

  private renderConnectedSites(connections: JiraConnection[]): void {
    const list = document.createElement('ul');
    list.className = 'site-list';

    for (const conn of connections) {
      const item = document.createElement('li');
      item.className = 'site-item';
      item.innerHTML = `
        <div class="site-info">
          <img class="site-avatar" src="${conn.avatarUrl || ''}" alt="" />
          <div class="site-details">
            <div class="site-name">${this.escapeHtml(conn.displayName)}</div>
            <div class="site-url">${this.escapeHtml(conn.siteName)} &mdash; ${this.escapeHtml(conn.siteUrl)}</div>
          </div>
        </div>
      `;

      const disconnectBtn = document.createElement('button');
      disconnectBtn.className = 'btn btn-danger btn-sm';
      disconnectBtn.textContent = 'Disconnect';
      disconnectBtn.addEventListener('click', () => {
        if (confirm(`Disconnect from ${conn.siteName}?`)) {
          this.onDisconnect(conn.id);
        }
      });
      item.appendChild(disconnectBtn);

      list.appendChild(item);
    }

    this.container.appendChild(list);

    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.gap = '8px';
    actions.style.marginTop = '12px';

    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-secondary';
    addBtn.textContent = 'Add Another Site';
    addBtn.addEventListener('click', this.onAddSite);
    actions.appendChild(addBtn);

    const continueBtn = document.createElement('button');
    continueBtn.className = 'btn btn-primary';
    continueBtn.textContent = 'Capture Bug';
    continueBtn.addEventListener('click', this.onContinue);
    actions.appendChild(continueBtn);

    this.container.appendChild(actions);
  }

  private escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
