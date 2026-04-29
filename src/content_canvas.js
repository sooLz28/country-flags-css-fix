(() => {
  const replacementFontName = "Twemoji Country Flags";

  const patchFontDescriptor = (Ctor) => {
    if (!Ctor || !Ctor.prototype) return;
    const proto = Ctor.prototype;
    if (proto.__countryFlagFixerPatched) return;

    const descriptor = Object.getOwnPropertyDescriptor(proto, 'font');
    if (!descriptor || typeof descriptor.set !== 'function') return;

    const origSet = descriptor.set;
    const origGet = descriptor.get;

    Object.defineProperty(proto, 'font', {
      configurable: true,
      enumerable: descriptor.enumerable,
      get: origGet,
      set: function (value) {
        if (typeof value === 'string' && value.indexOf(replacementFontName) === -1) {
          // CSS font shorthand: [<style> <variant> <weight> <stretch>] <size>[/<line-height>] <family>
          // Split into "<prefix><size>" and "<family>" so we can prepend Twemoji to the family list.
          const match = value.match(/^(.*?)(\d*\.?\d+(?:px|em|rem|pt|%|pc|in|cm|mm|ex|ch|vh|vw)(?:\s*\/\s*[\d.]+(?:px|em|rem|pt|%)?)?)\s+(.+)$/);
          if (match) {
            value = `${match[1]}${match[2]} '${replacementFontName}', ${match[3]}`;
          }
        }
        return origSet.call(this, value);
      }
    });

    proto.__countryFlagFixerPatched = true;
  };

  patchFontDescriptor(typeof CanvasRenderingContext2D !== 'undefined' ? CanvasRenderingContext2D : null);
  patchFontDescriptor(typeof OffscreenCanvasRenderingContext2D !== 'undefined' ? OffscreenCanvasRenderingContext2D : null);
})();
