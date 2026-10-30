import { TestBed } from '@angular/core/testing';
import { SwUpdate } from '@angular/service-worker';
import { ToastService } from '@pp/shared/ui';
import { Subject } from 'rxjs';
import { InstallHint } from './install-hint';
import { IosInstallService } from './ios-install.service';
import { RELOAD_PAGE, SwUpdateService } from './sw-update.service';

const text = (el: Element) => (el.textContent ?? '').replace(/\s+/g, ' ').trim();

describe('SwUpdateService', () => {
  function setup(isEnabled = true) {
    const versionUpdates = new Subject<{ type: string }>();
    const fake = {
      isEnabled,
      versionUpdates,
      checkForUpdate: vi.fn().mockResolvedValue(true),
      activateUpdate: vi.fn().mockResolvedValue(true),
    };
    const reload = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: SwUpdate, useValue: fake },
        { provide: RELOAD_PAGE, useValue: reload },
      ],
    });
    TestBed.inject(SwUpdateService).start();
    return { fake, reload, versionUpdates, toast: TestBed.inject(ToastService) };
  }

  it('offers the update only once a new version is ready', () => {
    const { versionUpdates, toast } = setup();
    versionUpdates.next({ type: 'VERSION_DETECTED' });
    expect(toast.current()).toBeNull();
    versionUpdates.next({ type: 'VERSION_READY' });
    expect(toast.current()).toMatchObject({ message: 'Hay una versión nueva', actionLabel: 'Actualizar' });
  });

  it('activates the new version and reloads when the user accepts', async () => {
    const { fake, reload, versionUpdates, toast } = setup();
    versionUpdates.next({ type: 'VERSION_READY' });
    toast.current()!.onAction!();
    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    expect(fake.activateUpdate).toHaveBeenCalledTimes(1);
  });

  it('still reloads if activation fails', async () => {
    const { fake, reload, versionUpdates, toast } = setup();
    fake.activateUpdate.mockRejectedValue(new Error('no'));
    versionUpdates.next({ type: 'VERSION_READY' });
    toast.current()!.onAction!();
    await vi.waitFor(() => expect(reload).toHaveBeenCalled());
  });

  it('checks for updates when the app comes back to the foreground', () => {
    const { fake } = setup();
    document.dispatchEvent(new Event('visibilitychange'));
    expect(fake.checkForUpdate).toHaveBeenCalledTimes(1);
  });

  it('does nothing where the service worker is off, as in dev', () => {
    const { fake, versionUpdates, toast } = setup(false);
    versionUpdates.next({ type: 'VERSION_READY' });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(toast.current()).toBeNull();
    expect(fake.checkForUpdate).not.toHaveBeenCalled();
  });
});

describe('IosInstallService', () => {
  const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1';
  const ANDROID = 'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36';

  function create(userAgent: string, standalone = false) {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(userAgent);
    Object.defineProperty(navigator, 'standalone', { value: standalone, configurable: true });
    return TestBed.inject(IosInstallService);
  }

  beforeEach(() => localStorage.removeItem('pp-install-hint-dismissed'));
  afterEach(() => {
    vi.restoreAllMocks();
    Reflect.deleteProperty(navigator, 'standalone');
  });

  it('reminds iPhone users in the browser', () => {
    expect(create(IPHONE).visible()).toBe(true);
  });

  it('stays quiet once the app is installed', () => {
    expect(create(IPHONE, true).visible()).toBe(false);
  });

  it('stays quiet on other platforms, which offer their own install prompt', () => {
    expect(create(ANDROID).visible()).toBe(false);
  });

  it('stays dismissed, including after a relaunch', () => {
    create(IPHONE).dismiss();
    expect(TestBed.inject(IosInstallService).visible()).toBe(false);

    TestBed.resetTestingModule();
    expect(create(IPHONE).visible()).toBe(false);
  });
});

describe('InstallHint', () => {
  it('explains the Share > Add to Home Screen steps and can be closed', () => {
    const fixture = TestBed.createComponent(InstallHint);
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(text(root)).toContain('Compartir');
    expect(text(root)).toContain('Agregar a inicio');

    const dismissed = vi.fn();
    fixture.componentInstance.dismissed.subscribe(dismissed);
    root.querySelector<HTMLButtonElement>('button')!.click();
    expect(dismissed).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when hidden', () => {
    const fixture = TestBed.createComponent(InstallHint);
    fixture.detectChanges();
    expect(text(fixture.nativeElement)).toBe('');
  });
});
