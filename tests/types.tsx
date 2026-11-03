import { Icon } from '@imumd/mcicons/react';
import { iconSvg, mountIcons, type IconDefinition } from '@imumd/mcicons/svg';
import sword from '@imumd/mcicons/definitions/diamond-sword';
import { iconClass, type IconName } from '@imumd/mcicons';
const name: IconName = 'diamond-sword';
const definition: IconDefinition = sword;
iconClass(name, 'xl');
iconSvg(definition, { title: 'Sword', size: 32 });
mountIcons([definition], document);
const icon = <Icon icon={sword} title="Diamond sword" size={32} className="item" aria-describedby="description" />;
void icon;
// @ts-expect-error Unknown catalog identifiers must not pass the generated type.
iconClass('not-an-icon');
// @ts-expect-error Definitions, not string names, are required by the React entry.
const invalid = <Icon icon="diamond-sword" />;
void invalid;
