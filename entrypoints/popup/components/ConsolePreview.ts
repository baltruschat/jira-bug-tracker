import type { ConsoleEntry } from '../../../src/models/types';

export class ConsolePreview {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  render(entries: ConsoleEntry[]): void {
    const section = document.createElement('div');
    section.className = 'preview-section';

    const errorCount = entries.filter((e) => e.level === 'error').length;
    const warnCount = entries.filter((e) => e.level === 'warn').length;

    const header = document.createElement('div');
    header.className = 'preview-header';
    header.innerHTML = `
      <span>Console Output</span>
      <span>
        <span class="badge">${entries.length}</span>
        ${errorCount > 0 ? `<span class="badge badge-error">${errorCount} errors</span>` : ''}
        ${warnCount > 0 ? `<span class="badge badge-warn">${warnCount} warnings</span>` : ''}
      </span>
    `;

    const content = document.createElement('div');
    content.className = 'preview-content';
    content.style.display = 'none';
    content.style.fontFamily = 'monospace';
    content.style.fontSize = '11px';

    for (const entry of entries.slice(-50)) {
      const line = document.createElement('div');
      line.style.cssText = `padding:2px 0;border-bottom:1px solid #f0f0f0;color:${this.getLevelColor(entry.level)}`;
      const time = new Date(entry.timestamp).toISOString().slice(11, 23);
      line.textContent = `[${time}] ${entry.level.toUpperCase()} ${entry.message}`;
      content.appendChild(line);
    }

    if (entries.length > 50) {
      const more = document.createElement('div');
      more.style.cssText = 'padding:4px 0;color:#5e6c84;font-style:italic;';
      more.textContent = `... and ${entries.length - 50} more entries`;
      content.appendChild(more);
    }

    header.addEventListener('click', () => {
      content.style.display = content.style.display === 'none' ? 'block' : 'none';
    });

    section.appendChild(header);
    section.appendChild(content);
    this.container.appendChild(section);
  }

  private getLevelColor(level: string): string {
    switch (level) {
      case 'error': return '#de350b';
      case 'warn': return '#ff8b00';
      case 'info': return '#0052cc';
      default: return '#333';
    }
  }
}
