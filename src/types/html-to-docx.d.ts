declare module 'html-to-docx' {
  interface HtmlToDocxOptions {
    orientation?: 'portrait' | 'landscape';
    margins?: Partial<{ top: number; right: number; bottom: number; left: number; header: number; footer: number; gutter: number }>;
    title?: string;
    font?: string;
    fontSize?: number;
    [key: string]: unknown;
  }
  const htmlToDocx: (
    htmlString: string,
    headerHTMLString?: string | null,
    options?: HtmlToDocxOptions,
    footerHTMLString?: string | null
  ) => Promise<Buffer | ArrayBuffer | Blob>;
  export default htmlToDocx;
}
