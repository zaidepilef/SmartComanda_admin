import { Component } from '@angular/core';

import { AppIconName, IconComponent } from '../../icons/icon.component';

@Component({
  selector: 'app-icons',
  templateUrl: './icons.component.html',
  imports: [IconComponent]
})
export class IconsComponent {
  public icons: AppIconName[] = [
    'dashboard',
    'list',
    'pencil',
    'star',
    'bell',
    'menu',
    'moon',
    'sun',
    'contrast',
    'user',
    'settings',
    'lock',
    'logout',
    'basket',
    'dollar',
    'calculator',
    'notes',
    'building',
    'users'
  ];
}
