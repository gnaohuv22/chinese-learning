import {
  trigger,
  transition,
  style,
  query,
  animate,
  group,
} from '@angular/animations';

const slideConfig = '500ms cubic-bezier(0.32, 0.72, 0, 1)';

export const routeTransition = trigger('routeAnimations', [
  // Forward transition (Push)
  transition(':increment', [
    style({ position: 'relative' }),
    query(':enter, :leave', [
      style({
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 2,
      }),
    ], { optional: true }),
    query(':enter', [style({ transform: 'translateX(100%)', opacity: 1 })], { optional: true }),
    query(':leave', [style({ zIndex: 1 })], { optional: true }),
    group([
      query(':leave', [
        animate(slideConfig, style({ transform: 'translateX(-30%)', opacity: 0 })),
      ], { optional: true }),
      query(':enter', [
        animate(slideConfig, style({ transform: 'translateX(0)', opacity: 1 })),
      ], { optional: true }),
    ]),
  ]),

  // Backward transition (Pop)
  transition(':decrement', [
    style({ position: 'relative' }),
    query(':enter, :leave', [
      style({
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 1,
      }),
    ], { optional: true }),
    query(':enter', [style({ transform: 'translateX(-30%)', opacity: 0.5, zIndex: 1 })], { optional: true }),
    query(':leave', [style({ zIndex: 2 })], { optional: true }),
    group([
      query(':leave', [
        animate(slideConfig, style({ transform: 'translateX(100%)', opacity: 1 })),
      ], { optional: true }),
      query(':enter', [
        animate(slideConfig, style({ transform: 'translateX(0)', opacity: 1 })),
      ], { optional: true }),
    ]),
  ]),
]);
