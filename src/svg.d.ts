export interface IconPath { readonly fill: string; readonly d: string; readonly opacity?: number }
export interface IconDefinition { readonly name: string; readonly width: number; readonly height: number; readonly paths: readonly IconPath[] }
export interface SvgOptions { title?: string; size?: number | string; className?: string }
export declare function iconSvg(icon: IconDefinition, options?: SvgOptions): string;
export declare function mountIcons(icons: readonly IconDefinition[], root?: ParentNode): number;
