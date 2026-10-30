import { TestBed } from '@angular/core/testing';
import { provideSettings, SettingsStore } from '@pp/settings';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
    document.head.innerHTML = '<meta name="theme-color" content="#f4f7fb">';
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideSettings({ persistence: 'memory' })] });
  });

  it('applies a saved dark theme once settings are ready, with chrome color and storage hint', async () => {
    const settings = TestBed.inject(SettingsStore);
    TestBed.inject(ThemeService);
    await vi.waitFor(() => expect(settings.ready()).toBe(true));
    await settings.update({ theme: 'dark' });
    await vi.waitFor(() => expect(document.documentElement.getAttribute('data-theme')).toBe('dark'));
    expect(document.querySelector('meta[name="theme-color"]')!.getAttribute('content')).toBe('#17151f');
    expect(localStorage.getItem('pp-theme')).toBe('dark');
  });

  it('switches back to light', async () => {
    const settings = TestBed.inject(SettingsStore);
    TestBed.inject(ThemeService);
    await vi.waitFor(() => expect(settings.ready()).toBe(true));
    await settings.update({ theme: 'dark' });
    await settings.update({ theme: 'light' });
    await vi.waitFor(() => expect(document.documentElement.getAttribute('data-theme')).toBe('light'));
    expect(document.querySelector('meta[name="theme-color"]')!.getAttribute('content')).toBe('#f4f7fb');
  });

  it('follows the system preference when set to system', async () => {
    const settings = TestBed.inject(SettingsStore);
    TestBed.inject(ThemeService);
    await vi.waitFor(() => expect(settings.ready()).toBe(true));
    await settings.update({ theme: 'system' });
    await vi.waitFor(() => expect(document.documentElement.getAttribute('data-theme')).toBe('light'));
    expect(localStorage.getItem('pp-theme')).toBe('system');
  });
});
