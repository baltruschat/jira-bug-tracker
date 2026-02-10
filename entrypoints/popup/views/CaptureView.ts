import type { BugReport } from '../../../src/models/types';
import { ScreenshotPreview } from '../components/ScreenshotPreview';
import { ConsolePreview } from '../components/ConsolePreview';
import { NetworkPreview } from '../components/NetworkPreview';

export class CaptureView {
  private container: HTMLElement;
  private onContinue: () => void;
  private onAnnotate: () => void;
  private onReCapture: () => void;

  constructor(
    container: HTMLElement,
    callbacks: {
      onContinue: () => void;
      onAnnotate: () => void;
      onReCapture: () => void;
    },
  ) {
    this.container = container;
    this.onContinue = callbacks.onContinue;
    this.onAnnotate = callbacks.onAnnotate;
    this.onReCapture = callbacks.onReCapture;
  }

  renderLoading(): void {
    this.container.innerHTML = `
      <div class="loading">
        <div class="spinner"></div>
        <span class="loading-text">Capturing bug data...</span>
      </div>`;
  }

  render(report: BugReport): void {
    this.container.innerHTML = '';

    // Screenshot preview
    if (report.screenshot) {
      const screenshotPreview = new ScreenshotPreview(this.container, {
        onAnnotate: this.onAnnotate,
      });
      screenshotPreview.render(report.screenshot);
    }

    // Console entries summary
    if (report.consoleEntries.length > 0) {
      const consolePreview = new ConsolePreview(this.container);
      consolePreview.render(report.consoleEntries);
    }

    // Network requests summary
    if (report.networkRequests.length > 0) {
      const networkPreview = new NetworkPreview(this.container);
      networkPreview.render(report.networkRequests);
    }

    // Environment info
    if (report.environment) {
      const envSection = document.createElement('div');
      envSection.className = 'card';
      envSection.innerHTML = `
        <div class="card-header">
          <span class="card-title">Environment</span>
        </div>
        <div style="font-size: 12px; color: #5e6c84;">
          ${report.environment.browserName} ${report.environment.browserVersion} |
          ${report.environment.os} |
          ${report.environment.viewportWidth}x${report.environment.viewportHeight}
        </div>
      `;
      this.container.appendChild(envSection);
    }

    // Page context
    if (report.pageContext) {
      const pageSection = document.createElement('div');
      pageSection.className = 'card';
      pageSection.innerHTML = `
        <div class="card-header">
          <span class="card-title">Page</span>
        </div>
        <div style="font-size: 12px; color: #5e6c84; word-break: break-all;">
          ${this.escapeHtml(report.pageContext.title)}<br/>
          ${this.escapeHtml(report.pageContext.url)}
        </div>
      `;
      this.container.appendChild(pageSection);
    }

    // Actions
    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.gap = '8px';
    actions.style.marginTop = '12px';

    const recaptureBtn = document.createElement('button');
    recaptureBtn.className = 'btn btn-secondary';
    recaptureBtn.textContent = 'Re-capture';
    recaptureBtn.addEventListener('click', this.onReCapture);
    actions.appendChild(recaptureBtn);

    const continueBtn = document.createElement('button');
    continueBtn.className = 'btn btn-primary';
    continueBtn.textContent = 'Continue to Report';
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
