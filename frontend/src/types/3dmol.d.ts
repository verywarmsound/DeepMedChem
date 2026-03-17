declare namespace $3Dmol {
  function createViewer(
    element: HTMLElement | string,
    config?: {
      backgroundColor?: string;
      antialias?: boolean;
      id?: string;
    },
  ): GLViewer;

  interface Atom {
    x: number;
    y: number;
    z: number;
    elem: string;
    serial: number;
    [key: string]: unknown;
  }

  interface GLViewer {
    addModel(data: string, format: string): GLModel;
    removeAllModels(): void;
    setStyle(sel: object, style: object): void;
    zoomTo(): void;
    render(): void;
    resize(): void;
    clear(): void;
    zoom(factor: number): void;
    spin(axis: string | boolean): void;
    setBackgroundColor(color: string): void;
    getCanvas(): HTMLCanvasElement;
  }

  interface GLModel {
    setStyle(sel: object, style: object): void;
    selectedAtoms(sel: object): Atom[];
  }
}

interface Window {
  $3Dmol: typeof $3Dmol;
}
