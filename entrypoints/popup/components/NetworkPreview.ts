import type { NetworkRequest } from '../../../src/models/types';

export class NetworkPreview {
  private container: HTMLElement;
  private onRemove?: (requestId: string) => void;

  constructor(container: HTMLElement, callbacks?: { onRemove?: (requestId: string) => void }) {
    this.container = container;
    this.onRemove = callbacks?.onRemove;
  }

  render(requests: NetworkRequest[]): void {
    const section = document.createElement('div');
    section.className = 'preview-section';

    const failedCount = requests.filter((r) => r.error || (r.statusCode && r.statusCode >= 400)).length;

    const header = document.createElement('div');
    header.className = 'preview-header';
    header.innerHTML = `
      <span>Network Requests</span>
      <span>
        <span class="badge">${requests.length}</span>
        ${failedCount > 0 ? `<span class="badge badge-error">${failedCount} failed</span>` : ''}
      </span>
    `;

    const content = document.createElement('div');
    content.className = 'preview-content';
    content.style.display = 'none';

    for (const req of requests.slice(-50)) {
      const line = document.createElement('div');
      line.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:3px 0;border-bottom:1px solid #f0f0f0;font-size:11px;';

      const statusColor = this.getStatusColor(req.statusCode);
      const duration = req.duration != null ? `${req.duration}ms` : '-';

      const info = document.createElement('span');
      info.style.cssText = `overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;color:${statusColor}`;
      info.textContent = `${req.method} ${req.url} [${req.statusCode ?? 'pending'}] ${duration}`;
      line.appendChild(info);

      if (this.onRemove) {
        const removeBtn = document.createElement('button');
        removeBtn.className = 'btn-icon';
        removeBtn.style.cssText = 'font-size:10px;padding:2px 4px;flex-shrink:0;';
        removeBtn.textContent = '\u2715';
        removeBtn.title = 'Remove from report';
        removeBtn.addEventListener('click', () => this.onRemove?.(req.id));
        line.appendChild(removeBtn);
      }

      content.appendChild(line);
    }

    if (requests.length > 50) {
      const more = document.createElement('div');
      more.style.cssText = 'padding:4px 0;color:#5e6c84;font-style:italic;font-size:11px;';
      more.textContent = `... and ${requests.length - 50} more requests`;
      content.appendChild(more);
    }

    header.addEventListener('click', () => {
      content.style.display = content.style.display === 'none' ? 'block' : 'none';
    });

    section.appendChild(header);
    section.appendChild(content);
    this.container.appendChild(section);
  }

  private getStatusColor(status: number | null): string {
    if (status == null) return '#5e6c84';
    if (status >= 500) return '#de350b';
    if (status >= 400) return '#ff8b00';
    if (status >= 200 && status < 300) return '#36b37e';
    return '#333';
  }
}
