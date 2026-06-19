(() => {
  class ImageSlot extends HTMLElement {
    static get observedAttributes() { return ['src', 'placeholder']; }

    connectedCallback() {
      this._render();
    }

    attributeChangedCallback() {
      if (this.isConnected) this._render();
    }

    _render() {
      const src = this.getAttribute('src');
      const placeholder = this.getAttribute('placeholder') || '';
      this.innerHTML = '';
      if (src) {
        const img = document.createElement('img');
        img.src = src;
        img.alt = '';
        img.decoding = 'async';
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
        this.appendChild(img);
        return;
      }
      const box = document.createElement('div');
      box.textContent = placeholder;
      box.style.cssText = [
        'width:100%', 'height:100%', 'box-sizing:border-box',
        'display:flex', 'align-items:center', 'justify-content:center',
        'background:var(--is-bg,var(--paper,#1e1a13))',
        'border:1px solid var(--is-border,var(--line,#34302a))',
        'border-radius:var(--is-radius,0)',
        'color:var(--is-text,var(--muted,#756f62))',
        'font-family:var(--mono,"JetBrains Mono",ui-monospace,monospace)',
        'font-size:11px', 'letter-spacing:.12em', 'text-transform:uppercase',
        'text-align:center', 'padding:16px', 'line-height:1.45',
      ].join(';');
      this.appendChild(box);
    }
  }

  if (!customElements.get('image-slot')) {
    customElements.define('image-slot', ImageSlot);
  }
})();
