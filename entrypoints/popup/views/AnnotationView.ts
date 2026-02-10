import type { Screenshot, Annotation } from '../../../src/models/types';
import {
  addAnnotation,
  removeLastAnnotation,
  resetAnnotations,
  renderAnnotations,
} from '../../../src/services/screenshot';

type Tool = 'highlight' | 'redact';

export class AnnotationView {
  private container: HTMLElement;
  private onDone: (screenshot: Screenshot) => void;
  private onCancel: () => void;

  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private screenshot!: Screenshot;
  private currentTool: Tool = 'highlight';
  private highlightColor: string = '#ffcc00';
  private isDrawing = false;
  private startX = 0;
  private startY = 0;

  constructor(
    container: HTMLElement,
    callbacks: {
      onDone: (screenshot: Screenshot) => void;
      onCancel: () => void;
    },
  ) {
    this.container = container;
    this.onDone = callbacks.onDone;
    this.onCancel = callbacks.onCancel;
  }

  async render(screenshot: Screenshot): Promise<void> {
    this.screenshot = screenshot;
    this.container.innerHTML = '';

    // Toolbar
    const toolbar = document.createElement('div');
    toolbar.style.cssText = 'display:flex;gap:8px;padding:8px 0;align-items:center;flex-wrap:wrap;';

    const highlightBtn = this.createToolButton('Highlight', 'highlight');
    const redactBtn = this.createToolButton('Redact', 'redact');

    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = this.highlightColor;
    colorInput.title = 'Highlight color';
    colorInput.addEventListener('change', () => {
      this.highlightColor = colorInput.value;
    });

    const undoBtn = document.createElement('button');
    undoBtn.className = 'btn btn-secondary btn-sm';
    undoBtn.textContent = 'Undo';
    undoBtn.addEventListener('click', () => this.handleUndo());

    const resetBtn = document.createElement('button');
    resetBtn.className = 'btn btn-secondary btn-sm';
    resetBtn.textContent = 'Reset';
    resetBtn.addEventListener('click', () => this.handleReset());

    toolbar.append(highlightBtn, redactBtn, colorInput, undoBtn, resetBtn);
    this.container.appendChild(toolbar);

    // Canvas
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = 'width:100%;cursor:crosshair;border:1px solid #e0e0e0;border-radius:4px;';
    this.container.appendChild(this.canvas);

    // Load image and size canvas
    const img = new Image();
    img.onload = () => {
      const scale = this.container.clientWidth / img.naturalWidth;
      this.canvas.width = img.naturalWidth;
      this.canvas.height = img.naturalHeight;
      this.canvas.style.height = `${img.naturalHeight * scale}px`;
      this.ctx = this.canvas.getContext('2d')!;
      this.drawImage(img);
      this.drawAnnotations();
    };
    img.src = screenshot.originalDataUrl;

    // Mouse events
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));

    // Action buttons
    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:8px;margin-top:8px;';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-secondary';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', this.onCancel);
    actions.appendChild(cancelBtn);

    const doneBtn = document.createElement('button');
    doneBtn.className = 'btn btn-primary';
    doneBtn.textContent = 'Done';
    doneBtn.addEventListener('click', () => this.handleDone());
    actions.appendChild(doneBtn);

    this.container.appendChild(actions);
  }

  private createToolButton(label: string, tool: Tool): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = `btn btn-sm ${this.currentTool === tool ? 'btn-primary' : 'btn-secondary'}`;
    btn.textContent = label;
    btn.addEventListener('click', () => {
      this.currentTool = tool;
      this.container.querySelectorAll('.tool-btn')?.forEach((b) => b.classList.remove('btn-primary'));
      btn.classList.add('btn-primary');
    });
    btn.classList.add('tool-btn');
    return btn;
  }

  private getCanvasCoords(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  private onMouseDown(e: MouseEvent): void {
    this.isDrawing = true;
    const coords = this.getCanvasCoords(e);
    this.startX = coords.x;
    this.startY = coords.y;
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isDrawing) return;
    const coords = this.getCanvasCoords(e);
    this.redrawAll();
    // Preview rectangle
    const w = coords.x - this.startX;
    const h = coords.y - this.startY;
    this.ctx.strokeStyle = this.currentTool === 'highlight' ? this.highlightColor : '#000';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([5, 5]);
    this.ctx.strokeRect(this.startX, this.startY, w, h);
    this.ctx.setLineDash([]);
  }

  private onMouseUp(e: MouseEvent): void {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    const coords = this.getCanvasCoords(e);
    const w = coords.x - this.startX;
    const h = coords.y - this.startY;

    if (Math.abs(w) < 5 || Math.abs(h) < 5) return;

    const annotation: Annotation = {
      type: this.currentTool,
      x: Math.min(this.startX, coords.x),
      y: Math.min(this.startY, coords.y),
      width: Math.abs(w),
      height: Math.abs(h),
      color: this.currentTool === 'highlight' ? this.highlightColor : '#000000',
    };

    this.screenshot = addAnnotation(this.screenshot, annotation);
    this.redrawAll();
  }

  private redrawAll(): void {
    const img = new Image();
    img.onload = () => {
      this.drawImage(img);
      this.drawAnnotations();
    };
    img.src = this.screenshot.originalDataUrl;
  }

  private drawImage(img: HTMLImageElement): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(img, 0, 0);
  }

  private drawAnnotations(): void {
    for (const ann of this.screenshot.annotations) {
      if (ann.type === 'highlight') {
        this.ctx.fillStyle = ann.color;
        this.ctx.globalAlpha = 0.3;
        this.ctx.fillRect(ann.x, ann.y, ann.width, ann.height);
        this.ctx.globalAlpha = 1.0;
        this.ctx.strokeStyle = ann.color;
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(ann.x, ann.y, ann.width, ann.height);
      } else {
        this.ctx.fillStyle = '#000000';
        this.ctx.globalAlpha = 1.0;
        this.ctx.fillRect(ann.x, ann.y, ann.width, ann.height);
      }
    }
  }

  private handleUndo(): void {
    this.screenshot = removeLastAnnotation(this.screenshot);
    this.redrawAll();
  }

  private handleReset(): void {
    this.screenshot = resetAnnotations(this.screenshot);
    this.redrawAll();
  }

  private async handleDone(): Promise<void> {
    if (this.screenshot.annotations.length > 0) {
      this.screenshot = await renderAnnotations(this.screenshot);
    }
    this.onDone(this.screenshot);
  }
}
