import type { ReactElement, SVGProps } from 'react';
import type { IconDefinition } from '@imumd/mcicons/svg';
export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'children'> { icon: IconDefinition; title?: string; size?: number | string }
export declare function Icon(props: IconProps): ReactElement;
