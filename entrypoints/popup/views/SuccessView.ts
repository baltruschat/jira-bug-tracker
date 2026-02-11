export class SuccessView {
  private container: HTMLElement;
  private onNewReport: () => void;

  constructor(
    container: HTMLElement,
    callbacks: { onNewReport: () => void },
  ) {
    this.container = container;
    this.onNewReport = callbacks.onNewReport;
  }

  render(issueKey: string, issueUrl: string, warnings?: string[]): void {
    this.container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'text-align:center;padding:40px 20px;';

    wrapper.innerHTML = `
      <div style="font-size:48px;margin-bottom:16px;">&#10003;</div>
      <div class="success" style="display:inline-block;margin-bottom:16px;">
        Bug report submitted successfully!
      </div>
      <div style="margin-bottom:20px;">
        <a href="${this.escapeAttr(issueUrl)}" target="_blank" rel="noopener noreferrer"
           style="font-size:18px;font-weight:600;color:#0052cc;text-decoration:none;">
          ${this.escapeHtml(issueKey)}
        </a>
        <div style="font-size:12px;color:#5e6c84;margin-top:4px;">Click to view in Jira</div>
      </div>
    `;

    if (warnings && warnings.length > 0) {
      const warningsDiv = document.createElement('div');
      warningsDiv.style.cssText =
        'margin-bottom:16px;padding:8px 12px;background:#fff3cd;border:1px solid #ffc107;border-radius:4px;color:#856404;font-size:13px;text-align:left;';
      for (const warning of warnings) {
        const p = document.createElement('p');
        p.style.cssText = 'margin:4px 0;';
        p.textContent = warning;
        warningsDiv.appendChild(p);
      }
      wrapper.appendChild(warningsDiv);
    }

    const newBtn = document.createElement('button');
    newBtn.className = 'btn btn-primary';
    newBtn.textContent = 'Report Another Bug';
    newBtn.addEventListener('click', this.onNewReport);
    wrapper.appendChild(newBtn);

    this.container.appendChild(wrapper);
  }

  private escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  private escapeAttr(str: string): string {
    return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
}
