// 输入处理系统

class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseInside = false;
    this.mouseDown = false;
    this.selectedChemokine = 0;
    this.keys = {};

    this.onDroplet = null;
    this.onPause = null;
    this.onRestart = null;
    this.onSelectChemokine = null;

    this.bindEvents();
  }

  bindEvents() {
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;
      this.mouseInside = true;
    });

    this.canvas.addEventListener('mouseenter', () => {
      this.mouseInside = true;
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.mouseInside = false;
    });

    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.mouseDown = true;
        this.handleClick();
      }
    });

    this.canvas.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.mouseDown = false;
      }
    });

    document.addEventListener('keydown', (e) => {
      this.keys[e.key] = true;
      this.handleKeyDown(e);
    });

    document.addEventListener('keyup', (e) => {
      this.keys[e.key] = false;
    });
  }

  handleClick() {
    if (this.onDroplet && this.mouseInside) {
      const chemokine = CONFIG.chemokines[this.selectedChemokine];
      this.onDroplet(this.mouseX, this.mouseY, chemokine);
    }
  }

  handleKeyDown(e) {
    if (e.key >= '1' && e.key <= '9') {
      const index = parseInt(e.key) - 1;
      if (index < CONFIG.chemokines.length) {
        this.selectedChemokine = index;
        if (this.onSelectChemokine) {
          this.onSelectChemokine(index);
        }
      }
    }

    if (e.key === ' ' || e.key === 'Space') {
      e.preventDefault();
      if (this.onPause) {
        this.onPause();
      }
    }

    if (e.key === 'r' || e.key === 'R') {
      if (this.onRestart) {
        this.onRestart();
      }
    }
  }

  getMousePosition() {
    return { x: this.mouseX, y: this.mouseY };
  }

  getSelectedChemokine() {
    return CONFIG.chemokines[this.selectedChemokine];
  }

  selectChemokine(index) {
    if (index >= 0 && index < CONFIG.chemokines.length) {
      this.selectedChemokine = index;
    }
  }
}
