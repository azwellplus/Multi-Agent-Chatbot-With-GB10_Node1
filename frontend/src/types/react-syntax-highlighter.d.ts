declare module "react-syntax-highlighter" {
  import type { CSSProperties, ComponentType, HTMLAttributes } from "react";

  export interface SyntaxHighlighterProps extends HTMLAttributes<HTMLElement> {
    language?: string;
    style?: Record<string, unknown>;
    showLineNumbers?: boolean;
    wrapLongLines?: boolean;
    PreTag?: ComponentType<Record<string, unknown>> | keyof JSX.IntrinsicElements;
    customStyle?: CSSProperties;
  }

  export const Prism: ComponentType<SyntaxHighlighterProps>;
}

declare module "react-syntax-highlighter/dist/esm/styles/prism" {
  export const oneDark: Record<string, unknown>;
  export const oneLight: Record<string, unknown>;
}
