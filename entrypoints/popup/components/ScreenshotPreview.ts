import type { Screenshot } from '../../../src/models/types';

export class ScreenshotPreview {
  private container: HTMLElement;
  private onAnnotate?: () => void;

  constructor(container: HTMLElement, callbacks?: { onAnnotate?: () => void }) {
    this.container = container;
    this.onAnnotate = callbacks?.onAnnotate;
  }

  render(screenshot: Screenshot): void {
    const wrapper = document.createElement('div');
    wrapper.className = 'screenshot-preview';

    const img = document.createElement('img');
    img.src = screenshot.annotatedDataUrl ?? screenshot.originalDataUrl;
    img.alt = 'Captured screenshot';
    wrapper.appendChild(img);

    if (this.onAnnotate) {
      const actions = document.createElement('div');
      actions.className = 'screenshot-actions';

      const annotateBtn = document.createElement('button');
      annotateBtn.className = 'btn btn-secondary btn-sm';
      annotateBtn.textContent = 'Annotate';
      annotateBtn.addEventListener('click', this.onAnnotate);
      actions.appendChild(annotateBtn);

      wrapper.appendChild(actions);
    }

    this.container.appendChild(wrapper);
  }
}
